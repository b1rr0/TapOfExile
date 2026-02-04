import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillAllocation } from '../shared/entities/skill-allocation.entity';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { RedisService } from '../redis/redis.service';

// Simplified node structure cached from skill tree build
export interface CachedNode {
  id: number;
  nodeId: string;
  type: string;
  classAffinity: string;
  connections: number[];
  label: string;
  name: string | null;
  mods: { stat: string; value: number; mode: string }[];
}

interface CachedSkillTree {
  nodes: CachedNode[];
  edges: [number, number][];
  emblems: { classId: string; cx: number; cy: number; r: number; startNodeId: number }[];
}

const MAX_CLASS_SKILLS = 6;
const SKILL_TREE_CACHE_KEY = 'config:skill-tree';

// Stat key mapping (mirrored from bot/src/data/skill-node-defs.ts)
const STAT_TO_PLAYER: Record<string, string> = {
  damage: 'tapDamage',
  critChance: 'critChance',
  critMulti: 'critMultiplier',
  attackSpeed: 'attackSpeed',
  hp: 'hp',
  goldFind: 'goldFind',
  xpGain: 'xpGain',
  dps: 'passiveDps',
};

@Injectable()
export class SkillTreeService {
  constructor(
    @InjectRepository(SkillAllocation)
    private allocRepo: Repository<SkillAllocation>,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    private redis: RedisService,
  ) {}

  /**
   * Get the full skill tree. Cached in Redis.
   * The tree is deterministic (seeded RNG), same result every time.
   */
  async getSkillTree(): Promise<CachedSkillTree> {
    const cached = await this.redis.getJson<CachedSkillTree>(SKILL_TREE_CACHE_KEY);
    if (cached) return cached;

    // Build tree dynamically (same algorithm as client)
    // For now, return a placeholder — the real buildSkillTree() should be ported
    // The client-side tree builder uses seeded RNG(42) and is fully deterministic
    throw new BadRequestException(
      'Skill tree not cached. Restart server to rebuild.',
    );
  }

  /**
   * Get allocated node IDs for a character.
   */
  async getAllocations(characterId: string): Promise<number[]> {
    const allocs = await this.allocRepo.find({ where: { characterId } });
    return allocs.map((a) => a.nodeId);
  }

  /**
   * Get skill tree with player allocations.
   */
  async getTreeWithAllocations(telegramId: string, characterId: string) {
    const tree = await this.getSkillTree();
    const allocated = await this.getAllocations(characterId);

    return {
      ...tree,
      allocated,
    };
  }

  /**
   * Allocate a skill node.
   */
  async allocateNode(
    telegramId: string,
    characterId: string,
    nodeId: number,
  ) {
    const tree = await this.getSkillTree();
    const node = tree.nodes[nodeId];
    if (!node) throw new NotFoundException('Node not found');

    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    const allocated = await this.getAllocations(characterId);
    const allocatedSet = new Set(allocated);

    // Already allocated?
    if (allocatedSet.has(nodeId)) {
      throw new BadRequestException('Node already allocated');
    }

    // Check adjacency: must be connected to an already-allocated node
    // (start nodes are auto-allocated)
    const isStartNode = node.type === 'start';
    if (!isStartNode) {
      const hasAdjacentAllocated = node.connections.some((c) =>
        allocatedSet.has(c),
      );
      if (!hasAdjacentAllocated) {
        throw new BadRequestException(
          'Node must be adjacent to an allocated node',
        );
      }
    }

    // Check classSkill limit
    if (node.type === 'classSkill') {
      const classSkillCount = allocated.filter((id) => {
        const n = tree.nodes[id];
        return n && n.type === 'classSkill' && n.classAffinity === node.classAffinity;
      }).length;
      if (classSkillCount >= MAX_CLASS_SKILLS) {
        throw new BadRequestException(
          `Maximum ${MAX_CLASS_SKILLS} class skills allowed`,
        );
      }
    }

    // Save allocation
    const alloc = this.allocRepo.create({ characterId, nodeId });
    await this.allocRepo.save(alloc);

    return {
      allocated: [...allocated, nodeId],
      bonuses: this.computeBonuses(tree.nodes, new Set([...allocated, nodeId])),
    };
  }

  /**
   * Reset all allocations (costs gold from active league's PlayerLeague).
   */
  async resetAllocations(telegramId: string, characterId: string) {
    // Get character to find its PlayerLeague
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    const pl = await this.playerLeagueRepo.findOne({
      where: { id: char.playerLeagueId },
    });
    if (!pl) throw new NotFoundException('PlayerLeague not found');

    // Reset cost: 100 gold per allocated node
    const allocs = await this.allocRepo.find({ where: { characterId } });
    const cost = allocs.length * 100;

    if (BigInt(pl.gold) < BigInt(cost)) {
      throw new BadRequestException('Not enough gold');
    }

    pl.gold = String(BigInt(pl.gold) - BigInt(cost));
    await this.playerLeagueRepo.save(pl);

    await this.allocRepo.delete({ characterId });

    return { cost, allocated: [] };
  }

  /**
   * Compute stat bonuses from allocated nodes.
   * Ported from bot/src/data/skill-node-defs.ts: computeAllocatedBonuses
   */
  private computeBonuses(
    nodes: CachedNode[],
    allocated: Set<number>,
  ): { percent: Record<string, number>; flat: Record<string, number> } {
    const percent: Record<string, number> = {};
    const flat: Record<string, number> = {};

    for (const nodeId of allocated) {
      const node = nodes[nodeId];
      if (!node || node.type === 'start') continue;

      for (const mod of node.mods) {
        const key = STAT_TO_PLAYER[mod.stat] || mod.stat;
        if (mod.mode === 'flat') {
          flat[key] = (flat[key] || 0) + mod.value;
        } else {
          percent[key] = (percent[key] || 0) + mod.value;
        }
      }
    }

    return { percent, flat };
  }
}
