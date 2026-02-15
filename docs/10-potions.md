# Система зелий (Potions)

## Обзор

Зелья — первый consumable-предмет в игре. Пока реализованы **только зелья лечения** (красные).
Зелья падают после боя, хранятся в сумке (bag), экипируются в слоты Q/E, используются мгновенно в бою.

---

## Типы банок (Flask Types)

6 типов по возрастанию размера и силы хила. Чем больше банка — тем больше HP за глоток.

| # | Flask Type | Название | Хил за глоток (% maxHp) |
|---|-----------|----------|------------------------|
| 1 | `small_vial` | Small Vial | 8% |
| 2 | `round_flask` | Round Flask | 12% |
| 3 | `corked_flask` | Corked Flask | 16% |
| 4 | `tall_bottle` | Tall Bottle | 20% |
| 5 | `wide_bottle` | Wide Bottle | 24% |
| 6 | `jug` | Jug | 30% |

---

## Качество (Rarity) → Количество глотков

Качество зелья определяет **максимальное число зарядов** (глотков). Выпадает новое зелье — заряды = максимум.

| Качество | Цвет рамки | Макс. зарядов |
|----------|-----------|---------------|
| common | серый | 2 |
| rare | синий | 3 |
| epic | жёлтый | 4 |
| legendary | оранжевый | 5 |

### Пример

> **Wide Bottle (epic)** = 4 глотка × 24% maxHp = суммарно 96% maxHp за зелье

---

## Спрайты

Путь: `/assets/potions/{flaskType}/red_{currentCharges}.png`

- Размер: 16×16 px
- Цвет: `red` (для хилок)
- Файлы: `red_1.png` ... `red_5.png` — показывают уровень заполнения
- Если зарядов 0 — слот отображается пустым

---

## Механика хила

- **Мгновенное** — нажал кнопку → HP восстановился
- `healAmount = floor(playerMaxHp × healPercent)`
- HP ограничен `playerMaxHp` (не может превышать максимум)
- **Server-authoritative** — хил считается на сервере, клиент отображает результат
- Заряды уменьшаются на 1 за использование
- Когда заряды = 0 → зелье считается использованным (слот пуст)

---

## Система дропа

### Когда падают зелья

Зелья могут выпасть после **любого** успешного боя:
- ✅ Locations (story mode, акты 1–5)
- ✅ Endgame Maps (тиры 1–10)
- ✅ Boss Maps

За один бой может выпасть **0 или 1** зелье (бинарный ролл).

### Дроп по актам (Story Mode)

| Акт | Шанс дропа | Доступные банки (веса) | Распределение качества |
|-----|-----------|----------------------|----------------------|
| 1 | 15% | small_vial (70), round_flask (30) | 80% common, 18% rare, 2% epic |
| 2 | 18% | small_vial (40), round_flask (40), corked_flask (20) | 70% common, 25% rare, 5% epic |
| 3 | 20% | round_flask (30), corked_flask (40), tall_bottle (30) | 55% common, 30% rare, 12% epic, 3% legendary |
| 4 | 22% | corked_flask (25), tall_bottle (40), wide_bottle (35) | 40% common, 35% rare, 18% epic, 7% legendary |
| 5 | 25% | tall_bottle (25), wide_bottle (40), jug (35) | 30% common, 35% rare, 25% epic, 10% legendary |

### Дроп по тирам карт (Endgame Maps)

| Тир карты | Шанс дропа | Доступные банки (веса) | Распределение качества |
|-----------|-----------|----------------------|----------------------|
| 1–2 | 20% | round_flask (30), corked_flask (40), tall_bottle (30) | 55% common, 30% rare, 12% epic, 3% legendary |
| 3–4 | 22% | corked_flask (25), tall_bottle (40), wide_bottle (35) | 40% common, 35% rare, 18% epic, 7% legendary |
| 5–6 | 25% | tall_bottle (20), wide_bottle (40), jug (40) | 30% common, 35% rare, 25% epic, 10% legendary |
| 7–8 | 28% | wide_bottle (40), jug (60) | 20% common, 35% rare, 30% epic, 15% legendary |
| 9–10 | 30% | wide_bottle (30), jug (70) | 10% common, 30% rare, 35% epic, 25% legendary |

### Дроп с босс-карт (Boss Maps)

