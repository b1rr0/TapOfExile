# ITEMS BALANCE — Tap of Exile

> **Single source of truth** for item design.
> Each item from `/shared/public/assets/equipments/*/in_use/` gets assigned here:
> iLvl range, 2-4 stats, drop location.
> ~20% of items are **uniques** with special mechanics.
>
> Full stat ranges by tier -> `bot/docs/equipment/*.md`

---

## 1. Drop System — Framework

### iLvl <-> Progression

| Tier | iLvl    | reqLvl | Content                                      |
|------|---------|--------|----------------------------------------------|
| T5   | 1–19    | 0–14   | Act 1 (all locations)                        |
| T4   | 20–39   | 15–29  | Act 2 (all locations)                        |
| T3   | 40–59   | 30–44  | Act 3 (all locations)                        |
| T2   | 60–79   | 45–59  | Act 4 (all locations)                        |
| T1   | 80–100  | 60–75  | Act 5 + Endgame Maps T1–T10 + Boss Maps      |

### Name Affixes -> Item Theme

| Affix                         | Element / Stats                | iLvl Offset    |
|-------------------------------|------------------------------|----------------|
| Blood / Crimson / Marrow      | phys_dmg, flat_hp, loh       | any            |
| Ember / Cinder / Ash          | fire_dmg, fire_res           | any            |
| Frost / Glacial / Ice         | cold_dmg, cold_res           | any            |
| Storm / Thunder / Lightning   | lightning_dmg, lightning_res | any            |
| Void / Abyssal / Night / Dusk | energy_shield, pct_hp        | +20 to base    |
| Shadow / Veil                 | evasion, crit_chance         | +10 to base    |
| Gold / Gilded / Solaris       | gold_find, xp_bonus          | any            |
| Bone / Hollow / Skull         | flat_hp, life_regen          | any            |
| Thorn / Verdant / Wood        | cold_dmg, life_regen         | any            |
| Ancient / Voidborn            | top-end hierarchy            | T1 (80–100)    |
| Cursed / Forsaken             | high risk                    | T2–T1 (60–100) |
| Shattered / Hollow            | budget copies                | T5–T4 (1–39)   |

### Monster Affinity

| Monster       | Act | Preferred Categories                               |
|---------------|-----|----------------------------------------------------|
| Bandit        | 1   | Belts, Boots, Helmets (T5)                         |
| Wild Boar     | 1   | Plates, Gloves, Axes (T5)                          |
| Forest Spirit | 2   | Mantles, Rings, Amulets, Bows (T4)                 |
| Ronin         | 2–3 | Swords, Blades, Shields, Belts (T4–T3)            |
| Oni           | 3   | Axes, Helmets, Fire-themed items (T3)              |
| Tengu         | 4   | Bows, Staffs, Mantles, Evasion gear (T2)           |
| Dragon        | 4–5 | All item types, high iLvl (T2–T1)                 |
| Shogun        | 5   | Legendary quality any slot (T1 only)               |

### Boss Map -> Exclusive Drops (iLvl 88–100)

| Boss Map                  | Guaranteed Categories                            |
|---------------------------|--------------------------------------------------|
| Shadow Shogun's Domain    | Legendary Swords, Legendary Plates               |
| Dragon's Eternal Lair     | Legendary Staffs, Legendary Scrolls              |
| Oni Warlord's Throne      | Legendary Axes, Legendary Helmets                |
| Tengu Mountain Peak       | Legendary Bows, Legendary Mantles               |
| Ronin's Haunted Dojo      | Legendary Blades, Legendary Rings                |
| Spirit of the Ancient Wood| Legendary Boots, Legendary Amulets (nature)      |
| The Beast King's Arena    | Legendary Plates, Legendary Gloves               |
| Bandit Lord's Fortress    | Legendary Belts, Gold-Find focused Accessories   |

---

## 2. Weapons — One-Hand

### 2.1 Axes (`oh_axe`) — `weapon/axes/in_use/`

**Theme**: High phys. damage, heavy strikes, life on hit.
**Drop**: Bandit/Wild Boar (T5), Oni (T3), Dragon (T1).

| Item                           | iLvl  | Tier | Stats (2–4)                                                              | Special             |
|--------------------------------|-------|------|---------------------------------------------------------------------------|---------------------|
| Blackpine_Reaper               | 5–15  | T5   | flat_phys_dmg · flat_hp                                                  |                     |
| Bloodaxe_of_the_Forsaken       | 62–75 | T2   | flat_phys_dmg · pct_phys_dmg · fire_res                                  |                     |
| Bloodfang_Cleaver              | 10–25 | T5   | flat_phys_dmg · life_on_hit                                              |                     |
| Bloodmoon_Reaver               | 30–45 | T4   | flat_phys_dmg · pct_phys_dmg · flat_hp                                   |                     |
| Bloodpeak_Reaper               | 20–35 | T4   | flat_phys_dmg · flat_hp · life_on_hit                                    |                     |
| **Bloodreaver's_Cleave**       | 55–70 | T3   | flat_phys_dmg · pct_phys_dmg · life_on_hit · crit_chance                 | **UNIQUE** ↓        |
| Bloodrusted_Cleaver            | 5–20  | T5   | flat_phys_dmg · life_on_hit                                              |                     |
| Bloodthorn_Reaper              | 25–40 | T4   | flat_phys_dmg · pct_phys_dmg · cold_res                                  |                     |
| Cursed_Bloodmoon_Cleaver       | 65–80 | T2   | pct_phys_dmg · flat_phys_dmg · crit_chance · crit_multiplier             |                     |
| Ember_Bloodrite_Cleaver        | 40–58 | T3   | flat_phys_dmg · flat_fire_dmg · pct_phys_dmg                             |                     |
| Emberfell_Cleaver              | 35–52 | T3   | flat_fire_dmg · flat_phys_dmg · fire_res                                 |                     |
| Grimstone_Reaper               | 50–68 | T3   | flat_phys_dmg · pct_phys_dmg · flat_hp                                   | **UNIQUE** ↓        |
| Hollow_Bloodmoon_Cleaver_4     | 8–22  | T5   | flat_phys_dmg · flat_hp                                                  |                     |
| Hollow_Bloodrite_Cleaver       | 5–18  | T5   | flat_phys_dmg · life_on_hit                                              |                     |
| Shattered_Bloodmoon_Cleaver    | 12–28 | T5   | flat_phys_dmg · flat_hp                                                  |                     |
| Shattered_Bloodpeak_Cleaver    | 8–20  | T5   | flat_phys_dmg · life_on_hit                                              |                     |
| Storm_Bloodrite_Cleaver        | 45–62 | T3   | flat_phys_dmg · flat_lightning_dmg · crit_chance                         |                     |
| **Stormbreaker's_Maul**        | 75–90 | T2   | flat_phys_dmg · flat_lightning_dmg · pct_phys_dmg · crit_multiplier      | **UNIQUE** ↓        |
| Thornblight_Cleaver            | 30–48 | T4   | flat_phys_dmg · flat_cold_dmg · life_on_hit                              |                     |
| **Voidborn_Bloodmoon_Cleaver_3** | 85–100| T1 | pct_phys_dmg · flat_phys_dmg · flat_energy_shield · crit_chance          | **UNIQUE** ↓        |

**Unique Mechanics — Axes:**

> **Bloodreaver's_Cleave** — *Blood Harvest*
> Killing any enemy restores **8% of maximum HP**.
> Effect does not stack; triggers once per enemy.

> **Grimstone_Reaper** — *Soul Rend*
> `passive_dps_bonus` increases by **+1% per enemy killed** in the current session (max +30%). Resets on leaving the location.

> **Stormbreaker's_Maul** — *Lightning Crash*
> Every **5th hit** deals **300% lightning damage** of base.
> Counter resets on location change.

> **Voidborn_Bloodmoon_Cleaver_3** — *Void Hunger*
> Killing an Epic+ rarity enemy instantly restores **10% Energy Shield**.

---

### 2.2 Blades (`oh_dagger`) — `weapon/blades/in_use/`

**Theme**: High crit, elemental bonuses, daggers.
**Drop**: Ronin (T4), Forest Spirit (T4), Dragon (T1).

