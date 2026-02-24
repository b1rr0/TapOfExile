# Gloves (Перчатки)

**Slot:** `gloves`
**Описание:** Перчатки - гибридный слот. Дают оборонительные статы (броня/уклонение/ES) и часть атакующих (крит шанс, % физ урон, life on hit). Уникальный микс атаки и защиты.

---

## Подтипы

| Подтип                      | Код              | Особенность                     |
|-----------------------------|------------------|---------------------------------|
| Gauntlets (Латные)          | `glov_gauntlet` | Броня, атака                    |
| Bracers (Наручи)            | `glov_bracer`   | Уклонение, крит                 |
| Wraps (Обмотки)             | `glov_wrap`     | Энергощит, крит                 |

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

### % Physical Damage (`pct_phys_dmg`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 2%  | 8%   |
| T4   | 20 - 39   | 2%  | 16%  |
| T3   | 40 - 59   | 2%  | 28%  |
| T2   | 60 - 79   | 2%  | 42%  |
| T1   | 80 - 100  | 2%  | 60%  |

### Critical Strike Chance (`crit_chance`)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 0.3% | 1.5% |
| T4   | 20 - 39   | 0.3% | 3%   |
| T3   | 40 - 59   | 0.3% | 4.5% |
| T2   | 60 - 79   | 0.3% | 6.5% |
| T1   | 80 - 100  | 0.3% | 9%   |

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

### Life on Hit (`life_on_hit`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 2   |
| T4   | 20 - 39   | 1   | 5   |
| T3   | 40 - 59   | 1   | 10  |
| T2   | 60 - 79   | 1   | 16  |
| T1   | 80 - 100  | 1   | 25  |

---

## Пример генерации

**iLvl 20, Common Gauntlets:**
```
Iron Gauntlets (Gloves - Gauntlet)
Item Level: 20 | Required Level: 15
Rarity: Common

Base Armour: 10
---
+ 12% Physical Damage
+ 15 Armour
```

**iLvl 75, Epic Bracers:**
```
Wind Bracers (Gloves - Bracer)
Item Level: 75 | Required Level: 56
Rarity: Epic

Base Evasion: 32
---
+ 5.5% Critical Strike Chance
+ 45 Evasion
+ 14 Life on Hit
```
