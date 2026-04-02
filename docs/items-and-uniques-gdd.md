# TapOfExile — Items & Uniques GDD
### Complete Equipment Design Document

> **Game Designer Analysis** — Full item catalog, unique items per slot, class-specific gear
> Sources: poe2db.tw, fextralife wiki, existing codebase analysis, game-design-analysis.md

---

## GAME CONTEXT (Quick Reference)

```
TAP LOOP:     tap (50ms min) → damage → crit roll → element → resist calc → HP drain
SKILL LOOP:   CD timer → press → big damage (3-9x) → CD restart
CLASSES:      Warrior (Block/Tank), Samurai (Crit/Burst), Mage (Elemental/CDR), Archer (Speed/Multi)
ELEMENTS:     Physical | Fire | Lightning | Cold | Pure (unresistable)
SKILLS:       40+ defined — fire/earth/lightning/ice/water/wood/physical
RARITY:       Common (1-2 stats) → Rare (2-3) → Epic (3-4) → Legendary (4-6)
ITEM LEVEL:   1-100, tiers T5(1-19) T4(20-39) T3(40-59) T2(60-79) T1(80-100)
```

---

## PART 1 — FULL STAT POOL (ALL STATS, FINALIZED)

### 1.1 Offensive Stats
| ID | Name | Description | Notes |
|----|------|-------------|-------|
| `flat_phys_dmg` | +N Physical Damage | Flat bonus to tap damage | Core weapon stat |
| `pct_phys_dmg` | +N% Physical Damage | % bonus to physical component | Weapon, ring, amulet, gloves |
| `flat_fire_dmg` | +N Fire Damage | Flat fire added to tap | Weapon, ring, amulet |
| `flat_cold_dmg` | +N Cold Damage | Flat cold added to tap | Weapon, ring, amulet |
| `flat_lightning_dmg` | +N Lightning Damage | Flat lightning to tap | Weapon, ring, amulet |
| `pct_fire_dmg` | +N% Fire Damage | % multiplier on fire | **NEW** Weapon, ring, amulet |
| `pct_cold_dmg` | +N% Cold Damage | % multiplier on cold | **NEW** Weapon, ring, amulet |
| `pct_lightning_dmg` | +N% Lightning Damage | % multiplier on lightning | **NEW** Weapon, ring, amulet |
| `crit_chance` | +N% Critical Chance | Chance to deal crit hit | Weapon, ring, amulet, gloves, helm |
| `crit_multiplier` | +N% Critical Multiplier | Bonus crit damage | Weapon, ring, amulet |
| `skill_damage` | +N% Skill Damage | Multiplies skill `damageMultiplier` | **NEW** Weapon, helm, amulet |
| `multi_hit_chance` | +N% Multi-Hit Chance | Chance for extra tap hit | **NEW** Weapon, gloves |
| `damage_vs_bosses` | +N% Boss Damage | Extra damage vs boss enemies | **NEW** Weapon, amulet, ring |
| `execute_threshold` | Execute below N% HP | Instant kill at threshold | **NEW** Weapon only (Epic/Legendary) |
| `spell_amp_chance` | +N% Spell Amplify | Boosts Mage class special | **NEW** Wand/Staff only |

### 1.2 Defensive Stats
| ID | Name | Description | Notes |
|----|------|-------------|-------|
| `flat_hp` | +N Life | Flat maximum HP | All armor slots |
| `pct_hp` | +N% Life | % max HP | Most armor slots |
| `flat_armor` | +N Armour | Flat armor (phys reduction) | Armor slots |
| `pct_armor` | +N% Armour | % armor bonus | Heavy armor slots |
| `flat_evasion` | +N Evasion | Flat dodge rating | Evasion slots |
| `pct_evasion` | +N% Evasion | % evasion bonus | Evasion slots |
| `flat_energy_shield` | +N Energy Shield | Flat ES pool | ES slots |
| `pct_energy_shield` | +N% Energy Shield | % ES bonus | ES slots |
| `block_chance` | +N% Block Chance | Block incoming hits | 1H weapon only |
| `fire_res` | +N% Fire Resistance | Reduce fire damage taken | **NEW** Armor, ring, amulet, belt, boots, helm |
| `cold_res` | +N% Cold Resistance | Reduce cold damage taken | **NEW** Same slots |
| `lightning_res` | +N% Lightning Resistance | Reduce lightning damage taken | **NEW** Same slots |
| `phys_res` | +N% Physical Resistance | Reduce physical damage taken | **NEW** Armor, helmet, ring, amulet, belt |
| `dodge_rating` | +N% Dodge Chance | Avoid incoming hit entirely | **NEW** Boots, gloves, amulet |
| `thorns` | N Thorns Damage | Counter-damage when hit | **NEW** Armor, belt, gloves |
| `damage_taken_reduction` | -N% Damage Taken | Universal mitigation | **NEW** Armor, helm, belt (Epic/Leg only) |
| `armor_to_damage` | N% Armor → Tap Bonus | Convert armor to offense | **NEW** Warrior resonant stat |

### 1.2b UNIQUE-ONLY Mechanics (Not in regular stat pool)
| ID | Name | Description | Notes |
|----|------|-------------|-------|
| `damage_return` | Return N% Damage Taken | % of received damage dealt back to attacker | **UNIQUE ONLY** Warrior tank items |
| `execute_threshold` | Execute below N% HP | Instant kill at HP threshold | **UNIQUE ONLY** Samurai burst items |

> **`damage_return`** — a percentage of received damage is returned to the attacker. Unlike `thorns` (fixed flat damage), `damage_return` scales with enemy damage. The harder the enemy hits, the greater the return. An ideal tank stat for bosses.

### 1.3 Sustain Stats
| ID | Name | Description | Notes |
|----|------|-------------|-------|
| `life_regen` | +N HP/s | Passive HP recovery | Armor, ring, amulet, belt |
| `life_on_hit` | +N HP on Hit | Flat recovery per tap | Weapon, ring, gloves |
| `life_leech` | +N% Life Leech | % of damage → HP recovery | **NEW** Weapon, ring, amulet, gloves |
| `potion_effectiveness` | +N% Potion Power | Flask heals for more | **NEW** Belt, amulet |

### 1.4 Utility Stats
| ID | Name | Description | Notes |
|----|------|-------------|-------|
| `gold_find` | +N% Gold Find | Bonus gold from kills | Ring, amulet, belt |
| `gold_on_kill` | +N Gold per Kill | Flat gold bonus | **NEW** Ring, amulet, belt |
| `xp_bonus` | +N% XP | Bonus XP from kills | Helm, ring, amulet |
| `cooldown_reduction` | -N% Skill CD | Skills fire more often | **NEW** Helm, amulet, belt |
| `passive_dps_bonus` | +N% Passive DPS | Boosts idle/offline DPS | Ring, amulet |

---

## PART 2 — SLOT-BY-SLOT ITEM DESIGN

### 2.1 ONE-HAND WEAPONS

**Identity:** Primary offensive slot. Subtypes define playstyle.

#### Stat Pool by Subtype
| Subtype | Primary Stats | Secondary Stats | Exclusive |
|---------|--------------|-----------------|-----------|
| **Sword** | flat_phys_dmg, pct_phys_dmg | crit_chance, life_on_hit | - |
| **Axe** | flat_phys_dmg (2x weight), pct_phys_dmg | life_on_hit | damage_vs_bosses |
| **Dagger** | crit_chance (2x weight), crit_multiplier | life_leech | execute_threshold |
| **Wand** | flat_fire/cold/lightning, pct_elemental | skill_damage | spell_amp_chance |
| **Mace** | flat_phys_dmg (high), pct_phys_dmg (high) | block_chance | multi_hit_chance (low %) |

#### Base Stats by Tier
| Tier | iLvl | Base Damage | Max Offensive Stats |
|------|------|-------------|---------------------|
| T5 | 1-19 | 3-8 | Low rolls |
| T4 | 20-39 | 7-18 | Medium rolls |
| T3 | 40-59 | 15-35 | Good rolls |
| T2 | 60-79 | 28-55 | High rolls |
| T1 | 80-100 | 45-90 | Max rolls |

---

### ⚡ ONE-HAND UNIQUE ITEMS (28 items)

#### SWORDS (6 uniques)