| Item                         | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Amethyst_Fang**            | 52–68 | T3   | crit_chance · crit_multiplier · flat_cold_dmg                             | **UNIQUE** ↓ |
| Ashblight_Dirk               | 15–30 | T5   | flat_phys_dmg · crit_chance                                              |              |
| Azureblight_Katana           | 55–72 | T3   | flat_lightning_dmg · crit_chance · pct_phys_dmg                           |              |
| Crescent_Fang                | 20–38 | T4   | crit_chance · crit_multiplier · flat_cold_dmg                             |              |
| **Crimson_Marrow_Blade**     | 70–88 | T2   | pct_phys_dmg · crit_multiplier · flat_phys_dmg · life_on_hit              | **UNIQUE** ↓ |
| Crimson_Marrow_Cleaver       | 45–62 | T3   | flat_phys_dmg · pct_phys_dmg · life_on_hit                                |              |
| Crimson_Talon_Blade          | 30–48 | T4   | flat_phys_dmg · crit_chance · crit_multiplier                             |              |
| Ember_Nightfall_Cleaver      | 40–58 | T3   | flat_fire_dmg · crit_chance · pct_phys_dmg                                |              |
| Frostbrand_Katana            | 35–52 | T4   | flat_cold_dmg · crit_chance · crit_multiplier                             |              |
| Hollow_Amethyst_Blight       | 8–22  | T5   | crit_chance · flat_cold_dmg                                              |              |
| Hollow_Crimson_Blight_Cleaver| 5–18  | T5   | flat_phys_dmg · crit_chance                                              |              |
| Hollow_Talon                 | 10–25 | T5   | crit_chance · crit_multiplier                                            |              |
| Nightfang_Cleaver            | 42–60 | T3   | crit_chance · crit_multiplier · flat_phys_dmg                             |              |
| Nightpiercer_Katana          | 62–78 | T2   | crit_chance · crit_multiplier · flat_lightning_dmg                        |              |
| Ravenclaw_Cleaver            | 48–65 | T3   | crit_chance · pct_phys_dmg · crit_multiplier                              |              |
| Rotbone_Cleaver              | 22–38 | T4   | flat_phys_dmg · flat_hp · life_on_hit                                     |              |
| **Storm_Amethyst_Fang**      | 72–88 | T2   | flat_lightning_dmg · crit_chance · crit_multiplier · life_on_hit          | **UNIQUE** ↓ |
| Thornspire_Dirk              | 25–40 | T4   | flat_cold_dmg · crit_chance · flat_phys_dmg                               |              |
| Verdant_Fang_Cleaver         | 38–55 | T4   | flat_cold_dmg · crit_chance · life_on_hit                                 |              |
| **Verdant_Scourge**          | 80–95 | T1   | flat_cold_dmg · crit_multiplier · life_on_hit · pct_phys_dmg              | **UNIQUE** ↓ |

**Unique Mechanics — Blades:**

> **Amethyst_Fang** — *Venom Fang*
> Critical strikes add a **poison** stack (pure DoT = 5% of dealt crit damage per second, 3s). Stacks up to 5 times.

> **Crimson_Marrow_Blade** — *Blood Price*
> `crit_multiplier` increased by **+50%**, but **maximum HP reduced by 10%**.
> Stats on the item are fixed (unique item).

> **Storm_Amethyst_Fang** — *Static Charge*
> On crit, `life_on_hit` converts to **lightning damage** (equal to LoH x 3) instead of restoring HP.

> **Verdant_Scourge** — *Nature's Wrath*
> `flat_cold_dmg` increased by the value of **`life_regen`/sec x 5** (summed from all equipment).

---

### 2.3 Swords (`oh_sword`) — `weapon/swords/in_use/`

**Theme**: Balance of damage and crit, swords and katanas.
**Drop**: Ronin (T4–T3), Shogun (T1), Shadow Shogun Boss Map.

| Item                       | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|----------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| Ancient_Thornspire_Cleaver | 82–100| T1   | flat_phys_dmg · pct_phys_dmg · crit_multiplier · cold_res                 |              |
| Ashborn_Katana             | 22–38 | T4   | flat_phys_dmg · crit_chance · crit_multiplier                             |              |
| Ashenbrand_Cleaver         | 15–30 | T5   | flat_phys_dmg · pct_phys_dmg                                             |              |
| Bloodoak_Cleaver           | 30–48 | T4   | flat_phys_dmg · flat_hp · life_on_hit                                     |              |
| Cursed_Azureblight_Cleaver | 65–82 | T2   | flat_phys_dmg · flat_lightning_dmg · crit_chance · lightning_res          |              |
| Cursed_Duskfang_Cleaver    | 62–78 | T2   | flat_phys_dmg · pct_phys_dmg · crit_chance                               |              |
| Duskbrand_Cleaver          | 38–55 | T4   | flat_phys_dmg · pct_phys_dmg · crit_chance                               |              |
| **Duskfall_Cleaver**       | 68–85 | T2   | flat_phys_dmg · pct_phys_dmg · flat_evasion · crit_chance                | **UNIQUE** ↓ |
| Ember_Emberfang_Cleaver    | 42–60 | T3   | flat_phys_dmg · flat_fire_dmg · fire_res                                  |              |
| Embercleaver_Sabre         | 35–52 | T4   | flat_phys_dmg · flat_fire_dmg · crit_chance                               |              |
| Frostbane_Cleaver          | 28–45 | T4   | flat_phys_dmg · flat_cold_dmg · cold_res                                  |              |
| **Glacial_Fang_Blade**     | 58–75 | T3   | flat_cold_dmg · crit_chance · crit_multiplier · flat_phys_dmg             | **UNIQUE** ↓ |
| **Goldflare_Cleaver**      | 50–68 | T3   | flat_phys_dmg · gold_find · crit_chance                                   | **UNIQUE** ↓ |
| Hollow_Emberfang_Cleaver_2 | 8–22  | T5   | flat_phys_dmg · flat_fire_dmg                                            |              |
| Nightpurge_Cleaver         | 45–62 | T3   | flat_phys_dmg · crit_chance · pct_phys_dmg                               |              |
| Shattered_Emberfang_Cleaver| 5–20  | T5   | flat_phys_dmg · flat_fire_dmg                                            |              |
| Storm_Duskfang_Cleaver     | 52–70 | T3   | flat_phys_dmg · flat_lightning_dmg · crit_chance                          |              |
| Tideborne_Cleaver          | 40–58 | T3   | flat_phys_dmg · flat_cold_dmg · life_on_hit                               |              |
| **Veilpiercer's_Edge**     | 80–100| T1   | pct_phys_dmg · crit_chance · crit_multiplier · flat_phys_dmg              | **UNIQUE** ↓ |
| Veilpiercer_Blade          | 72–88 | T2   | flat_phys_dmg · pct_phys_dmg · crit_chance                               |              |

**Unique Mechanics — Swords:**

> **Duskfall_Cleaver** — *Twilight Edge*
> Deals additional phys. damage equal to **5% of total Evasion Rating** (across all equipment).

> **Glacial_Fang_Blade** — *Frostbite*
> Cold damage has a **15% chance to freeze** the enemy. The next hit against a frozen enemy deals **200% damage**.

> **Goldflare_Cleaver** — *Golden Rush*
> After killing a Rare+ rarity enemy, `gold_find` **doubles** for **30 seconds**.

> **Veilpiercer's_Edge** — *Phase Strike*
> **25% of all dealt damage** ignores enemy resistances.

---

## 3. Weapons — Two-Hand

### 3.1 Bows (`tw_bow`) — `weapon/bows/in_use/`

**Theme**: Ranged combat, lightning + cold, high crit.
**Drop**: Tengu (T2), Forest Spirit (T4), Tengu Mountain Peak Boss Map.

| Item                          | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|-------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Ancient_Emberflight_Longbow**| 85–100| T1  | flat_fire_dmg · pct_phys_dmg · crit_chance · fire_res                     | **UNIQUE** ↓ |
| Ancient_Thornwood_Whisper      | 82–98 | T1   | flat_cold_dmg · crit_chance · crit_multiplier · cold_res                  |              |
| Carrionfeather_Longbow         | 20–35 | T4   | flat_phys_dmg · pct_phys_dmg · life_on_hit                                |              |
| Cursed_Ebonwing_Recurve        | 65–80 | T2   | flat_lightning_dmg · crit_chance · pct_phys_dmg · lightning_res           |              |
| Ebonwhisper_Longbow            | 38–55 | T4   | flat_phys_dmg · crit_chance · flat_cold_dmg                               |              |
| Ebonwing_Recurve               | 30–48 | T4   | flat_phys_dmg · flat_lightning_dmg · crit_chance                          |              |
| Ebonwood_Recurve               | 15–30 | T5   | flat_phys_dmg · pct_phys_dmg                                             |              |
| Forsaken_Shadowpine_Recurve    | 62–78 | T2   | flat_phys_dmg · crit_chance · pct_phys_dmg · flat_evasion                 |              |
| **Frostbite_Whisper**          | 70–88 | T2   | flat_cold_dmg · crit_chance · crit_multiplier · cold_res                  | **UNIQUE** ↓ |
| Hollow_Stormwrath_Recurve      | 10–25 | T5   | flat_lightning_dmg · crit_chance                                         |              |
| Ravenstrike_Longbow            | 42–60 | T3   | flat_phys_dmg · crit_chance · crit_multiplier                             |              |
| Scorchwing_Recurve             | 35–52 | T4   | flat_fire_dmg · flat_phys_dmg · fire_res                                  |              |
| Shadowpiercer_Longbow          | 55–72 | T3   | flat_phys_dmg · crit_chance · flat_evasion                                |              |
| Shattered_Bloodthorn_Recurve   | 8–22  | T5   | flat_phys_dmg · flat_cold_dmg                                            |              |
| **Sorrow's_Crescent**          | 60–78 | T3   | crit_chance · crit_multiplier · flat_phys_dmg                             | **UNIQUE** ↓ |
| Spinebark_Recurve              | 22–38 | T4   | flat_phys_dmg · flat_cold_dmg · life_on_hit                               |              |
| Spinethorn_Recurve             | 28–45 | T4   | flat_cold_dmg · flat_phys_dmg · crit_chance                               |              |
| Stormwrath_Recurve             | 48–65 | T3   | flat_lightning_dmg · crit_chance · pct_phys_dmg                           |              |
| Voidborn_Shadowpine_Recurve    | 85–100| T1   | flat_phys_dmg · flat_evasion · crit_chance · pct_phys_dmg                 |              |
| **Voidstrike_Recurve**         | 80–100| T1   | flat_phys_dmg · crit_chance · crit_multiplier · pct_phys_dmg              | **UNIQUE** ↓ |

