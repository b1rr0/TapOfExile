# TapOfExile — Game Design Analysis
### Equipment, Classes & PoE2 Adaptation

> **Senior Game Designer Review** — Analyzing equipment-stats-analysis.md + poe2-item-mechanics.md + class system
> Focus: Player engagement, class identity, balance, tap-game adaptation

---

## EXECUTIVE SUMMARY

TapOfExile has a **solid mechanical skeleton** — tap damage, cooldown skills, elemental resistances, rarity tiers, and 9 equipment slots. The current 22-stat pool covers the basics well. However, the system has **three critical design gaps** that limit player engagement and long-term retention:

1. **No resistance on items** → Defense has no optimization layer
2. **No build identity through gear** → Every class gears identically
3. **Skills and gear are disconnected** → Items don't modify how skills feel

These gaps mean players can't express preferences through gear choices — you're just chasing bigger numbers, not building a character. This document fixes that.

---

## PART 1 — WHAT MAKES PoE2 ITEMS COMPELLING (And Why It Works)

### 1.1 The "Gear Narrative" Principle

In PoE2, every equipped item tells part of your build story. A player looks at their gear and can read: *"I'm an Ignite Elementalist — my chest has fire damage gain, my ring converts cold to fire, my belt has CDR so I cast more."*

**Your game currently lacks this.** A Warrior and a Mage in the same iLvl zone wear nearly identical gear — just different base numbers. There's no gear that "screams" Mage or Warrior.

**The fix:** Each class should have 2-3 stats that are *dramatically more valuable* for them than others. Then gear with those stats becomes "their" gear.

### 1.2 The "Three Satisfaction Loops" of Items

PoE2 items create engagement through three nested reward loops:

```
SHORT LOOP  (per kill)    → Loot drops, instant gratification
MEDIUM LOOP (per session) → Comparing items, deciding upgrades
LONG LOOP   (per week)    → Chasing a specific rare roll, building toward a goal
```

**Your current system:** Strong short loop (loot drops feel good), weak medium loop (limited comparison decisions), very weak long loop (no targeted goal — no "I need a ring with CDR + crit").

The new stats in equipment-stats-analysis.md **fix all three loops simultaneously** if implemented correctly.

### 1.3 The "Decision Density" Problem

PoE2's item depth comes from **meaningful trade-offs**, not just more stats. Every high-level player faces this constantly: *"Do I keep fire_res on this ring, or reroll it for crit_chance?"*

**Trade-offs to build into TapOfExile gear:**

| Trade-off | Option A | Option B | Why It's Interesting |
|-----------|----------|----------|----------------------|
| Offense vs. Survival | `pct_phys_dmg` | `fire_res` | Classic DPS vs. safety |
| Speed vs. Power | `attack_speed` | `crit_multiplier` | Fast weak hits vs. slow big hits |
| Flat vs. Scaling | `flat_hp` | `pct_hp` | Strong early vs. strong late |
| Skill vs. Tap | `skill_damage` | `crit_chance` | Burst window vs. consistent taps |
| Sustain vs. Peak | `life_leech` | `pct_phys_dmg` | Survivability vs. raw damage |

---

## PART 2 — STAT PRIORITY FOR MAXIMUM TAP-GAME ENGAGEMENT

### 2.1 The Tap-Game Constraint

Unlike ARPG where you move through zones, **tap games have a tighter feedback loop.** A player sees damage numbers every 50ms. This means:

- **Instant feedback stats are king** — crit_chance, multi_hit, attack_speed feel amazing
- **DoT/Regen stats feel weaker** — the feedback is slow and hard to see
- **Resistance gaps hurt fast** — dying to a fire mob in 3 hits is jarring

This shifts the priority order from standard ARPG wisdom.

### 2.2 Priority Tier List (Tap-Game Specific)

#### 🔴 MUST HAVE FIRST (Session 1 of implementation)

**1. `fire_res` / `cold_res` / `lightning_res`**
- **Why #1:** Without this, the resistance system feels half-built. Class resistances exist but gear can't fill the gaps. A Warrior with 0 fire resistance and no gear option to fix it is frustrating, not fun.
- **Tap-game relevance:** Very high. Elemental monsters will one-shot under-geared players. Resistance makes survival achievable without grinding HP.
- **Implementation complexity:** Low — just add to existing resistance calculation.