**🗡️ Ironclad Verdict** *(One-Hand Sword — Warrior)*
```
Legendary One-Hand Sword
"The blade judges not the man, but his armor."
────────────────────────────
+ 85% Physical Damage
+ [1% of Armor as Tap Damage Bonus]   ← armor_to_damage
+ 12 Life on Hit
────────────────────────────
Warrior Only. Your total Armor rating is added as flat Tap Damage at 1% rate.
Example: 600 Armor → +6 Tap Damage bonus
```
> **Design:** Warrior's core weapon. Rewards armor investment with offense. Makes defense feel offensive. Classic "convert defense to offense" PoE fantasy.

---

**🗡️ Thornwall Edge** *(One-Hand Sword — Warrior)*
```
Legendary One-Hand Sword
"Every cut feeds the wall."
────────────────────────────
+ 60 Physical Damage
+ 25 Thorns Damage
[When you Block, deal Thorns Damage to attacker]
+ 18% Block Chance
────────────────────────────
Blocks actively punish attackers.
```
> **Design:** Warrior tank fantasy — block = deal damage. Creates an aggressive tank feel.

---

**🗡️ Crimson Momentum** *(One-Hand Sword — Samurai)*
```
Epic One-Hand Sword
"Speed feeds the blade."
────────────────────────────
+ 55% Physical Damage
+ 8% Critical Strike Chance
[Each consecutive Critical Hit grants +3% Crit Chance (max 5 stacks)]
[Stacks reset on non-critical hit]
────────────────────────────
Combo Crit: stack up to +15% bonus crit from momentum.
```
> **Design:** Samurai momentum mechanic. Rewards consistent critting — creates hot streak feel.

---

**🗡️ Final Verdict** *(One-Hand Sword — Samurai)*
```
Legendary One-Hand Sword
"The last cut always lands."
────────────────────────────
+ 75% Physical Damage
+ 12% Critical Strike Chance
+ 60% Critical Strike Multiplier
[Execute enemies below 15% Life on Critical Hit]
────────────────────────────
```
> **Design:** Pure Samurai burst fantasy. Stack crit, then execute. Inspired by PoE2 culling strike.

---

**🗡️ Phantom Silhouette** *(One-Hand Sword — Archer)*
```
Epic One-Hand Sword
"Strike before the shadow arrives."
────────────────────────────
+ 45% Physical Damage
+ 15% Multi-Hit Chance
+ 5% Dodge Chance
[On Dodge: next tap deals 100% more damage]
────────────────────────────
Dodge + tap timing synergy for skilled Archer players.
```

---

**🗡️ Wraithblade** *(One-Hand Sword — Any)*
```
Legendary One-Hand Sword
"Cuts between life and death."
────────────────────────────
+ 70% Physical Damage
+ 4% Life Leech
+ 8% Critical Strike Chance
[Life Leech is instant (not over 1s)]
────────────────────────────
Rare mechanic: instant leech heals in one burst instead of over time.
```
> **Design:** Inspired by PoE2's Instant Leech concept. High sustain for any class.

---

#### AXES (4 uniques)

**🪓 Earthsplitter** *(Two-fist Axe — Warrior)*
```
Legendary One-Hand Axe
"The ground remembers every blow."
────────────────────────────
+ 90 Physical Damage
+ 80% Physical Damage
[Taps have 25% chance to deal double damage (Seismic Strike)]
+ 8 Life on Hit
────────────────────────────
```
> **Design:** Warrior heavy-hitter. Random double-damage procs feel like earthquakes. Pure single-target punishment — fits 1x1 combat perfectly.

---

**🪓 Sever & Sear** *(One-Hand Axe — Mage)*
```
Epic One-Hand Axe
"Fire and iron, together."
────────────────────────────
+ 40 Physical Damage
+ 35 Fire Damage
+ 50% Fire Damage
[Physical Damage from this weapon also counts as Fire]
────────────────────────────
All tap damage benefits from fire resistance reduction on enemy.
```
> **Design:** Hybrid Mage weapon — use physical weapon but fire build.

---

**🪓 Bloodletter** *(One-Hand Axe — Samurai)*
```
Legendary One-Hand Axe
"It bleeds gold."
────────────────────────────
+ 100 Physical Damage
+ 70% Physical Damage
[On Critical Hit: 5% chance to deal 5x damage (Bloodletter proc)]
- 5% Life per Bloodletter proc
────────────────────────────
Risk/reward: massive proc damage costs HP. Samurai high-risk burst.
```

---

**🪓 Voidcleaver** *(One-Hand Axe — Any)*
```
Epic One-Hand Axe
"Nothing survives in its wake."
────────────────────────────
+ 70 Physical Damage
+ 6% Multi-Hit Chance
+ 20% Damage vs Bosses
────────────────────────────
```

---

#### DAGGERS (5 uniques)

**🔪 Whisper of Lethal** *(One-Hand Dagger — Samurai)*
```
Legendary One-Hand Dagger
"You never hear it coming."
────────────────────────────
+ 12% Critical Strike Chance
+ 85% Critical Strike Multiplier
+ 3% Life Leech
[Crits restore 2x normal Leech]
────────────────────────────
The definitive Samurai weapon: extreme crit multiplier + leech on crit.
```
> **Design:** Embodies Samurai fantasy — high crit sustain. Inspired by PoE2 Rathpith Globe + Carnage Heart.

---

**🔪 Shadowfang** *(One-Hand Dagger — Samurai/Archer)*
```
Epic One-Hand Dagger
"Strike fast. Strike true."
────────────────────────────
+ 10% Critical Strike Chance
+ 60% Critical Strike Multiplier
+ 3% Life Leech
[Every 5th tap is guaranteed Critical Hit]
────────────────────────────
Cadence mechanic: predictable crit pattern for tap rhythm.
```
> **Design:** Creates a tap rhythm — tap 4 times, 5th is guaranteed crit. Skilled play reward.

---

**🔪 Soulpiercer** *(One-Hand Dagger — Any)*
```
Legendary One-Hand Dagger
"Bypasses all pretense of defense."
────────────────────────────
+ 9% Critical Strike Chance
+ 70% Critical Strike Multiplier
[Critical Hits ignore 25% of target's Resistance]
────────────────────────────
Penetration on crit — endgame boss killer.
```
> **Design:** Inspired by PoE2's Beacon of Azis (crit ignores resistances). Late-game buster.

---

**🔪 Gutripper** *(One-Hand Dagger — Archer)*
```
Epic One-Hand Dagger
"Every cut bleeds gold."
────────────────────────────
+ 7% Critical Strike Chance
+ 14% Multi-Hit Chance
+ 3% Life Leech
+ 20% Gold Find
────────────────────────────
Archer farm build weapon: many hits = many procs = gold + sustain.
```

---

**🔪 Phantom Needle** *(One-Hand Dagger — Archer)*
```
Legendary One-Hand Dagger
"You never see the second hit."
────────────────────────────
+ 10% Critical Strike Chance
+ 18% Multi-Hit Chance  ← (highest on any item, but dagger exclusive)
+ 5% Dodge Chance
[Double Shot chance doubled while Dual-Wielding or using Dagger]
────────────────────────────
Archer-specific: stacks with Double Shot class passive.
```

---

#### WANDS (5 uniques)

**🪄 Pyrostaff Wand** *(One-Hand Wand — Mage)*
```
Legendary One-Hand Wand
"It whispers in flames."
────────────────────────────
+ 60 Fire Damage
+ 80% Fire Damage
+ 12% Skill Damage
+ 5% Spell Amplify Chance
[Fire Skills have -15% Cooldown]
────────────────────────────
Fire Mage core weapon: fire damage + CDR on fire skills + spell amp.
```
> **Design:** Mage fire build identity item. CDR only on fire skills adds flavor.

---

**🪄 Stormcaller's Wand** *(One-Hand Wand — Mage)*
```
Legendary One-Hand Wand
"The sky obeys."
────────────────────────────
+ 65 Lightning Damage
+ 75% Lightning Damage
+ 8% Spell Amplify Chance
[On Spell Amplify: next skill fires instantly (no CD reset)]
────────────────────────────
Extremely powerful: Spell Amplify procs a free skill cast.
```
> **Design:** Rewards Mage's random proc — when it procs, you get a bonus skill. High variance, high reward.

---