| Шанс дропа | Доступные банки (веса) | Распределение качества |
|-----------|----------------------|----------------------|
| 40% | tall_bottle (15), wide_bottle (35), jug (50) | 10% common, 25% rare, 35% epic, 30% legendary |

---

## Хранение данных

### В сумке (BagItem)

Зелья хранятся как обычные `BagItem` с дополнительными полями:

```
type:           'potion'
quality:        'common' | 'rare' | 'epic' | 'legendary'
flaskType:      'small_vial' | 'round_flask' | ... | 'jug'
maxCharges:     2–5 (определяется quality)
currentCharges: 2–5 (при создании = maxCharges)
healPercent:    0.08–0.30 (определяется flaskType)
icon:           'potion'
name:           "Small Vial" | "Round Flask" | ... | "Jug"
```

### В экипировке (Character.equipment)

Экипированное зелье хранится в JSONB поле `equipment` персонажа:

```typescript
{
  "consumable-1": {  // слот Q
    bagItemId: "potion_round_flask_1707123456_a1b2",
    flaskType: "round_flask",
    quality: "rare",
    maxCharges: 3,
    currentCharges: 2,  // уменьшается при использовании
    healPercent: 0.12
  },
  "consumable-2": null  // слот E — пустой
}
```

---

## Экипировка

### Слоты

Два слота для consumable: `consumable-1` (Q) и `consumable-2` (E).

### API

```
POST /loot/equip-potion   { bagItemId, slot }
  → Переносит зелье из сумки в слот экипировки
  → Нельзя во время активного боя

POST /loot/unequip-potion { slot }
  → Возвращает зелье из экипировки в сумку (с текущими зарядами)
  → Нельзя во время активного боя
```

---

## Использование в бою

### WebSocket Events

```
→ Client sends:   'combat:use-potion'  { sessionId, slot }
← Server responds: 'combat:potion-used' { slot, healAmount, playerHp, playerMaxHp, remainingCharges, maxCharges }
```

### Серверная логика

1. Получить session из Redis
2. Проверить: игрок жив, сессия его
3. Загрузить `Character.equipment[slot]`
4. Проверить `currentCharges > 0`
5. `healAmount = floor(playerMaxHp × healPercent)`
6. `playerCurrentHp = min(playerMaxHp, playerCurrentHp + healAmount)`
7. `currentCharges--`
8. Сохранить character + Redis session
9. Вернуть результат клиенту

### UI в бою

- Кнопки Q / E в `action-bar` боевой сцены
- Показывают спрайт зелья + счётчик зарядов (`"2/3"`)
- По клику → `combat:use-potion` (с `e.stopPropagation()` чтобы не триггерить тап-атаку)
- Зелёный floating `+{healAmount}` при использовании (эффект хила)
- При 0 зарядов — кнопка неактивна, показывает пустой слот

---

## Pipeline дропа

```
1. Бой завершён успешно            → combat.service.ts:completeSession()
2. Определить конфиг дропа:
   - location → LOCATION_POTION_DROPS[act]
   - map      → getMapPotionDropConfig(tier)
   - boss_map → BOSS_MAP_POTION_DROP
3. rollPotionDrop(config)           → shared/potion-drops.ts
4. Если выпало → addItemsToBag()   → loot.service.ts → DB
5. Включить в ответ клиенту        → mapDrops[]
6. FE: показать в Victory экране   → victory-scene.ts
```

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `shared/potion-drops.ts` | Дефиниции банок, дроп-таблицы, `rollPotionDrop()` |
| `shared/types.ts` | `BagItemData` с potion-полями |
| `server/src/shared/entities/bag-item.entity.ts` | Колонки flaskType, maxCharges, currentCharges, healPercent |
| `server/src/loot/loot.service.ts` | Методы `rollLocationPotionDrop()`, `rollMapPotionDrop()` |
| `server/src/loot/loot.controller.ts` | Эндпоинты equip/unequip |
| `server/src/combat/combat.service.ts` | `usePotion()` + дроп в `completeSession()` |
| `server/src/combat/combat.gateway.ts` | Event `combat:use-potion` |
| `bot/src/scenes/combat-scene.ts` | UI кнопок Q/E |
| `bot/src/ui/equipment.ts` | Рендер зелий в equipment |
