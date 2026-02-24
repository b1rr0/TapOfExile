# PoE2 Item Mechanics for TapOfExile

> Sourced from [poe2db.tw](https://poe2db.tw/) and [fextralife wiki](https://pathofexile2.wiki.fextralife.com/)
> Skipped: Gems (Skill, Support, Meta, Spirit, Lineage), League mechanics

---

## Your Game Core (TapOfExile) Quick Reference

- **Tap**: No cooldown (50ms min), base `tapDamage`, crit roll
- **Skills**: Cooldown-based (2-5s), damage multipliers (3-5x), elemental profiles
- **Elements**: Physical, Fire, Lightning, Cold, Pure
- **Resistances**: 0-75% cap, `damage * (1 - resist%)`
- **Defense**: Dodge, Block (warrior), per-class specials
- **Potions**: Charge-based, heal% of maxHP, no cooldown between uses

---

## 1. DAMAGE TYPE MECHANICS

### 1.1 Elemental Damage Types
| Type | Resistance | Primary Ailment | Secondary Ailment |
|------|-----------|----------------|-------------------|
| Physical | Armour | Bleeding (DoT, 5s, 2x while moving) | Stun |
| Fire | Fire Res | Ignite (DoT, 4s) | - |
| Cold | Cold Res | Chill (slow 2-8s) | Freeze (immobilize 4s) |
| Lightning | Lightning Res | Shock (+20% dmg taken 4-8s) | Electrocute (interrupt 5s) |
| Chaos | Chaos Res | Poison (DoT, 2s) | 2x Energy Shield damage |

### 1.2 Damage Modifiers
| Mechanic | Description | Suggestion for TapOfExile |
|----------|-------------|---------------------------|
| **Penetration** | Treats target resistance as lower | Skill mod: "Ignores X% fire resistance" |
| **Conversion** | Changes damage type entirely | Item mod: "50% Physical converts to Fire" |
| **Damage Gain** | Gain extra damage as another type | "Gain 30% of Physical as extra Fire" |
| **Armour Break** | Lower target's armour; at full break +20% dmg | Debuff stacking mechanic |
| **Overwhelming** | Negates physical damage reduction | Endgame penetration stat |
| **Culling Strike** | Kill at 30%/20%/10% HP (Normal/Magic/Rare) | Execute threshold on enemies |
| **Decimating Strike** | Remove 5-30% life before hit | Pre-hit damage mechanic |
| **Lucky/Unlucky** | Roll twice, take better/worse | Crit/dodge modifiers |
| **Overkill** | Excess damage beyond kill threshold | Splash/chain damage source |

---

## 2. AILMENT SYSTEM

### 2.1 Ailments (Status Effects on Enemies)
| Ailment | Type | Duration | Key Mechanic |
|---------|------|----------|-------------|
| **Bleeding** | Physical DoT | 5s | 100% extra while target moves |
| **Ignite** | Fire DoT | 4s | Can spread to nearby enemies |
| **Chill** | Slow | 2-8s | Scales with cold damage |
| **Freeze** | Immobilize | 4s | Full stop, can shatter |
| **Shock** | Dmg amplify | 4-8s | +20% damage taken |
| **Electrocute** | Interrupt | 5s | Prevents actions |
| **Poison** | Chaos DoT | 2s | Can stack infinitely |

### 2.2 Special Debuffs
| Debuff | Effect | Suggestion |
|--------|--------|------------|
| **Blind** | -20% accuracy and evasion | Enemy miss chance buff |
| **Maim** | -30% move speed, -15% evasion | Slow + vulnerability |
| **Hinder** | -30% movement speed | Pure slow effect |
| **Withered** | +5% chaos dmg taken, stacks 10x | DoT amplifier |
| **Crushed** | -15% physical damage reduction | Armor shred |
| **Brittle** | +6% crit chance against target | Crit vulnerability |
| **Intimidate** | Enemies take increased damage | General damage amp |
| **Taunt** | Enemies can only target you, -10% dmg | Tank mechanic |

---

## 3. DEFENSE MECHANICS

### 3.1 Primary Defenses
| Defense | How It Works | Suggestion |
|---------|-------------|------------|
| **Armour** | Reduces physical damage proportionally | Already have resistances; add armor as flat reduction |
| **Evasion** | Chance to completely avoid hits | Your dodge system, can scale |
| **Energy Shield** | Absorbs damage before life; recharges after delay | Shield layer with recharge timer |
| **Block** | Completely prevents damage from hit | Already have for Warrior |
| **Deflect** | Prevents 40% of damage | Partial block mechanic |
| **Suppress** | Prevents 50% damage from hit | Another partial mitigation |
| **Parry** (Buckler) | Active timing-based block + counterattack | Tap-timing mini-game |

### 3.2 Recovery Mechanics
| Recovery | How It Works | Suggestion |
|----------|-------------|------------|
| **Life Leech** | Recover % of damage dealt over 1s | Sustain through damage |
| **Mana Leech** | Recover % of damage as mana | Skill resource recovery |
| **Energy Shield Leech** | Recover % as shield | Shield sustain |
| **Recoup** | Recover % of damage TAKEN over 8s | Defensive recovery |
| **Life Regen** | Passive HP per second | Idle recovery |
| **Recharge** | Auto-recovery after delay (12.5%/s) | Shield recharge mechanic |
| **Instant Leech** | Leech applies immediately (unique) | Powerful sustain option |
| **Flask Overflow** | Recovery can exceed max life | Temporary overhealing |

---

## 4. CHARGE SYSTEM

### 4.1 Charge Types
| Charge | Effect | Duration | Suggestion |
|--------|--------|----------|------------|
| **Endurance** | Defensive buff (damage reduction) | 15s | Stacking defense buff |
| **Frenzy** | Offensive buff (attack speed) | 15s | Stacking speed/damage buff |
| **Power** | Critical buff (crit chance) | 15s | Stacking crit buff |
| **Rage** | +1% attack damage per point | Decays | Risk/reward offensive resource |

### 4.2 Charge Interactions (from items)
- Consume charges for powerful effects (Nebuloch: consume endurance charge for guaranteed crit)
- Gain charges on specific triggers (kill, hit, block, being hit)
- Duplicate charges on gain (Soul Cores)
- Convert charges to different types

---

## 5. PROJECTILE MECHANICS

| Mechanic | Description | Suggestion |
|----------|-------------|------------|
| **Chain** | Redirects to another target after hit | Multi-target bouncing |
| **Pierce** | Passes through targets while damaging | Line damage |
| **Fork** | Splits into 2 on first hit | Branching projectiles |
| **Split** | Fires at multiple targets within 6m | Shotgun spread |
| **Returning** | Returns to caster after reaching end | Boomerang effect |
| **Circle Formation** | Projectiles fire in nova pattern (Sire of Shards) | AoE skill variant |

---

## 6. UNIQUE ITEM MECHANICS (Best for TapOfExile)

### 6.1 Damage Conversion & Transformation
| Mechanic | Source Item | Description |
|----------|------------|-------------|
| Lightning→Chaos | Voltaxic Rift | 100% lightning converts to chaos |
| Cold→Lightning | Whisper of Brotherhood ring | 100% cold converts to lightning |
| Lightning→Cold | Call of Brotherhood ring | 100% lightning converts to cold |
| Elemental→Chaos | Original Sin ring | 100% elemental converts to chaos |
| Physical→Fire | Fury of the King talisman | Bear skills convert phys to fire |
| Ignite→Chaos | Blackflame ring | Ignite deals chaos instead of fire |
| Bleeding→Fire | Blistering Bond ring | Bleed deals fire instead of physical |
| All Dmg→Extra Chaos | Ming's Heart ring | Gain 30-40% damage as extra chaos |
| All Dmg→Extra Chaos (allies) | Evergrasping Ring | Allies gain 15-25% as extra chaos |
| Spell→Attack | Crown of Eyes helm | Spell damage also boosts attacks |

### 6.2 On-Kill / On-Hit Effects
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Headhunter** | Belt | Steal rare monster modifiers for 20s |
| **Onslaught on Kill** | Death Rush ring | Speed buff on kill |
| **Explosions on Crit Kill** | Quecholli weapon | AoE explosions from crit kills |
| **Ignite Spread** | Cracklecreep ring / Searing Touch | Ignite spreads to nearby enemies |
| **Lightning Bolt on Crit** | Choir of the Storm amulet | Trigger lightning bolt |
| **Shocked Ground** | Wake of Destruction boots | Leave shocked ground while moving |
| **Ignited Ground** | Birth of Fury boots | Leave ignited ground while moving |
| **Corpse Decompose** | Corpsewade boots | Trigger decompose per step |
| **Overkill Splash** | Trampletoe boots | Overkill damage hits nearby |
| **Bolt Loading on Kill** | The Last Lament crossbow | Auto-load bolts from kills |

### 6.3 Conditional / Threshold Mechanics
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Low Life Bonuses** | Coward's Legacy belt | Count as low life at 75% HP |
| **Full Life Bonuses** | Various | Bonus at 100% HP |
| **Surrounded Bonus** | Various | Bonus when 5+ enemies within 3m |
| **Unhit Recently** | Hyrri's Ire | Double evasion when not hit recently |
| **Missing Life Recovery** | Defiance of Destiny amulet | Recover 20-30% missing life before hit |
| **Instant Flask at Low Life** | Birthright Buckle belt | Emergency instant heal |
| **Random Speed on Hit** | Gamblesprint boots | Random movement speed boost |
| **Random Shrine Buff** | Hammer of Faith | Random shrine buff every 10s |

### 6.4 Resource Manipulation
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Damage from Mana** | Cloak of Defiance | 50% damage taken from mana first |
| **Life Cost→Chaos Damage** | Burden of Shadows | Life costs become chaos damage |
| **Mana→Life Conversion** | Tangletongue | Mana recovery applies to life |
| **Leech Overflow→ES** | Soul Tether belt | Excess life leech goes to ES |
| **Flask→ES** | Shavronne's Satchel belt | Flask life recovery also heals ES |
| **Flask Overflow HP** | The Gnashing Sash belt | Flask can overheal max life |
| **Flask→Minions** | Umbilicus Immortalis belt | Flasks heal minions instead |
| **No Spirit** | Kaom's Heart | +1500 life but 0 spirit |
| **Auto Flask Charges** | Revered Resin / Keelhaul | Flask gains charges per second |

### 6.5 Curse & Debuff Mechanics
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Infinite Duration Curses** | Cospri's Will | Curses never expire |
| **Additional Curse** | Doedre's Damning ring | Apply extra curse to enemies |
| **Hexproof Penetration** | Cospri's Will | Curses affect curse-immune enemies |
| **Critical Weakness on Parry** | Silverthorne buckler | 10 stacks of crit weakness |
| **Enfeeble on Block** | Rondel de Ezo buckler | Auto-curse on block |
| **No-Delay Curses** | Windscream boots | Curses activate instantly |

### 6.6 Unique Defense Mechanics
| Mechanic | Source | Description |
|----------|-------|-------------|
| **No Extra Crit Damage Taken** | The Brass Dome | Crits don't do bonus damage |
| **Dodge Avoids All** | Ab Aeterno boots | Dodge roll avoids everything |
| **Phase Through Enemies** | Ghostmarch boots | Dodge rolls pass through |
| **Thorns** | Bramblejack / Blood Thorn | 250% melee damage reflected |
| **Thorns on Stun** | Prized Pain ring | Deal thorns damage to stunned |
| **Thorns Crit** | Briarpatch boots | Thorns can critically hit |
| **Corrupted Blood on Block** | Bloodbarrier buckler | Deal 50% max life as phys DoT |
| **Parried→Spell Damage** | Nocturne buckler | Parry debuff applies to spells |
| **Distance-Based Accuracy** | Vigilant View ring | Enemies less accurate at range |
| **Iron Reflexes** | Knight-errant boots | Convert evasion to armour |
| **Armor→Deflection** | Shankgonne boots | Convert armor to deflection |
| **Minion Resist = Yours** | Carrion Call focus | Minions share your resistances |

### 6.7 Scaling / Stacking Mechanics
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Attribute Scaling** | Pillar of Caged God | Damage per 10 str/dex/int |
| **Intelligence→Spell Damage** | Whispering Ice | Int scales spell damage |
| **Evasion→Movement Speed** | Queen of the Forest | Evasion boosts movespeed (cap 75%) |
| **Spirit→Spell Damage** | Threaded Light focus | Spell damage per 10 spirit |
| **Mana Spent→Spell Damage** | Indigon helm | Recent mana spent boosts spells |
| **Ring Bonus Amplifier** | Ingenuity belt | 40-80% increased ring bonuses |
| **Grand Spectrum** | Jewels | Stacking bonuses per spectrum jewel |
| **Enemy Power→Lightning** | Olrovasara weapon | Accumulate enemy power as lightning |

### 6.8 Mirror / Copy / Steal Mechanics
| Mechanic | Source | Description |
|----------|-------|-------------|
| **Reflect Other Ring** | Kalandra's Touch ring | Copies your other ring's stats |
| **Steal Monster Mods** | Headhunter belt | Gain rare monster modifiers for 20s |
| **Copy Monster Modifier** | The Flesh Poppet talisman | Copy random mod on shapeshift |
| **Companion Shares Damage** | Starkonja's Head helm | Companion absorbs damage |
| **Quiver Bonus Multiplier** | Widowhail bow | Doubles quiver bonuses |

### 6.9 Skill Slot & Skill Modification
| Mechanic | Source | Description |
|----------|-------|-------------|
| **+1 Skill Slot** | Bursting Decay ring | Extra active skill slot |
| **+1 Skill Limit** | Idol of Uldurn amulet | Extra skill limit |
| **Grant Skill** | Mjölner (Thunder), Lightning Coil (Valako's Charge) | Item gives free skill |
| **3 Herald Skills** | The Coming Calamity | Grants three herald buffs |
| **Extended Perfect Timing** | Assailum helm | Wider skill timing window |
| **Two-Hand as One-Hand** | Bringer of Rain helm | Wield 2H weapon in 1 hand |
| **Triggered Skill Refund** | Collapsing Horizon | Triggered skills cost 50% less |
| **Additional Instilled Mods** | Strugglescream amulet | 3 extra flask mods |

---

## 7. ITEM SYSTEM MECHANICS

### 7.1 Item Rarity Tiers
| Tier | Color | Affixes | Suggestion |
|------|-------|---------|------------|
| Normal (White) | White | 0 | Base item, no bonuses |
| Magic (Blue) | Blue | 1-2 (prefix+suffix) | Minor bonuses |
| Rare (Yellow) | Yellow | Up to 6 (3 prefix + 3 suffix) | Strong bonuses |
| Unique (Gold/Brown) | Orange | Fixed special mods | Build-defining |

### 7.2 Affix System (Prefix + Suffix)
**Prefixes** (up to 3 on rare):
- Flat damage additions
- Life/mana/ES bonuses
- Armour/evasion bonuses
- Elemental damage

**Suffixes** (up to 3 on rare):
- Resistances
- Attack/cast speed
- Critical chance/multiplier
- Attributes (str/dex/int)

### 7.3 Implicit Modifiers
- Built into base item type
- Cannot be crafted; tied to item base
- Example: Ruby Ring always has fire resistance implicit

### 7.4 Corrupted Modifiers
- Item becomes "corrupted" - can't be modified further
- May gain powerful new implicit
- May brick the item (bad outcome)
- Risk/reward mechanic

---

## 8. CRAFTING SYSTEM

### 8.1 Currency Orbs
| Currency | Effect | Suggestion for TapOfExile |
|----------|--------|---------------------------|
| **Orb of Transmutation** | Normal→Magic (1 affix) | Basic upgrade |
| **Orb of Augmentation** | Add 1 mod to magic | Add modifier |
| **Orb of Alchemy** | Normal→Rare (4 affixes) | Premium upgrade |
| **Regal Orb** | Magic→Rare (+1 affix) | Upgrade tier |
| **Chaos Orb** | Reroll rare item | Reforge mods |
| **Exalted Orb** | Add 1 mod to rare | Augment rare |
| **Orb of Annulment** | Remove 1 random mod | Risky removal |
| **Orb of Chance** | Normal→possibly Unique | Gamble for unique |

### 8.2 Essence Crafting
- Guaranteed specific modifier when used
- Tiers: Lesser → Standard → Greater → Perfect
- Perfect Essences: Remove random mod + add guaranteed mod on rare
- Categories: Damage, Defense, Utility, Resistance, Special

### 8.3 Desecration System (Bone Currency)
| Currency | Target | Effect |
|----------|--------|--------|
| Collarbones | Jewelry | Desecrated affixes |
| Jawbones | Weapons/Quivers | Desecrated affixes |
| Ribs | Armor | Desecrated affixes |
| Craniums | Jewels | Desecrated affixes |
- Unique modifier pool separate from normal crafting

### 8.4 Omen Meta-Crafting
- Passive items: Activate automatically on next relevant action
- Consumed after trigger
- Control prefix/suffix generation
- Guarantee specific affix types
- Examples: "Next Exalt adds only prefix", "Next Chaos removes lowest mod"

### 8.5 Catalyst Quality
- Apply to jewelry for quality bonuses
- Enhance specific modifier categories
- Up to 20% quality bonus

---

## 9. AUGMENT SOCKET SYSTEM

### 9.1 Rune Types (Kalguuran)
| Rune | Weapon Bonus | Armor Bonus |
|------|-------------|-------------|
| Desert Rune | Fire damage | Fire resistance |
| Glacial Rune | Cold damage | Cold resistance |
| Storm Rune | Lightning damage | Lightning resistance |
| Iron Rune | Physical/spell damage | Armour/evasion |
| Body Rune | Life leech | Max life |
| Mind Rune | Mana leech | Max mana |
| Rebirth Rune | Life on hit | Life regen |
| Stone Rune | Stun buildup | Stun threshold |
| Vision Rune | Accuracy/crit | Crit resist |
| Tempered Rune | Physical damage | Thorns |

### 9.2 Soul Cores (Vaal)
| Core | Effect |
|------|--------|
| Heatproofing | Armour applies to cold damage |
| Insulation | Armour applies to lightning damage |
| Dampening | Armour applies to fire damage |
| Flow | Cooldown recovery speed |
| Ferocity | Maximum rage |
| Assault | Frenzy charge duplication |
| Endurance | Endurance charge duplication |
| Affliction | Increased curse damage |
| Convalescence | Recoup rate |

### 9.3 Idols (Azmeri)
- Snake, Primate, Owl, Cat, Wolf, Stag, Boar, Bear, Ox, Rabbit, Fox
- Special bonded modifiers (class-gated)

### 9.4 Abyssal Eyes
- Recovered from Abyssal enemies
- Unique socket augments with abyss-themed bonuses

### 9.5 Ancient Augments
- Limit: Only 1 ancient augment socketed at a time
- Powerful singular effects

---

## 10. CHARM SYSTEM (Reactive Trinkets)

### 10.1 Core Mechanics
- Max 3 charms equipped
- Trigger automatically on condition
- Charge-based (recharge on kill, half monster power)
- Duration-based effect

### 10.2 Charm Types
| Charm | Trigger | Effect |
|-------|---------|--------|
| Thawing | Taking cold damage | Freeze immunity |
| Staunching | Bleeding | Bleed immunity |
| Antidote | Poison | Poison immunity |
| Dousing | Ignite | Ignite immunity |
| Grounding | Shock | Shock immunity |
| Stone | Being stunned | Stun immunity |
| Silver | Being slowed | Slow immunity |
| Ruby/Sapphire/Topaz/Amethyst | Elemental damage | Resistance boost |
| Golden | Killing rare/unique | Item rarity boost |
| Cleansing | Being cursed | Curse immunity |

### 10.3 Unique Charm Mechanics
| Charm | Special Effect |
|-------|---------------|
| Beira's Anguish | Ignites enemies based on max life when triggered |
| Breath of Mountains | Gain Power Charge when triggered by cold |
| For Utopia | 200% armour during effect |
| Ngamahu's Chosen | Gain Rage when hit by fire |
| The Fall of the Axe | Grants Onslaught speed buff |
| Valako's Roar | Gain Frenzy Charge when struck by lightning |
| Sanguis Heroum | Creates consecrated ground + passive charge gen |
| The Black Cat | Enemy lightning damage becomes Unlucky |

---

## 11. FLASK SYSTEM

### 11.1 Core Changes from PoE1
- 1 life flask + 1 mana flask + utility "trinket" slots
- Reactive (not permanent buffs)
- Guard flasks replace guard skills
- Charges from monster kills (scaled by monster power)

### 11.2 Interesting Flask Mechanics (from items)
| Mechanic | Source |
|----------|--------|
| Auto-charge over time | Glowswarm ring, Revered Resin, Keelhaul belt |
| Instant recovery at low life | Birthright Buckle belt |
| Flask heals ES too | Shavronne's Satchel belt |
| Flask overheals max life | The Gnashing Sash belt |
| Flask heals minions | Umbilicus Immortalis belt |
| Doubled flask charges | Meginord's Girdle belt |
| Both slots accept any flask | Waistgate belt |

---

## 12. JEWEL SYSTEM (Passive Tree Sockets)

### 12.1 Core Mechanics
- Socket into passive skill tree
- Radius-based effects modify nearby passives
- Types: Ruby, Emerald, Sapphire, Diamond

### 12.2 Interesting Unique Jewel Mechanics
| Jewel | Effect |
|-------|--------|
| From Nothing | Allocate passives without connection to tree |
| Megalomaniac | Grants 2-3 random notable passives |
| The Adorned | Boosts corrupted magic jewel effects |
| Grand Spectrum (stacking) | Scales with number of Grand Spectrums socketed |
| Timeless Jewels | Transform all passives in radius |
| Heart of the Well | 4 random modifiers |
| Controlled Metamorphosis | Allocate unconnected but lose resistances |

---

## 13. RELIC SYSTEM (Endgame Trial Modifiers)

### 13.1 Core Mechanics
- Placed in Relic Altar before endgame trials
- Persist between trials
- Tetris-like arrangement (varying dimensions 1x2 to 4x1)
- Unlock more slots by killing bosses

### 13.2 Effect Categories
- Max life/honour bonuses
- Resource restoration rates
- Merchant discounts
- Monster damage adjustments
- Player defenses
- Movement/dodge bonuses

---

## 14. LIQUID EMOTION SYSTEM (Delirium)

### 14.1 Core Mechanics
- Currency from Delirium encounters
- Instill Notable Passive Skills into amulets
- Tiers: Diluted → Standard → Concentrated
- 821+ available passives to instill
- Cannot stack same passive twice

---

## 15. TOP SUGGESTIONS FOR TAP OF EXILE

### 15.1 High-Priority Mechanics to Add
1. **Ailment System** - Bleeding, Ignite, Chill, Shock, Poison as status effects
2. **Damage Conversion** - Convert physical to elemental on items
3. **On-Kill Effects** - Explosions, onslaught, charge generation
4. **Charge System** - Endurance/Frenzy/Power charges (stacking buffs)
5. **Item Affixes** - Prefix/suffix system for equipment randomization
6. **Charm Slots** - Reactive trinkets that auto-trigger on conditions
7. **Leech Mechanic** - Recover HP based on damage dealt

### 15.2 Medium-Priority Mechanics
8. **Penetration** - Ignore portion of enemy resistance
9. **Culling Strike** - Execute at HP threshold
10. **Lucky/Unlucky** - Roll twice take better/worse for damage/crit
11. **Jewel Sockets** - Socketable items in passive tree
12. **Rune Sockets** - Socketable items in equipment
13. **Essence Crafting** - Guaranteed mod crafting
14. **Energy Shield** - Secondary HP pool with recharge delay

### 15.3 Fun/Unique Mechanics for Tap Game
15. **Headhunter Effect** - Steal enemy modifiers temporarily
16. **Thorns** - Reflect damage to attackers (scales with tap speed)
17. **Ignite Spread** - Fire DoT chains between enemies
18. **Flask Overflow** - Overhealing creates temporary bonus HP
19. **Mirror Ring** - Copy another equipment slot's bonuses
20. **Attribute Scaling** - Damage scales per X stat points
21. **Random Shrine Buffs** - Periodic random buff (every 10s)
22. **Distance-Based Accuracy** - Novel defense mechanic
23. **Parry Timing** - Tap timing mini-game for defense
24. **Corrupted Items** - Risk/reward item gambling