**🪄 Glacial Cipher** *(One-Hand Wand — Mage)*
```
Epic One-Hand Wand
"Cold logic, absolute."
────────────────────────────
+ 50 Cold Damage
+ 65% Cold Damage
+ 10% Skill Damage
[Cold Skills reduce enemy damage by 10% for 3s]
────────────────────────────
Cold skills apply soft taunt/debuff — cold build defensive option.
```

---

**🪄 Voidtongue** *(One-Hand Wand — Mage)*
```
Legendary One-Hand Wand
"Elements taste like nothing here."
────────────────────────────
+ 40 Fire Damage
+ 40 Cold Damage
+ 40 Lightning Damage
[All elemental skills deal all three elements simultaneously]
[Total damage = unchanged; split three ways vs resistances]
────────────────────────────
```
> **Design:** Mixed element build. Enemies rarely have all three resistances capped. More consistent vs any enemy.

---

**🪄 Arcanist's Mark** *(One-Hand Wand — Mage/Any)*
```
Epic One-Hand Wand
"Mark, then obliterate."
────────────────────────────
+ 45 Fire Damage
+ 7% Skill Damage
+ 3% Spell Amplify Chance
[On 3rd consecutive Skill use: next skill deals 50% more damage]
────────────────────────────
Triple-skill rhythm: build up 3 casts, 4th hits harder.
```

---

#### MACES (4 uniques)

**🔨 The Aegis Fist** *(One-Hand Mace — Warrior)*
```
Legendary One-Hand Mace
"Every shield has a hammer."
────────────────────────────
+ 100 Physical Damage
+ 80% Physical Damage
+ 20% Block Chance
[On Block: deal 40% of blocked damage as Physical back to attacker]
────────────────────────────
```
> **Design:** Block = counter attack. The ultimate reactive Warrior weapon.

---

**🔨 Overcrusher** *(One-Hand Mace — Warrior)*
```
Epic One-Hand Mace
"Too much force is exactly enough."
────────────────────────────
+ 80 Physical Damage
+ 60% Physical Damage
[Every 3rd tap deals 200% Physical Damage (Crush proc)]
+ 15 Life on Hit
────────────────────────────
Power every 3 taps — tap rhythm mechanic for Warrior.
```

---

**🔨 Bonebreaker** *(One-Hand Mace — Any)*
```
Epic One-Hand Mace
"It finds the weak points."
────────────────────────────
+ 90 Physical Damage
+ 50% Physical Damage
+ 30% Damage vs Bosses
[Enemies hit take 5% increased damage for 5s (stacks 3x)]
────────────────────────────
Armor shred mechanic: stack 3x for -15% enemy defense.
```

---

**🔨 Twin Burden** *(One-Hand Mace — Any)*
```
Legendary One-Hand Mace
"Slow is smooth. Smooth is deadly."
────────────────────────────
+ 120 Physical Damage (highest flat of any 1H)
+ 100% Physical Damage (highest % of any 1H)
- 5% Dodge Chance
────────────────────────────
Pure glass cannon physical mace. Highest raw numbers, but sluggish.
```

---

### 2.2 TWO-HAND WEAPONS

**Identity:** Highest single-weapon damage. Locks out off-hand but provides 1.5x all stats.

#### Unique Two-Hand Items (10 items)

**⚔️ Colossus Grind** *(Greatsword — Warrior)*
```
Legendary Two-Hand Sword
"The mountain does not hurry."
────────────────────────────
+ 150 Physical Damage
+ 120% Physical Damage
[2% of Armour added as flat Physical Damage per hit]
+ 20 Life on Hit
────────────────────────────
Warrior 2H: max armor investment converts to massive tap damage.
```

---

**⚔️ Splitwind Axe** *(Greataxe — Any)*
```
Legendary Two-Hand Axe
"One hit, two wounds."
────────────────────────────
+ 140 Physical Damage
+ 100% Physical Damage
[Every tap hits twice — second hit deals 30% damage]
────────────────────────────
Pseudo multi-hit: always double-tap at reduced rate.
```
> **Design:** Inspired by PoE2's multi-projectile items. Consistent extra hit, very satisfying.

---

**🏹 Stormrend Bow** *(Bow — Archer)*
```
Legendary Two-Hand Bow
"The storm follows the arrow."
────────────────────────────
+ 12% Critical Strike Chance
+ 80% Critical Strike Multiplier
+ 15% Multi-Hit Chance
[Critical Hits have 30% chance to trigger extra Lightning damage (50% tap damage)]
────────────────────────────
Archer crit bow: crit → lightning proc chain.
```

---

**🏹 Widow's Whisper** *(Bow — Archer)*
```
Epic Two-Hand Bow
"Silence follows every shot."
────────────────────────────
+ 10% Critical Strike Chance
+ 12% Multi-Hit Chance
+ 8% Dodge Chance
[30% of Physical Damage converted to Cold Damage]
────────────────────────────
Hybrid physical/cold Archer. Leverages both resist types.
```

---

**🏹 Gloom Arrow** *(Bow — Archer)*
```
Legendary Two-Hand Bow
"It finds what hides."
────────────────────────────
+ 14% Critical Strike Chance
+ 100% Critical Strike Multiplier
+ 50% Damage vs Bosses   ← (Highest boss damage of any item)
────────────────────────────
```
> **Design:** Pure boss-killer bow for dedicated boss runs.

---

**🔱 Archon's Stave** *(Staff — Mage)*
```
Legendary Two-Hand Staff
"Power without compromise."
────────────────────────────
+ 90 Fire Damage
+ 70 Lightning Damage
+ 15% Skill Damage
+ 8% Spell Amplify Chance
[All Skill Damage gains +20% from any element you've used this combat]
────────────────────────────
Mage 2H: multi-element scaling. Use all 3 elements → max 60% bonus.
```

---

**🔱 The Endless Lecture** *(Staff — Mage)*
```
Legendary Two-Hand Staff
"The sermon never ends."
────────────────────────────
+ 120 Fire Damage
+ 150% Fire Damage
+ 12% Skill Damage
[Fire Skills have -25% Cooldown (best CDR of any item)]
[+15% Skill Damage for each Fire skill used (max 3 stacks)]
────────────────────────────
The ultimate fire CDR staff. Pairs with CDR on helm + belt.
```

---

**🔱 Frostweave Sanctum** *(Staff — Mage)*
```
Legendary Two-Hand Staff
"Cold never wavers."
────────────────────────────
+ 130 Cold Damage
+ 140% Cold Damage
+ 10% Skill Damage
[Cold skills reduce enemy damage by 20% for 4s]
[Cold Resistance on gear is 50% more effective]
────────────────────────────
Cold mage: offensive + defensive hybrid. Enemy weakened, your cold res amplified.
```

---

**🔨 The Titan's Promise** *(Greatmace — Warrior)*
```
Legendary Two-Hand Mace
"It promises only ruin."
────────────────────────────
+ 200 Physical Damage (highest of all weapons)
+ 150% Physical Damage
- 8% Dodge Chance
[Every 4th tap triggers Earth Shatter: 250% Physical Damage, ignores 20% of enemy Resistance]
────────────────────────────
```
> **Design:** Inspired by PoE2 Marohi Erqi. Slow but massive. Every 4th tap is a devastating single-target slam — resistance-ignoring makes it the ultimate boss-killer rhythm weapon.

---

**⛏️ The Paradox** *(Greataxe — Any)*
```
Legendary Two-Hand Axe
"The more it hurts, the more you want it."
────────────────────────────
+ 160 Physical Damage
+ 130% Physical Damage
[Each time you take damage: +2% damage bonus for 10s (max 10 stacks)]
[-10% of max Life as cost per stack gained]
────────────────────────────
```
> **Design:** Pain builds power. High risk — lose HP to gain damage stacks. Inspired by PoE2's Nebuloch/pain synergy.

---

### 2.3 HELMETS

#### Helmet Unique Items (8 items)

**⛑️ Iron Sentinel** *(Heavy Helm — Warrior)*
```
Legendary Helmet
"It watches. It endures."
────────────────────────────
+ 140 Life
+ 25% Increased Life
+ 120 Armour
[Block Chance is doubled while above 80% Life]
[Gain +1 Endurance Stack on Block (max 5: each gives +3% dmg, -1% dmg taken)]
────────────────────────────
```
> **Design:** Warrior flagship helm. Endurance system embodied in one item.

