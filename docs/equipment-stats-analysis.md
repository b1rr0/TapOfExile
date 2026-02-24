# Equipment Stats Analysis: PoE2 vs TapOfExile

> Comparison of PoE2 equipment stat pools vs your current system, with new stat ideas per slot and per class.

---

## 1. CURRENT STATE: Your Equipment System

### 1.1 Slots (9 total)
| Slot | Subtypes | Identity |
|------|----------|----------|
| One-Hand | Sword, Axe, Dagger, Wand, Mace | Offense primary |
| Two-Hand | Greatsword, Greataxe, Bow, Staff, Greatmace | Offense (1.5x) |
| Helmet | Heavy, Light, Circlet | Defense + XP |
| Armor | Plate, Leather, Robe, Chain | Defense primary |
| Gloves | Gauntlet, Bracer, Wrap | Hybrid atk/def |
| Boots | Plate, Leather, Silk, Chain | Move speed + def |
| Belt | Leather, Chain, Heavy, Cloth | HP + gold find |
| Ring (x2) | Ruby, Sapphire, Topaz, Gold, Iron | Universal |
| Amulet | Pendant, Talisman, Locket | Passive DPS + utility |

### 1.2 Current Stats (22 stats)
**Offense (8):** flat_phys_dmg, pct_phys_dmg, flat_fire_dmg, flat_cold_dmg, flat_lightning_dmg, crit_chance, crit_multiplier, attack_speed

**Defense (9):** flat_hp, pct_hp, flat_armor, pct_armor, flat_evasion, pct_evasion, flat_energy_shield, pct_energy_shield, block_chance

**Utility (5):** move_speed, gold_find, xp_bonus, life_regen, life_on_hit, passive_dps_bonus

### 1.3 What's MISSING vs PoE2
| Category | PoE2 Has | You Don't Have |
|----------|----------|----------------|
| Resistances on gear | Fire/Cold/Lightning/Chaos res on armor, rings, belts, amulets | **No resistance stats on items at all** |
| Elemental % damage | % increased fire/cold/lightning damage | Only flat elemental, no % scaling |
| Penetration | Elemental/physical penetration | No penetration |
| Leech | Life/mana leech % of damage | Only life_on_hit (flat) |
| Ailment stats | Bleed/ignite/poison chance & duration | No ailment system |
| Attributes | Str/Dex/Int on every slot | No attribute system |
| Skill mods | +level to skills, cooldown reduction | No skill-boosting stats |
| Stun | Stun buildup, stun threshold | No stun system on items |
| Thorns | Physical/elemental thorns | No thorns stat |
| Dodge on items | Dodge rating / suppress / deflect | Only class-based dodge |
| Mana/Spirit | Max mana, mana regen, spirit | No mana/resource stats |

---

## 2. PoE2 STAT POOLS BY EQUIPMENT TYPE

### 2.1 Weapons (1H & 2H)
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Flat physical | Adds X-Y Physical | flat_phys_dmg | ✅ Have |
| % physical | 40-179% increased | pct_phys_dmg | ✅ Have |
| Flat elemental | Fire/Cold/Lightning ranges | flat_fire/cold/lightning | ✅ Have |
| Physical + Accuracy combo | Combined prefix | - | Missing |
| Crit chance | 10-34% | crit_chance | ✅ Have |
| Attack speed | 5-16% | attack_speed | ✅ Have |
| +Level to skills | "+1 to Melee Skills" | - | **NEW IDEA** |
| Attributes | +Str/Dex | - | Missing |
| Accuracy | +Accuracy Rating | - | Different system |

### 2.2 Body Armor
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Max Life | +40-150 | flat_hp, pct_hp | ✅ Have |
| Armor/Evasion/ES | Flat + % | flat/pct_armor/evasion/es | ✅ Have |
| Resistances | All 4 elements 10-40% | - | **CRITICAL MISSING** |
| Life Regen | Life regen/s | life_regen | ✅ Have |
| Thorns | Physical thorns damage | - | **NEW IDEA** |
| Damage gain | "Gain 5% as extra Fire" | - | **NEW IDEA** |
| Cooldown recovery | 15-30% CDR | - | **NEW IDEA** |
| Movement speed penalty | -3% to -5% on heavy armor | - | Could add |
| Ailment duration reduction | Reduced bleed/ignite/poison | - | Needs ailment system |
| Stun threshold | +Stun threshold | - | **NEW IDEA** |