**2. `cooldown_reduction` (CDR)**
- **Why #2:** Skills are the most exciting moment in tap combat — the big boom every 2-5s. CDR directly increases how often those exciting moments happen.
- **Tap-game relevance:** Extremely high. This is THE stat for tap games — more skill presses = more dopamine hits.
- **Cap recommendation:** Hard cap at 40% total. At 40% CDR: 2s skill → 1.2s, 5s skill → 3s. Still meaningful, not broken.
- **Implementation complexity:** Low — multiply cooldownMs by (1 - cdr).

**3. `life_leech`**
- **Why #3:** Currently sustain = potions (limited) + life_on_hit (flat, weak scaling). Leech creates a sustain system that *rewards good play* (deal damage → survive). This is the most satisfying sustain feel in ARPGs.
- **Tap-game relevance:** High. Every tap triggers leech. High DPS = high sustain = rewarding tap speed.
- **Balance:** Cap leech recovery at 20% max HP/second to prevent immortality.

#### 🟠 HIGH VALUE (Phase 2)

**4. `skill_damage`**
- Separates "skill build" from "tap build." Creates a distinct playstyle: stack skill_damage, use skills as primary, tap as filler.
- Great for Mage identity — their skills should hit harder than their taps.

**5. `pct_fire_dmg` / `pct_cold_dmg` / `pct_lightning_dmg`**
- Enables elemental build specialization. Currently a fire Mage and lightning Mage gear identically. With these stats, you can commit to an element.
- Creates "fire build" vs "lightning build" player identity.

**6. `dodge_rating` on items**
- Extends dodge from class feature to build choice. Archer + dodge gear = glass cannon dancer. Warrior + dodge gear = unusual but valid.

#### 🟡 BUILD DIVERSITY (Phase 3)

**7. `multi_hit_chance`** — Archer synergy, "more hits" feel, great numbers feedback
**8. `damage_vs_bosses`** — Endgame-focused, creates boss-killer specialization
**9. `thorns`** — Warrior identity, passive combat feel, surprising damage source
**10. `damage_taken_reduction`** — Ultra-rare, ultra-valuable, creates strong item chase

#### 🟢 FLAVOR / LATE (Phase 4)

**11. `area_damage`** — Needs multi-enemy combat to feel meaningful
**12. `gold_on_kill`** — Farming build identity
**13. `potion_effectiveness`** — Enhances existing potion system depth

---

## PART 3 — CLASS × EQUIPMENT INTERACTION DESIGN

### 3.1 Design Principle: "Class Amplifies Gear, Gear Amplifies Class"

Each class should have stats where **1 point goes further** than it does on other classes. This creates natural gear magnetism — Samurai players *want* crit gear because their class multiplies crit.

### 3.2 Warrior — "The Converter" Build Identity

**Core fantasy:** Survive everything, punish enemies for attacking you.