---

**⛑️ Mindveil Circlet** *(Circlet — Mage)*
```
Legendary Helmet
"The mind bends to no element."
────────────────────────────
+ 80 Energy Shield
+ 70% Increased Energy Shield
+ 20% Cooldown Reduction
[All Elemental Skills share their individual cooldowns as one pool]
[But: all skills reset simultaneously every 8s]
────────────────────────────
```
> **Design:** Unique rhythm: all skills fire simultaneously in a burst window every 8s. Mage single-target burst identity — unleash everything at once on the boss.

---

**⛑️ Headhunter's Eye** *(Light Helm — Any)*
```
Legendary Helmet
"See everything. Take everything."
────────────────────────────
+ 80 Life
+ 12% XP Bonus
+ 30% Gold Find
[On killing a Boss enemy: gain a random stat buff for 30s]
[Possible buffs: +30% damage, +15% crit, +20% CDR, +15% multi-hit chance, +25% resist all]
────────────────────────────
```
> **Design:** Directly inspired by PoE2's Headhunter belt. Boss kill grants a stolen modifier.

---

**⛑️ Phantom Crown** *(Light Helm — Archer)*
```
Legendary Helmet
"Wear the ghost. Be the ghost."
────────────────────────────
+ 90 Evasion
+ 60% Increased Evasion
+ 8% Dodge Chance
[While above 70% Life: +15% additional Dodge Chance]
[On successful Dodge: +10% multi-hit chance for 2s]
────────────────────────────
```
> **Design:** Archer dodge stacker. High HP → high dodge → dodge proc multi-hit loop.

---

**⛑️ Momentum Mask** *(Circlet — Samurai)*
```
Epic Helmet
"Count the hits. Feed the fury."
────────────────────────────
+ 70 Life
+ 8% Critical Strike Chance
[Each Critical Hit increases Crit Multiplier by 5% for 3s (max 10 stacks = +50%)]
[Stacks reset when you take damage]
────────────────────────────
```
> **Design:** Momentum helmet for Samurai. Crit chains build crit multiplier stacks.

---

**⛑️ Voidcrown** *(Circlet — Any)*
```
Legendary Helmet
"What it takes, it keeps."
────────────────────────────
+ 60 Energy Shield
+ 20% XP Bonus   ← (highest XP on any item)
+ 18% Cooldown Reduction
[On Kill: 2% chance to drop an extra Gold item]
────────────────────────────
```
> **Design:** XP + CDR + gold proc. Leveling speed helm.

---

**⛑️ Forsaken Faceplate** *(Heavy Helm — Warrior)*
```
Epic Helmet
"Loss becomes strength."
────────────────────────────
+ 130 Life
+ 100 Armour
[Thorns Damage is doubled]
[When below 50% Life: Thorns deal triple damage instead]
────────────────────────────
```
> **Design:** Low-HP Warrior variant. Pairs with thorns on armor and belt for reflect build.

---

**⛑️ The Oracle's Veil** *(Circlet — Mage)*
```
Legendary Helmet
"Before you cast, it's already happened."
────────────────────────────
+ 90 Energy Shield
+ 60% Energy Shield
[Spell Amplify procs are not random — they activate every 5th skill use]
────────────────────────────
```
> **Design:** Removes RNG from Mage special. Predictable Spell Amplify every 5th skill. Inspired by Ungil's Harmony inversion.

---

### 2.4 BODY ARMOR

#### Armor Unique Items (8 items)

**🛡️ The Iron Fortress** *(Plate — Warrior)*
```
Legendary Body Armour
"It has never been breached."
────────────────────────────
+ 200 Life
+ 220 Armour
+ 100% Increased Armour
[Return 15% of damage taken back to attacker]   ← damage_return (unique mechanic)
[When below 30% Life: Armour effectiveness doubles]
────────────────────────────
```
> **Design:** Warrior "last stand" armor. Damage return punishes enemies for hitting you — the ultimate tank fantasy. Below 30% HP, armor doubles for survival.

---

**🛡️ Kaom's Will** *(Plate — Warrior)*
```
Legendary Body Armour
"The will to endure outlasts the body."
────────────────────────────
+ 300 Life   ← (highest flat HP in the game)
+ 40% Increased Life
[No Energy Shield]
[Thorns Damage = 15% of max Life]
────────────────────────────
```
> **Design:** Inspired by PoE2's Kaom's Heart. Maximum life, no ES, thorns scales with HP. Pure tank.

---

**🛡️ Wraithweave Robe** *(Robe — Mage)*
```
Legendary Body Armour
"The shield is not metal. It is will."
────────────────────────────
+ 150 Energy Shield
+ 120% Increased Energy Shield
[Energy Shield protects against Physical Damage at 50% efficiency]
[Life regeneration is applied to Energy Shield instead]
────────────────────────────
```
> **Design:** Inspired by PoE2's Ligurium Talisman + ES body. ES covers physical too. Pure ES build enabler.

---

**🛡️ Cloak of the Hollow** *(Leather — Archer/Samurai)*
```
Legendary Body Armour
"The one who can't be touched, can't be stopped."
────────────────────────────
+ 180 Evasion
+ 100% Increased Evasion
[While Evasion > 500: +10% Damage]
[While Evasion > 1000: +10% more Dodge Chance]
────────────────────────────
```
> **Design:** Inspired by PoE2's Queen of the Forest. Evasion scales offense and defense.

---

**🛡️ Thornweave Plate** *(Chain — Warrior)*
```
Epic Body Armour
"It grows sharper as the fight continues."
────────────────────────────
+ 150 Life
+ 100 Armour
+ 80 Evasion
+ 60 Thorns Damage
[Each hit you receive increases Thorns by +5 for 10s (max 10 stacks)]
────────────────────────────
```
> **Design:** Progressive thorns — longer fight = more thorns. Warrior sustain through battle.

---

**🛡️ Silkghost Robe** *(Robe — Mage)*
```
Legendary Body Armour
"Matter has no authority here."
────────────────────────────
+ 100 Energy Shield
+ 80% Energy Shield
+ 15% Cold Resistance
[When Spell Amplify activates: restore 10% Energy Shield]
────────────────────────────
```
> **Design:** Spell Amplify as ES sustain. Mage ES recovery is tied to their class special.

---

**🛡️ Penitent's Hauberk** *(Chain — Any)*
```
Legendary Body Armour
"Pain is the only honest teacher."
────────────────────────────
+ 160 Life
+ 120 Armour
+ 80 Evasion
[Each time you take damage exceeding 10% max life: gain +5% damage for 5s (max 5 stacks)]
[Taking damage stacks faster, but dying is also faster]
────────────────────────────
```
> **Design:** Inspired by PoE2's Penitent armor concept — take pain, gain power. Universal high-risk option.

---

**🛡️ The Vanishing** *(Leather — Archer)*
```
Epic Body Armour
"Strike from where they cannot see."
────────────────────────────
+ 160 Evasion
+ 80% Evasion
+ 10% Dodge Chance
[Dodge Chance also applies to Skill Damage reduction (dodge "dodges" skill effects)]
────────────────────────────
```

---

### 2.5 GLOVES

#### Gloves Unique Items (6 items)

**🥊 Berserker's Grip** *(Gauntlet — Warrior)*
```
Legendary Gloves
"Grip it. Break it."
────────────────────────────
+ 60% Physical Damage
+ 30 Armour
+ 12 Life on Hit
[Thorns Damage applies to your Taps as bonus Physical Damage (15%)]
────────────────────────────
```
> **Design:** Warrior offensive gloves. Thorns adds to tap damage — convert defense to offense.

---

**🥊 Swiftfingers** *(Bracer — Archer/Samurai)*
```
Legendary Gloves
"So fast, they blur."
────────────────────────────
+ 14% Multi-Hit Chance   ← (highest multi-hit on gloves)
+ 9% Critical Strike Chance
+ 8% Dodge Chance
────────────────────────────
```
> **Design:** Highest multi-hit on gloves. Archer's core gloves — more hits per tap.

---

