# Boots (Ботинки)

**Slot:** `boots`
**Описание:** Ботинки - единственный слот с movement speed. Также дают оборонительные статы (HP, броня, уклонение, ES). Movement speed - ключевой стат для фарма.

---

## Подтипы

| Подтип                       | Код             | Особенность                       |
|------------------------------|-----------------|-----------------------------------|
| Plate Boots (Латные)         | `boot_plate`   | Броня, HP                         |
| Leather Boots (Кожаные)      | `boot_leather` | Уклонение, move speed             |
| Silk Shoes (Шёлковые)        | `boot_silk`    | Энергощит                          |
| Chain Boots (Кольчужные)     | `boot_chain`   | Броня + Уклонение (гибрид)        |

---

## Базовая защита (implicit)

| Tier | iLvl      | Base Armour | Base Evasion | Base ES |
|------|-----------|-------------|--------------|---------|
| T5   | 1 - 19    | 3 - 8       | 2 - 6        | 1 - 4   |
| T4   | 20 - 39   | 8 - 18      | 5 - 12       | 3 - 9   |
| T3   | 40 - 59   | 16 - 32     | 10 - 22      | 7 - 16  |
| T2   | 60 - 79   | 28 - 52     | 18 - 36      | 12 - 28 |
| T1   | 80 - 100  | 45 - 80     | 30 - 55      | 22 - 42 |

---

## Доступные статы и диапазоны

### Movement Speed (`move_speed`)
**Эксклюзивный стат ботинок.** Увеличивает скорость передвижения.

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 5%  | 10%  |
| T4   | 20 - 39   | 5%  | 15%  |
| T3   | 40 - 59   | 5%  | 20%  |
| T2   | 60 - 79   | 5%  | 28%  |
| T1   | 80 - 100  | 5%  | 35%  |

### Flat Life (`flat_hp`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 4   | 16  |
| T4   | 20 - 39   | 4   | 32  |
| T3   | 40 - 59   | 4   | 55  |
| T2   | 60 - 79   | 4   | 80  |
| T1   | 80 - 100  | 4   | 112 |

### Flat Armour (`flat_armor`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 2   | 10  |
| T4   | 20 - 39   | 2   | 22  |
| T3   | 40 - 59   | 2   | 40  |
| T2   | 60 - 79   | 2   | 62  |
| T1   | 80 - 100  | 2   | 90  |

### Flat Evasion (`flat_evasion`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 2   | 8   |
| T4   | 20 - 39   | 2   | 18  |
| T3   | 40 - 59   | 2   | 32  |
| T2   | 60 - 79   | 2   | 50  |
| T1   | 80 - 100  | 2   | 72  |

### Flat Energy Shield (`flat_energy_shield`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 5   |
| T4   | 20 - 39   | 1   | 12  |
| T3   | 40 - 59   | 1   | 22  |
| T2   | 60 - 79   | 1   | 35  |
| T1   | 80 - 100  | 1   | 50  |

---

## Пример генерации

**iLvl 10, Common Leather Boots:**
```
Worn Shoes (Boots - Leather)
Item Level: 10 | Required Level: 7
Rarity: Common

Base Evasion: 4
---
+ 8% Movement Speed
+ 10 Life
```

**iLvl 82, Epic Plate Boots:**
```
Ironclad Treads (Boots - Plate)
Item Level: 82 | Required Level: 61
Rarity: Epic

Base Armour: 62
---
+ 30% Movement Speed
+ 95 Life
+ 78 Armour
+ 60 Evasion
```

**iLvl 100, Legendary Silk Shoes:**
```
Voidwalkers (Boots - Silk)
Item Level: 100 | Required Level: 75
Rarity: Legendary

Base Energy Shield: 40
---
+ 35% Movement Speed
+ 108 Life
+ 48 Energy Shield
+ 68 Evasion
+ 82 Armour
```

---

## Заметка о Movement Speed

Movement Speed - один из самых ценных статов в игре. В PoE-подобных играх ботинки без move speed считаются слабыми, даже если остальные статы хорошие. При генерации лута рекомендуется:

- **Common:** 1 стат, высокий шанс что это move speed
- **Rare+:** move speed почти гарантирован как один из статов
- **Legendary:** move speed + полный набор защиты