**Unique Mechanics — Bows:**

> **Ancient_Emberflight_Longbow** — *Ember Arrow*
> Fire damage of this weapon **ignores 20%** of enemy fire resistance.

> **Frostbite_Whisper** — *Shatter*
> Cold critical strikes against **frozen** enemies deal **+150% bonus damage**.

> **Sorrow's_Crescent** — *Lament*
> Each **non-critical hit** accumulates a Sorrow stack (+1% crit_chance, max 20 stacks). The first critical resets stacks but strikes with the full accumulated bonus.

> **Voidstrike_Recurve** — *Void Piercer*
> **10% of all dealt damage** converts to **pure damage** (bypasses all resistances).

---

### 3.2 Staffs (`tw_staff`) — `weapon/staffs/in_use/`

**Theme**: Elemental damage, Energy Shield, passive DPS.
**Drop**: Tengu (T2), Dragon (T1), Dragon's Eternal Lair Boss Map.

| Item                          | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|-------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| Azureblight_Scepter           | 52–68 | T3   | flat_lightning_dmg · flat_cold_dmg · crit_chance                          |              |
| Azurite_Thaumaturge's_Rod     | 62–78 | T2   | flat_lightning_dmg · pct_energy_shield · crit_chance                      |              |
| Bloodmoon_Scepter             | 35–52 | T4   | flat_phys_dmg · pct_phys_dmg · life_on_hit                                |              |
| Bloodthorn_Scepter            | 28–45 | T4   | flat_phys_dmg · flat_cold_dmg · life_on_hit                               |              |
| Bonegnaw_Crook                | 18–35 | T5   | flat_hp · life_regen · flat_phys_dmg                                     |              |
| Bonelust_Crook                | 10–25 | T5   | flat_hp · life_regen                                                    |              |
| Bonewraith_Scepter            | 22–38 | T4   | flat_hp · life_regen · flat_phys_dmg                                     |              |
| Crescent_Voidstaff            | 75–92 | T2   | flat_energy_shield · pct_energy_shield · passive_dps_bonus                | **UNIQUE** ↓ |
| Crimson_Conduit_Staff         | 45–62 | T3   | flat_phys_dmg · flat_fire_dmg · passive_dps_bonus                         |              |
| Crimson_Thaumaturge's_Rod     | 58–75 | T3   | flat_fire_dmg · pct_phys_dmg · crit_chance                                |              |
| Ebonspire_Crook               | 40–58 | T4   | flat_cold_dmg · flat_energy_shield · crit_chance                          |              |
| **Embercrown_Staff**          | 68–85 | T2   | flat_fire_dmg · passive_dps_bonus · pct_phys_dmg · fire_res               | **UNIQUE** ↓ |
| Marrowveil_Scepter            | 48–65 | T3   | flat_hp · flat_energy_shield · life_regen                                 |              |
| Ossein_Conduit_Staff          | 32–50 | T4   | flat_hp · life_regen · flat_phys_dmg                                     |              |
| Ossuary_Crook                 | 15–30 | T5   | flat_hp · life_regen                                                    |              |
| **Serpent's_Coil_Staff**      | 80–100| T1   | flat_cold_dmg · life_regen · flat_hp · cold_res                           | **UNIQUE** ↓ |
| **Starfall_Scepter**          | 85–100| T1   | flat_lightning_dmg · crit_chance · passive_dps_bonus · pct_energy_shield  | **UNIQUE** ↓ |
| Stormveil_Scepter             | 55–72 | T3   | flat_lightning_dmg · crit_chance · pct_energy_shield                      |              |
| Thornwick_Conduit             | 38–55 | T4   | flat_cold_dmg · life_regen · flat_hp                                     |              |
| Verdant_Scepter_of_Thorns     | 42–60 | T3   | flat_cold_dmg · flat_hp · life_regen · cold_res                           |              |

**Unique Mechanics — Staffs:**

> **Crescent_Voidstaff** — *Void Hunger*
> Killing any enemy restores **5 Energy Shield** (stackable per kill).

> **Embercrown_Staff** — *Inferno Aura*
> `passive_dps_bonus` on this weapon applies **only to fire damage** (effectiveness x1.5 for fire, x0 for everything else).

> **Serpent's_Coil_Staff** — *Serpent's Blessing*
> `life_regen` increased by **+1 HP/s per 3% cold resistance** across all equipment.

> **Starfall_Scepter** — *Falling Stars*
> Every **10th tap** activates Starfall: deals **200% flat_lightning_dmg** of this weapon as an area hit to all enemies in the wave.

---

### 3.3 Scrolls (`tw_scroll`) — `weapon/scrolls/in_use/`

**Theme**: Passive DPS, experience, elemental damage, magical grimoires.
**Drop**: Dragon (T1), Shogun (T1), Dragon's Eternal Lair Boss Map.

| Item                                 | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|--------------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Azurite_Codex_of_Ruin**            | 78–95 | T1   | flat_lightning_dmg · passive_dps_bonus · xp_bonus                         | **UNIQUE** ↓ |
| Codex_of_Wasting                     | 30–48 | T4   | passive_dps_bonus · flat_cold_dmg · life_regen                            |              |
| Crimson_Binding_Scroll               | 22–38 | T4   | flat_phys_dmg · passive_dps_bonus · flat_hp                               |              |
| Cursed_Veilbound_Grimoire            | 65–82 | T2   | passive_dps_bonus · pct_energy_shield · crit_chance                       |              |
| Forsaken_Veilbound_Codex             | 60–78 | T2   | pct_energy_shield · passive_dps_bonus · xp_bonus                          |              |
| Nightbound_Codex                     | 42–60 | T3   | passive_dps_bonus · flat_cold_dmg · flat_energy_shield                    |              |
| **Paw_of_the_Covenant**              | 55–72 | T3   | flat_phys_dmg · passive_dps_bonus · flat_hp                               | **UNIQUE** ↓ |
| Scroll_of_Twilight_Ruin              | 48–65 | T3   | flat_cold_dmg · passive_dps_bonus · pct_phys_dmg                          |              |
| **Scrolls_of_the_Starfall_Covenant** | 82–100| T1   | flat_lightning_dmg · xp_bonus · passive_dps_bonus · crit_chance           | **UNIQUE** ↓ |
| Shattered_Codex_of_Withering_Truths  | 8–22  | T5   | passive_dps_bonus · flat_hp                                              |              |
| Shattered_Embercall_Grimoire         | 5–20  | T5   | flat_fire_dmg · passive_dps_bonus                                        |              |
| Storm_Crimson_Covenant_Scroll_3      | 52–70 | T3   | flat_lightning_dmg · flat_phys_dmg · passive_dps_bonus                    |              |
| Storm_Veilscript_Codex               | 58–75 | T3   | flat_lightning_dmg · passive_dps_bonus · pct_energy_shield                |              |
| Veilmark_Codex                       | 35–52 | T4   | passive_dps_bonus · pct_energy_shield · xp_bonus                          |              |
| Veilweave_Codex                      | 28–45 | T4   | passive_dps_bonus · flat_energy_shield · crit_chance                      |              |
| Verdant_Blight_Codex                 | 38–55 | T4   | flat_cold_dmg · passive_dps_bonus · life_regen                            |              |
| Verdant_Grimoire_of_Blight           | 42–60 | T3   | flat_cold_dmg · flat_hp · passive_dps_bonus · life_regen                  |              |
| Voidborn_Abyssal_Codex_Scroll        | 85–100| T1   | passive_dps_bonus · flat_energy_shield · pct_energy_shield · xp_bonus     |              |
| Voidborn_Crimson_Covenant_Scroll     | 82–100| T1   | flat_phys_dmg · passive_dps_bonus · pct_phys_dmg · flat_hp                |              |
| **Voidpact_Grimoire**                | 80–100| T1   | passive_dps_bonus · pct_energy_shield · crit_chance · xp_bonus            | **UNIQUE** ↓ |

**Unique Mechanics — Scrolls:**

> **Azurite_Codex_of_Ruin** — *Ruination*
> Each killed enemy adds **+1 to flat_lightning_dmg** of this weapon (resets on zone change). Max +50.

> **Paw_of_the_Covenant** — *Beast Bond*
> `flat_phys_dmg` increased by **+5% per completed Act** by the character (max Act 5 = +25%).

> **Scrolls_of_the_Starfall_Covenant** — *Covenant of Stars*
> `xp_bonus` also works as `gold_find` at **50% of its value** (they stack additively).

> **Voidpact_Grimoire** — *Eldritch Pact*
> `passive_dps_bonus` on the item is **doubled**, but **maximum HP reduced by 15%**.

---

## 4. Armour

### 4.1 Helmets (`helmet`) — `armor/helmets/in_use/`

**Theme**: HP, armour/evasion, resistances, XP bonus.
**Drop**: Bandit/Wild Boar (T5), Oni (T3), any enemies (T1). Oni Warlord Boss Map.

