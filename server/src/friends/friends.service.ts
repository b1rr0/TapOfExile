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
      select: ['id', 'nickname', 'classId', 'skinId', 'level'],
      take: 20,
    });

    return chars;
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
      relations: ['requester'],
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
      select: [
        'id', 'nickname', 'classId', 'skinId', 'level',
        'tapDamage', 'critChance', 'critMultiplier', 'dodgeChance',
        'hp', 'maxHp', 'dojoBestDamage',
      ],
    });
    if (!friendChar) {
      throw new NotFoundException('Character not found');
    }

    const slots = await this.equipSlotRepo.find({
      where: { characterId: friendCharacterId },
      relations: ['item'],
    });

    return {
      character: friendChar,
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

  /** Submit dojo best damage — upsert into denormalized dojo_records */
  async submitDojo(
    telegramId: string,
    characterId: string,
    totalDamage: number,
  ) {
    const char = await this.characterRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
      select: ['id', 'playerTelegramId', 'nickname', 'classId', 'skinId', 'level', 'dojoBestDamage'],
    });
    if (!char) {
      throw new ForbiddenException('Character not owned by you');
    }

    // Also update Character.dojoBestDamage for backward compat
    if (totalDamage > char.dojoBestDamage) {
      char.dojoBestDamage = totalDamage;
      await this.characterRepo.save(char);
    }

    // Upsert denormalized record
    let record = await this.dojoRecordRepo.findOne({
      where: { characterId },
    });

    if (!record) {
      record = this.dojoRecordRepo.create({
        characterId,
        playerTelegramId: char.playerTelegramId,
        nickname: char.nickname,
        classId: char.classId,
        skinId: char.skinId,
        level: char.level,
        bestDamage: totalDamage,
      });
      await this.dojoRecordRepo.save(record);
    } else {
      // Always update denormalized fields
      record.nickname = char.nickname;
      record.classId = char.classId;
      record.skinId = char.skinId;
      record.level = char.level;
      if (totalDamage > record.bestDamage) {
        record.bestDamage = totalDamage;
      }
      await this.dojoRecordRepo.save(record);
    }

    return { bestDamage: record.bestDamage };
  }

  /** Friends dojo leaderboard: self + friends from dojo_records (no extra JOINs) */
  async getDojoLeaderboard(telegramId: string, characterId: string) {
    await this.validateOwnership(telegramId, characterId);

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

    // Single query on denormalized table — no JOINs
    const records = await this.dojoRecordRepo.find({
      where: { characterId: In(charIds) },
      order: { bestDamage: 'DESC' },
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
        isSelf: r.characterId === characterId,
      })),
    };
  }

  /** Global dojo leaderboard: top N from dojo_records */
  async getGlobalLeaderboard(characterId: string, limit = 50) {
    const records = await this.dojoRecordRepo.find({
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