### 2.3 Helmets
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Life | Flat + % | flat_hp, pct_hp | ✅ Have |
| Armor/Evasion/ES | Flat + % | ✅ Have | ✅ Have |
| Resistances | All elements | - | **CRITICAL MISSING** |
| XP bonus | Not in PoE2 | xp_bonus | ✅ Unique to you |
| +Level to skills | "+1 to spell skills" | - | **NEW IDEA** |
| Accuracy | +Accuracy | - | Different system |
| Mana/ES | +Mana, +ES | flat_energy_shield | Partial |

### 2.4 Gloves
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Attack speed | ✅ | attack_speed | ✅ Have |
| Crit chance | ✅ | crit_chance | ✅ Have |
| % phys damage | ✅ | pct_phys_dmg | ✅ Have |
| Flat added damage | Fire/Cold/Lightning to attacks | - | **NEW IDEA for gloves** |
| Life on hit | ✅ | life_on_hit | ✅ Have |
| Armor/Evasion/ES | ✅ | ✅ | ✅ Have |
| Leech | Life/ES leech | - | **NEW IDEA** |
| Poison/Bleed chance | On hit ailments | - | Needs ailment system |

### 2.5 Boots
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Movement Speed | 10-30% | move_speed | ✅ Have |
| Life | Flat | flat_hp | ✅ Have |
| Armor/Evasion/ES | Flat | ✅ | ✅ Have |
| Resistances | All elements | - | **CRITICAL MISSING** |
| Ailment immunity | Freeze/Chill/Shock | - | Needs ailment system |
| Stun threshold | +Stun threshold | - | **NEW IDEA** |
| Thorns | On some uniques | - | Low priority |

### 2.6 Belts
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Life | +10-174 | flat_hp, pct_hp | ✅ Have |
| Armor | +12-255 | flat_armor | ✅ Have |
| Stun Threshold | +6-304 | - | **NEW IDEA** |
| Resistances | All 4 | - | **CRITICAL MISSING** |
| Thorns | 1-220 Physical Thorns | - | **NEW IDEA** |
| Life Regen | 1-13/s | life_regen | ✅ Have |
| Gold Find | ✅ | gold_find | ✅ Have |
| Flask bonuses | Flask charges, recovery | - | **NEW IDEA** |
| Strength | +5-36 | - | No attributes |

### 2.7 Rings
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Life | +10-119 | flat_hp, pct_hp | ✅ Have |
| Mana | +10-54 | - | Missing |
| Attributes | +5-33 to each | - | No attributes |
| All Resistances | 3-16% all, or 6-45% single | - | **CRITICAL MISSING** |
| Chaos Resistance | 4-27% | - | No chaos element |
| Flat elemental | ✅ | flat_fire/cold/lightning | ✅ Have |
| Crit chance/multi | ✅ | crit_chance, crit_multiplier | ✅ Have |
| Gold/XP | ✅ | gold_find, xp_bonus | ✅ Have |
| Passive DPS | - | passive_dps_bonus | ✅ Unique to you |
| Life on hit | ✅ | life_on_hit | ✅ Have |

### 2.8 Amulets
| Stat Category | PoE2 | Your Game | Gap |
|---------------|------|-----------|-----|
| Life | +10-149, +3-8% inc | flat_hp, pct_hp | ✅ Have |
| Attributes | +5-33, +2-24 all | - | No attributes |
| All Resistances | Up to 18% all | - | **CRITICAL MISSING** |
| Crit chance/multi | ✅ | crit_chance, crit_multiplier | ✅ Have |
| % phys damage | ✅ | pct_phys_dmg | ✅ Have |
| Flat elemental | ✅ | flat_fire/cold/lightning | ✅ Have |
| Passive DPS | - | passive_dps_bonus | ✅ Unique to you |
| Cast speed | ✅ | - | Could add as skill CDR |
| +Level to skills | ✅ | - | **NEW IDEA** |

