# Two-Hand Weapons (Двуручное оружие)

**Slot:** `two_hand`
**Описание:** Двуручное оружие - луки, посохи, двуручные мечи/топоры. Занимает оба слота рук. Статы ~1.5x выше одноручного, но нельзя носить щит/второе оружие.

---

## Подтипы

| Подтип               | Код            | Особенность                     |
|----------------------|----------------|---------------------------------|
| Greatsword (Двуруч.)  | `th_sword`   | Высокий физ. урон               |
| Greataxe (Секира)     | `th_axe`     | Максимальный физ. урон          |
| Bow (Лук)             | `th_bow`     | Дальний бой, крит              |
| Staff (Посох)         | `th_staff`   | Элементальный урон              |
| Greatmace (Молот)     | `th_mace`    | Огромный урон, медленный        |

---

## Базовые характеристики (implicit)

Двуручное оружие имеет ~1.5x базовый урон одноручного:

| Tier | iLvl      | Base Damage (min-max) |
|------|-----------|-----------------------|
| T5   | 1 - 19    | 5 - 12                |
| T4   | 20 - 39   | 10 - 27               |
| T3   | 40 - 59   | 22 - 52               |
| T2   | 60 - 79   | 42 - 82               |
| T1   | 80 - 100  | 68 - 135              |

---

## Доступные статы и диапазоны

> **Множитель x1.5:** Все flat-значения у двуручного оружия в ~1.5 раза выше одноручного.

### Flat Physical Damage (`flat_phys_dmg`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 2   | 8    |
| T4   | 20 - 39   | 2   | 18   |
| T3   | 40 - 59   | 2   | 38   |
| T2   | 60 - 79   | 2   | 68   |
| T1   | 80 - 100  | 2   | 112  |

### % Physical Damage (`pct_phys_dmg`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 8%  | 30%  |
| T4   | 20 - 39   | 8%  | 60%  |
| T3   | 40 - 59   | 8%  | 105% |
| T2   | 60 - 79   | 8%  | 165% |
| T1   | 80 - 100  | 8%  | 240% |

### Flat Fire Damage (`flat_fire_dmg`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 6   |
| T4   | 20 - 39   | 1   | 15  |
| T3   | 40 - 59   | 1   | 30  |
| T2   | 60 - 79   | 1   | 57  |
| T1   | 80 - 100  | 1   | 90  |

### Flat Cold Damage (`flat_cold_dmg`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 6   |
| T4   | 20 - 39   | 1   | 15  |
| T3   | 40 - 59   | 1   | 30  |
| T2   | 60 - 79   | 1   | 57  |
| T1   | 80 - 100  | 1   | 90  |

### Flat Lightning Damage (`flat_lightning_dmg`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 1   | 9    |
| T4   | 20 - 39   | 1   | 22   |
| T3   | 40 - 59   | 1   | 45   |
| T2   | 60 - 79   | 1   | 75   |
| T1   | 80 - 100  | 1   | 120  |

### Critical Strike Chance (`crit_chance`)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 0.5% | 2%   |
| T4   | 20 - 39   | 0.5% | 4%   |
| T3   | 40 - 59   | 0.5% | 6%   |
| T2   | 60 - 79   | 0.5% | 9%   |
| T1   | 80 - 100  | 0.5% | 12%  |

### Critical Strike Multiplier (`crit_multiplier`)

| Tier | iLvl      | Min  | Max   |
|------|-----------|------|-------|
| T5   | 1 - 19    | 8%   | 22%   |
| T4   | 20 - 39   | 8%   | 38%   |
| T3   | 40 - 59   | 8%   | 60%   |
| T2   | 60 - 79   | 8%   | 90%   |
| T1   | 80 - 100  | 8%   | 128%  |

### Attack Speed (`attack_speed`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 1%  | 4%   |
| T4   | 20 - 39   | 1%  | 7%   |
| T3   | 40 - 59   | 1%  | 10%  |
| T2   | 60 - 79   | 1%  | 14%  |
| T1   | 80 - 100  | 1%  | 18%  |

### Life on Hit (`life_on_hit`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 5   |
| T4   | 20 - 39   | 1   | 10  |
| T3   | 40 - 59   | 1   | 21  |
| T2   | 60 - 79   | 1   | 33  |
| T1   | 80 - 100  | 1   | 52  |

---

## Пример генерации

**iLvl 30, Rare Greataxe:**
```
Iron Cleaver (Two-Hand Axe)
Item Level: 30 | Required Level: 22
Rarity: Rare

Base Damage: 15
---
+ 14 Physical Damage
+ 45% Physical Damage
+ 6 Life on Hit
```

**iLvl 88, Legendary Bow:**
```
Void Whisper (Two-Hand Bow)
Item Level: 88 | Required Level: 66
Rarity: Legendary

Base Damage: 112
---
+ 95 Physical Damage
+ 200% Physical Damage
+ 85 Lightning Damage
+ 10% Critical Strike Chance
+ 110% Critical Strike Multiplier
+ 15% Attack Speed
```