**🥊 Witchfire Wraps** *(Wrap — Mage)*
```
Legendary Gloves
"Your hands are the last thing they see."
────────────────────────────
+ 45 Fire Damage
+ 50 Energy Shield
+ 5% Spell Amplify Chance
[Skill casts apply a 3s damage debuff to the enemy (-15% resistance to that element)]
────────────────────────────
```
> **Design:** Mage gloves that debuff enemy resistance. Stack fire → fire skill debuffs fire resist → more fire damage.

---

**🥊 Crit Conductor** *(Wrap — Samurai)*
```
Legendary Gloves
"Every touch is a verdict."
────────────────────────────
+ 9% Critical Strike Chance
+ 50% Critical Strike Multiplier
+ 3% Life Leech
[On Critical Hit: 20% chance to gain +1 Momentum Stack immediately]
────────────────────────────
```

---

**🥊 Ironclad Gauntlets** *(Gauntlet — Warrior)*
```
Epic Gloves
"Nothing slips through."
────────────────────────────
+ 25% Physical Damage
+ 40 Armour
+ 20 Thorns Damage
[Block Chance +5%]
────────────────────────────
```

---

**🥊 Phantom Touch** *(Bracer — Archer)*
```
Epic Gloves
"It hits before you aim."
────────────────────────────
+ 7% Critical Strike Chance
+ 10% Multi-Hit Chance
[Each Dodge gives +2% Critical Strike Chance for 3s (max 5 stacks)]
────────────────────────────
```
> **Design:** Dodge stacks multi-hit. Archer rhythm: dodge → gain multi-hit → hit harder.

---

### 2.6 BOOTS

#### Boots Unique Items (6 items)

**👢 Stormwalkers** *(Leather Boots — Archer)*
```
Legendary Boots
"Speed is the only armour that matters."
────────────────────────────
+ 15% Dodge Chance   ← (highest dodge on boots)
+ 10% Multi-Hit Chance
[After Dodging: +5% Multi-Hit Chance for 3s (stacks 3x)]
────────────────────────────
```
> **Design:** Inspired by PoE2 Darkray Vectors. Dodge triggers multi-hit stacking — evasion becomes offense.

---

**👢 Ironwall Sabatons** *(Plate Boots — Warrior)*
```
Legendary Boots
"Each step is a wall."
────────────────────────────
+ 100 Life
+ 80 Armour
+ 15% Fire Resistance
[Return 5% of damage taken back to attacker]   ← damage_return
[Every 5s of combat: +2% Block Chance (max +10% bonus)]
────────────────────────────
```
> **Design:** Sustained combat reward. Warrior gets more defensive the longer the fight.

---

**👢 Ghoststep Slippers** *(Silk Boots — Mage/Any)*
```
Legendary Boots
"Walk between moments."
────────────────────────────
+ 60 Energy Shield
+ 15% Cooldown Reduction
+ 10% Cold Resistance
[After using a Skill: +5% Dodge Chance for 3s]
────────────────────────────
```
> **Design:** Mage CDR boots. Skill use = brief dodge window. Fits Mage glass-cannon survival.

---

**👢 Ragebinders** *(Chain Boots — Any)*
```
Epic Boots
"Run faster when it burns."
────────────────────────────
+ 80 Life
+ 15% Fire Resistance
+ 40 Armour
[Below 50% Life: +10% Dodge Chance bonus]
────────────────────────────
```

---

**👢 Coward's Pace** *(Leather Boots — Any)*
```
Legendary Boots
"Run first. Fight second."
────────────────────────────
+ 12% Dodge Chance
+ 50 Evasion
[You count as Low Life while at 60% max Life or below]
[Low Life bonuses activate earlier]
────────────────────────────
```
> **Design:** Inspired by PoE2's Coward's Legacy belt. Low life threshold — risk/reward. Archer pairs perfectly.

---

**👢 Earthbound Greaves** *(Plate Boots — Warrior)*
```
Epic Boots
"Immovable. Unbreakable."
────────────────────────────
+ 100 Armour
+ 100 Life
+ 15% Lightning Resistance
[+5% Damage Taken Reduction]
────────────────────────────
```

---

### 2.7 BELTS

#### Belt Unique Items (8 items)

**👑 The Endless Hunger** *(Leather Belt — Any)*
```
Legendary Belt
"It always wants more."
────────────────────────────
+ 120 Life
+ 20% Increased Life
+ 30% Gold Find
[Life Leech is instant (same as Wraithblade but on belt)]
[Life from Flask can Overflow max Life by 20%]
────────────────────────────
```
> **Design:** Combines instant leech + overflow flask. Sustain monster belt.

---

**👑 Titan's Girdle** *(Heavy Belt — Warrior)*
```
Legendary Belt
"What it binds, it strengthens."
────────────────────────────
+ 100 Armour
+ 100 Life
+ 25% Increased Life
[Thorns Damage = 5% of max Life (scales with your HP stack)]
────────────────────────────
```
> **Design:** Warrior HP stacking belt where HP converts to thorns. More HP = more thorns passive damage.

---

**👑 Coldsnap Sash** *(Chain Belt — Mage)*
```
Epic Belt
"Even time slows here."
────────────────────────────
+ 60 Energy Shield
+ 20% Cooldown Reduction
+ 12% Cold Resistance
[Cold Skills also reduce enemy damage output by 10% for 3s]
────────────────────────────
```

---

**👑 Headhunter's Mark** *(Cloth Belt — Any)*
```
Legendary Belt
"Wear their power."
────────────────────────────
+ 20% Gold Find
+ 10% XP Bonus
[On killing an Elite/Boss enemy: steal their highest stat for 20s]
[Possible steal: +30% damage, +15% CDR, +20% crit, +10% dodge]
────────────────────────────
```
> **Design:** Directly inspired by PoE2's Headhunter. The ultimate meta belt — makes elite kills feel massive.

---

**👑 Momentum Band** *(Chain Belt — Samurai)*
```
Epic Belt
"Never stop moving forward."
────────────────────────────
+ 80 Life
+ 15% Cooldown Reduction
[Consecutive Critical Hits: each crit reduces next skill CD by 0.5s (max 2s reduction)]
────────────────────────────
```
> **Design:** Samurai crit → CDR feedback loop. Fast critting = faster skills.

---

**👑 Coward's Chain** *(Leather Belt — Archer)*
```
Legendary Belt
"Fear is just awareness."
────────────────────────────
+ 90 Life
+ 20% Increased Life
[You count as Low Life below 65% HP (earlier than default 35%)]
[Low Life: +15% multi-hit chance, +10% damage]
────────────────────────────
```
> **Design:** Archer low-life build enabler. Hover at 50-65% HP for permanent speed boost.

---

**👑 Flask Catalyst** *(Leather Belt — Any)*
```
Epic Belt
"Every sip is sacred."
────────────────────────────
+ 70 Life
+ 50% Potion Effectiveness
[Potions grant +20% Tap Damage and +20% Skill Damage for 5s]
────────────────────────────
```
> **Design:** Potion build support. Potions become tactical resources, not just emergency heals.

---

**👑 The Balance** *(Heavy Belt — Any)*
```
Legendary Belt
"Take less to give more."
────────────────────────────
+ 80 Armour
+ 80 Life
[50% of Damage Taken is Recouped as HP over 8s]
[- 10% Max Life]
────────────────────────────
```
> **Design:** Inspired by PoE2's Recoup mechanic. Take hits, heal them back slowly. Great for sustained combat.

---

### 2.8 RINGS

#### Ring Unique Items (10 items)

**💍 The Eternal Ember** *(Topaz Ring — Fire Mage)*
```
Legendary Ring
"It never cools."
────────────────────────────
Implicit: +28 Fire Damage
────────────────────────────
+ 60% Fire Damage
+ 20% Fire Resistance
[Fire Skills deal bonus damage equal to 5% of your Fire Resistance]
────────────────────────────
```
> **Design:** Fire resistance becomes fire offense. Mage invests in res and gets damage back.

---

**💍 The Frozen Theorem** *(Sapphire Ring — Cold Mage)*
```
Legendary Ring
"Cold logic, absolute."
────────────────────────────
Implicit: +25 Cold Damage
────────────────────────────
+ 55% Cold Damage
+ 15% Cold Resistance
[Cold Damage Penetrates 15% of enemy resistance]
────────────────────────────
```
> **Design:** Cold penetration ring. PoE2 Pandemonius adapted.

---

