# Armor (Body Armour)

**Slot:** `armor`
**Description:** The main defensive slot. Provides the highest defensive stats among all equipment. The highest values of HP, armour, evasion, and energy shield.

---

## Subtypes

| Subtype                     | Code             | Feature                           |
|-----------------------------|------------------|-----------------------------------|
| Plate                       | `arm_plate`     | Maximum armour                    |
| Leather                     | `arm_leather`   | Evasion                           |
| Robe                        | `arm_robe`      | Energy shield                     |
| Chain                       | `arm_chain`     | Armour + Evasion (hybrid)         |

---

## Base Defence (implicit)

Body armour provides the highest base defence among all slots:

| Tier | iLvl      | Base Armour | Base Evasion | Base ES |
|------|-----------|-------------|--------------|---------|
| T5   | 1 - 19    | 10 - 25     | 6 - 16       | 4 - 12  |
| T4   | 20 - 39   | 22 - 55     | 14 - 36      | 10 - 28 |
| T3   | 40 - 59   | 48 - 95     | 30 - 65      | 22 - 50 |
| T2   | 60 - 79   | 85 - 155    | 55 - 105     | 40 - 82 |
| T1   | 80 - 100  | 135 - 230   | 90 - 165     | 65 - 125|

> Subtype determines which base defence is primary. Chain = 70% of each Armour and Evasion.

---

## Available Stats and Ranges

### Flat Life (`flat_hp`)
Body armour provides the highest HP bonus among all slots.

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 8   | 30  |
| T4   | 20 - 39   | 8   | 60  |
| T3   | 40 - 59   | 8   | 100 |
| T2   | 60 - 79   | 8   | 145 |
| T1   | 80 - 100  | 8   | 200 |

### % Increased Life (`pct_hp`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3%  | 8%   |
| T4   | 20 - 39   | 3%  | 14%  |
| T3   | 40 - 59   | 3%  | 22%  |
| T2   | 60 - 79   | 3%  | 30%  |
| T1   | 80 - 100  | 3%  | 40%  |

### Flat Armour (`flat_armor`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 5   | 25   |
| T4   | 20 - 39   | 5   | 55   |
| T3   | 40 - 59   | 5   | 100  |
| T2   | 60 - 79   | 5   | 155  |
| T1   | 80 - 100  | 5   | 220  |

### % Increased Armour (`pct_armor`)

| Tier | iLvl      | Min | Max   |
|------|-----------|-----|-------|
| T5   | 1 - 19    | 5%  | 15%   |
| T4   | 20 - 39   | 5%  | 30%   |
| T3   | 40 - 59   | 5%  | 50%   |
| T2   | 60 - 79   | 5%  | 75%   |
| T1   | 80 - 100  | 5%  | 110%  |

### Flat Evasion (`flat_evasion`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 4   | 20   |
| T4   | 20 - 39   | 4   | 45   |
| T3   | 40 - 59   | 4   | 80   |
| T2   | 60 - 79   | 4   | 125  |
| T1   | 80 - 100  | 4   | 180  |

### % Increased Evasion (`pct_evasion`)

| Tier | iLvl      | Min | Max   |
|------|-----------|-----|-------|
| T5   | 1 - 19    | 5%  | 15%   |
| T4   | 20 - 39   | 5%  | 30%   |
| T3   | 40 - 59   | 5%  | 50%   |
| T2   | 60 - 79   | 5%  | 75%   |
| T1   | 80 - 100  | 5%  | 110%  |

### Flat Energy Shield (`flat_energy_shield`)

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 3   | 14   |
| T4   | 20 - 39   | 3   | 30   |
| T3   | 40 - 59   | 3   | 55   |
| T2   | 60 - 79   | 3   | 85   |
| T1   | 80 - 100  | 3   | 125  |

### % Increased Energy Shield (`pct_energy_shield`)

| Tier | iLvl      | Min | Max   |
|------|-----------|-----|-------|
| T5   | 1 - 19    | 5%  | 15%   |
| T4   | 20 - 39   | 5%  | 30%   |
| T3   | 40 - 59   | 5%  | 55%   |
| T2   | 60 - 79   | 5%  | 80%   |
| T1   | 80 - 100  | 5%  | 115%  |

### Life Regeneration (`life_regen`)

| Tier | iLvl      | Min  | Max   |
|------|-----------|------|-------|
| T5   | 1 - 19    | 0.5  | 3     |
| T4   | 20 - 39   | 0.5  | 7     |
| T3   | 40 - 59   | 0.5  | 14    |
| T2   | 60 - 79   | 0.5  | 24    |
| T1   | 80 - 100  | 0.5  | 38    |

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

> Body armour is the **key slot for all resistances**. Especially important for the Mage (0% phys. resistance base) — Plate and Chain provide Physical Resistance. No more than 2 resistance stats on a single item.

---

## Generation Example

**iLvl 35, Rare Plate:**
```
Steel Breastplate (Armor - Plate)
Item Level: 35 | Required Level: 26
Rarity: Rare

Base Armour: 42
---
+ 48 Life
+ 40 Armour
+ 20% Increased Armour
```

**iLvl 95, Legendary Robe:**
```
Void Mantle (Armor - Robe)
Item Level: 95 | Required Level: 71
Rarity: Legendary

Base Energy Shield: 110
---
+ 180 Life
+ 35% Increased Life
+ 115 Energy Shield
+ 100% Increased Energy Shield
+ 32 Life Regeneration
+ 160 Evasion
```
