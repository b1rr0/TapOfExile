# Skill Tree

## Key Files

| File | Purpose |
|------|---------|
| `shared/skill-tree.ts` | Tree construction (~256 nodes), layout, SkillNode, SkillTreeBuilder |
| `shared/skill-tree-validation.ts` | Allocation validation (BFS, point budget) |
| `shared/skill-node-defs.ts` | NodeDef, StatModifier, node pools, CLASS_SKILLS |
| `server/src/skill-tree/skill-tree.service.ts` | BE: save, validate, reset |
| `server/src/skill-tree/skill-tree.controller.ts` | REST endpoints |
| `bot/src/scenes/skill-tree-scene.ts` | FE: SVG rendering, pan/zoom, interaction |
| `bot/src/data/skill-tree.ts` | FE re-export from shared + CLASS_IMG |

## Tree Architecture

Circular graph in PoE2 style, ~256 nodes. Layout is deterministic (seeded RNG, seed=42), cached.

### Structure (layers from inside out):

```
Center (CX=800, CY=800)
  → 4 start nodes at radius 210 (samurai/warrior/mage/archer)
  → Each inside Emblem circle (r=100) with 16 class-specific skills
  → Inner ring (3 per class = 12)
  → Trunk ring (5 per class = 20)
  → Branch ring (5 per class = 20)
  → Fractal tendrils (5 roots per class, depth-2 branching)
  → Keystones at the farthest points (2 per class = 8)
  → Cross-class bridges (trunk[ci][4] → trunk[ci+1][0])
```

### Node Types

| Type | Shape | Size | Description |
|------|-------|------|-------------|
| start | circle | 14 | Class start node |
| minor | circle | 8 | Small bonuses (+3-10%) |
| notable | hex | 12 | Medium bonuses (+10-35%), often multi-stat |
| keystone | diamond | 16 | Powerful (+50-100%), often with trade-off |
| classSkill | hex | 9 | Inside Emblem, up to 6 |

## Point System

- **Outer points** = `level - 1` (minor, notable, keystone nodes)
- **Class skills** — separate limit: `MAX_CLASS_SKILLS = 6`
- Start node does not cost points

## Node Pools (skill-node-defs.ts)

### MINOR_POOL (16 nodes, cyclic)

+3-10% to a single stat: damage, critChance, critMulti, hp, goldFind, xpGain, dodge, fire/lightning/cold/pure dmg.

### NOTABLE_POOL (24 nodes, cyclic)

+10-35% to one or two stats. Examples:
- "Razor Edge" (+12% Damage)
- "Eagle Eye" (+15% Crit Chance)
- "Blood Frenzy" (+8% Dmg, +15% HP)
- "Precision" (+10% Crit, +10% Dmg)

### KEYSTONE_POOL (8 nodes)

Powerful effects:
- **Berserker Rage**: +100% Dmg (2x Dmg at low HP)
- **Perfect Aim**: +100% Crit Damage (Crits deal 3x)
- **Undying Will**: +100% HP, -20% Dmg
- **Midas Touch**: +100% Gold Find (2x Gold)
- **Infernal Crown**: +60% Fire Dmg, +20% HP
- **Soul Eater**: +50% HP (Kills heal 5% HP)
- **Chaos Lord**: +50% All Damage
- **Eternal Student**: +200% XP (3x XP)

### CLASS_SKILLS (16 per class)

Unique per class:
- **Samurai**: Lightning + physical, crit-focused (Iaido, Bushido, Windcutter...)
- **Warrior**: Fire + physical, tanky (Shield Wall, Warcry, Heavy Strike...)
- **Mage**: Fire/lightning/cold, elemental diversity (Fireball, Frost Nova, Lightning Bolt...)
- **Archer**: Cold + physical, crit/dodge (Power Shot, Frost Arrow, Hawk Eye...)

## Stat Mapping (STAT_TO_PLAYER)

```
damage       → tapDamage
dps          → tapDamage
critChance   → critChance
critMulti    → critMultiplier
hp           → hp (maxHp)
goldFind     → goldFind
xpGain       → xpGain
dodge        → dodgeChance
fireDmg      → fireDmg
lightningDmg → lightningDmg
coldDmg      → coldDmg
pureDmg      → pureDmg
```

## Bonus Calculation (computeAllocatedBonuses)

```typescript
// For each allocated node, sums modifiers:
result = { percent: { tapDamage: 0.23, critChance: 0.15, ... }, flat: {} }
// Application: finalStat = baseStat * (1 + bonuses.percent[key]) + bonuses.flat[key]
```

## Validation (skill-tree-validation.ts)

**Used on both FE (pre-validation) and BE (authoritative).**

4 checks:

1. **Start node allocated** — the class start node must be in the array
2. **Valid IDs** — all IDs are integers in range [0, tree.nodes.length)
3. **BFS connectivity** — all nodes are reachable from the start node via other allocated nodes
4. **Points budget**:
   - outer nodes (not start and not classSkill) <= `level - 1`
   - classSkill nodes <= `MAX_CLASS_SKILLS (6)`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/skill-tree?characterId` | Get allocated nodes |
| POST | `/skill-tree/accept` | Save allocations (body: `{characterId, allocated: number[]}`) |
| POST | `/skill-tree/reset` | Reset (body: `{characterId}`), cost: 100 gold * number of nodes |

## FE Flow (skill-tree-scene.ts)

1. `mount()` → `buildSkillTree()` (from shared, cached)
2. Loads `char.allocatedNodes` from state
3. Renders SVG: emblems → edges → nodes
4. Pan/zoom (pointer + pinch + wheel)
5. **Two-tap interaction**: 1st tap → tooltip, 2nd tap → allocate/deallocate
6. Checks on allocation:
   - `isReachable(nodeId)` — has an allocated neighbor
   - `getOuterUsedCount() < totalPoints` — free points available
   - `getClassSkillCount() < MAX_CLASS_SKILLS` — class skill limit
7. Deallocation only for leaf nodes (`isLeaf` checks BFS connectivity)
8. **Accept** → FE pre-validation (`validateAllocations`) → `api.skillTree.accept()`
9. **Reset** button → confirm popup → clears everything to startNode, 100 gold/node