**💍 Ring of Dominion** *(Iron Ring — Warrior)*
```
Legendary Ring
"Command through strength."
────────────────────────────
Implicit: +20 Physical Damage
────────────────────────────
+ 40% Physical Damage
+ 15% Fire Resistance
+ 15% Cold Resistance
[Block Chance also provides Resistance to all elements equal to 10% of Block Chance]
────────────────────────────
```
> **Design:** Warrior synergy ring. Block → resistance conversion covers elemental weakness.

---

**💍 Bloodpact Ring** *(Ruby Ring — Samurai)*
```
Legendary Ring
"Life for power. Always."
────────────────────────────
Implicit: +45 Life
────────────────────────────
+ 60% Critical Strike Multiplier
+ 3% Life Leech
[Critical Hits restore 3x the leech amount (instant)]
────────────────────────────
```
> **Design:** Inspired by PoE2's Carnage Heart. Amplified leech on crits for Samurai sustain.

---

**💍 Speedring of the Hunt** *(Gold Ring — Archer)*
```
Legendary Ring
"The hunter doesn't wait."
────────────────────────────
Implicit: +35% Gold Find
────────────────────────────
+ 12% Multi-Hit Chance
+ 8% Critical Strike Chance
+ 20% Gold Find
[On Double Shot proc: +5% multi-hit chance for 2s (stacks up to 3x)]
────────────────────────────
```
> **Design:** Archer farm ring. Double Shot triggers multi-hit buff — more hits = more procs = more hits.

---

**💍 The Mirror** *(Any Ring — Any)*
```
Legendary Ring
"Reflect everything."
────────────────────────────
[This ring copies the stats of your OTHER equipped ring]
[Copies: flat damage, %, resistance values]
[Does NOT copy: unique effects, implicit]
────────────────────────────
```
> **Design:** Directly inspired by PoE2's Kalandra's Touch. One ring = two rings if you have a strong ring. Very powerful build tool.

---

**💍 Omen Circle** *(Ruby Ring — Any)*
```
Epic Ring
"What it predicts, it ensures."
────────────────────────────
Implicit: +30 Life
────────────────────────────
+ 40 Life
+ 10% Life Regen
[When HP drops below 30%: instantly restore 15% Life (once per combat)]
────────────────────────────
```
> **Design:** Emergency self-save. Designed for high-risk builds to have a floor.

---

**💍 Ring of Vengeance** *(Iron Ring — Warrior)*
```
Epic Ring
"Every wound earns interest."
────────────────────────────
Implicit: +15 Physical Damage
────────────────────────────
+ 30 Thorns Damage
+ 10% Physical Damage
[Return 8% of damage taken back to attacker]   ← damage_return (unique mechanic)
[Damage return increases by +2% for every 50 damage received (max +20%)]
────────────────────────────
```

---

**💍 Mist Signet** *(Any Ring — Archer)*
```
Legendary Ring
"In the fog, everything dies."
────────────────────────────
[No implicit]
────────────────────────────
+ 8% Dodge Chance
+ 15% Multi-Hit Chance
[After Dodging: next 3 taps deal +25% damage]
────────────────────────────
```
> **Design:** Dodge → damage window. Rewards Archer for active dodge skill.

---

**💍 Serpent's Coil** *(Gold Ring — Any)*
```
Legendary Ring
"It multiplies your gifts."
────────────────────────────
Implicit: +25% Gold Find
────────────────────────────
+ 40% Gold Find
+ 8% XP Bonus
[On kill: 5% chance to drop 2x loot from that enemy]
────────────────────────────
```
> **Design:** Inspired by PoE2's Serpent's Egg (double charges). Double loot chance.

---

### 2.9 AMULETS

#### Amulet Unique Items (10 items)

**📿 Heart of the Inferno** *(Talisman — Fire Mage)*
```
Legendary Amulet
"It burns even when you're cold."
────────────────────────────
+ 45 Fire Damage
+ 70% Fire Damage
+ 15% Skill Damage
+ 15% Cooldown Reduction
[Fire Resistance on all gear is treated as +5% Fire Damage bonus]
────────────────────────────
```
> **Design:** Fire res → fire damage synergy. Fire Mage rewards investing in resist with offense.

---

**📿 Defiance of Fate** *(Pendant — Any)*
```
Legendary Amulet
"It denies the killing blow."
────────────────────────────
+ 80 Life
+ 15% Increased Life
[Recover 25% of Missing Life before taking a killing blow (once per combat)]
────────────────────────────
```
> **Design:** Inspired by PoE2's Defiance of Destiny. Anti-death mechanic. Universal survival tool.

---

**📿 The Omniscient Eye** *(Locket — Warrior)*
```
Legendary Amulet
"It sees the blow before it lands."
────────────────────────────
+ 60 Life
+ 20% Cooldown Reduction
[Block Chance also applies to Skill Damage (block reduces skill damage taken by block %)]
────────────────────────────
```
> **Design:** Warrior's defensive skills extended to block skill damage too.

---

**📿 Soul Anchor** *(Talisman — Samurai)*
```
Legendary Amulet
"Stay sharp. Stay alive."
────────────────────────────
+ 55 Life
+ 45% Critical Strike Multiplier
+ 4% Life Leech
[After a Critical Hit: you cannot die for 0.5s]
────────────────────────────
```
> **Design:** Burst survival — critting keeps you alive momentarily. PoE2 grace-period concept.

---

**📿 Choir of Elements** *(Locket — Mage)*
```
Legendary Amulet
"When all three elements harmonize, creation trembles."
────────────────────────────
+ 35 Fire Damage
+ 35 Cold Damage
+ 35 Lightning Damage
+ 10% Skill Damage
[Gain 5% increased damage for each elemental type you've dealt this combat (max 3 stacks)]
────────────────────────────
```
> **Design:** Inspired by PoE2's Choir of the Storm/Coming Calamity. Rewards using all 3 elements.

---

**📿 Xoph's Legacy** *(Amber Pendant — Fire Mage)*
```
Legendary Amulet
"Your presence is a furnace."
────────────────────────────
+ 50 Fire Damage
+ 50% Fire Damage
[Enemies have -15% Fire Resistance while in combat with you]
────────────────────────────
```
> **Design:** Directly adapted from PoE2's Xoph's Blood. Fire aura debuff on enemies. Fire Mage endgame amulet.

---

**📿 The Pandemonious** *(Lapis Pendant — Cold Mage)*
```
Legendary Amulet
"Cold is not a temperature. It is a will."
────────────────────────────
+ 50 Cold Damage
+ 60% Cold Damage
[Cold Damage Penetrates 25% of Enemy Cold Resistance]
────────────────────────────
```
> **Design:** Directly adapted from PoE2's Pandemonius. Best cold penetration in the game.

---

**📿 Bloodbound** *(Crimson Pendant — Samurai)*
```
Legendary Amulet
"Healing is just stored pain."
────────────────────────────
+ 50 Life
+ 80% Critical Strike Multiplier
[200% increased Life Leech rate]
[Life Leech does not stop when at full life]
────────────────────────────
```
> **Design:** Adapted from PoE2's Carnage Heart. Leech is much faster AND continues past full HP (overheal buffer).

---

**📿 Serpent's Eye** *(Gold Pendant — Farmer)*
```
Legendary Amulet
"It sees the gold in everything."
────────────────────────────
+ 40% Gold Find
+ 20% Gold on Kill (flat)
+ 15% XP Bonus
[+1 to all Skill Limits (can use each skill one more time before CD)]
────────────────────────────
```
> **Design:** Adapted from PoE2's Idol of Uldurn. Farm build + extra skill uses. Utility monster.

---

**📿 The Reckoning** *(Bloodstone — Warrior)*
```
Legendary Amulet
"It counts every sin."
────────────────────────────
+ 70 Life
+ 30% Passive DPS Bonus
[Each Block deals 5% of your total Thorns damage to the current target]
[Endurance Stacks persist for 5s longer]
────────────────────────────
```

---

## PART 3 — CLASS ITEM SETS (BiS Recommendations)

### Best-in-Slot Sets per Class

