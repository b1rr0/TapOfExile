# Belts (Пояса)

**Slot:** `belt`
**Описание:** Пояс - утилитарно-защитный слот. Основной источник HP и gold find. Также даёт броню и life regen. Не имеет атакующих статов.

---

## Подтипы

| Подтип                      | Код            | Особенность                     |
|-----------------------------|----------------|---------------------------------|
| Leather Belt (Кожаный)      | `belt_leather`| Implicit: +flat_hp              |
| Chain Belt (Цепной)         | `belt_chain`  | Implicit: +flat_energy_shield   |
| Heavy Belt (Тяжёлый)        | `belt_heavy`  | Implicit: +flat_armor           |
| Cloth Belt (Тканевый)       | `belt_cloth`  | Implicit: +gold_find            |

---

## Implicit бонусы (зависят от подтипа)

| Подтип    | Implicit Stat       | T5 (1-19) | T4 (20-39) | T3 (40-59) | T2 (60-79) | T1 (80-100) |
|-----------|---------------------|-----------|------------|------------|------------|-------------|
| Leather   | flat_hp             | 5 - 15    | 5 - 28     | 5 - 45     | 5 - 65     | 5 - 90      |
| Chain     | flat_energy_shield  | 2 - 6     | 2 - 12     | 2 - 20     | 2 - 30     | 2 - 42      |
| Heavy     | flat_armor          | 3 - 12    | 3 - 25     | 3 - 42     | 3 - 62     | 3 - 85      |
| Cloth     | gold_find           | 3% - 8%   | 3% - 15%   | 3% - 25%   | 3% - 38%   | 3% - 55%    |

---

## Доступные статы и диапазоны

### Flat Life (`flat_hp`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 5   | 18  |
| T4   | 20 - 39   | 5   | 35  |
| T3   | 40 - 59   | 5   | 58  |
| T2   | 60 - 79   | 5   | 85  |
| T1   | 80 - 100  | 5   | 120 |

### % Increased Life (`pct_hp`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 2%  | 5%   |
| T4   | 20 - 39   | 2%  | 9%   |
| T3   | 40 - 59   | 2%  | 14%  |
| T2   | 60 - 79   | 2%  | 20%  |
| T1   | 80 - 100  | 2%  | 28%  |

### Flat Armour (`flat_armor`)

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 2   | 10  |
| T4   | 20 - 39   | 2   | 22  |
| T3   | 40 - 59   | 2   | 38  |
| T2   | 60 - 79   | 2   | 58  |
| T1   | 80 - 100  | 2   | 82  |

### Gold Find (`gold_find`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 10%  |
| T4   | 20 - 39   | 3%  | 18%  |
| T3   | 40 - 59   | 3%  | 30%  |
| T2   | 60 - 79   | 3%  | 48%  |
| T1   | 80 - 100  | 3%  | 70%  |

### Life Regeneration (`life_regen`)

| Tier | iLvl      | Min  | Max   |
|------|-----------|------|-------|
| T5   | 1 - 19    | 0.5  | 2     |
| T4   | 20 - 39   | 0.5  | 5     |
| T3   | 40 - 59   | 0.5  | 10    |
| T2   | 60 - 79   | 0.5  | 18    |
| T1   | 80 - 100  | 0.5  | 28    |

### Fire Resistance (`fire_res`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 8%   |
| T4   | 20 - 39   | 3%  | 14%  |
| T3   | 40 - 59   | 3%  | 22%  |
| T2   | 60 - 79   | 3%  | 32%  |
| T1   | 80 - 100  | 3%  | 45%  |

### Cold Resistance (`cold_res`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 8%   |
| T4   | 20 - 39   | 3%  | 14%  |
| T3   | 40 - 59   | 3%  | 22%  |
| T2   | 60 - 79   | 3%  | 32%  |
| T1   | 80 - 100  | 3%  | 45%  |

### Lightning Resistance (`lightning_res`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 8%   |
| T4   | 20 - 39   | 3%  | 14%  |
| T3   | 40 - 59   | 3%  | 22%  |
| T2   | 60 - 79   | 3%  | 32%  |
| T1   | 80 - 100  | 3%  | 45%  |

### Physical Resistance (`phys_res`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 8%   |
| T4   | 20 - 39   | 3%  | 14%  |
| T3   | 40 - 59   | 3%  | 22%  |
| T2   | 60 - 79   | 3%  | 32%  |
| T1   | 80 - 100  | 3%  | 45%  |

> Пояс — важный слот для покрытия резистов. Максимум 2 резист-стата. Heavy Belt предпочтителен для Physical Resistance.

---

## Пример генерации

**iLvl 18, Common Leather Belt:**
```
Worn Belt (Belt - Leather)
Item Level: 18 | Required Level: 13
Rarity: Common

Implicit: + 12 Life
---
+ 15 Life
+ 6% Gold Find
```

**iLvl 90, Legendary Heavy Belt:**
```
Titan's Girdle (Belt - Heavy)
Item Level: 90 | Required Level: 67
Rarity: Legendary

Implicit: + 78 Armour
---
+ 110 Life
+ 25% Increased Life
+ 72 Armour
+ 60% Gold Find
+ 25 Life Regeneration
+ 22 Armour (дубль - не бывает, переролл)
```

> **Примечание:** Один и тот же стат не может выпасть дважды на одном предмете. При дубле - переролл.
