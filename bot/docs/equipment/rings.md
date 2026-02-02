# Rings (Кольца)

**Slot:** `ring` (2 слота: `left_ring`, `right_ring`)
**Описание:** Кольца - универсальные аксессуары. Можно носить 2 одновременно. Дают микс из атакующих, защитных и утилитарных статов. Хороший источник крита, элементального урона и gold find.

---

## Подтипы

| Подтип                  | Код            | Особенность                     |
|-------------------------|----------------|---------------------------------|
| Ruby Ring (Рубин)       | `ring_ruby`   | Implicit: +flat_hp              |
| Sapphire Ring (Сапфир)  | `ring_sapphire` | Implicit: +flat_cold_dmg     |
| Topaz Ring (Топаз)      | `ring_topaz`  | Implicit: +flat_lightning_dmg   |
| Gold Ring (Золотое)     | `ring_gold`   | Implicit: +gold_find            |
| Iron Ring (Железное)    | `ring_iron`   | Implicit: +flat_phys_dmg        |

---

## Implicit бонусы (зависят от подтипа)

| Подтип    | Implicit Stat       | T5 (1-19) | T4 (20-39) | T3 (40-59) | T2 (60-79) | T1 (80-100) |
|-----------|---------------------|-----------|------------|------------|------------|-------------|
| Ruby      | flat_hp             | 5 - 12    | 5 - 22     | 5 - 35     | 5 - 50     | 5 - 70      |
| Sapphire  | flat_cold_dmg       | 1 - 3     | 1 - 6      | 1 - 10     | 1 - 16     | 1 - 24      |
| Topaz     | flat_lightning_dmg  | 1 - 4     | 1 - 8      | 1 - 14     | 1 - 22     | 1 - 32      |
| Gold      | gold_find           | 3% - 8%   | 3% - 14%   | 3% - 22%   | 3% - 32%   | 3% - 45%    |
| Iron      | flat_phys_dmg       | 1 - 2     | 1 - 5      | 1 - 9      | 1 - 14     | 1 - 20      |

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

### Flat Fire Damage (`flat_fire_dmg`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 3   |
| T4   | 20 - 39   | 1   | 7   |
| T3   | 40 - 59   | 1   | 14  |
| T2   | 60 - 79   | 1   | 24  |
| T1   | 80 - 100  | 1   | 38  |

### Flat Cold Damage (`flat_cold_dmg`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 3   |
| T4   | 20 - 39   | 1   | 7   |
| T3   | 40 - 59   | 1   | 14  |
| T2   | 60 - 79   | 1   | 24  |
| T1   | 80 - 100  | 1   | 38  |

### Flat Lightning Damage (`flat_lightning_dmg`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 5   |
| T4   | 20 - 39   | 1   | 10  |
| T3   | 40 - 59   | 1   | 20  |
| T2   | 60 - 79   | 1   | 34  |
| T1   | 80 - 100  | 1   | 52  |

### Critical Strike Chance (`crit_chance`)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 0.3% | 1%   |
| T4   | 20 - 39   | 0.3% | 2%   |
| T3   | 40 - 59   | 0.3% | 3.5% |
| T2   | 60 - 79   | 0.3% | 5%   |
| T1   | 80 - 100  | 0.3% | 7%   |

### Critical Strike Multiplier (`crit_multiplier`)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 3%   | 10%  |
| T4   | 20 - 39   | 3%   | 18%  |
| T3   | 40 - 59   | 3%   | 30%  |
| T2   | 60 - 79   | 3%   | 45%  |
| T1   | 80 - 100  | 3%   | 62%  |

### Flat Life (`flat_hp`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 3   | 12  |
| T4   | 20 - 39   | 3   | 25  |
| T3   | 40 - 59   | 3   | 42  |
| T2   | 60 - 79   | 3   | 62  |
| T1   | 80 - 100  | 3   | 85  |

### % Increased Life (`pct_hp`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 1%  | 4%   |
| T4   | 20 - 39   | 1%  | 6%   |
| T3   | 40 - 59   | 1%  | 9%   |
| T2   | 60 - 79   | 1%  | 12%  |
| T1   | 80 - 100  | 1%  | 16%  |

### Gold Find (`gold_find`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 2%  | 8%   |
| T4   | 20 - 39   | 2%  | 15%  |
| T3   | 40 - 59   | 2%  | 25%  |
| T2   | 60 - 79   | 2%  | 40%  |
| T1   | 80 - 100  | 2%  | 58%  |

### Experience Bonus (`xp_bonus`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1%  | 2%  |
| T4   | 20 - 39   | 1%  | 4%  |
| T3   | 40 - 59   | 1%  | 6%  |
| T2   | 60 - 79   | 1%  | 9%  |
| T1   | 80 - 100  | 1%  | 12% |

### Life Regeneration (`life_regen`)

| Tier | iLvl      | Min  | Max   |
|------|-----------|------|-------|
| T5   | 1 - 19    | 0.3  | 1.5   |
| T4   | 20 - 39   | 0.3  | 4     |
| T3   | 40 - 59   | 0.3  | 8     |
| T2   | 60 - 79   | 0.3  | 14    |
| T1   | 80 - 100  | 0.3  | 22    |

### Life on Hit (`life_on_hit`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 2   |
| T4   | 20 - 39   | 1   | 5   |
| T3   | 40 - 59   | 1   | 10  |
| T2   | 60 - 79   | 1   | 16  |
| T1   | 80 - 100  | 1   | 25  |

### Passive DPS Bonus (`passive_dps_bonus`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 1%  | 5%   |
| T4   | 20 - 39   | 1%  | 10%  |
| T3   | 40 - 59   | 1%  | 18%  |
| T2   | 60 - 79   | 1%  | 30%  |
| T1   | 80 - 100  | 1%  | 45%  |

---

## Пример генерации

**iLvl 12, Common Iron Ring:**
```
Rusted Band (Ring - Iron)
Item Level: 12 | Required Level: 9
Rarity: Common

Implicit: + 1 Physical Damage
---
+ 8 Life
```

**iLvl 80, Epic Ruby Ring:**
```
Crimson Loop (Ring - Ruby)
Item Level: 80 | Required Level: 60
Rarity: Epic

Implicit: + 48 Life
---
+ 5% Critical Strike Chance
+ 40% Critical Strike Multiplier
+ 35% Gold Find
+ 28% Passive DPS Bonus
```