#### 🛡️ WARRIOR — "Indestructible Fortress" Set
```
GOAL: Maximum HP + Thorns + Armor → converts defense to offense

Weapon:    Ironclad Verdict (1H Sword) OR The Aegis Fist (1H Mace)
Armor:     Kaom's Will OR The Iron Fortress
Helmet:    Iron Sentinel
Gloves:    Berserker's Grip
Belt:      Titan's Girdle
Boots:     Ironwall Sabatons
Ring 1:    Ring of Dominion (Block → Resistance)
Ring 2:    Ring of Vengeance (Thorns scales with damage taken)
Amulet:    The Reckoning OR The Omniscient Eye

TOTAL SYNERGY:
- Max HP: ~2,000+ at L60
- Armor: ~1,200+ (converts to ~30+ bonus tap damage via Ironclad Verdict)
- Thorns: ~180+ (Kaom's Will: 15% of 2000 HP = 300 thorns passive)
- Damage Return: 15% (Iron Fortress) + 5% (Ironwall Sabatons) + 8% (Ring of Vengeance) = 28%
- Block: ~35%+ (with Iron Sentinel's doubling above 80% HP)
- Resistances: plugged via Ring of Dominion (block→res)
```

---

#### ⚔️ SAMURAI — "Momentum Reaper" Set
```
GOAL: Stack crit → leech → more crit → explode everything

Weapon:    Whisper of Lethal (Dagger) OR Final Verdict (Sword)
Armor:     Cloak of the Hollow (Evasion → Damage)
Helmet:    Momentum Mask (crit stacks crit multiplier)
Gloves:    Crit Conductor
Belt:      Momentum Band (crits reduce skill CD)
Boots:     Stormwalkers OR normal dodge boots
Ring 1:    Bloodpact Ring (3x leech on crit)
Ring 2:    The Mirror (copies Bloodpact!)
Amulet:    Bloodbound (200% leech rate, overheal)

TOTAL SYNERGY:
- Crit Chance: ~40%+ (5% base + helmet + gloves + rings)
- Crit Multi: base 2.68× + 85% (dagger) + 50% (gloves) + 80% (amulet) ≈ 4.8x
- Life Leech: 3% (dagger) + 3% (gloves) + 4% (amulet) = 10% of damage → HP/s
- Mirror Ring copies Bloodpact → 6% leech effectively
- Momentum Band: 10 crits → 5s total CD reduction on skills
```

---

#### 🧙 MAGE — "Eternal Firestorm" Set
```
GOAL: Maximum fire damage + CDR → near-constant skill spam

Weapon:    The Endless Lecture (Staff) OR Pyrostaff Wand + off-hand
Armor:     Wraithweave Robe OR Silkghost Robe
Helmet:    The Oracle's Veil (predictable Spell Amplify) OR Mindveil Circlet
Gloves:    Witchfire Wraps (debuff fire resist on skill cast)
Belt:      Coldsnap Sash (20% CDR) OR Momentum Band
Boots:     Ghoststep Slippers (15% CDR + speed)
Ring 1:    The Eternal Ember (fire res → fire damage)
Ring 2:    The Frozen Theorem (cold pen) OR second Eternal Ember
Amulet:    Heart of the Inferno (fire res → damage) OR Xoph's Legacy

TOTAL SYNERGY:
- CDR: 25% (staff) + 15% (belt) + 15% (boots) + 20% (helm) = 75% raw, capped at 40%
  → Fireball: 3s × 0.60 = 1.8s cooldown
  → Explosion: 5s × 0.60 = 3.0s cooldown
- Fire Damage: ~400%+ multiplier
- Spell Amplify: every 5th skill (Oracle's Veil) = guaranteed every ~9s
- Enemy fire resist: -15% (Xoph's amulet) + -15% (Witchfire debuff) = -30% → enemies at effectively -30%
```

---

#### 🏹 ARCHER — "Bullet Storm" Set
```
GOAL: Maximum hit rate + sustain through volume of hits

Weapon:    Phantom Needle (Dagger) OR Stormrend Bow
Armor:     The Vanishing OR Cloak of the Hollow
Helmet:    Phantom Crown (dodge→multi-hit proc)
Gloves:    Swiftfingers (14% multi-hit + 9% crit + 8% dodge)
Belt:      Coward's Chain (low-life 65% threshold for +15% multi-hit)
Boots:     Stormwalkers (15% dodge → multi-hit stacking)
Ring 1:    Speedring of the Hunt (Double Shot stacks speed)
Ring 2:    Mist Signet (dodge → 3 taps at +25% damage)
Amulet:    Choir of Elements OR normal leech amulet

TOTAL SYNERGY:
- Multi-Hit: 18% (dagger) + 14% (gloves) + 5% (boots) + 15% (belt low-life) = 52% (soft cap at 35%)
- Dodge: 10% (helm) + 15% (boots) + 8% (ring) = 33% total dodge
- After dodge: 3 taps at +25% = Mist Signet payoff
- Double Shot: 29% base + Double Shot ring stacking = ~35% each tap
```

---

## PART 4 — ITEM DESIGN RULES (For Developers)

### 4.1 Unique Item Creation Rules
```
1. Every unique MUST have at least 1 stat that normal items cannot roll
2. Every unique MUST have a clear "for whom" — class or playstyle
3. No unique should be universally best-in-slot for every class
4. Tradeoff uniques (gain X, lose Y) create memorable identities
5. Uniques that interact with class specials are the most engaging
6. At least 30% of uniques should have "inverter" mechanics (loss → gain)
```

### 4.2 Normal Item Stat Rules
```
- Same stat cannot appear twice on one item
- Common items: draw from "basic" pool only
- Epic+: draw from "advanced" pool (CDR, leech, multi-hit, etc.)
- Legendary: may include "legendary-exclusive" stats (execute, spell_amp, armor_to_damage)
- Resist stats: never more than 2 elements on one item
- Damage stats: max 3 offensive stats per item (prevents stacking all damage)
```

### 4.3 Drop Distribution
```
Zone enemies:     ~60% Common, ~25% Rare, ~12% Epic, ~3% Legendary
Boss rewards:     ~20% Common, ~40% Rare, ~30% Epic, ~10% Legendary
Map boss reward:  Guaranteed Epic+; 25% chance Legendary
iLvl distribution: ±5 from current zone level
```

### 4.4 Stat Scaling Reference (All Tiers)
| Stat | T5 (1-19) | T4 (20-39) | T3 (40-59) | T2 (60-79) | T1 (80-100) |
|------|-----------|------------|------------|------------|-------------|
| fire_res | 3-8% | 3-14% | 3-22% | 3-32% | 3-45% |
| cold_res | 3-8% | 3-14% | 3-22% | 3-32% | 3-45% |
| lightning_res | 3-8% | 3-14% | 3-22% | 3-32% | 3-45% |
| phys_res | 3-8% | 3-14% | 3-22% | 3-32% | 3-45% |
| cooldown_reduction | 2-5% | 2-8% | 2-12% | 2-16% | 2-22% |
| life_leech | 0.5-1% | 0.5-2% | 0.5-3% | 0.5-4.5% | 0.5-6% |
| skill_damage | 3-10% | 3-20% | 3-35% | 3-55% | 3-80% |
| pct_fire_dmg | 3-10% | 3-20% | 3-35% | 3-55% | 3-80% |
| dodge_rating | 0.5-2% | 0.5-3% | 0.5-5% | 0.5-7% | 0.5-10% |
| thorns | 1-5 | 1-15 | 1-30 | 1-55 | 1-90 |
| multi_hit_chance | 1-2% | 1-4% | 1-6% | 1-9% | 1-12% |
| damage_vs_bosses | 3-8% | 3-15% | 3-25% | 3-40% | 3-60% |
| damage_taken_reduction | 1-2% | 1-3% | 1-4% | 1-5% | 1-7% |

---

## PART 5 — UNIQUE ITEM SUMMARY TABLE

