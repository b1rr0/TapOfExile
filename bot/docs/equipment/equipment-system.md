# Equipment System - Game Design Document

## Overview

Система экипировки в стиле PoE (упрощённая). Каждый предмет - объект с типом, редкостью, уровнем и набором случайных статов.

---

## Типы экипировки (Equipment Slots)

| Slot          | Код           | Описание                          |
|---------------|---------------|-----------------------------------|
| One-Hand      | `one_hand`    | Одноручное оружие (меч, топор, жезл) |
| Two-Hand      | `two_hand`    | Двуручное оружие (лук, посох, двуручный меч) |
| Helmet        | `helmet`      | Шлем                              |
| Amulet        | `amulet`      | Амулет (ожерелье)                 |
| Armor         | `armor`       | Нагрудник / броня                 |
| Ring          | `ring`        | Кольцо (2 слота: left_ring, right_ring) |
| Gloves        | `gloves`      | Перчатки                          |
| Belt          | `belt`        | Пояс                              |
| Boots         | `boots`       | Ботинки                           |

---

## Редкость (Rarity)

| Rarity    | Цвет        | Hex       | Кол-во статов | Drop weight |
|-----------|-------------|-----------|---------------|-------------|
| Common    | Серый       | `#9d9d9d` | 1-2           | 60%         |
| Rare      | Синий       | `#4488ff` | 2-3           | 25%         |
| Epic      | Фиолетовый | `#a335ee` | 3-4           | 12%         |
| Legendary | Оранжевый  | `#ff8000` | 4-6           | 3%          |

Чем выше редкость - тем больше статов у предмета и тем шире диапазон их значений.

---

## Уровень предмета (Item Level) и требования

### Item Level (iLvl): 0 - 100

Уровень предмета определяет силу его статов. Чем выше iLvl, тем выше потолок значений.

### Required Level (reqLvl): 0 - 75

Уровень персонажа, с которого можно надеть предмет.

### Формула reqLvl от iLvl

```
reqLvl = Math.floor(iLvl * 0.75)
```

| Item Level (iLvl) | Required Level (reqLvl) |
|--------------------|------------------------|
| 1                  | 0                      |
| 10                 | 7                      |
| 20                 | 15                     |
| 30                 | 22                     |
| 40                 | 30                     |
| 50                 | 37                     |
| 60                 | 45                     |
| 70                 | 52                     |
| 80                 | 60                     |
| 90                 | 67                     |
| 100                | 75                     |

---

## Система статов (Stat Tiers)

Статы предмета определяются **тирами (tiers)**. Тир зависит от iLvl предмета.

### Тиры по iLvl

| Tier | iLvl диапазон | Описание        |
|------|---------------|-----------------|
| T5   | 1 - 19        | Начальный       |
| T4   | 20 - 39       | Средний         |
| T3   | 40 - 59       | Продвинутый     |
| T2   | 60 - 79       | Мастерский      |
| T1   | 80 - 100      | Легендарный     |

### Принцип масштабирования

- **Минимальное значение стата - одинаковое для всех тиров** (floor не растёт)
- **Максимальное значение растёт с тиром** (потолок поднимается)
- Это значит: iLvl 10 шмотка МОЖЕТ выпасть с минимальным статом, но НИКОГДА с топовым
- iLvl 100 шмотка тоже может выпасть с минимумом, но имеет шанс на максимум

### Пример масштабирования (Flat Physical Damage)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 1    | 8    |
| T4   | 20 - 39   | 1    | 18   |
| T3   | 40 - 59   | 1    | 35   |
| T2   | 60 - 79   | 1    | 60   |
| T1   | 80 - 100  | 1    | 100  |

---

## Категории статов

### Offensive (Атака)

| Stat ID              | Название                   | Единица | Описание                              |
|----------------------|----------------------------|---------|---------------------------------------|
| `flat_phys_dmg`      | Flat Physical Damage       | +N      | Плоский физ. урон к атаке             |
| `pct_phys_dmg`       | % Physical Damage          | +N%     | Процентный бонус к физ. урону         |
| `flat_fire_dmg`      | Flat Fire Damage           | +N      | Плоский урон огнём                    |
| `flat_cold_dmg`      | Flat Cold Damage           | +N      | Плоский урон холодом                  |
| `flat_lightning_dmg`  | Flat Lightning Damage     | +N      | Плоский урон молнией                  |
| `crit_chance`        | Critical Strike Chance     | +N%     | Шанс критического удара              |
| `crit_multiplier`    | Critical Strike Multiplier | +N%     | Множитель крит. удара                 |
| `attack_speed`       | Attack Speed               | +N%     | Скорость атаки                        |

### Defensive (Защита)

