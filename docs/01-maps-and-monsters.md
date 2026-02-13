# Карты и Монстры

## Общая архитектура

Боевая система **server-authoritative** — все расчёты (урон, HP, награды) делаются на бекенде через **WebSocket** (Socket.IO, namespace `/combat`). Фронтенд — только отображение.

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `shared/endgame-maps.ts` | Определения тиров, боссов, волн, дроп-логика |
| `shared/monster-attacks.ts` | 8 типов монстров × 5 атак, weighted random |
| `shared/balance.ts` | Все числовые константы баланса (`B`) |
| `server/src/level-gen/level-gen.service.ts` | Генерация монстров и очереди |
| `server/src/level-gen/monster-types.ts` | Типы монстров, рарити, сопротивления |
| `server/src/combat/combat.gateway.ts` | WebSocket gateway (namespace `/combat`) |
| `server/src/combat/combat.service.ts` | Server-authoritative боевая логика |
| `server/src/combat/elemental-damage.ts` | Расчёт элементального урона |
| `bot/src/scenes/map-scene.ts` | UI выбора локаций (5 актов × 10 локаций) |
| `bot/src/scenes/map-device-scene.ts` | UI выбора endgame карт |
| `bot/src/scenes/combat-scene.ts` | UI боя |
| `bot/src/game/combat.ts` | FE менеджер боя (CombatManager) |

---

## Story Mode (5 актов × 10 локаций)

Каждый акт — 10 локаций (orders 1-10). Orders 1-8 — основная цепочка, 9-10 — боковые ветки.

### Правила доступа к локациям

- Акт 1, Order 1 — всегда доступна
- Пройденные локации — всегда можно перепройти
- Переход между актами: предыдущий акт нуждается в >= 8 пройденных main-chain локаций
- Внутри акта, порядок открытия: `REQUIREMENT_ORDER = [0,1,2,3,4,5,6,7,3,5]`
  - Order N требует `REQUIREMENT[N-1]` для открытия
  - Пример: Order 9 требует Order 3, Order 10 требует Order 5

### Уровень монстра

```
monsterLevel = (act - 1) * 10 + order
```

Диапазон: 1 (Act 1 Order 1) — 50 (Act 5 Order 10).

### Формулы скейлинга (Story Mode)

```
actMul = ACT_SCALING_BASE ^ (act - 1)     // 2.5^(act-1)

HP     = MONSTER_HP_BASE   * HP_GROWTH^(order-1)   * rarity.hpMul   * actMul * [1 ± HP_RANDOM]
Gold   = MONSTER_GOLD_BASE * GOLD_GROWTH^(order-1)  * rarity.goldMul * actMul
XP     = MONSTER_XP_BASE   * XP_GROWTH^(order-1)    * rarity.xpMul   * actMul
Damage = MONSTER_DMG_BASE  * DMG_GROWTH^(order-1)   * RARITY_DMG_MUL * actMul * [1 ± DMG_RANDOM]
```

### Текущие значения баланса

| Константа | Значение |
|-----------|----------|
| `ACT_SCALING_BASE` | 2.5 |
| `MONSTER_HP_BASE` | 10 |
| `MONSTER_HP_GROWTH` | 1.5 |
| `MONSTER_HP_RANDOM` | 0.15 (±15%) |
| `MONSTER_GOLD_BASE` | 3 |
| `MONSTER_GOLD_GROWTH` | 1.35 |
| `MONSTER_XP_BASE` | 5 |
| `MONSTER_XP_GROWTH` | 1.3 |
| `MONSTER_DMG_BASE` | 3 |
| `MONSTER_DMG_GROWTH` | 1.4 |
| `MONSTER_DMG_RANDOM` | 0.10 (±10%) |

### Награды за локацию (база, до act scaling)

| Order | Gold | XP  | Тип |
|-------|------|-----|-----|
| 1     | 60   | 40  | Main chain |
| 2     | 100  | 65  | Main chain |
| 3     | 140  | 95  | Main chain |
| 4     | 190  | 130 | Main chain |
| 5     | 260  | 180 | Main chain |
| 6     | 350  | 240 | Main chain |
| 7     | 450  | 320 | Main chain |
| 8     | 600  | 450 | Main chain |
| 9     | 300  | 220 | Side branch |
| 10    | 420  | 300 | Side branch |

---

## Endgame карты (Tier 1-10)

Открываются после прохождения всех 5 актов (>= 8 main-chain локаций в каждом).

### Тиры карт (MAP_TIERS)

Используют Act 5 Order 10 как базовую точку (`MAP_BASE_ACT=5, MAP_BASE_ORDER=10`), умножают на tier:

| Тир | HP мн. | Gold мн. | XP мн. | Уровень монстра |
|-----|--------|----------|--------|-----------------|
| 1   | 1.0    | 1.0      | 1.0    | 41              |
| 2   | 1.5    | 1.4      | 1.3    | 42              |
| 3   | 2.2    | 1.9      | 1.7    | 44              |
| 4   | 3.2    | 2.5      | 2.2    | 45              |
| 5   | 4.5    | 3.2      | 2.8    | 46              |
| 6   | 6.5    | 4.2      | 3.5    | 47              |
| 7   | 9.0    | 5.5      | 4.5    | 48              |
| 8   | 13.0   | 7.2      | 5.8    | 50              |
| 9   | 18.0   | 9.5      | 7.5    | 51              |
| 10  | 25.0   | 13.0     | 10.0   | 52              |

Формула уровня: `40 + round(mapTier * 1.2)`