| # | Name | Slot | Type | Class | Key Mechanic |
|---|------|------|------|-------|--------------|
| 1 | Ironclad Verdict | 1H Sword | Offense | Warrior | Armor → tap damage |
| 2 | Thornwall Edge | 1H Sword | Tank | Warrior | Block → thorns counter |
| 3 | Crimson Momentum | 1H Sword | Burst | Samurai | Crit stacks crit chance |
| 4 | Final Verdict | 1H Sword | Execute | Samurai | Execute below 15% HP |
| 5 | Phantom Silhouette | 1H Sword | Speed | Archer | Dodge → 2x next tap |
| 6 | Wraithblade | 1H Sword | Sustain | Any | Instant Life Leech |
| 7 | Earthsplitter | 1H Axe | Heavy | Warrior | 25% double-damage proc (Seismic Strike) |
| 8 | Sever & Sear | 1H Axe | Hybrid | Mage | Phys counts as fire |
| 9 | Bloodletter | 1H Axe | Burst | Samurai | 5x proc, costs HP |
| 10 | Voidcleaver | 1H Axe | Endgame | Any | Boss damage |
| 11 | Whisper of Lethal | Dagger | Core | Samurai | 2x leech on crit |
| 12 | Shadowfang | Dagger | Rhythm | Samurai | 5th tap = guaranteed crit |
| 13 | Soulpiercer | Dagger | Endgame | Any | Crit ignores 25% resist |
| 14 | Gutripper | Dagger | Farm | Archer | Multi-hit + gold find |
| 15 | Phantom Needle | Dagger | Speed | Archer | Highest multi-hit, Double Shot synergy |
| 16 | Pyrostaff Wand | Wand | Fire | Mage | Fire CDR + spell amp |
| 17 | Stormcaller's Wand | Wand | Lightning | Mage | Spell Amp = free skill cast |
| 18 | Glacial Cipher | Wand | Cold | Mage | Cold skills debuff enemies |
| 19 | Voidtongue | Wand | Mixed | Mage | All 3 elements simultaneously |
| 20 | Arcanist's Mark | Wand | Rhythm | Mage | 3-skill burst cycle |
| 21 | The Aegis Fist | Mace | Tank | Warrior | Block → counter damage |
| 22 | Overcrusher | Mace | Power | Warrior | 3rd tap = 200% damage |
| 23 | Bonebreaker | Mace | Debuff | Any | Armor shred stacks |
| 24 | Twin Burden | Mace | Raw | Any | Highest damage, heavy penalty |
| 25 | Colossus Grind | 2H Sword | Tank | Warrior | Armor → flat phys per hit |
| 26 | Splitwind Axe | 2H Axe | Speed | Any | Every tap hits twice |
| 27 | Stormrend Bow | Bow | Crit | Archer | Crit → lightning proc |
| 28 | Widow's Whisper | Bow | Hybrid | Archer | 30% phys → cold |
| 29 | Gloom Arrow | Bow | Boss | Archer | 50% boss damage |
| 30 | Archon's Stave | Staff | Multi | Mage | All elements synergy |
| 31 | The Endless Lecture | Staff | Fire | Mage | -25% fire CDR |
| 32 | Frostweave Sanctum | Staff | Cold | Mage | Cold slows enemies |
| 33 | The Titan's Promise | 2H Mace | Power | Warrior | 4th tap = 250% slam, ignores 20% resistance |
| 34 | The Paradox | 2H Axe | Risk | Any | Pain stacks damage |
| 35 | Iron Sentinel | Helmet | Tank | Warrior | Block doubles above 80% HP |
| 36 | Mindveil Circlet | Helmet | Burst | Mage | Skills share/reset cooldown every 8s |
| 37 | Headhunter's Eye | Helmet | Farm | Any | Boss kill → random stat buff |
| 38 | Phantom Crown | Helmet | Speed | Archer | Dodge → multi-hit chance |
| 39 | Momentum Mask | Helmet | Crit | Samurai | Crit stacks crit multiplier |
| 40 | Voidcrown | Helmet | Leveling | Any | Most XP + CDR |
| 41 | Forsaken Faceplate | Helmet | Thorns | Warrior | Double/triple thorns |
| 42 | The Oracle's Veil | Helmet | Control | Mage | Spell Amp every 5th skill |
| 43 | The Iron Fortress | Armor | Tank | Warrior | 15% damage return + armor doubles at low HP |
| 44 | Kaom's Will | Armor | HP | Warrior | +300 HP, thorns = 15% HP |
| 45 | Wraithweave Robe | Armor | ES | Mage | ES covers physical |
| 46 | Cloak of the Hollow | Armor | Evasion | Archer | Evasion → damage + dodge |
| 47 | Thornweave Plate | Armor | Reactive | Warrior | Thorns grow during combat |
| 48 | Silkghost Robe | Armor | Sustain | Mage | Spell Amp restores ES |
| 49 | Penitent's Hauberk | Armor | Risk | Any | Take damage → gain damage |
| 50 | The Vanishing | Armor | Evasion | Archer | Dodge on skills too |
| 51 | Berserker's Grip | Gloves | Offense | Warrior | Thorns adds to taps |
| 52 | Swiftfingers | Gloves | Speed | Archer | Highest multi-hit on gloves |
| 53 | Witchfire Wraps | Gloves | Debuff | Mage | Skills reduce enemy elemental resist |
| 54 | Crit Conductor | Gloves | Crit | Samurai | Crit → Momentum stacks |
| 55 | Ironclad Gauntlets | Gloves | Tank | Warrior | Block + thorns + armor |
| 56 | Phantom Touch | Gloves | Combo | Archer | Dodge → crit stacks |
| 57 | Stormwalkers | Boots | Dodge | Archer | Dodge → multi-hit stacks |
| 58 | Ironwall Sabatons | Boots | Tank | Warrior | 5% damage return + combat duration → block |
| 59 | Ghoststep Slippers | Boots | CDR | Mage | Skill use → dodge buff |
| 60 | Ragebinders | Boots | Risk | Any | Low life → dodge bonus |
| 61 | Coward's Pace | Boots | Risk | Any | Low life at 60% threshold |
| 62 | Earthbound Greaves | Boots | Defense | Warrior | Armor + HP + DTR |
| 63 | The Endless Hunger | Belt | Sustain | Any | Instant leech + flask overflow |
| 64 | Titan's Girdle | Belt | Tank | Warrior | HP → thorns conversion |
| 65 | Coldsnap Sash | Belt | CDR | Mage | CDR + cold resist + debuff |
| 66 | Headhunter's Mark | Belt | Elite | Any | Steal elite stat for 20s |
| 67 | Momentum Band | Belt | Crit | Samurai | Crits reduce skill CD |
| 68 | Coward's Chain | Belt | Risk | Archer | Low life at 65%, multi-hit buff |
| 69 | Flask Catalyst | Belt | Utility | Any | Potions grant action buff |
| 70 | The Balance | Belt | Sustain | Any | Recoup 50% damage taken |
| 71 | The Eternal Ember | Ring | Fire | Mage | Fire res → fire damage |
| 72 | The Frozen Theorem | Ring | Cold | Mage | Cold penetration |
| 73 | Ring of Dominion | Ring | Tank | Warrior | Block → resistance |
| 74 | Bloodpact Ring | Ring | Crit | Samurai | 3x leech on crit |
| 75 | Speedring of the Hunt | Ring | Speed | Archer | Double Shot → multi-hit buff |
| 76 | The Mirror | Ring | Meta | Any | Copies other ring's stats |
| 77 | Omen Circle | Ring | Safety | Any | Emergency 15% restore |
| 78 | Ring of Vengeance | Ring | Return | Warrior | 8% damage return, scales with hits taken |
| 79 | Mist Signet | Ring | Combo | Archer | Dodge → 3 buffed taps |
| 80 | Serpent's Coil | Ring | Farm | Any | Double loot chance |
| 81 | Heart of the Inferno | Amulet | Fire | Mage | Fire res → fire damage (amulet) |
| 82 | Defiance of Fate | Amulet | Safety | Any | Prevent one death |
| 83 | The Omniscient Eye | Amulet | Tank | Warrior | Block reduces skill damage |
| 84 | Soul Anchor | Amulet | Burst | Samurai | Crit → 0.5s invulnerability |
| 85 | Choir of Elements | Amulet | Multi | Mage | 3 elements → triple damage bonus |
| 86 | Xoph's Legacy | Amulet | Fire | Mage | Enemies have -15% fire res |
| 87 | The Pandemonious | Amulet | Cold | Mage | 25% cold penetration |
| 88 | Bloodbound | Amulet | Leech | Samurai | 200% leech + overheal |
| 89 | Serpent's Eye | Amulet | Farm | Any | +1 skill use + gold |
| 90 | The Reckoning | Amulet | Tank | Warrior | Block → Thorns pulse on target |

**Total: 90 unique items across all slots**