| Item                       | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|----------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Amethyst_Witch's_Crown** | 72–88 | T2   | flat_energy_shield · pct_energy_shield · xp_bonus                         | **UNIQUE** ↓ |
| Ancient_Grimscale_Helm_2   | 82–100| T1   | flat_armor · pct_armor · flat_hp · fire_res                               |              |
| Crimson_Lotus_Crown        | 45–62 | T3   | flat_hp · pct_hp · fire_res                                              |              |
| Crimson_Thorn_Crown        | 38–55 | T4   | flat_hp · flat_armor · cold_res                                          |              |
| **Crimson_Throne_Helm**    | 68–85 | T2   | flat_hp · pct_hp · flat_armor · phys_res                                  | **UNIQUE** ↓ |
| Ember_Grimscale_Coronet    | 52–68 | T3   | flat_armor · fire_res · flat_hp                                          |              |
| Embercrown_Helm            | 40–58 | T3   | flat_armor · fire_res · pct_armor                                        |              |
| Emberveil_Casque           | 35–52 | T4   | flat_armor · flat_energy_shield · fire_res                               |              |
| Emberveil_Coif             | 22–38 | T4   | flat_evasion · fire_res · flat_hp                                        |              |
| Emberveil_Helm             | 15–30 | T5   | flat_armor · fire_res                                                   |              |
| Forsaken_Grimscale_Helm    | 60–78 | T2   | flat_armor · pct_armor · phys_res · flat_hp                               |              |
| Grimscale_Coronet          | 28–45 | T4   | flat_armor · flat_hp · cold_res                                          |              |
| Grimscale_Cowl             | 18–35 | T5   | flat_evasion · flat_hp                                                  |              |
| **Hollowveil_Skull_Helm**  | 55–72 | T3   | flat_energy_shield · pct_energy_shield · xp_bonus                         | **UNIQUE** ↓ |
| **Horned_Tyrant's_Crown**  | 80–100| T1   | flat_hp · pct_hp · phys_res · xp_bonus                                   | **UNIQUE** ↓ |
| Moss-Worn_Helm_of_Thorns   | 20–38 | T4   | flat_hp · cold_res · life_regen                                          |              |
| Shadowpeak_Helm            | 42–60 | T3   | flat_evasion · pct_evasion · flat_hp                                     |              |
| Shattered_Emberveil_Helm   | 5–20  | T5   | flat_armor · fire_res                                                   |              |
| Storm_Emberveil_Helm_2     | 48–65 | T3   | flat_armor · lightning_res · flat_hp                                     |              |
| Veilbound_Crown            | 62–80 | T2   | flat_energy_shield · pct_energy_shield · lightning_res                    |              |

**Unique Mechanics — Helmets:**

> **Amethyst_Witch's_Crown** — *Arcane Attunement*
> `flat_energy_shield` absorbs **15% of incoming physical damage** before HP (Energy Shield becomes a barrier against phys. damage).

> **Crimson_Throne_Helm** — *Blood Crown*
> `flat_hp` on this helmet **doubles** after killing a Boss rarity enemy (effect lasts until end of location).

> **Hollowveil_Skull_Helm** — *Death Mask*
> `xp_bonus` **doubles** while player HP is below **30% of maximum**.

> **Horned_Tyrant's_Crown** — *Domination*
> All numeric stats on **other equipped items** are increased by **+2%** (multiplicative bonus to roll).

---

### 4.2 Plates / Chest Armor (`armor`) — `armor/plates/in_use/`

**Theme**: Main defensive slot. Max HP, armour, resistances.
**Drop**: Wild Boar (T5), Oni (T3), Dragon (T1). Beast King's Arena + Shadow Shogun Boss Maps.

| Item                           | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|--------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| Azuremantle_Cuirass            | 55–72 | T3   | flat_energy_shield · pct_energy_shield · lightning_res                    |              |
| Bloodplate_Cuirass             | 22–38 | T4   | flat_hp · flat_armor · phys_res                                          |              |
| Bloodrite_Cuirass              | 38–55 | T4   | flat_hp · pct_hp · flat_armor                                            |              |
| Bloodstitched_Doublet          | 15–30 | T5   | flat_hp · flat_evasion                                                  |              |
| Bloodweave_Cuirass             | 30–48 | T4   | flat_hp · pct_hp · cold_res                                              |              |
| **Bonelord's_Cuirass**         | 72–88 | T2   | flat_hp · flat_armor · pct_armor · phys_res                               | **UNIQUE** ↓ |
| **Crimson_Harbinger_Plate**    | 78–95 | T1   | flat_hp · pct_hp · flat_armor · phys_res                                  | **UNIQUE** ↓ |
| Crimson_Thornplate             | 45–62 | T3   | flat_hp · flat_armor · cold_res                                          |              |
| Cursed_Bloodweave_Cuirass_2    | 65–82 | T2   | flat_hp · pct_hp · flat_armor · fire_res                                  |              |
| Ember_Ironbound_Thoraxplate    | 52–68 | T3   | flat_armor · pct_armor · fire_res · flat_hp                               |              |
| **Goldenscale_Cuirass**        | 68–85 | T2   | flat_armor · pct_armor · gold_find · flat_hp                              | **UNIQUE** ↓ |
| Goldplate_Sentinel             | 42–60 | T3   | flat_armor · pct_armor · flat_hp                                         |              |
| Shadowplate_Corselet           | 48–65 | T3   | flat_evasion · pct_evasion · flat_hp                                     |              |
| Shattered_Thornplate_Cuirass   | 8–22  | T5   | flat_hp · flat_armor                                                    |              |
| Thornbound_Cuirass             | 35–52 | T4   | flat_hp · cold_res · flat_armor                                          |              |
| Thornscale_Harness             | 28–45 | T4   | flat_armor · flat_hp · lightning_res                                     |              |
| Thornweave_Cuirass             | 18–35 | T5   | flat_hp · flat_armor                                                    |              |
| Thornwood_Pauldrons            | 10–25 | T5   | flat_hp · flat_armor                                                    |              |
| Veilbound_Cuirass              | 62–80 | T2   | flat_energy_shield · pct_energy_shield · flat_hp · lightning_res          |              |
| **Voidborn_Goldenscale_Cuirass**| 85–100| T1  | flat_armor · pct_armor · flat_energy_shield · pct_energy_shield           | **UNIQUE** ↓ |

**Unique Mechanics — Plates:**

> **Bonelord's_Cuirass** — *Bone Fortress*
> `flat_armor` increased by **+1 per 10 flat_hp** total across all equipment.

> **Crimson_Harbinger_Plate** — *Harbinger's Will*
> When HP drops below **25%**: +30% phys_res for **5 seconds** (60s cooldown).

> **Goldenscale_Cuirass** — *Dragonscale*
> Every **10% gold_find** across all equipment grants **+5 flat_armor** to this chest piece.

> **Voidborn_Goldenscale_Cuirass** — *Void Mantle*
> `energy_shield` regenerates at **5% per second** while the player takes no damage (2s delay).

---

### 4.3 Mantles — new slot `mantle` — `armor/mantles/in_use/`

> **New slot proposal**: Mantles (cloaks) occupy the **`mantle`** slot (shoulders/cloak).
> Available stats: `flat_evasion · pct_evasion · flat_energy_shield · cold_res · lightning_res · life_regen · gold_find · pct_hp`
> Stat count: 2–3 (auxiliary slot, not overloaded).

**Drop**: Forest Spirit (T4), Tengu (T2), Tengu Mountain Peak Boss Map.

| Item                           | iLvl  | Tier | Stats (2–3)                                             | Special      |
|--------------------------------|-------|------|---------------------------------------------------------|--------------|
| Ancient_Shadowveil_Mantle      | 82–100| T1   | pct_evasion · flat_energy_shield · cold_res             |              |
| Crimson_Veilcloak              | 42–60 | T3   | flat_evasion · cold_res                                |              |
| Duskweave_Mantle               | 28–45 | T4   | flat_evasion · pct_hp                                  |              |
| Ember_Ravenwing_Mantle         | 48–65 | T3   | flat_evasion · life_regen · cold_res                   |              |
| Emberfell_Mantle               | 35–52 | T4   | flat_energy_shield · life_regen                        |              |
| Forsaken_Thornweave_Mantle     | 62–78 | T2   | flat_evasion · pct_evasion · cold_res                  |              |
| Forsaken_Thornweave_Mantle_2   | 65–82 | T2   | flat_evasion · cold_res · life_regen                   |              |
| **Frostweave_Mantle**          | 52–68 | T3   | flat_evasion · cold_res · life_regen                   |              |
| **Frostweaver's_Mantle**       | 72–88 | T2   | pct_evasion · cold_res · flat_energy_shield             | **UNIQUE** ↓ |
| **Goldweave_Mantle**           | 58–75 | T3   | gold_find · flat_evasion · pct_hp                       | **UNIQUE** ↓ |
| Hollow_Shadowveil_Mantle       | 8–22  | T5   | flat_evasion · pct_hp                                  |              |
| **Ravenwing_Shroud**           | 68–85 | T2   | pct_evasion · flat_evasion · flat_energy_shield         | **UNIQUE** ↓ |
| Shadowpall_Mantle              | 38–55 | T4   | flat_evasion · pct_evasion                             |              |
| Shattered_Frostweave_Mantle    | 10–25 | T5   | flat_evasion · cold_res                                |              |
| Shattered_Shadowveil_Mantle_2  | 5–18  | T5   | flat_evasion · pct_hp                                  |              |
| **Shroudweaver's_Mantle**      | 80–100| T1   | pct_evasion · flat_energy_shield · pct_hp               | **UNIQUE** ↓ |
| Storm_Thornweave_Mantle        | 55–72 | T3   | flat_evasion · lightning_res · life_regen              |              |
| Thornwood_Shroud               | 22–38 | T4   | flat_evasion · cold_res                                |              |
| Voidborn_Shadowveil_Mantle     | 82–100| T1   | pct_evasion · flat_energy_shield · pct_hp              |              |
| Voidborn_Shadowweave_Mantle_3  | 85–100| T1   | pct_evasion · pct_energy_shield · life_regen            |              |