---

## 3. NEW STATS TO ADD (Prioritized)

### 3.1 TIER 1 — High Impact, Adds Depth

#### `fire_res` / `cold_res` / `lightning_res` — Elemental Resistances
**Why:** Your game already has resistance as a class-only mechanic. Adding resistance to items creates a gear optimization layer — players choose between offense and survivability.

| Stat ID | Slots | T5 (1-19) | T4 (20-39) | T3 (40-59) | T2 (60-79) | T1 (80-100) |
|---------|-------|-----------|------------|------------|------------|-------------|
| `fire_res` | Armor, Helmet, Belt, Boots, Ring, Amulet | 3%-8% | 3%-14% | 3%-22% | 3%-32% | 3%-45% |
| `cold_res` | Armor, Helmet, Belt, Boots, Ring, Amulet | 3%-8% | 3%-14% | 3%-22% | 3%-32% | 3%-45% |
| `lightning_res` | Armor, Helmet, Belt, Boots, Ring, Amulet | 3%-8% | 3%-14% | 3%-22% | 3%-32% | 3%-45% |

**Balance note:** Max resist stays 75%. Class base + items can reach cap. Early game you're vulnerable to elements; endgame you cap.

#### `pct_fire_dmg` / `pct_cold_dmg` / `pct_lightning_dmg` — % Elemental Damage
**Why:** You have flat elemental but no % scaling. This creates build diversity — stack fire % for fire builds, etc.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `pct_fire_dmg` | Weapon, Amulet, Ring | 3%-10% | 3%-20% | 3%-35% | 3%-55% | 3%-80% |
| `pct_cold_dmg` | Weapon, Amulet, Ring | 3%-10% | 3%-20% | 3%-35% | 3%-55% | 3%-80% |
| `pct_lightning_dmg` | Weapon, Amulet, Ring | 3%-10% | 3%-20% | 3%-35% | 3%-55% | 3%-80% |

#### `cooldown_reduction` — Skill Cooldown Reduction
**Why:** Your skills are 2-5s cooldown. CDR creates a new optimization axis. Feels great in tap games.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `cooldown_reduction` | Helmet, Amulet, Belt | 2%-5% | 2%-8% | 2%-12% | 2%-16% | 2%-22% |

**Cap at 40%.** Prevents skills from becoming spammable.

#### `life_leech` — % of Damage Leeched as Life
**Why:** Adds sustain scaling — the harder you hit, the more you heal. Much better endgame feel than flat life_on_hit.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `life_leech` | Weapon, Gloves, Ring, Amulet | 0.5%-1% | 0.5%-2% | 0.5%-3% | 0.5%-4.5% | 0.5%-6% |

---

### 3.2 TIER 2 — Medium Impact, Adds Build Choices

#### `dodge_rating` — Flat Dodge Chance on Items
**Why:** Currently dodge is class-only. Adding dodge to items lets non-Archer classes invest in dodge builds.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `dodge_rating` | Boots, Gloves, Amulet | 0.5%-2% | 0.5%-3% | 0.5%-5% | 0.5%-7% | 0.5%-10% |

#### `thorns` — Physical Thorns Damage
**Why:** Fun mechanic from PoE2. Enemies take damage when they attack you. Scales with tank builds.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `thorns` | Armor, Belt, Gloves | 1-5 | 1-15 | 1-30 | 1-55 | 1-90 |

**Formula:** When monster attacks you, they take `thorns` damage (before your resistance). Scales with pct_armor.

#### `skill_damage` — % Increased Skill Damage
**Why:** Your skills have damageMultiplier. This stat makes skills hit harder, separate from tap damage.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `skill_damage` | Weapon, Helmet, Amulet | 3%-10% | 3%-20% | 3%-35% | 3%-55% | 3%-80% |

#### `potion_effectiveness` — Flask Power Bonus
**Why:** Your game has potions. Making them better via items adds a gear dimension to sustain.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `potion_effectiveness` | Belt, Amulet | 5%-10% | 5%-18% | 5%-28% | 5%-40% | 5%-55% |