### Формулы скейлинга (Map Mode)

```
HP   = 10 * 1.5^9 * rarityMul * 2.5^4 * tierHpMul
Gold = 3  * 1.35^9 * rarityMul * 2.5^4 * tierGoldMul
XP   = 5  * 1.3^9  * rarityMul * 2.5^4 * tierXpMul
```

### Волновые шаблоны (Wave Templates)

| Диапазон тиров | Кол-во волн |
|----------------|-------------|
| 1-2            | 3           |
| 3-4            | 4           |
| 5-6            | 4           |
| 7-8            | 4           |
| 9-10           | 5           |

---

## Боссы (BOSS_MAPS) — 8 боссов

Каждый босс: 2 trash-волны + boss-монстр (3 волны).

| Босс | Тип | HP мн. | Gold мн. | XP мн. |
|------|-----|--------|----------|--------|
| Shadow Shogun's Domain | Shogun | 8.0 | 10.0 | 8.0 |
| Dragon's Eternal Lair | Dragon | 10.0 | 12.0 | 10.0 |
| Oni Warlord's Throne | Oni | 7.0 | 9.0 | 7.0 |
| Tengu Mountain Peak | Tengu | 9.0 | 11.0 | 9.0 |
| Ronin's Haunted Dojo | Ronin | 6.0 | 8.0 | 6.0 |
| Spirit of the Ancient Wood | Forest Spirit | 7.5 | 9.5 | 7.5 |
| The Beast King's Arena | Wild Boar | 6.5 | 8.5 | 6.5 |
| Bandit Lord's Fortress | Bandit | 5.5 | 7.5 | 5.5 |

### Boss Key Tiers (3 уровня сложности)

| Тир | Название | Качество | HP | Gold | XP |
|-----|----------|----------|----|------|----|
| 1 | Standard | boss_silver | 1.0x | 1.0x | 1.0x |
| 2 | Empowered | boss_gold | 1.8x | 2.0x | 1.8x |
| 3 | Mythic | boss_red | 3.0x | 3.5x | 3.0x |

Выбор тира boss key при дропе:
- Карты тир 5-6 → boss_tier 1
- Карты тир 7-8 → boss_tier 2
- Карты тир 9-10 → boss_tier 3
- Boss-карты → всегда boss_tier 3

---

## Типы монстров (8)

| Тип | Базовые сопротивления | Основной элемент |
|-----|----------------------|------------------|
| Bandit | Physical | Physical |
| Wild Boar | Physical | Physical |
| Forest Spirit | Cold | Cold + Pure |
| Ronin | Physical + Lightning | Physical + Lightning |
| Oni | Fire | Fire |
| Tengu | Lightning + Cold | Lightning |
| Dragon | Мульти-элемент | Fire + Pure |
| Shogun | Все элементы | Physical + Lightning + Pure |

Каждый тип имеет **5 уникальных атак** с разными элементальными сплитами, скоростью и весом.

### Множители редкости

| Редкость | HP мн. | Gold мн. | XP мн. | DMG мн. | Бонус сопротивлений |
|----------|--------|----------|--------|---------|---------------------|
| Common | 1.0 | 1.0 | 1.0 | 1.0 | +0% |
| Rare | 1.6 | 1.5 | 1.4 | 1.3 | +5% |
| Epic | 2.5 | 2.2 | 2.0 | 1.8 | +10% |
| Boss | 4.0 | 3.5 | 3.0 | 2.5 | +15% |

Resistance cap: **75%** на элемент.

---

## Элементальная система

### Элементы урона
`physical`, `fire`, `lightning`, `cold`, `pure`

Pure урон игнорирует все сопротивления.

### Расчёт урона

```
Для каждого элемента:
  fraction  = damageProfile[element]
  rawElem   = totalDamage * fraction
  resist    = target.resistance[element]   (0 для pure)
  effective = floor(rawElem * (1 - resist))

total = sum(effective)
Минимум 1 урона если rawDamage > 0
```

Дефолтный профиль: `{ physical: 1.0 }` — 100% физический.
Элементальные сплиты приходят из skill-tree нод, не из класса.

---

## Очередь монстров (buildMonsterQueue)

```
for each wave → for each spawn → for i in 0..count → create monster → push to queue
```

Хранится в Redis: `combat:session:{uuid}` с TTL 30 минут.

---

## FE → BE Flow (WebSocket)

```
1. Игрок выбирает локацию/ключ     → map-scene.ts / map-device-scene.ts
2. FE: preconnectSocket()           → начинает подключение Socket.IO
3. FE: emit "combat:start-location" → { locationId, waves, order, act }
   или "combat:start-map"          → { mapKeyItemId, direction? }
4. BE: валидация, buildMonsterQueue → Создаёт Redis-сессию
5. BE: emit "combat:started"        → { sessionId, currentMonster, playerHp }
6. FE: Entrance animation           → Loading run → monster entrance
7. FE: emit "combat:entrance-done"  → BE запускает combat loop (200ms tick)
8. FE: emit "combat:tap"            → { sessionId } (повторяется)
9. BE: processTap(), emit "tap-result" → { damage, isCrit, killed, playerHp }
10. BE: processEnemyTick (каждые 200ms) → emit "enemy-attack" → { attacks[], playerHp }
11. При killed: stopCombatLoop, ждёт entrance-done
12. Все мертвы → FE emit "combat:complete" → BE emit "combat:completed"
13. BE: начисляет gold/xp/drops     → Удаляет Redis-сессию
14. FE: Victory scene               → Показывает награды
```
