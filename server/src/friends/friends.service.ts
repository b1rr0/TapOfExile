import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike, In } from 'typeorm';
import { Friendship } from '../shared/entities/friendship.entity';
import { Character } from '../shared/entities/character.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { DojoRecord } from '../shared/entities/dojo-record.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(Character)
    private characterRepo: Repository<Character>,
    @InjectRepository(EquipmentSlot)
    private equipSlotRepo: Repository<EquipmentSlot>,
    @InjectRepository(DojoRecord)
    private dojoRecordRepo: Repository<DojoRecord>,
  ) {}

  /** Search characters by nickname (partial match, exclude own) */
  async searchCharacters(telegramId: string, query: string) {
    if (!query || query.length < 2) return [];

    const chars = await this.characterRepo.find({
      where: {
        nickname: ILike(`%${query}%`),
        playerTelegramId: Not(telegramId),
      },
      relations: ['player'],
      take: 20,
    });

    return chars.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      classId: c.classId,
      skinId: c.skinId,
      level: c.level,
      telegramUsername: c.player?.telegramUsername || null,
    }));
  }

  /** Send a friend request from one character to another */
  async sendRequest(
    telegramId: string,
    fromCharacterId: string,
    toCharacterId: string,
  ) {
    if (fromCharacterId === toCharacterId) {
      throw new BadRequestException('Cannot friend yourself');
    }

    // Validate requester owns fromCharacterId
    const fromChar = await this.characterRepo.findOne({
      where: { id: fromCharacterId, playerTelegramId: telegramId },
    });
    if (!fromChar) {
      throw new ForbiddenException('Character not owned by you');
    }

    // Validate target exists
    const toChar = await this.characterRepo.findOne({
      where: { id: toCharacterId },
    });
    if (!toChar) {
      throw new NotFoundException('Target character not found');
    }

    // Check no existing friendship in either direction
    const existing = await this.friendshipRepo.findOne({
      where: [
        { requesterId: fromCharacterId, targetId: toCharacterId },
        { requesterId: toCharacterId, targetId: fromCharacterId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Already friends');
      }
      if (existing.status === 'pending') {
        throw new BadRequestException('Friend request already pending');
      }
      // If rejected, allow re-request by updating
      existing.requesterId = fromCharacterId;
      existing.targetId = toCharacterId;
      existing.status = 'pending';
      existing.acceptedAt = null;
      return this.friendshipRepo.save(existing);
    }

    const friendship = this.friendshipRepo.create({
      requesterId: fromCharacterId,
      targetId: toCharacterId,
      status: 'pending',
    });

    return this.friendshipRepo.save(friendship);
  }

  /** Get incoming pending requests for a character */
  async getIncomingRequests(telegramId: string, characterId: string) {
    await this.validateOwnership(telegramId, characterId);

    const requests = await this.friendshipRepo.find({
      where: { targetId: characterId, status: 'pending' },
      relations: ['requester', 'requester.player'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
      friendshipId: r.id,
      character: {
        id: r.requester.id,
        nickname: r.requester.nickname,
        classId: r.requester.classId,
        skinId: r.requester.skinId,
        level: r.requester.level,
        telegramUsername: r.requester.player?.telegramUsername || null,
      },
      createdAt: r.createdAt,
    }));
  }

  /** Accept or reject a friend request */
  async respondToRequest(
    telegramId: string,
    friendshipId: string,
    accept: boolean,
  ) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Request not found');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Request already handled');
    }

    // Validate caller owns the target character
    await this.validateOwnership(telegramId, friendship.targetId);

    friendship.status = accept ? 'accepted' : 'rejected';
    if (accept) friendship.acceptedAt = new Date();

    await this.friendshipRepo.save(friendship);
    return { status: friendship.status };
  }

  /** List accepted friends for a character */
  async listFriends(telegramId: string, characterId: string) {
    await this.validateOwnership(telegramId, characterId);

    const friendships = await this.friendshipRepo.find({
      where: [
        { requesterId: characterId, status: 'accepted' },
        { targetId: characterId, status: 'accepted' },
      ],
      relations: ['requester', 'requester.player', 'target', 'target.player'],
    });

    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    return friendships.map((f) => {
      const friend =
        f.requesterId === characterId ? f.target : f.requester;
      const lastSeenAt = friend.player?.lastSeenAt
        ? new Date(friend.player.lastSeenAt).getTime()
        : 0;
      const isOnline = lastSeenAt > 0 && (now - lastSeenAt) < ONLINE_THRESHOLD_MS;

      return {
        friendshipId: f.id,
        character: {
          id: friend.id,
          nickname: friend.nickname,
          classId: friend.classId,
          skinId: friend.skinId,
          level: friend.level,
          dojoBestDamage: friend.dojoBestDamage,
          telegramUsername: friend.player?.telegramUsername || null,
        },
        isOnline,
        lastSeenAt: friend.player?.lastSeenAt || null,
      };
    });
  }

  /** Remove a friendship */
  async removeFriend(telegramId: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    // Validate caller owns one side
    const ownedChars = await this.characterRepo.find({
      where: { playerTelegramId: telegramId },
      select: ['id'],
    });
    const ownedIds = ownedChars.map((c) => c.id);

    if (
      !ownedIds.includes(friendship.requesterId) &&
      !ownedIds.includes(friendship.targetId)
    ) {
      throw new ForbiddenException('Not your friendship');
    }

    await this.friendshipRepo.remove(friendship);
  }

  /** Get a friend's equipment (only if actually friends) */
  async getFriendEquipment(
    telegramId: string,
    myCharacterId: string,
    friendCharacterId: string,
  ) {
    await this.validateOwnership(telegramId, myCharacterId);

    // Check friendship exists
    const friendship = await this.friendshipRepo.findOne({
      where: [
        {
          requesterId: myCharacterId,
          targetId: friendCharacterId,
          status: 'accepted',
        },
        {
          requesterId: friendCharacterId,
          targetId: myCharacterId,
          status: 'accepted',
        },
      ],
    });
    if (!friendship) {
      throw new ForbiddenException('Not friends with this character');
    }

    const friendChar = await this.characterRepo.findOne({
      where: { id: friendCharacterId },
      relations: ['player'],
    });
    if (!friendChar) {
      throw new NotFoundException('Character not found');
    }

    const slots = await this.equipSlotRepo.find({
      where: { characterId: friendCharacterId },
      relations: ['item'],
    });

    return {
      character: {
        id: friendChar.id,
        nickname: friendChar.nickname,
        classId: friendChar.classId,
        skinId: friendChar.skinId,
        level: friendChar.level,
        tapDamage: friendChar.tapDamage,
        critChance: friendChar.critChance,
        critMultiplier: friendChar.critMultiplier,
        dodgeChance: friendChar.dodgeChance,
        hp: friendChar.hp,
        maxHp: friendChar.maxHp,
        dojoBestDamage: friendChar.dojoBestDamage,
        telegramUsername: friendChar.player?.telegramUsername || null,
      },
      equipment: slots.map((s) => ({
        slotId: s.slotId,
        item: s.item
          ? {
              id: s.item.id,
              name: s.item.name,
              type: s.item.type,
              quality: s.item.quality,
              level: s.item.level,
              tier: s.item.tier,
              flaskType: s.item.flaskType,
              maxCharges: s.item.maxCharges,
              healPercent: s.item.healPercent,
            }
          : null,
      })),
    };
  }

  /** Friends dojo leaderboard: self + friends from dojo_records, same league only */
  async getDojoLeaderboard(telegramId: string, characterId: string) {
    await this.validateOwnership(telegramId, characterId);

    // Resolve league from the requesting character
    const self = await this.characterRepo.findOne({
      where: { id: characterId },
      select: ['id', 'leagueId'],
    });

    // Collect IDs: self + friends
    const friendships = await this.friendshipRepo.find({
      where: [
        { requesterId: characterId, status: 'accepted' },
        { targetId: characterId, status: 'accepted' },
      ],
    });

    const charIds = [
      characterId,
      ...friendships.map((f) =>
        f.requesterId === characterId ? f.targetId : f.requesterId,
      ),
    ];

    // Use denormalized leagueId on dojo_records - no JOIN with characters needed
    let records: DojoRecord[];
    if (self?.leagueId) {
      records = await this.dojoRecordRepo.find({
        where: { characterId: In(charIds), leagueId: self.leagueId },
        order: { bestDamage: 'DESC' },
      });
    } else {
      records = await this.dojoRecordRepo.find({
        where: { characterId: In(charIds) },
        order: { bestDamage: 'DESC' },
      });
    }

    return {
      leaderboard: records.map((r, i) => ({
        rank: i + 1,
        characterId: r.characterId,
        nickname: r.nickname,
        classId: r.classId,
        skinId: r.skinId,
        level: r.level,
        bestDamage: r.bestDamage,
        telegramUsername: r.telegramUsername || null,
        isSelf: r.characterId === characterId,
      })),
    };
  }

  /** Global dojo leaderboard: top N from dojo_records, filtered by caller's league */
  async getGlobalLeaderboard(characterId: string, limit = 50) {
    // Resolve league from the requesting character
    const char = await this.characterRepo.findOne({
      where: { id: characterId },
      select: ['id', 'leagueId'],
    });

    // Use denormalized leagueId on dojo_records - no JOIN with characters needed
    const where: any = {};
    if (char?.leagueId) {
      where.leagueId = char.leagueId;
    }

    const records = await this.dojoRecordRepo.find({
      where,
      order: { bestDamage: 'DESC' },
      take: limit,
    });

    return {
      leaderboard: records.map((r, i) => ({
        rank: i + 1,
        characterId: r.characterId,
        nickname: r.nickname,
        classId: r.classId,
        skinId: r.skinId,
        level: r.level,
        bestDamage: r.bestDamage,
        telegramUsername: r.telegramUsername || null,
        isSelf: r.characterId === characterId,
      })),
    };
  }

  private async validateOwnership(telegramId: string, characterId: string) {
    const char = await this.characterRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
      select: ['id'],
    });
    if (!char) {
      throw new ForbiddenException('Character not owned by you');
    }
  }
}