**Unique Mechanics — Mantles:**

> **Frostweaver's_Mantle** — *Permafrost*
> Cold resistance absorbs cold damage, then **reflects 20% of absorbed** back to the attacker.

> **Goldweave_Mantle** — *Gold Rush Aura*
> `gold_find` on this mantle applies to **all other equipment** at +10% of the mantle's value (aura).

> **Ravenwing_Shroud** — *Shadow Flight*
> `pct_evasion` **x1.5** while player HP is **above 70%** of maximum.

> **Shroudweaver's_Mantle** — *Weave of Fates*
> `pct_energy_shield` also applies to the **HP** pool at **50% of its value** (e.g.: 40% ES -> +20% HP bonus).

---

### 4.4 Shields — new slot `off_hand` — `armor/shields/in_use/`

> **New slot proposal**: Shield occupies the **`off_hand`** slot (left hand with one-hand weapon).
> Available stats: `block_chance · flat_armor · flat_hp · phys_res · fire_res · cold_res · lightning_res · flat_energy_shield`
> Stat count: 2–3.

**Drop**: Bandit (T5), Ronin (T3), Shogun (T1).

| Item                       | iLvl  | Tier | Stats (2–3)                                              | Special      |
|----------------------------|-------|------|----------------------------------------------------------|--------------|
| **Ancient_Voidpact_Aegis** | 82–100| T1   | block_chance · flat_energy_shield · phys_res              | **UNIQUE** ↓ |
| Azurite_Warden's_Aegis     | 58–75 | T3   | block_chance · flat_armor · lightning_res                 |              |
| Bloodthorn_Aegis           | 35–52 | T4   | flat_hp · block_chance · cold_res                        |              |
| Bonelord's_Bulwark         | 62–78 | T2   | flat_armor · flat_hp · block_chance                      |              |
| Faithward_Aegis            | 22–38 | T4   | block_chance · flat_armor                               |              |
| Frostward_Aegis            | 42–60 | T3   | block_chance · cold_res · flat_hp                        |              |
| Gilded_Warden's_Bulwark    | 65–82 | T2   | block_chance · flat_armor · flat_hp                      |              |
| **Goldward_Bulwark**       | 55–72 | T3   | block_chance · flat_armor · flat_hp                      | **UNIQUE** ↓ |
| Hexwood_Bastion            | 38–55 | T4   | block_chance · cold_res · flat_energy_shield             |              |
| Hollow_Solward's_Aegis     | 8–22  | T5   | block_chance · flat_armor                               |              |
| **Ironbound_Citadel**      | 75–92 | T1   | block_chance · flat_armor · phys_res · flat_hp           | **UNIQUE** ↓ |
| Ironwood_Bastion           | 28–45 | T4   | flat_armor · block_chance · flat_hp                      |              |
| **Lionheart_Aegis**        | 68–85 | T2   | block_chance · flat_hp · phys_res                        | **UNIQUE** ↓ |
| Marrowbound_Aegis          | 45–62 | T3   | flat_hp · block_chance · phys_res                        |              |
| Shattered_Voidpact_Aegis   | 10–25 | T5   | block_chance · flat_energy_shield                        |              |
| Solward's_Aegis            | 18–35 | T5   | block_chance · flat_armor                               |              |
| Thornspire_Bastion         | 48–65 | T3   | flat_armor · cold_res · block_chance                     |              |
| Thornveil_Bulwark          | 52–68 | T3   | flat_armor · flat_energy_shield · block_chance           |              |
| Veilward_Aegis             | 58–75 | T3   | flat_energy_shield · block_chance · lightning_res         |              |
| Voidborn_Obsidian_Bulwark  | 85–100| T1   | block_chance · flat_energy_shield · phys_res · flat_armor |              |

**Unique Mechanics — Shields:**

> **Ancient_Voidpact_Aegis** — *Void Contract*
> `block_chance` also applies to **elemental damage** (fire/cold/lightning) — not just physical.

> **Goldward_Bulwark** — *Midas Guard*
> `gold_find` from all equipment adds **+1% block_chance per 10% gold_find** (max +15%).

> **Ironbound_Citadel** — *Fortress Wall*
> Each 1% `block_chance` above 10% converts to **+10 flat_armor** (armour build priority).

> **Lionheart_Aegis** — *Lionheart*
> On blocking a hit: restores **5% of max HP** instantly.

---

### 4.5 Gloves (`gloves`) — `armor/gloves/in_use/`

**Theme**: LoH, crit, evasion, armour. Strike slot.
**Drop**: Wild Boar (T5), Oni (T3), Beast King's Arena Boss Map.

| Item                           | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|--------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| Ancient_Bloodwraith_Grips_2    | 82–100| T1   | life_on_hit · flat_armor · pct_phys_dmg · crit_chance                     |              |
| **Bloodhound's_Grasp**         | 60–78 | T2   | life_on_hit · flat_evasion · crit_chance                                  | **UNIQUE** ↓ |
| Bloodhusk_Grips                | 18–35 | T5   | flat_armor · life_on_hit                                                |              |
| Bloodpulse_Wraps               | 30–48 | T4   | life_on_hit · pct_phys_dmg · flat_armor                                   |              |
| Bloodsoaked_Wraiths            | 22–38 | T4   | life_on_hit · flat_evasion                                              |              |
| **Bloodthorn_Gauntlets**       | 65–82 | T2   | flat_armor · pct_phys_dmg · life_on_hit · crit_chance                     | **UNIQUE** ↓ |
| Bloodveil_Gauntlets            | 42–60 | T3   | flat_armor · flat_evasion · life_on_hit                                   |              |
| Bloodveil_Wraps                | 28–45 | T4   | flat_evasion · life_on_hit                                              |              |
| Bloodweave_Grips               | 35–52 | T4   | pct_phys_dmg · flat_armor · life_on_hit                                   |              |
| Bloodwraith_Grips              | 48–65 | T3   | life_on_hit · flat_evasion · flat_armor                                   |              |
| Cursed_Bonegrip_Gauntlets      | 62–80 | T2   | flat_armor · pct_phys_dmg · crit_chance · flat_evasion                    |              |
| Ember_Ashen_Grips              | 38–55 | T4   | flat_armor · pct_phys_dmg · crit_chance                                   |              |
| Hollow_Crimson_Thorngrips      | 8–22  | T5   | flat_armor · life_on_hit                                                |              |
| Nightfall_Grips                | 45–62 | T3   | flat_evasion · crit_chance · flat_energy_shield                           |              |
| Rotwood_Gauntlets              | 15–30 | T5   | flat_armor · flat_evasion                                               |              |
| **Shadowpact_Grips**           | 70–88 | T2   | flat_evasion · crit_chance · life_on_hit                                  | **UNIQUE** ↓ |
| Shadowveil_Grips               | 52–68 | T3   | flat_evasion · flat_energy_shield · crit_chance                           |              |
| Shattered_Veilweaver's_Grasp   | 10–25 | T5   | flat_evasion · flat_energy_shield                                        |              |
| Veilwraith_Grips               | 55–72 | T3   | flat_energy_shield · flat_evasion · life_on_hit                           |              |
| **Wraithbound_Gauntlets**      | 78–95 | T1   | life_on_hit · flat_energy_shield · flat_evasion · crit_chance             | **UNIQUE** ↓ |

**Unique Mechanics — Gloves:**

> **Bloodhound's_Grasp** — *Scent of Blood*
> `life_on_hit` **tripled** against enemies affected by DoT (poison, burning).

> **Bloodthorn_Gauntlets** — *Thorn Fist*
> **15% of flat_armor** of these gloves is reflected as damage to the enemy on each hit.

> **Shadowpact_Grips** — *Shadow Pact*
> `crit_chance` also works as a **chance to double gold_find** from the next drop after a crit.

> **Wraithbound_Gauntlets** — *Wraith Touch*
> **25% of life_on_hit** converts to **Energy Shield** restoration instead of HP.

---

### 4.6 Belts (`belt`) — `armor/belts/in_use/`

**Theme**: HP, resistances, gold_find, life_regen.
**Drop**: Bandit (T5), Ronin (T3), Bandit Lord's Fortress Boss Map.