#### `damage_taken_reduction` — % Less Damage Taken
**Why:** A simple, powerful defensive stat. Rare and valuable. Different from resistance (applies to ALL damage including pure).

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `damage_taken_reduction` | Armor, Helmet, Belt | 1%-2% | 1%-3% | 1%-4% | 1%-5% | 1%-7% |

**Cap at 30%.** Very rare stat. Only on Legendary/Epic.

---

### 3.3 TIER 3 — Fun / Niche, Adds Flavor

#### `multi_hit_chance` — Chance for Extra Hit
**Why:** Like Archer's Double Shot but as an item stat. Any class could gain multi-tap chance.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `multi_hit_chance` | Weapon, Gloves | 1%-2% | 1%-4% | 1%-6% | 1%-9% | 1%-12% |

#### `gold_on_kill` — Flat Gold per Kill
**Why:** Alternative to % gold find. Feels different — consistent bonus vs scaling.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `gold_on_kill` | Ring, Amulet, Belt | 1-3 | 1-8 | 1-15 | 1-28 | 1-45 |

#### `damage_vs_bosses` — % More Damage vs Bosses
**Why:** Endgame-focused stat. Useless in trash, huge vs bosses. Creates boss-killer gear sets.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `damage_vs_bosses` | Weapon, Amulet, Ring | 3%-8% | 3%-15% | 3%-25% | 3%-40% | 3%-60% |

#### `area_damage` — % Damage as AoE to Nearby Enemies
**Why:** Inspired by PoE2's overkill splash. Part of your damage hits nearby enemies. Great for clear speed.

| Stat ID | Slots | T5 | T4 | T3 | T2 | T1 |
|---------|-------|----|----|----|----|----|
| `area_damage` | Weapon, Armor | 2%-5% | 2%-10% | 2%-18% | 2%-28% | 2%-40% |

---

## 4. UPDATED STAT DISTRIBUTION PER SLOT

### New Full Matrix (existing + proposed new stats)

| Stat / Slot              | 1H | 2H | Helm | Amul | Armor | Ring | Glov | Belt | Boot |
|--------------------------|----|----|------|------|-------|------|------|------|------|
| **EXISTING:**            |    |    |      |      |       |      |      |      |      |
| flat_phys_dmg            | +  | +  |      |      |       |      |      |      |      |
| pct_phys_dmg             | +  | +  |      | +    |       | +    | +    |      |      |
| flat_fire_dmg            | +  | +  |      | +    |       | +    |      |      |      |
| flat_cold_dmg            | +  | +  |      | +    |       | +    |      |      |      |
| flat_lightning_dmg       | +  | +  |      | +    |       | +    |      |      |      |
| crit_chance              | +  | +  |      | +    |       | +    | +    |      |      |
| crit_multiplier          | +  | +  |      | +    |       | +    |      |      |      |
| attack_speed             | +  | +  |      |      |       |      | +    |      |      |
| flat_hp                  |    |    | +    | +    | +     | +    |      | +    | +    |
| pct_hp                   |    |    | +    | +    | +     | +    |      | +    |      |
| flat_armor               |    |    | +    |      | +     |      | +    | +    | +    |
| pct_armor                |    |    | +    |      | +     |      |      |      |      |
| flat_evasion             |    |    | +    |      | +     |      | +    |      | +    |
| pct_evasion              |    |    | +    |      | +     |      |      |      |      |
| flat_energy_shield       |    |    | +    |      | +     |      | +    |      | +    |
| pct_energy_shield        |    |    | +    |      | +     |      |      |      |      |
| block_chance             | +  |    |      |      |       |      |      |      |      |
| move_speed               |    |    |      |      |       |      |      |      | +    |
| gold_find                |    |    |      | +    |       | +    |      | +    |      |
| xp_bonus                 |    |    | +    | +    |       | +    |      |      |      |
| life_regen               |    |    |      | +    | +     | +    |      | +    |      |
| life_on_hit              | +  | +  |      |      |       | +    | +    |      |      |
| passive_dps_bonus        |    |    |      | +    |       | +    |      |      |      |
| **NEW TIER 1:**          |    |    |      |      |       |      |      |      |      |
| fire_res                 |    |    | +    | +    | +     | +    |      | +    | +    |
| cold_res                 |    |    | +    | +    | +     | +    |      | +    | +    |
| lightning_res            |    |    | +    | +    | +     | +    |      | +    | +    |
| pct_fire_dmg             | +  | +  |      | +    |       | +    |      |      |      |
| pct_cold_dmg             | +  | +  |      | +    |       | +    |      |      |      |
| pct_lightning_dmg        | +  | +  |      | +    |       | +    |      |      |      |
| cooldown_reduction       |    |    | +    | +    |       |      |      | +    |      |
| life_leech               | +  | +  |      | +    |       | +    | +    |      |      |
| **NEW TIER 2:**          |    |    |      |      |       |      |      |      |      |
| dodge_rating             |    |    |      | +    |       |      | +    |      | +    |
| thorns                   |    |    |      |      | +     |      | +    | +    |      |
| skill_damage             | +  | +  | +    | +    |       |      |      |      |      |
| potion_effectiveness     |    |    |      | +    |       |      |      | +    |      |
| damage_taken_reduction   |    |    | +    |      | +     |      |      | +    |      |
| **NEW TIER 3:**          |    |    |      |      |       |      |      |      |      |
| multi_hit_chance         | +  | +  |      |      |       |      | +    |      |      |
| gold_on_kill             |    |    |      | +    |       | +    |      | +    |      |
| damage_vs_bosses         | +  | +  |      | +    |       | +    |      |      |      |
| area_damage              | +  | +  |      |      | +     |      |      |      |      |