**Current stats at Level 60:**
- HP: 100 + 17×18 = ~1,126 HP
- Tap Damage: 2 + 59×1.4 = ~84.6
- Block: 15% + 59×0.2% = ~26.8%
- Physical Res: 30% (hard-coded, doesn't grow)

**Design problem:** Warrior deals the LEAST damage per tap (1.4 growth vs Mage's 2.2). He's the tank but has no offensive payoff for tanking.

**The "Converter" Identity:**
Warrior should convert defensive stats INTO offensive power. This makes tanking rewarding, not just survivable.

```
WARRIOR GEAR SYNERGY CHAIN:
flat_armor → armor_to_damage → higher tap damage
block_chance → thorns → passive damage on blocks
flat_hp → damage_taken_reduction → sustain for longer fights
fire_res/cold_res → cover elemental gap → now can survive mage fights
```

**New stat suggestion: `armor_to_damage`**
> "+X% of total Armor added as Tap Damage bonus"
- Only meaningful for Warrior (highest armor investment)
- At 5% rate: 500 armor = +25 tap damage bonus
- Slots: Armor, Belt, Gloves
- Creates a completely unique stat axis for the class

**Endurance Stack concept** (no new stat needed — just a passive):
> "Each time you Block, gain a stack of Endurance (max 5). Each stack: +3% damage, -1% damage taken. Stacks decay 1/5s without blocking."
- Rewards active play in tap game
- Creates combat rhythm: get hit → block → stack → burst

**Warrior Ideal Gear Profile:**
```
Weapon:    flat_phys_dmg + life_on_hit + block_chance
Armor:     flat_hp + thorns + damage_taken_reduction
Helmet:    flat_hp + pct_hp + fire_res (plug elemental gap)
Gloves:    flat_armor + life_on_hit + thorns
Belt:      flat_hp + pct_hp + cold_res + life_regen
Boots:     move_speed + flat_hp + lightning_res
Ring (×2): fire_res + flat_hp | cold_res + life_on_hit
Amulet:    passive_dps_bonus + pct_hp + life_regen
```

---

### 3.3 Samurai — "The Momentum" Build Identity

**Core fantasy:** Build crit momentum, explode single targets, feel unstoppable.

**Current stats at Level 60:**
- Crit Chance: 5% + 59×0.3% = ~22.7%
- Crit Multiplier: 1.5 + 59×0.02 = ~2.68× base + 50%+59×2% Lethal Precision = ~169% total bonus
- Effective crit multiplier vs avg: very high burst

**Design problem:** Samurai has incredible burst but **zero sustain mechanics**. A run of bad RNG (no crits) = taking full damage with no recovery.

**The "Momentum" Identity:**
Crits should generate momentum — and momentum fuels sustain + more crits.

```
SAMURAI GEAR SYNERGY CHAIN:
crit_chance → hit crit threshold → life_leech activates
life_leech → stay alive during crit streaks → more taps
crit_multiplier → bigger crits → more leech per hit
life_on_hit → sustain between crits → bridge the gap
```

**New mechanic concept: `crit_momentum`**
> "Each critical hit grants 1 stack of Momentum (max 10). Each stack: +2% crit chance, +1% attack speed. Stacks reset when you take damage exceeding 15% max HP in one hit."
- No stat needed — implement as Samurai passive
- Creates a risk/reward "hot streak" feel
- Tapping fast feels different from tap-and-wait

**Combo Execute idea:**
> New stat on weapons: `execute_threshold` — "Kill enemies below X% HP"
- Samurai specific optimization
- Creates "two-tap" satisfaction: weaken → execute
- Slots: Weapon only

**Samurai Ideal Gear Profile:**
```
Weapon:    crit_chance + crit_multiplier + life_leech (Dagger)
Armor:     flat_hp + pct_evasion (dodge to avoid counter-damage)
Helmet:    crit_chance + flat_hp + xp_bonus
Gloves:    crit_chance + attack_speed + life_on_hit
Belt:      flat_hp + life_regen (bridge between crits)
Boots:     move_speed + flat_evasion + dodge_rating
Ring (×2): crit_multiplier + life_leech | flat_hp + crit_chance
Amulet:    passive_dps_bonus + crit_multiplier + pct_phys_dmg
```

---

### 3.4 Mage — "The Elemental Architect" Build Identity

**Core fantasy:** Build toward a specific element, nuke with skills, ES survives hits.

**Current stats at Level 60:**
- Tap Damage: 2 + 59×2.2 = ~131.8 (highest growth!)
- Spell Amplify: 8% + 59×0.3% = ~25.7% chance
- Fire Res: 20%, Lightning: 15%, Cold: 15%, Physical: 0%

**Design problem:** Mage has the highest tap damage growth but **Spell Amplify is uncontrollable**. Also, 0 physical resistance is a death sentence in physical-heavy zones. Items can't currently fix that.

**The "Elemental Architect" Identity:**
Mage should COMMIT to one element and make it devastating. Items let you go "all-in" on fire, cold, or lightning.

```
MAGE GEAR SYNERGY CHAIN:
pct_fire_dmg (weapon + ring + amulet) → fire damage multiplied
cooldown_reduction (helmet + amulet) → fire skills more frequent
flat_fire_dmg (ring + amulet) → base boosted
skill_damage (weapon + helmet) → skills hit harder
pct_energy_shield (armor + helmet) → compensate for low HP
```

**Build specialization through ring choices:**
- **Fire Mage:** Topaz Ring (flat lightning) swapped for Ruby Ring (HP) → safety over offense for glass cannon mage
- **Cold Mage:** 2× Sapphire Rings → pure cold focus
- **Arcane Mage:** 1× Gold Ring + 1× Iron Ring → farm build

**Spell Amplify Enhancement stat:**
> New stat on Staves/Wands: `spell_amp_chance`
> "+X% chance to Spell Amplify"
- Only Mage benefits (it's their class special)
- At high rolls, Spell Amplify can reach 40-50% proc rate
- Creates powerful "glass cannon mage" build fantasy
- Range: T5: 1-3%, T1: 1-10%

**Mage Ideal Gear Profile (Fire Build):**
```
Weapon:    pct_fire_dmg + skill_damage + spell_amp_chance (Staff)
Armor:     pct_energy_shield + flat_energy_shield + fire_res
Helmet:    cooldown_reduction + flat_energy_shield + pct_energy_shield
Gloves:    flat_fire_dmg + crit_chance + flat_energy_shield
Belt:      cooldown_reduction + flat_hp + life_regen
Boots:     move_speed + flat_energy_shield + cold_res
Ring (×2): pct_fire_dmg + flat_fire_dmg | pct_fire_dmg + crit_multiplier
Amulet:    skill_damage + cooldown_reduction + pct_fire_dmg
```

---

### 3.5 Archer — "The Storm" Build Identity

**Core fantasy:** Tap faster than anyone, multi-hit constantly, dodge everything.

**Current stats at Level 60:**
- Crit Chance: 5% + 59×0.4% = ~28.6% (highest!)
- Double Shot: 12% + 59×0.3% = ~29.7% chance
- Dodge: 6% + 59×0.2% = ~17.8%
- HP: 100 + 59×10 = 690 (lowest!)

**Design problem:** Archer has the LOWEST HP (690 vs Warrior's 1126 at 60) with almost no natural sustain. The dodge helps but isn't enough against sustained fire. Also, Double Shot and a potential `multi_hit_chance` item stat could stack to truly silly levels without a cap.

**The "Storm" Identity:**
Archer should feel like a damage machine that barely survives on speed alone — dodge everything, hit multiple times, leech life through sheer volume of hits.

```
ARCHER GEAR SYNERGY CHAIN:
attack_speed (gloves + weapon) → more taps per second → more leech triggers
multi_hit_chance (weapon + gloves) → stacks with Double Shot → proc chains
life_leech (ring + amulet) → sustain through offense volume
dodge_rating (boots + gloves + amulet) → compensate for low HP
pct_cold_dmg (bow) → cold element focus → chill enemy attack speed
```

**Critical cap interaction:**
- Archer at L60: 28.6% base crit
- Bow can add up to 12% crit (T1)
- Gloves add up to 9% crit (T1)
- Amulet adds up to 10% crit (T1)
- **Total: ~59% crit chance** — very high but not capped
- Double Shot at 29.7% = effectively 1.3× hit rate
- **Risk:** multi_hit_chance + Double Shot could reach 40%+ "extra hits" — soft cap at 25% multi_hit

**Glass Cannon passive idea:**
> "When below 40% Life: +20% attack speed, +15% damage. Archer only."
- Rewards skilled play (staying low, not dying)
- Synergizes with life_leech (hover at 35-40% HP on purpose)
- Makes Archer feel dangerous and exciting

**Archer Ideal Gear Profile:**
```
Weapon:    crit_chance + multi_hit_chance + life_leech (Bow)
Armor:     flat_evasion + pct_evasion + cold_res
Helmet:    crit_chance + flat_hp + xp_bonus (Circlet)
Gloves:    attack_speed + crit_chance + life_on_hit (Bracer)
Belt:      flat_hp + pct_hp + life_regen (HP investment)
Boots:     move_speed + dodge_rating + flat_evasion
Ring (×2): life_leech + crit_chance | crit_multiplier + flat_hp
Amulet:    damage_vs_bosses + pct_phys_dmg + life_leech
```

---

## PART 4 — BALANCE CONCERNS & GUARDRAILS

### 4.1 Stat Interaction Dangers

| Risk | Scenario | Cap / Fix |
|------|----------|-----------|
| **CDR + Skill Spam** | 40% CDR turns 2s skills into 1.2s | Hard cap CDR at 40% total |
| **Multi-hit + Double Shot** | 25% multi + 30% double = 55% extra hit rate | Soft cap: `multi_hit_chance` max 15% on any single item |
| **Leech + High DPS** | 6% leech × 200 damage = 12 HP/tap × 20 taps/s = 240 HP/s | Cap leech recovery at 20% maxHP/s |
| **Crit stacking** | Archer can reach ~70%+ crit with all slots | Crit chance cap at 75% — same as resist |
| **Resistance capping** | Class 30% phys + ring + belt + armor = easily overcap | Diminishing returns above 50%; hard wall at 75% |
| **Damage inflation** | `pct_phys_dmg` on weapon + ring + amulet + gloves = 4 sources | Additive, not multiplicative — safe unless base is too high |
| **thorns + block combo** | Warrior blocks 27% of hits, each block deals thorns | Thorns on block is fine — it's delayed offense, not instant |

### 4.2 Itemization Difficulty Curve

**Problem to avoid:** New players get overwhelmed by 40+ stats on items.

**Solution — Stat Density by Rarity:**
```
Common    (1-2 stats):  Only basic stats — flat_hp, flat_armor, flat damage, move_speed
Rare      (2-3 stats):  Basic + moderate — adds resistance, life_regen, attack_speed
Epic      (3-4 stats):  Moderate + depth — adds crit, CDR, leech, skill_damage
Legendary (4-6 stats):  Full pool — rare stats appear: damage_taken_reduction, multi_hit, damage_vs_bosses
```

This means a new player only sees 5-6 stat types until they hit Epic/Legendary rarity — vastly reducing cognitive load.

### 4.3 "Resistance Tax" Design

**PoE2's best design decision:** Every zone has an element that punishes you. You *must* invest in resistances or die. This forces interesting gear decisions.

**Recommendation for TapOfExile:**
> Each act (or every 10 levels of location) has an **element theme** that adds 10% more damage of that element to all monsters.

```
Act 1: Physical zone  → Warrior comfortable, Mage needs phys mitigation
Act 2: Fire zone      → Mage comfortable (20% fire res), Warrior needs fire gear
Act 3: Cold zone      → Archer comfortable (10% cold), others need cold res
Act 4: Lightning zone → Samurai comfortable (10% light), others need light res
Act 5+: Mixed         → Need balanced resistances across slots
```

This creates **forced gear diversity** — a player who only stacks offense will hit a wall in Act 2 and need to adjust.

### 4.4 The "Carry Forward" Problem

If items drop at current zone iLvl and old items become worthless fast, the medium loop (comparing items, feeling upgrades) is weakened.

**Recommendation:**
- Item level drops within ±5 of current location level
- Good rolls on lower iLvl items can stay relevant 10-15 levels
- Boss maps guarantee 1 item within ±3 iLvl of boss tier

---

## PART 5 — THE TAP-GAME ADAPTATION FRAMEWORK

### 5.1 What Makes PoE2 Depth Work in a Tap Context

| PoE2 Mechanic | Why It Works in PoE2 | Tap Adaptation |
|---------------|----------------------|----------------|
| Crafting orbs | You control item improvement | Remove complexity — add "reroll 1 stat" button at gold cost |
| Build diversity | 1000+ viable builds | You need 2-3 viable builds per class — that's enough |
| Trade economy | Other players fill your gaps | No trade needed — just ensure drops are complete enough |
| Passive skill tree | 100+ hours of investment | Skill tree exists, items reinforce its direction |
| Currency drops | Meta-resource for crafting | Gold replaces currency — use gold to reroll stats |

### 5.2 The "5-Slot Feeling" Principle

In PoE2, upgrading one slot feels like progress. In a tap game, you need the same feeling but faster.

**Target upgrade cadence per session (20 min):**
- Normal play: 2-3 new items evaluated
- At least 1 upgrade opportunity
- At least 1 "almost perfect" item that creates a desire to return

**This means:**
- Drop rate for Epic+: ~5-8% per kill in early zones, 15-20% in endgame
- Every kill should feel like it could drop something relevant
- Don't make only boss drops matter

### 5.3 Slot Specialization Creates "Gear Storytelling"

**Goal:** A player should be able to describe their build using their gear.

*Current state:* "I have a Legendary sword and Epic boots"
*Target state:* "I'm a CDR Mage — I have CDR on my helmet, belt, and amulet, so my Fireball is down to 1.8 seconds. I use a fire staff to stack fire damage. Two fire rings. It's a fire build."

**Implementation requirement:** Stats need to stack meaningfully from 3+ slots to reach breakpoints.

Example CDR breakpoints that feel different:
```
0% CDR:   Fireball = 3.0s  (cast every ~3s)
10% CDR:  Fireball = 2.7s  (noticeable but minor)
25% CDR:  Fireball = 2.25s (clearly faster)
40% CDR:  Fireball = 1.8s  (nearly double the frequency)
```

To hit 40% CDR the player needs: Helmet T1 (22%) + Amulet T2 (16%) = 38%. This is a dedicated gear investment — meaningful, achievable, rewarding.

---

## PART 6 — NEW STATS FINAL PRIORITY LIST

Based on the full analysis — tap-game feel, class synergy, balance risk, and implementation complexity:

| Priority | Stat | Impact | Complexity | Class Beneficiary |
|----------|------|--------|------------|-------------------|
| 1 | `fire_res` / `cold_res` / `lightning_res` | Critical | Low | All (esp. Warrior) |
| 2 | `cooldown_reduction` | Very High | Low | Mage (primary) |
| 3 | `life_leech` | Very High | Medium | Samurai, Archer |
| 4 | `skill_damage` | High | Low | Mage, all |
| 5 | `pct_fire/cold/lightning_dmg` | High | Low | Mage (primary) |
| 6 | `dodge_rating` | Medium | Low | Archer (primary) |
| 7 | `spell_amp_chance` | High (class-specific) | Low | Mage only |
| 8 | `thorns` | Medium | Low | Warrior (primary) |
| 9 | `damage_taken_reduction` | Medium | Low | Warrior, all |
| 10 | `multi_hit_chance` | High (feel) | Low | Archer (primary) |
| 11 | `damage_vs_bosses` | Medium | Low | Endgame all |
| 12 | `area_damage` | Low (limited context) | Medium | All (future) |
| 13 | `armor_to_damage` | Medium | Low | Warrior only |
| 14 | `execute_threshold` | Niche | Medium | Samurai only |
| 15 | `potion_effectiveness` | Low-Medium | Low | All |

---

## PART 7 — IMPLEMENTATION RECOMMENDATIONS

### 7.1 Minimum Viable Enhancement (1 sprint)

Just these three changes dramatically improve the game:
1. Add `fire_res`, `cold_res`, `lightning_res` to 6 slots
2. Add `cooldown_reduction` to 3 slots
3. Add `life_leech` to 4 slots

This costs ~12 stat entries in the pool system and transforms the gear optimization feel.

### 7.2 Tooltip Enhancement Required

Current tooltip only shows: name, quality, type, basic stats.

**New tooltip should show:**
```
[Legendary]  CRIMSON EDGE          iLvl 82
             One-Hand Sword
─────────────────────────────────────────
Base Damage: 68
─────────────────────────────────────────
+ 65 Physical Damage         [OFFENSE]
+ 140% Physical Damage       [OFFENSE]
+ 10% Critical Strike Chance [OFFENSE]
+ 4.5% Life Leech            [SUSTAIN] ← new
─────────────────────────────────────────
Required Level: 61
```

Color-code stat categories: Orange = Offense, Blue = Defense, Green = Sustain, Purple = Utility.

### 7.3 Build Template System (Long-term)

Add a "Build Hint" to each class selection that highlights which stats to look for:

```
⚔️ SAMURAI BUILD GUIDE
Primary stats:   crit_chance, crit_multiplier
Secondary stats: life_leech, attack_speed
Key items:       Dagger (crit), Ring ×2 (crit_multi + leech)
Avoid:           pct_armor, flat_energy_shield
```

This onboards new players without removing decision-making from experienced ones.

---

## SUMMARY: TOP 10 DESIGN DECISIONS

1. **Resistance on gear is mandatory** — game feels broken without it
2. **CDR is the #1 engagement stat for a tap game** — more skill casts = more fun
3. **Life leech rewards tap speed** — perfect tap-game sustain mechanic
4. **Each class needs 2-3 "resonant stats"** — stats that multiply their identity
5. **Weapon subtypes should have stat weights** — daggers for crit, staves for skill damage
6. **Zone elemental themes force resistance investment** — prevents pure offense builds
7. **Stats should stack to meaningful breakpoints** — 3+ pieces to hit CDR cap
8. **Rarity gates cognitive complexity** — Common players see 5 stats, Legendary players see 15
9. **Archer needs a sustain solution** — `life_leech` + `multi_hit` volume-heals through low HP
10. **Warrior needs offensive conversion** — `thorns`, `armor_to_damage` turn defense into offense