| Item                           | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|--------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Abyssal_Cinch**              | 68–85 | T2   | flat_hp · life_regen · gold_find                                          | **UNIQUE** ↓ |
| Ancient_Cinderbound_Girdle_2   | 82–100| T1   | flat_hp · fire_res · life_regen · gold_find                               |              |
| Ancient_Wraithbound_Girdle     | 80–100| T1   | flat_hp · pct_hp · flat_armor · cold_res                                  |              |
| **Bloodwarden's_Cincture**     | 60–78 | T2   | flat_hp · life_regen · phys_res                                           | **UNIQUE** ↓ |
| Bloodwrath_Girdle              | 35–52 | T4   | flat_hp · flat_armor · phys_res                                          |              |
| Boneweave_Girdle               | 22–38 | T4   | flat_hp · life_regen · flat_armor                                         |              |
| Carrionwraith_Girdle           | 28–45 | T4   | flat_hp · cold_res · life_regen                                          |              |
| Crimson_Warden's_Girdle        | 45–62 | T3   | flat_hp · phys_res · flat_armor                                          |              |
| Cursed_Shadowbound_Girdle      | 65–82 | T2   | flat_hp · pct_hp · gold_find · lightning_res                              |              |
| Ember_Cinderbound_Girdle       | 38–55 | T4   | flat_hp · fire_res · life_regen                                          |              |
| Forsaken_Cinderbound_Girdle    | 58–75 | T3   | flat_hp · fire_res · flat_armor · phys_res                                |              |
| Hollow_Cinderbound_Girdle      | 8–22  | T5   | flat_hp · fire_res                                                      |              |
| **Shadowbind_Cincture**        | 55–72 | T3   | flat_evasion · flat_hp · gold_find                                        | **UNIQUE** ↓ |
| Shadowbound_Girdle             | 42–60 | T3   | flat_hp · pct_hp · lightning_res                                         |              |
| Storm_Abyssal_Cinch            | 52–68 | T3   | flat_hp · lightning_res · flat_armor                                      |              |
| Storm_Cinderbound_Girdle       | 48–65 | T3   | flat_hp · lightning_res · fire_res                                       |              |
| Tarnished_Corslet_Girdle       | 15–30 | T5   | flat_hp · flat_armor                                                    |              |
| Verdant_Girdle_of_Thorns       | 30–48 | T4   | flat_hp · cold_res · life_regen                                          |              |
| Verdant_Siege_Girdle           | 18–35 | T5   | flat_hp · flat_armor                                                    |              |
| **Voidstitched_Girdle**        | 75–92 | T1   | flat_hp · pct_hp · life_regen · lightning_res                             | **UNIQUE** ↓ |

**Unique Mechanics — Belts:**

> **Abyssal_Cinch** — *Abyss Pull*
> `gold_find` has a **5% chance** to drop a **Map Key** of the current tier instead of gold (Endgame Maps only).

> **Bloodwarden's_Cincture** — *Blood Warden*
> `life_regen` **doubles** while HP is below **50% of maximum**.

> **Shadowbind_Cincture** — *Shadow Bind*
> Unique belt — the only belt that grants `flat_evasion` (not in the standard pool). `flat_evasion` value is **tripled**, but `gold_find` reduced by **-15%**.

> **Voidstitched_Girdle** — *Void Stitching*
> `flat_hp` on this belt (including implicit) also adds an **equal amount of Energy Shield** passively (1 HP = 1 ES). ES from this effect does not count as an item stat.

---

### 4.7 Boots (`boots`) — `boots/boots/in_use/`

**Theme**: Evasion, resistances, HP, movement.
**Drop**: Bandit (T5), Forest Spirit (T4), Spirit of the Ancient Wood Boss Map.

| Item                           | iLvl  | Tier | Stats (2–4)                                                              | Special      |
|--------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| Amethyst_Marrow_Treads         | 52–68 | T3   | flat_evasion · cold_res · flat_hp                                        |              |
| Ancient_Abyssal_Treads         | 82–100| T1   | flat_evasion · flat_armor · flat_energy_shield · lightning_res            |              |
| Ashenmire_Treads               | 18–35 | T5   | flat_evasion · cold_res                                                 |              |
| Ashenworn_Greaves              | 10–25 | T5   | flat_armor · flat_hp                                                    |              |
| Bloodmire_Treads               | 28–45 | T4   | flat_hp · flat_evasion · fire_res                                        |              |
| Cindercrust_Greaves            | 35–52 | T4   | flat_armor · fire_res · flat_hp                                         |              |
| Cinderfell_Treads              | 22–38 | T4   | flat_evasion · fire_res                                                 |              |
| Crimson_Void_Treads            | 58–75 | T3   | flat_evasion · flat_energy_shield · cold_res                             |              |
| Hollow_Frostbind_Treads        | 8–22  | T5   | flat_evasion · cold_res                                                 |              |
| **Marrowstep_Treads**          | 65–82 | T2   | flat_hp · flat_armor · cold_res                                          | **UNIQUE** ↓ |
| Mossgrown_Treads               | 15–30 | T5   | flat_evasion · cold_res                                                 |              |
| **Shadowstep_Greaves**         | 55–72 | T3   | flat_evasion · flat_armor · flat_hp                                      | **UNIQUE** ↓ |
| Shattered_Shadowstep_Greaves   | 5–20  | T5   | flat_evasion · flat_hp                                                  |              |
| Stonewraith_Treads             | 38–55 | T4   | flat_armor · flat_evasion · flat_hp                                     |              |
| Storm_Mossgrown_Treads         | 45–62 | T3   | flat_evasion · lightning_res · flat_armor                               |              |
| Stormveil_Treads               | 48–65 | T3   | flat_evasion · lightning_res · flat_energy_shield                        |              |
| Thornveil_Treads               | 42–60 | T3   | flat_evasion · cold_res · flat_armor                                    |              |
| **Umbralshard_Treads**         | 72–88 | T2   | flat_evasion · flat_armor · flat_energy_shield · lightning_res            | **UNIQUE** ↓ |
| **Voidborn_Embercinder_Treads**| 80–100| T1   | flat_evasion · flat_energy_shield · fire_res · flat_hp                    | **UNIQUE** ↓ |
| Voidborn_Shadowstep_Greaves    | 85–100| T1   | flat_armor · flat_evasion · flat_energy_shield · cold_res                |              |

**Unique Mechanics — Boots:**

> **Marrowstep_Treads** — *Bone Walk*
> `flat_hp` on boots **counts twice** when calculating maximum HP (double contribution from this slot).

> **Shadowstep_Greaves** — *Shadow Step*
> All `flat_evasion` (from boots + other equipment) **doubles** for **3 seconds** after killing an enemy.

> **Umbralshard_Treads** — *Umbral Phase*
> **10% chance** on taking a hit: that specific hit is **completely ignored** (phase).

> **Voidborn_Embercinder_Treads** — *Cinder Walk*
> Passively deals `flat_fire_dmg` (equal to the stat value on the boots) to **all enemies every 2 seconds** (fire trail).

---

### 4.8 Pants — new slot `legs` — `armor/pants/in_use/`

> **New slot proposal**: Pants occupy the **`legs`** slot.
> Available stats: `flat_hp · flat_armor · flat_evasion · flat_energy_shield · fire_res · cold_res · lightning_res · phys_res · crit_chance`
> Stat count: 2–3.

**Drop**: Wild Boar (T5), Oni (T3), Dragon (T1).

| Item                              | iLvl  | Tier | Stats (2–3)                                         | Special      |
|-----------------------------------|-------|------|-----------------------------------------------------|--------------|
| **Abyssal_Weave_Chausses**        | 62–80 | T2   | flat_energy_shield · lightning_res                  |              |
| **Abyssal_Wrath_Greaves**         | 68–85 | T2   | flat_energy_shield · crit_chance · lightning_res     | **UNIQUE** ↓ |
| Bonelace_Greaves                  | 18–35 | T5   | flat_hp · flat_armor                               |              |
| Cinderfall_Greaves                | 30–48 | T4   | flat_armor · fire_res                              |              |
| Crimson_Weave_Legguards           | 38–55 | T4   | flat_hp · phys_res                                 |              |
| Deepwood_Legguards                | 22–38 | T4   | flat_hp · cold_res                                 |              |
| **Infernal_Cinderwraps**          | 55–72 | T3   | flat_armor · fire_res · flat_hp                     | **UNIQUE** ↓ |
| Motleyweave_Leggings              | 10–25 | T5   | flat_hp · flat_evasion                             |              |
| Pestilent_Bog_Chausses            | 28–45 | T4   | flat_hp · cold_res · flat_armor                    |              |
| **Ravenwing_Chausses**            | 72–88 | T2   | flat_evasion · pct_evasion · cold_res               | **UNIQUE** ↓ |
| Rotscourge_Legguards              | 15–30 | T5   | flat_hp · flat_armor                               |              |
| Scorched_Marrow_Chausses          | 35–52 | T4   | flat_armor · fire_res                              |              |
| Shadowbind_Legguards              | 42–60 | T3   | flat_evasion · lightning_res                       |              |
| Shadowthorn_Greaves               | 48–65 | T3   | flat_evasion · cold_res · flat_hp                  |              |
| Shattered_Emberscourge_Legguards  | 8–22  | T5   | flat_armor · fire_res                              |              |
| Thornveil_Legguards               | 45–62 | T3   | flat_hp · cold_res                                 |              |
| Veilbound_Greaves                 | 58–75 | T3   | flat_energy_shield · flat_evasion · lightning_res   |              |
| Violetblight_Greaves              | 52–68 | T3   | flat_energy_shield · cold_res · flat_hp            |              |
| Voidborn_Amethyst_Blight_Leggings | 82–100| T1   | flat_energy_shield · pct_energy_shield · crit_chance|              |
| **Voidweave_Breeches**            | 78–95 | T1   | flat_energy_shield · pct_energy_shield · flat_hp    | **UNIQUE** ↓ |