---

## 5. CLASS-SPECIFIC ANALYSIS & SUGGESTIONS

### 5.1 Warrior (Tank / Block)
**Identity:** High HP, Block, Physical Resistance, Low DPS
**Special:** Block Chance (15% base + 0.2%/lvl)
**Resistance:** 30% physical, 0 elemental

**Current weakness:** Warrior has no way to scale offense except raw gear. No elemental scaling.

**Suggestions:**
| Idea | Description | Implementation |
|------|-------------|----------------|
| **Block → Counter** | When blocking, deal thorns damage back | `thorns` stat synergizes naturally with block |
| **Armor Scaling DPS** | % of Armor adds to Tap Damage | New stat: `armor_to_damage` (e.g. 1% of armor = +tap damage) |
| **Tank Reward** | Bonus damage per second survived in combat | Stacking `tenacity` buff: +1% damage per 5s alive |
| **Shield Slam stat** | Block triggers skill damage | New stat on shields: `block_skill_damage` |
| **Taunt** | Force all enemies to attack you (irrelevant solo but thematic) | Reduces enemy attack delay by 20% but reduces their damage 15% |
| **Endurance Stacks** | Gain stack when hit, each stack +2% damage reduction | Like PoE2 Endurance Charges but triggered by warrior block |
| **Elemental Resist Gap** | 0 elemental res = very weak to elemental monsters | Warrior NEEDS resistance gear more than other classes |

**Priority items for Warrior:**
- Weapons with `life_on_hit` + `flat_phys_dmg` (sustain fighter)
- Armor with `thorns` + `damage_taken_reduction` (reflect tank)
- Belt with `flat_hp` + `pct_hp` + resistance (HP stacking)
- Ring with `fire_res`/`cold_res`/`lightning_res` (cover elemental weakness)

---

### 5.2 Samurai (Crit / Burst)
**Identity:** Crit-focused, fast growing crit chance/multiplier, medium defense
**Special:** Lethal Precision (+50% crit damage base, +2%/lvl)
**Resistance:** 10% physical, 10% lightning

**Current weakness:** Glass cannon without investment. High crit but no sustain.

**Suggestions:**
| Idea | Description | Implementation |
|------|-------------|----------------|
| **Crit Leech** | Critical hits leech more life | New stat: `crit_life_leech` (2x leech on crit) |
| **Execute** | Kill enemies below X% HP on crit | Like PoE2 Culling Strike but crit-gated |
| **Bleeding on Crit** | Critical hits cause bleed (DoT) | Ailment system + `bleed_on_crit` stat |
| **Combo Counter** | Consecutive crits increase damage | +5% damage per crit in a row, resets on non-crit |
| **First Strike** | Bonus damage on first hit of combat | +50% on first tap per monster |
| **Precision Shard** | Crit beyond 100% chance = extra crit multi | Overflow mechanic for crit stacking |
| **Dodge on Crit** | Gain brief dodge window after critting | +10% dodge for 2s after crit |

