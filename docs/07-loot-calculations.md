# Расчёт выпадения наград (Loot)

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `shared/endgame-maps.ts` | `rollMapDrops()` — основная логика дропа |
| `server/src/loot/loot.service.ts` | Обёртка: вызов rollMapDrops + bag management |
| `shared/balance.ts` | Константы баланса наград за монстров |
| `server/src/combat/combat.service.ts` | Вызов loot при complete |

## Drop Settings (shared/endgame-maps.ts)

### Обычные карты (Regular Maps)

```
60% → Ключ того же тира
20% → Ключ тира+1 (cap: MAX_TIER=10)
 5% → Boss ключ (только если tier >= 5)
```

- Tier+1 срабатывает только если same-tier не выпал
- Boss ключ — random boss из 8

### Босс-карты (Boss Maps)

```
Гарантированно: 1-2 обычных ключа (tier 5-8)
  - Тир: Math.random() * (max-min) + min
30% → Бонусный ключ тира+1
 5% → Boss ключ (tier 3, random boss)
```

## Boss Key Tier Selection (pickBossKeyTier)

| Источник | Boss Key Tier |
|----------|---------------|
| Boss maps | Всегда tier 3 (Mythic) |
| Regular tier 9-10 | Tier 3 (Mythic) |
| Regular tier 7-8 | Tier 2 (Empowered) |
| Regular tier 5-6 | Tier 1 (Standard) |

## Качество ключей по тиру (tierQuality)

| Map Tier | Качество |
|----------|----------|
| 1-3 | common |
| 4-6 | rare |
| 7-9 | epic |
| 10 | legendary |

## Структура дропнутого ключа

### Map Key:

```typescript
{
  id: `map_t${tier}_${timestamp}_${random}`,
  name: `Tier ${tier} Map`,
  type: "map_key",
  tier: number,
  quality: "common" | "rare" | "epic" | "legendary",
  level: tier,
  icon: "🗺️",
  acquiredAt: Date.now()
}
```

### Boss Key:

```typescript
{
  id: `bosskey_${bossId}_t${bossKeyTier}_${timestamp}_${random}`,
  name: "{Boss Name}",
  type: "boss_map_key",
  bossId: string,
  bossKeyTier: 1 | 2 | 3,
  quality: "boss_silver" | "boss_gold" | "boss_red",
  level: bossKeyTier,
  icon: "{boss emoji}",
  acquiredAt: Date.now()
}
```

## Bag Management (loot.service.ts)

- **Max bag size: 32 items**
- При переполнении — самые старые предметы вытесняются (FIFO)
- `addItemsToBag()` персистит в БД

## Награды за монстров (balance.ts)

### Location-Based (Story Mode)

| Order | Gold | XP |
|-------|------|----|
| 1 | 60 | 40 |
| 2 | 100 | 65 |
| 3 | 140 | 95 |
| 4 | 190 | 130 |
| 5 | 260 | 180 |
| 6 | 350 | 240 |
| 7 | 450 | 320 |
| 8 | 600 | 450 |
| 9 | 300 | 220 |
| 10 | 420 | 300 |

Эти значения умножаются на rarity mul и tier/act mul.

### XP Progression (Leveling)

```
xpToNext = Math.floor(XP_BASE * XP_GROWTH^(level-1))
         = Math.floor(100 * 1.3^(level-1))
```

## Endgame Unlock

Открывается после прохождения всех 5 актов (8+ локаций в каждом).

Стартовый набор:
- 3 ключа Tier 1 (`B.ENDGAME_STARTER_KEYS = 3, ENDGAME_STARTER_TIER = 1`)

## Pipeline дропа

```
1. Combat complete                          → combat.service.ts
2. Если endgame: rollMapDrops(tier, isBoss) → shared/endgame-maps.ts
3. Дропы → loot.service.addItemsToBag()     → DB persist
4. Ответ клиенту: mapDrops[]               → BagItem[]
5. FE: state.bag.push(...mapDrops)          → state.ts
6. FE: Victory scene показывает дропы       → victory-scene.ts
```

## Ключевые формулы резюме

```
Monster Gold = baseGold * rarityMul * tierGoldMul (или actMul для story)
Monster XP   = baseXp   * rarityMul * tierXpMul
Map Drop     = rollMapDrops(tier, isBoss, direction)
Boss Key Tier = f(source tier): 5-6→1, 7-8→2, 9-10→3, boss→3
Key Quality  = f(tier): 1-3→common, 4-6→rare, 7-9→epic, 10→legendary
```