**Unique Mechanics — Pants:**

> **Abyssal_Wrath_Greaves** — *Wrath of Abyss*
> `crit_chance` from these pants **counts at double value** when calculating final crit chance.

> **Infernal_Cinderwraps** — *Infernal Heat*
> `fire_res` on these pants converts to **+1 flat_fire_dmg per 3% fire_res** (e.g. 30% -> +10 flat fire dmg).

> **Ravenwing_Chausses** — *Raven's Flight*
> `flat_evasion` applies to **all damage types** at 20% effectiveness (including fire/cold/lightning).

> **Voidweave_Breeches** — *Void Weave*
> Energy Shield regenerates at **2%/sec continuously** (regardless of taking damage, no delay).

---

## 5. Accessories

### 5.1 Amulets Set A (`amulet`) — `accessory/amulets/in_use/`

**Theme**: Universal slot. Unique offence+defence combos, passive DPS, gold/xp.
**Drop**: Forest Spirit (T4), Dragon (T1), Spirit of the Ancient Wood Boss Map.

| Item                      | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|---------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Abyssal_Anchor**        | 80–100| T1   | flat_energy_shield · pct_energy_shield · pct_hp                           | **UNIQUE** ↓ |
| Abyssal_Sigil             | 62–78 | T2   | flat_energy_shield · lightning_res · passive_dps_bonus                    |              |
| Azurite_Watcher's_Seal    | 55–72 | T3   | flat_hp · pct_hp · cold_res · xp_bonus                                   |              |
| Bloodwood_Effigy          | 28–45 | T4   | flat_hp · life_regen · phys_res                                          |              |
| **Chalice_of_Cinders**    | 65–82 | T2   | life_regen · flat_fire_dmg · fire_res                                     | **UNIQUE** ↓ |
| Crimson_Oath_Medallion    | 38–55 | T4   | flat_hp · pct_phys_dmg · phys_res                                        |              |
| Crimson_Tether_Amulet     | 30–48 | T4   | flat_hp · pct_phys_dmg · life_regen                                      |              |
| Embercrest_Amulet         | 42–60 | T3   | flat_fire_dmg · pct_phys_dmg · fire_res                                  |              |
| Emberfang_Talisman        | 48–65 | T3   | flat_fire_dmg · crit_chance · passive_dps_bonus                           |              |
| Emberscourge_Talisman     | 52–68 | T3   | flat_fire_dmg · pct_phys_dmg · crit_multiplier                            |              |
| **Gilded_Redemption_Cross**| 58–75| T3   | gold_find · xp_bonus · flat_hp                                            | **UNIQUE** ↓ |
| Hollowveil_Talisman       | 18–35 | T5   | flat_hp · flat_energy_shield                                             |              |
| Latticebound_Talisman     | 35–52 | T4   | flat_hp · cold_res · lightning_res                                       |              |
| Luneblight_Charm          | 22–38 | T4   | flat_cold_dmg · cold_res · life_regen                                    |              |
| Pawbound_Talisman         | 10–25 | T5   | flat_hp · flat_phys_dmg                                                 |              |
| **Raven's_Hollow_Eye**    | 72–90 | T2   | crit_chance · crit_multiplier · passive_dps_bonus                         | **UNIQUE** ↓ |
| Shadowpact_Talisman       | 45–62 | T3   | flat_evasion · crit_chance · passive_dps_bonus                            |              |
| Solaris_Oath_Amulet       | 60–78 | T2   | gold_find · xp_bonus · flat_hp · life_regen                               |              |
| Verdant_Sorrow_Pendant    | 25–42 | T4   | flat_cold_dmg · life_regen · cold_res                                    |              |
| Verdant_Teardrop_Amulet   | 15–30 | T5   | flat_hp · cold_res                                                      |              |

**Unique Mechanics — Amulets A:**

> **Abyssal_Anchor** — *Soul Anchor*
> On receiving lethal damage: **survive with 1 HP** (120-second cooldown). Effect triggers once.

> **Chalice_of_Cinders** — *Burning Chalice*
> `life_regen` converts: every **2 HP/s regen -> +1 flat_fire_dmg** to attacks (regeneration is preserved).

> **Gilded_Redemption_Cross** — *Holy Redemption*
> `gold_find` and `xp_bonus` are both **x1.5** (multiplier, not additive bonus).

> **Raven's_Hollow_Eye** — *All-Seeing Eye*
> For each Rare+ enemy killed: `crit_chance` and `crit_multiplier` increase by **+1%** (max +20%, session counter).

---

### 5.2 Amulets Set B (`amulet`) — `accessory/amulets2/in_use/`

**Theme**: Dark, cursed, unusual amulets. More often unique.

| Item                           | iLvl  | Tier | Stats (2–4)                                                               | Special      |
|--------------------------------|-------|------|---------------------------------------------------------------------------|--------------|
| **Arachnid's_Vigil**           | 62–80 | T2   | life_on_hit · pct_phys_dmg · crit_chance                                  | **UNIQUE** ↓ |
| Azurite_Watcher's_Seal         | 55–72 | T3   | flat_hp · pct_hp · xp_bonus · cold_res                                   |              |
| Cardiophage_Amulet             | 42–60 | T3   | flat_hp · life_regen · phys_res                                          |              |
| Chronoveil_Sigil               | 52–68 | T3   | xp_bonus · passive_dps_bonus · flat_hp                                   |              |
| Crimson_Warden's_Cross         | 38–55 | T4   | flat_hp · phys_res · pct_hp                                              |              |
| Crossward_Aegis                | 30–48 | T4   | flat_hp · phys_res · cold_res                                            |              |
| Cursed_Deathshead_Sigil        | 65–82 | T2   | crit_chance · crit_multiplier · passive_dps_bonus · pct_phys_dmg          |              |
| Forsaken_Arachnid's_Vigil      | 62–80 | T2   | life_on_hit · crit_chance · flat_hp                                      |              |
| Forsaken_Bloodwing_Talisman    | 58–75 | T3   | flat_phys_dmg · pct_phys_dmg · flat_hp · life_on_hit                      |              |
| Gilded_Sepulcher_Amulet        | 55–72 | T3   | gold_find · flat_hp · xp_bonus                                           |              |
| Heartwood_Vigil                | 25–42 | T4   | flat_hp · life_regen · cold_res                                          |              |
| **Pentagram_of_the_Void**      | 78–95 | T1   | fire_res · cold_res · lightning_res · phys_res                            | **UNIQUE** ↓ |
| **Skull_of_Echoing_Dread**     | 72–90 | T2   | crit_chance · crit_multiplier · passive_dps_bonus                         | **UNIQUE** ↓ |
| Spiralvoid_Pendant             | 60–78 | T2   | flat_energy_shield · pct_energy_shield · passive_dps_bonus                |              |
| Stag's_Malice_Talisman         | 45–62 | T3   | pct_phys_dmg · crit_chance · flat_phys_dmg                               |              |
| **Sundered_Chronometer**       | 68–85 | T2   | xp_bonus · passive_dps_bonus · flat_hp · life_regen                       | **UNIQUE** ↓ |
| Tentacle_Sigil                 | 48–65 | T3   | flat_energy_shield · passive_dps_bonus · lightning_res                    |              |
| Thornveil_Pendant              | 22–38 | T4   | flat_cold_dmg · cold_res · life_regen                                    |              |
| Violet_Vigil_Amulet            | 35–52 | T4   | flat_energy_shield · cold_res · pct_hp                                   |              |
| Withered_Heartwood_Charm       | 15–30 | T5   | flat_hp · life_regen                                                    |              |

**Unique Mechanics — Amulets B:**

> **Arachnid's_Vigil** — *Spider's Web*
> `life_on_hit` also triggers from **passive DPS ticks** (each passive damage tick heals as if it were a hit).

> **Pentagram_of_the_Void** — *Pentapact*
> All 4 resistances on this amulet function at **x1.5** (e.g. 30% fire_res -> effective 45%).

> **Skull_of_Echoing_Dread** — *Echo of Death*
> On enemy kill: deals **20% of the victim's max HP** as **pure damage** to the next enemy in the queue.

> **Sundered_Chronometer** — *Fractured Time*
> `xp_bonus` also reduces **active skill cooldowns** by 1% per 5% xp_bonus (max -20%).

---

### 5.3 Rings (`ring`) — `accessory/rings/in_use/`

**Theme**: Universal accessory x2. Elemental damage, crit, resistances, gold.
**Drop**: Forest Spirit (T4), Ronin (T3), any enemies (whole game). Ronin's Haunted Dojo Boss Map.