**Priority items for Samurai:**
- Dagger with `crit_chance` + `crit_multiplier` + `life_leech` (burst sustain)
- Amulet with `passive_dps_bonus` + `crit_multiplier` + `pct_phys_dmg`
- Gloves with `crit_chance` + `attack_speed` (crit cap rushing)
- Ring with `crit_multiplier` + `life_leech` (scale the special)

---

### 5.3 Mage (Elemental / AoE)
**Identity:** Elemental damage focus, Spell Amplify, high resistances, low HP
**Special:** Spell Amplify (8% chance for 2.5x damage, +0.3%/lvl)
**Resistance:** 0% physical, 20% fire, 15% lightning, 15% cold

**Current weakness:** Low HP, no physical resistance. Spell Amplify is random — no way to control it.

**Suggestions:**
| Idea | Description | Implementation |
|------|-------------|----------------|
| **Elemental Mastery** | % elemental damage scales ALL elements | `pct_fire/cold/lightning_dmg` stats are core |
| **Skill CDR Build** | Reduce skill cooldowns = more skill casts | `cooldown_reduction` is CRITICAL for mage |
| **Elemental Conversion** | Convert physical to fire/cold/lightning | New stat: `phys_to_fire_conversion` etc. |
| **Spell Amplify Scaling** | Items that boost Spell Amplify chance | New stat: `spell_amp_chance` on staffs/wands |
| **Energy Shield Focus** | ES as primary defense (no need for HP) | Mage already has ES; add ES-specific stats |
| **Elemental Penetration** | Ignore % of enemy elemental resistance | New stat: `elemental_penetration` |
| **AoE on Amplify** | When Spell Amplify triggers, splash to nearby | Amplified hits deal 30% to adjacent enemies |
| **Mana Shield** | ES absorbs damage before HP fully | Already exists in concept; make it item-boostable |

**Priority items for Mage:**
- Staff with `pct_fire_dmg` + `flat_fire_dmg` + `skill_damage` (fire build)
- Wand with `pct_cold_dmg` + `pct_lightning_dmg` (multi-element)
- Helmet with `cooldown_reduction` + `flat_energy_shield` + `pct_energy_shield`
- Robe armor with `pct_energy_shield` + `flat_hp` (sustain)
- Amulet with `skill_damage` + `cooldown_reduction` + `passive_dps_bonus`

---

### 5.4 Archer (Speed / Multi-Hit)
**Identity:** Highest dodge, Double Shot, crit scaling, low HP
**Special:** Double Shot (12% chance, +0.3%/lvl)
**Resistance:** 5% physical, 10% cold

**Current weakness:** Very low HP (10/lvl), needs dodge/evasion investment to survive.

**Suggestions:**
| Idea | Description | Implementation |
|------|-------------|----------------|
| **Projectile Chain** | Hits bounce to nearby enemies | New stat: `chain_chance` (on bows) |
| **Multi-Hit Stacking** | Double Shot + multi_hit_chance stack | Stat synergy: both roll independently |
| **Evasion → Damage** | Convert evasion to damage bonus | Like Queen of the Forest: evasion → move speed → DPS |
| **Poison on Hit** | Hits apply poison DoT | Ailment system + `poison_chance` stat |
| **Critical Pierce** | Crits ignore dodge chance of enemies | If enemies ever get dodge |
| **Dodge → Counter** | After dodging, next hit deals 2x damage | Reward for dodging |
| **Rapid Fire** | Attack speed has diminishing returns but Archer ignores it | Remove tap cooldown floor for Archer (25ms instead of 50ms) |
| **Glass Cannon Mode** | Below 50% HP, deal 30% more damage | Low-life bonus mechanic |

