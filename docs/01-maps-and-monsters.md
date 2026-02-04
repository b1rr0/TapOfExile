# Карты и Монстры

## Общая архитектура

Боевая система **server-authoritative** — все расчёты (урон, HP, награды) делаются на бекенде. Фронтенд — только отображение.

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `shared/endgame-maps.ts` | Определения тиров, боссов, волн, дроп-логика |
| `server/src/level-gen/level-gen.service.ts` | Генерация монстров и очереди |
| `server/src/level-gen/monster-types.ts` | Типы монстров и множители редкости |
| `server/src/combat/combat.service.ts` | Управление сессиями боя, обработка тапов |
| `server/src/combat/combat.controller.ts` | REST эндпоинты боя |
| `bot/src/scenes/map-device-scene.ts` | UI выбора карт |
| `bot/src/scenes/combat-scene.ts` | UI боя |
| `bot/src/game/combat.ts` | FE менеджер боя (CombatManager) |

## Тиры карт (MAP_TIERS)

10 тиров с экспоненциальным скейлингом. Определены в `shared/endgame-maps.ts`.

| Тир | HP мн. | Gold мн. | XP мн. |
|-----|--------|----------|--------|
| 1   | 1.0    | 1.0      | 1.0    |
| 2   | 1.5    | 1.4      | 1.3    |
| 3   | 2.2    | 1.9      | 1.7    |
| 4   | 3.2    | 2.5      | 2.2    |
| 5   | 4.5    | 3.2      | 2.8    |
| 6   | 6.5    | 4.2      | 3.5    |
| 7   | 9.0    | 5.5      | 4.5    |
| 8   | 13.0   | 7.2      | 5.8    |
| 9   | 18.0   | 9.5      | 7.5    |
| 10  | 25.0   | 13.0     | 10.0   |

## Волновые шаблоны (Wave Templates)

5 брекетов (по 2 тира каждый), определяют состав монстров в волнах:

- **Bracket 0** (Tiers 1-2): Common монстры (Ronin, Oni, Tengu)
- **Bracket 1** (Tiers 3-4): Rare и Epic монстры
- **Bracket 2** (Tiers 5-6): Больше Epic
- **Bracket 3** (Tiers 7-8): Появляются Boss-rarity монстры
- **Bracket 4** (Tiers 9-10): Максимум сложности, много Boss-rarity

## Боссы (BOSS_MAPS)

8 боссов с уникальными множителями:

| Босс | HP мн. | Gold мн. | XP мн. |
|------|--------|----------|--------|
| Shadow Shogun | 8.0 | 10.0 | 8.0 |
| Ancient Dragon | 10.0 | 12.0 | 10.0 |
| Demon Oni | 7.0 | 9.0 | 7.0 |
| Wind Tengu | 9.0 | 11.0 | 9.0 |
| Phantom Ronin | 6.0 | 8.0 | 6.0 |
| Forest Guardian | 7.5 | 9.5 | 7.5 |
| Beast King | 6.5 | 8.5 | 6.5 |
| Bandit Lord | 5.5 | 7.5 | 5.5 |

Каждый босс имеет 2 trash-волны + boss-монстр.

### Boss Key Tiers (3 уровня сложности)

| Тир | Название | Качество | HP | Gold | XP |
|-----|----------|----------|----|------|----|
| 1 | Standard | boss_silver | 1.0x | 1.0x | 1.0x |
| 2 | Empowered | boss_gold | 1.8x | 2.0x | 1.8x |
| 3 | Mythic | boss_red | 3.0x | 3.5x | 3.0x |

## Генерация монстров (level-gen.service.ts)

### Story Mode (`createMonsterForLocation`)

```
HP   = 10 * 1.5^(order-1) * rarityMul * 2.5^(act-1) * ±15%
Gold = 3  * 1.35^(order-1) * rarityMul * 2.5^(act-1)
XP   = 5  * 1.3^(order-1)  * rarityMul * 2.5^(act-1)
```

### Map Mode (`createMonsterForMap`)

```
HP   = 10 * 1.5^9 * rarityMul * 2.5^4 * tierHpMul
Gold = 3  * 1.35^9 * rarityMul * 2.5^4 * tierGoldMul
XP   = 5  * 1.3^9  * rarityMul * 2.5^4 * tierXpMul
```

Где `BASE_ORDER=10`, `BASE_ACT=5` — фиксированная точка отсчёта, а `tierMul` берётся из определения тира.

### Множители редкости (monster-types.ts)

| Редкость | HP мн. | Gold мн. | XP мн. |
|----------|--------|----------|--------|
| Common | 1.0 | 1.0 | 1.0 |
| Rare | 1.6 | 1.5 | 1.4 |
| Epic | 2.5 | 2.2 | 2.0 |
| Boss | 4.0 | 3.5 | 3.0 |

### Типы монстров (8 типов)

| Тип | minStage | Тип | minStage |
|-----|----------|-----|----------|
| Bandit | 1 | Oni | 8 |
| Wild Boar | 1 | Tengu | 12 |
| Forest Spirit | 3 | Dragon | 15 |
| Ronin | 5 | Shogun | 20 |

## Очередь монстров (buildMonsterQueue)

Берёт Wave definitions, раскрывает в массив индивидуальных монстров:

```
for each wave → for each spawn → for i in 0..count → create monster → push to queue
```

Хранится в Redis: `{ monsterQueue, currentIndex, ... }` с TTL 30 минут.

## FE → BE Flow

```
1. Игрок выбирает ключ карты     → map-device-scene.ts
2. Выбирает направление (boss)   → 8 карточек боссов
3. FE: api.combat.startMap()      → POST /combat/start-map
4. BE: проверяет ключ, строит     → Удаляет ключ из сумки
   очередь, создаёт Redis сессию  → Возвращает sessionId + первого монстра
5. FE: рендерит монстра           → combat-scene.ts
6. FE: api.combat.tap(sessionId)  → POST /combat/tap (повторяется)
7. BE: считает урон, обновляет HP → Возвращает damage, isCrit, killed, nextMonster
8. При killed=true: FE анимация   → 1200ms задержка на спавн
9. Все мертвы → api.complete()    → POST /combat/complete
10. BE: начисляет gold/xp/drops   → Возвращает итоги
11. FE: Victory screen            → Показывает дропы
```