| Item                            | iLvl  | Tier | Implicit              | Stats (2–3)                                                    | Special      |
|---------------------------------|-------|------|-----------------------|----------------------------------------------------------------|--------------|
| Ashborn_Signet                  | 22–38 | T4   | flat_phys_dmg         | pct_phys_dmg · crit_chance                                     |              |
| Embercrest_Sigil                | 38–55 | T4   | flat_fire_dmg         | flat_fire_dmg · crit_chance                                    |              |
| Emberfang_Sigil                 | 48–65 | T3   | flat_fire_dmg         | crit_multiplier · pct_phys_dmg · fire_res                      |              |
| Emberwraith_Sigil               | 35–52 | T4   | flat_fire_dmg         | passive_dps_bonus · fire_res                                   |              |
| Forsaken_Abyssal_Signet         | 62–80 | T2   | flat_hp               | flat_energy_shield · lightning_res · passive_dps_bonus         |              |
| Forsaken_Obsidian_Covenant_Ring | 58–75 | T3   | flat_hp               | phys_res · flat_energy_shield · pct_hp                         |              |
| Grimwood_Sigil                  | 28–45 | T4   | flat_cold_dmg         | cold_res · life_regen                                          |              |
| Nightfall_Signet                | 42–60 | T3   | flat_hp               | flat_evasion · crit_chance · gold_find                         |              |
| **Oathkeeper's_Seal**           | 72–88 | T2   | flat_hp               | fire_res · cold_res · lightning_res                             | **UNIQUE** ↓ |
| Obsidian_Covenant_Ring          | 52–68 | T3   | flat_hp               | phys_res · cold_res · flat_hp                                  |              |
| Ravenclaw_Sigil                 | 45–62 | T3   | flat_lightning_dmg    | crit_chance · crit_multiplier · pct_phys_dmg                   |              |
| Sable_Oath_Sigil                | 38–55 | T4   | flat_hp               | flat_energy_shield · passive_dps_bonus                         |              |
| Serpent's_Covenant_Ring         | 55–72 | T3   | flat_cold_dmg         | cold_res · life_regen · flat_hp                                |              |
| Shattered_Embercrest_Sigil      | 8–22  | T5   | flat_fire_dmg         | fire_res                                                       |              |
| Sigil_of_the_Withered_Crown     | 62–78 | T2   | flat_hp               | pct_hp · life_regen · phys_res                                 |              |
| **Sovereign's_Seal**            | 68–85 | T2   | gold_find             | gold_find · xp_bonus · flat_hp                                 | **UNIQUE** ↓ |
| **Stormveil_Sigil**             | 75–92 | T1   | flat_lightning_dmg    | flat_lightning_dmg · crit_chance · lightning_res               | **UNIQUE** ↓ |
| Thornweave_Signet               | 30–48 | T4   | flat_cold_dmg         | cold_res · flat_hp · life_regen                                |              |
| **Voidborn_Serpent's_Coil_Ring_2** | 82–100| T1 | flat_energy_shield    | pct_energy_shield · passive_dps_bonus · flat_energy_shield     | **UNIQUE** ↓ |
| Voidpulse_Sigil                 | 65–82 | T2   | flat_energy_shield    | pct_energy_shield · passive_dps_bonus · lightning_res          |              |

**Unique Mechanics — Rings:**

> **Oathkeeper's_Seal** — *Sworn Oath*
> All resistance stats on this ring **apply to both ring slots** simultaneously (not stacked twice — shared pool).

> **Sovereign's_Seal** — *Sovereign's Decree*
> `gold_find` on this ring also works as `xp_bonus` at **25% of its value**.

> **Stormveil_Sigil** — *Storm Veil*
> Lightning damage has a **20% chance** to hit **all enemies** in the current wave simultaneously.

> **Voidborn_Serpent's_Coil_Ring_2** — *Void Coil*
> Energy Shield regenerates at **10%/sec** (passively, with no delay conditions).

---

## 6. Consumable Items — Flasks

### Colour Code System

| Colour  | Flask Type          | Effect                                          | Compatible Types             |
|---------|--------------------|-------------------------------------------------|------------------------------|
| Green   | Life Flask         | Restores HP (healPercent of max HP)              | All flask types              |
| Blue    | Mana/ES Flask      | Restores Energy Shield                           | All flask types              |
| Red     | Attack Flask       | Temporary flat_phys_dmg bonus (+N%)              | All flask types              |
| Yellow  | Speed Flask        | Temporary passive_dps_bonus (+N%)                | All flask types              |
| Cyan    | Resistance Flask   | Temporary bonus to all resistances               | All flask types              |
| Purple  | Utility Flask      | Combo effect (HP + offence/defence bonus)        | All flask types              |

### Flask Types by Size (healPercent and charges)

| Flask Type (`flaskType`)   | Dir                  | maxCharges | healPercent | Effect Duration     |
|----------------------------|----------------------|------------|-------------|---------------------|
| `small_vial`               | `consumables/small_vials` | 3     | 8%          | 3s                  |
| `round_flask`              | `consumables/round_flasks`| 4     | 14%         | 5s                  |
| `corked_flask`             | `consumables/corked_flasks`| 4    | 12%         | 4s                  |
| `jug`                      | `consumables/jugs`   | 5          | 22%         | 6s                  |
| `tall_bottle`              | `consumables/tall_bottles`| 5     | 18%         | 8s                  |
| `wide_bottle`              | `consumables/wide_bottles`| 6     | 25%         | 6s                  |

### Flask Quality (item rarity) -> charges and heal%

| Rarity    | maxCharges Bonus | healPercent Bonus | Additional Effect                |
|-----------|------------------|-------------------|----------------------------------|
| Common    | base             | base              | heal only                        |
| Rare      | +1               | +3%               | +offence/defence bonus (5s)      |
| Epic      | +2               | +5%               | +offence/defence bonus (8s) x1.5 |
| Legendary | +3               | +8%               | +special effect by colour        |

### Legendary Flask Effects by Colour

| Colour  | Legendary Effect                                                             |
|---------|------------------------------------------------------------------------------|
| Green   | Heal over time + restores 2 charges on killing a Rare+ enemy               |
| Blue    | ES restoration + shield blocks the next hit (1 time)                        |
| Red     | +40% phys damage + next hit is guaranteed Critical Strike                  |
| Yellow  | +40% passive_dps_bonus + gold_find doubled for 10s                          |
| Cyan    | +50% all resistances + immunity to elemental damage for 3s                 |
| Purple  | Heal + resets cooldown of one active skill                                  |

---

## 7. Summary Table — Drop Weight by Category

### Equipment Drop Chance (vs gold/xp/keys)

| Content                    | Item Drop Chance    | Rarity Distribution             |
|----------------------------|---------------------|---------------------------------|
| Act 1–2 normal monsters    | 8%                  | 70% Common / 25% Rare / 5% Epic |
| Act 3–4 normal monsters    | 10%                 | 60% Common / 30% Rare / 9% Epic / 1% Legendary |
| Act 5 normal monsters      | 12%                 | 50% Rare / 35% Epic / 15% Legendary |
| Rare monsters              | +5% bonus           | shift +10% toward Epic/Legendary |
| Elite monsters (epic)      | +10% bonus          | shift +20% toward Legendary      |
| Location bosses            | 40% (1 item guaranteed) | 30% Epic / 70% Legendary |
| Endgame Map T1–4           | 15%                 | 40% Epic / 60% Legendary    |
| Endgame Map T5–10          | 20%                 | 20% Epic / 80% Legendary    |
| Boss Maps (all)            | 100% (2–3 items)    | 100% Legendary              |

### Monster Affinity — Detailed

| Monster       | Drop Pool Categories                                   | iLvl Bonus |
|---------------|--------------------------------------------------------|------------|
| Bandit        | Belt, Boots, Helmet (phys. equipment)                  | 0          |
| Wild Boar     | Plate, Gloves, Axes                                    | 0          |
| Forest Spirit | Mantle, Ring, Amulet, Bow, Boots                       | +2         |
| Ronin         | Sword, Blade, Shield, Belt                             | +5         |
| Oni           | Axe, Helmet, Plate (fire-themed)                       | +8         |
| Tengu         | Bow, Staff, Mantle, Evasion Armor                      | +12        |
| Dragon        | All categories (no restriction), Scrolls               | +18        |
| Shogun        | All categories, bias toward Legendary quality          | +25        |

---

## 8. New Slots — Proposal Summary

| Slot        | Code       | Asset Source        | Stat Pool                                                          |
|-------------|------------|---------------------|--------------------------------------------------------------------|
| Mantle      | `mantle`   | `armor/mantles/`    | evasion · energy_shield · cold_res · lightning_res · life_regen · gold_find · pct_hp |
| Off-Hand    | `off_hand` | `armor/shields/`    | block_chance · flat_armor · flat_hp · phys_res · elemental_res · flat_energy_shield |
| Legs        | `legs`     | `armor/pants/`      | flat_hp · flat_armor · flat_evasion · flat_energy_shield · elemental_res · crit_chance |

> **Note**: New slots (mantle, off_hand, legs) increase the overall character power ceiling.
> It is recommended to introduce them gradually — starting from Act 2, 3, and 4 respectively,
> to avoid overwhelming the player in the early game.

---

*Last updated: 2026-02-28 | Version: 1.0*
*Author: Game Designer Agent x Tap of Exile Balance Team*