**Priority items for Archer:**
- Bow with `crit_chance` + `crit_multiplier` + `multi_hit_chance` (shotgun build)
- Boots with `move_speed` + `dodge_rating` + `flat_evasion` (survival)
- Gloves with `attack_speed` + `life_on_hit` + `crit_chance`
- Ring with `life_leech` + `crit_chance` (sustain through offense)
- Amulet with `damage_vs_bosses` + `pct_phys_dmg` (boss killer variant)

---

## 6. SUBTYPE IDENTITY IDEAS

### 6.1 Weapon Subtypes Should Feel Different
Currently all weapon subtypes in a slot roll from the same stat pool. PoE2 differentiates heavily.

| Subtype | Current Identity | Suggested Stat Weighting |
|---------|-----------------|--------------------------|
| Sword (1H) | "Balanced" | Equal weights, jack-of-all |
| Axe (1H) | "High phys" | 2x weight on flat_phys_dmg, pct_phys_dmg |
| Dagger (1H) | "High crit" | 2x weight on crit_chance, crit_multiplier |
| Wand (1H) | "Elemental" | 2x weight on elemental stats, add spell_damage |
| Mace (1H) | "Slow power" | Higher base damage, lower attack_speed rolls |
| Bow (2H) | "Ranged crit" | Crit + multi_hit_chance |
| Staff (2H) | "Elemental" | pct_fire/cold/lightning + skill_damage |

### 6.2 Armor Subtypes Should Gate Defenses
| Subtype | Primary Defense | Secondary | Exclusive Stat |
|---------|----------------|-----------|----------------|
| Plate | Armor | HP | `damage_taken_reduction` |
| Leather | Evasion | Move speed | `dodge_rating` |
| Robe | Energy Shield | Skill CDR | `skill_damage` |
| Chain | Armor + Evasion | Balanced | None (hybrid) |

### 6.3 New Ring Subtypes Idea
| Subtype | Implicit | Theme |
|---------|----------|-------|
| Ruby Ring | flat_hp | Tank/sustain |
| Sapphire Ring | flat_cold_dmg | Cold builds |
| Topaz Ring | flat_lightning_dmg | Lightning builds |
| Gold Ring | gold_find | Farm/utility |
| Iron Ring | flat_phys_dmg | Physical builds |
| **Amethyst Ring** (NEW) | `cold_res` OR `chaos_res` | Defense |
| **Diamond Ring** (NEW) | `crit_chance` | Crit builds |
| **Moonstone Ring** (NEW) | `flat_energy_shield` | ES builds |
| **Coral Ring** (NEW) | `life_regen` | Sustain builds |

---

## 7. IMPLEMENTATION PRIORITY ROADMAP

### Phase 1: Core Stats (Biggest impact)
1. Add `fire_res`, `cold_res`, `lightning_res` to defensive slots
2. Add `pct_fire_dmg`, `pct_cold_dmg`, `pct_lightning_dmg` to offensive slots
3. Add `cooldown_reduction` to helmet, amulet, belt
4. Add `life_leech` to weapons, gloves, ring, amulet
5. Update stat matrix in equipment-system.md
6. Update item tooltip to show new stats

### Phase 2: Build Diversity
7. Add `dodge_rating` to boots, gloves, amulet
8. Add `thorns` to armor, belt, gloves
9. Add `skill_damage` to weapons, helmet, amulet
10. Add `potion_effectiveness` to belt, amulet
11. Add `damage_taken_reduction` to armor, helmet, belt (rare stat)
12. Implement subtype stat weighting (daggers favor crit, etc.)

### Phase 3: Endgame Stats
13. Add `multi_hit_chance` to weapons, gloves
14. Add `damage_vs_bosses` to weapons, amulet, ring
15. Add `area_damage` to weapons, armor
16. Add `gold_on_kill` to ring, amulet, belt
17. Add new ring subtypes (Diamond, Amethyst, Moonstone, Coral)

### Phase 4: Class-Specific Items
18. Class-gated legendary items (e.g. "Warrior only" shield with block→counter)
19. Unique/legendary items with special mechanics (from poe2-item-mechanics.md)
20. Set items (2-piece, 4-piece bonuses)