| Stat ID              | Название                   | Единица | Описание                              |
|----------------------|----------------------------|---------|---------------------------------------|
| `flat_hp`            | Flat Life                  | +N      | Плоское здоровье                      |
| `pct_hp`             | % Increased Life           | +N%     | Процентный бонус к здоровью           |
| `flat_armor`         | Flat Armour                | +N      | Плоская броня                         |
| `pct_armor`          | % Increased Armour         | +N%     | Процентный бонус к броне              |
| `flat_evasion`       | Flat Evasion               | +N      | Плоское уклонение                     |
| `pct_evasion`        | % Increased Evasion        | +N%     | Процентный бонус к уклонению          |
| `flat_energy_shield` | Flat Energy Shield         | +N      | Плоский энергощит                     |
| `pct_energy_shield`  | % Increased Energy Shield  | +N%     | Процентный бонус к энергощиту         |
| `block_chance`       | Block Chance               | +N%     | Шанс блока                            |

### Utility (Общие)

| Stat ID              | Название                   | Единица | Описание                              |
|----------------------|----------------------------|---------|---------------------------------------|
| `move_speed`         | Movement Speed             | +N%     | Скорость передвижения                 |
| `gold_find`          | Gold Find                  | +N%     | Бонус к нахождению золота             |
| `xp_bonus`           | Experience Bonus           | +N%     | Бонус к получаемому опыту             |
| `life_regen`         | Life Regeneration          | +N/s    | Регенерация здоровья в секунду        |
| `life_on_hit`        | Life on Hit                | +N      | Восстановление HP за удар             |
| `passive_dps_bonus`  | Passive DPS Bonus          | +N%     | Бонус к пассивному урону              |

---

## Какие статы доступны каждому типу экипировки

| Stat / Slot         | One-Hand | Two-Hand | Helmet | Amulet | Armor | Ring | Gloves | Belt | Boots |
|---------------------|----------|----------|--------|--------|-------|------|--------|------|-------|
| flat_phys_dmg       | +        | +        |        |        |       |      |        |      |       |
| pct_phys_dmg        | +        | +        |        | +      |       | +    | +      |      |       |
| flat_fire_dmg       | +        | +        |        | +      |       | +    |        |      |       |
| flat_cold_dmg       | +        | +        |        | +      |       | +    |        |      |       |
| flat_lightning_dmg  | +        | +        |        | +      |       | +    |        |      |       |
| crit_chance         | +        | +        |        | +      |       | +    | +      |      |       |
| crit_multiplier     | +        | +        |        | +      |       | +    |        |      |       |
| attack_speed        | +        | +        |        |        |       |      | +      |      |       |
| flat_hp             |          |          | +      | +      | +     | +    |        | +    | +     |
| pct_hp              |          |          | +      | +      | +     | +    |        | +    |       |
| flat_armor          |          |          | +      |        | +     |      | +      | +    | +     |
| pct_armor           |          |          | +      |        | +     |      |        |      |       |
| flat_evasion        |          |          | +      |        | +     |      | +      |      | +     |
| pct_evasion         |          |          | +      |        | +     |      |        |      |       |
| flat_energy_shield  |          |          | +      |        | +     |      | +      |      | +     |
| pct_energy_shield   |          |          | +      |        | +     |      |        |      |       |
| block_chance        | +        |          |        |        |       |      |        |      |       |
| move_speed          |          |          |        |        |       |      |        |      | +     |
| gold_find           |          |          |        | +      |       | +    |        | +    |       |
| xp_bonus            |          |          | +      | +      |       | +    |        |      |       |
| life_regen          |          |          |        | +      | +     | +    |        | +    |       |
| life_on_hit         | +        | +        |        |        |       | +    | +      |      |       |
| passive_dps_bonus   |          |          |        | +      |       | +    |        |      |       |

---

## OOP Структура предмета

```javascript
class Equipment {
  constructor({ type, rarity, itemLevel }) {
    this.id = generateId();
    this.type = type;           // 'one_hand' | 'two_hand' | 'helmet' | ...
    this.rarity = rarity;       // 'common' | 'rare' | 'epic' | 'legendary'
    this.itemLevel = itemLevel; // 0-100
    this.reqLevel = Math.floor(itemLevel * 0.75); // 0-75
    this.stats = [];            // [{ id: 'flat_phys_dmg', value: 15 }, ...]
    this.name = '';             // Генерируемое название
  }
}
```

### Генерация статов

```javascript
// 1. Определяем кол-во статов по редкости
const statCount = rollStatCount(this.rarity);

// 2. Берём пул доступных статов для данного типа экипировки
const pool = STAT_POOLS[this.type];

// 3. Рандомно выбираем N статов без повторений
const selectedStats = pickRandom(pool, statCount);

// 4. Для каждого стата определяем тир по iLvl и роллим значение
for (const statId of selectedStats) {
  const tier = getTierByLevel(this.itemLevel);
  const { min, max } = STAT_RANGES[statId][tier];
  const value = randomInt(min, max);
  this.stats.push({ id: statId, value });
}
```

---

## Документация по типам

Каждый тип экипировки описан в отдельном файле:

- [One-Hand Weapons](./one-hand-weapons.md)
- [Two-Hand Weapons](./two-hand-weapons.md)
- [Helmets](./helmets.md)
- [Amulets](./amulets.md)
- [Armor](./armor.md)
- [Rings](./rings.md)
- [Gloves](./gloves.md)
- [Belts](./belts.md)
- [Boots](./boots.md)
