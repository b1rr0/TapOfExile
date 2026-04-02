# ITEMS BALANCE — Tap of Exile

> **Single source of truth** для дизайна предметов.
> Каждый предмет из `/shared/public/assets/equipments/*/in_use/` получает здесь:
> iLvl диапазон · 2–4 стата · место дропа.
> ~20% предметов — **уникальные** с особой механикой.
>
> Полные диапазоны статов по тирам → `bot/docs/equipment/*.md`

---

## 1. Система дропа — Фреймворк

### iLvl ↔ Прогрессия

| Tier | iLvl    | reqLvl | Контент                                      |
|------|---------|--------|----------------------------------------------|
| T5   | 1–19    | 0–14   | Act 1 (все локации)                          |
| T4   | 20–39   | 15–29  | Act 2 (все локации)                          |
| T3   | 40–59   | 30–44  | Act 3 (все локации)                          |
| T2   | 60–79   | 45–59  | Act 4 (все локации)                          |
| T1   | 80–100  | 60–75  | Act 5 + Endgame Maps T1–T10 + Boss Maps      |

### Аффиксы в имени → тематика предмета

| Аффикс                        | Элемент / статы              | iLvl смещение |
|-------------------------------|------------------------------|----------------|
| Blood / Crimson / Marrow      | phys_dmg, flat_hp, loh       | любой          |
| Ember / Cinder / Ash          | fire_dmg, fire_res           | любой          |
| Frost / Glacial / Ice         | cold_dmg, cold_res           | любой          |
| Storm / Thunder / Lightning   | lightning_dmg, lightning_res | любой          |
| Void / Abyssal / Night / Dusk | energy_shield, pct_hp        | +20 к базе     |
| Shadow / Veil                 | evasion, crit_chance         | +10 к базе     |
| Gold / Gilded / Solaris       | gold_find, xp_bonus          | любой          |
| Bone / Hollow / Skull         | flat_hp, life_regen          | любой          |
| Thorn / Verdant / Wood        | cold_dmg, life_regen         | любой          |
| Ancient / Voidborn            | top-end иерархия             | T1 (80–100)    |
| Cursed / Forsaken             | высокий риск                 | T2–T1 (60–100) |
| Shattered / Hollow            | бюджетные копии              | T5–T4 (1–39)   |

### Аффинитет монстров

| Монстр        | Act | Предпочтительные категории                         |
|---------------|-----|----------------------------------------------------|
| Bandit        | 1   | Belts, Boots, Helmets (T5)                         |
| Wild Boar     | 1   | Plates, Gloves, Axes (T5)                          |
| Forest Spirit | 2   | Mantles, Rings, Amulets, Bows (T4)                 |
| Ronin         | 2–3 | Swords, Blades, Shields, Belts (T4–T3)            |
| Oni           | 3   | Axes, Helmets, Fire-themed items (T3)              |
| Tengu         | 4   | Bows, Staffs, Mantles, Evasion gear (T2)           |
| Dragon        | 4–5 | All item types, high iLvl (T2–T1)                 |
| Shogun        | 5   | Legendary quality any slot (T1 only)               |

### Boss Map → эксклюзивный дроп (iLvl 88–100)

| Boss Map                  | Гарантированные категории                        |
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

## 2. Оружие — Одноручное

### 2.1 Axes (`oh_axe`) — `weapon/axes/in_use/`

**Тема**: Высокий физ. урон, тяжёлые удары, жизнь за удар.
**Дроп**: Bandit/Wild Boar (T5), Oni (T3), Dragon (T1).

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                              | Особое              |
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

**Уникальные механики — Axes:**

> **Bloodreaver's_Cleave** — *Blood Harvest*
> Убийство любого врага восстанавливает **8% от максимального HP**.
> Эффект не стакается; работает один раз за врага.

> **Grimstone_Reaper** — *Soul Rend*
> `passive_dps_bonus` увеличивается на **+1% за каждого убитого врага** в текущей сессии (макс +30%). Сбрасывается при выходе из локации.

> **Stormbreaker's_Maul** — *Lightning Crash*
> Каждый **5-й удар** наносит **300% lightning damage** от базового.
> Счётчик сбрасывается при смене локации.

> **Voidborn_Bloodmoon_Cleaver_3** — *Void Hunger*
> Убийство врага редкости Epic+ восстанавливает **10% Energy Shield** мгновенно.

---

### 2.2 Blades (`oh_dagger`) — `weapon/blades/in_use/`

**Тема**: Высокий крит, элементальные надбавки, кинжалы.
**Дроп**: Ronin (T4), Forest Spirit (T4), Dragon (T1).

| Предмет                      | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Blades:**

> **Amethyst_Fang** — *Venom Fang*
> Критические удары добавляют стак **яда** (pure DoT = 5% от нанесённого крит. урона в секунду, 3с). Стакается до 5 раз.

> **Crimson_Marrow_Blade** — *Blood Price*
> `crit_multiplier` увеличен на **+50%**, но **максимальное HP снижено на 10%**.
> Статы на предмете фиксированы (уникальный предмет).

> **Storm_Amethyst_Fang** — *Static Charge*
> При криты `life_on_hit` конвертируется в **lightning damage** (равный LoH × 3), вместо восстановления HP.

> **Verdant_Scourge** — *Nature's Wrath*
> `flat_cold_dmg` увеличен на значение **`life_regen`/сек × 5** (суммируется из всей экипировки).

---

### 2.3 Swords (`oh_sword`) — `weapon/swords/in_use/`

**Тема**: Баланс урона и крита, мечи и катаны.
**Дроп**: Ronin (T4–T3), Shogun (T1), Shadow Shogun Boss Map.

| Предмет                    | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Swords:**

> **Duskfall_Cleaver** — *Twilight Edge*
> Наносит дополнительный физ. урон равный **5% от суммарного Evasion Rating** (по всей экипировке).

> **Glacial_Fang_Blade** — *Frostbite*
> Холодный урон имеет **15% шанс заморозить** врага. Следующий удар по замороженному врагу наносит **200% урона**.

> **Goldflare_Cleaver** — *Golden Rush*
> После убийства врага редкости Rare+ `gold_find` **удваивается** на **30 секунд**.

> **Veilpiercer's_Edge** — *Phase Strike*
> **25% всего наносимого урона** игнорирует сопротивления противника.

---

## 3. Оружие — Двуручное

### 3.1 Bows (`tw_bow`) — `weapon/bows/in_use/`

**Тема**: Дальний бой, lightning + cold, высокий крит.
**Дроп**: Tengu (T2), Forest Spirit (T4), Tengu Mountain Peak Boss Map.

| Предмет                       | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Bows:**

> **Ancient_Emberflight_Longbow** — *Ember Arrow*
> Огненный урон этого оружия **игнорирует 20%** сопротивления врага к огню.

> **Frostbite_Whisper** — *Shatter*
> Критические удары холодом против **замороженных** врагов наносят **+150% бонусного урона**.

> **Sorrow's_Crescent** — *Lament*
> Каждый **не-критический удар** накапливает стак Sorrow (+1% crit_chance, макс 20 стаков). Первый критический сбрасывает стаки, но бьёт с полным накопленным бонусом.

> **Voidstrike_Recurve** — *Void Piercer*
> **10% от всего наносимого урона** конвертируется в **pure damage** (обходит все сопротивления).

---

### 3.2 Staffs (`tw_staff`) — `weapon/staffs/in_use/`

**Тема**: Элементальный урон, Energy Shield, passive DPS.
**Дроп**: Tengu (T2), Dragon (T1), Dragon's Eternal Lair Boss Map.

| Предмет                       | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Staffs:**

> **Crescent_Voidstaff** — *Void Hunger*
> Убийство любого врага восстанавливает **5 Energy Shield** (stackable per kill).

> **Embercrown_Staff** — *Inferno Aura*
> `passive_dps_bonus` на этом оружии применяется **только к fire damage** (эффективность ×1.5 для огня, ×0 для остального).

> **Serpent's_Coil_Staff** — *Serpent's Blessing*
> `life_regen` увеличен на **+1 HP/s за каждые 3% cold resistance** на всей экипировке.

> **Starfall_Scepter** — *Falling Stars*
> Каждый **10-й тап** активирует Starfall: наносит **200% flat_lightning_dmg** этого оружия как area hit всем врагам в волне.

---

### 3.3 Scrolls (`tw_scroll`) — `weapon/scrolls/in_use/`

**Тема**: Пассивный DPS, опыт, элементальный урон, магические гримуары.
**Дроп**: Dragon (T1), Shogun (T1), Dragon's Eternal Lair Boss Map.

| Предмет                              | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Scrolls:**

> **Azurite_Codex_of_Ruin** — *Ruination*
> Каждый убитый враг добавляет **+1 к flat_lightning_dmg** этого оружия (сбрасывается при смене зоны). Макс +50.

> **Paw_of_the_Covenant** — *Beast Bond*
> `flat_phys_dmg` увеличен на **+5% за каждый пройденный Акт** персонажем (макс Act 5 = +25%).

> **Scrolls_of_the_Starfall_Covenant** — *Covenant of Stars*
> `xp_bonus` также работает как `gold_find` на **50% своей величины** (они суммируются).

> **Voidpact_Grimoire** — *Eldritch Pact*
> `passive_dps_bonus` на предмете **удвоен**, но **максимальное HP снижено на 15%**.

---

## 4. Броня

### 4.1 Helmets (`helmet`) — `armor/helmets/in_use/`

**Тема**: HP, броня/уклонение, резисты, XP-бонус.
**Дроп**: Bandit/Wild Boar (T5), Oni (T3), любые врачи (T1). Oni Warlord Boss Map.

| Предмет                    | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Helmets:**

> **Amethyst_Witch's_Crown** — *Arcane Attunement*
> `flat_energy_shield` поглощает **15% входящего физического урона** раньше чем HP (Energy Shield становится барьером от физ. урона).

> **Crimson_Throne_Helm** — *Blood Crown*
> `flat_hp` на этом шлеме **удваивается** после убийства врага редкости Boss (эффект длится до конца локации).

> **Hollowveil_Skull_Helm** — *Death Mask*
> `xp_bonus` **удваивается**, пока HP игрока ниже **30% от максимума**.

> **Horned_Tyrant's_Crown** — *Domination*
> Все числовые статы на **других надетых предметах** увеличены на **+2%** (мультипликативный бонус к роллу).

---

### 4.2 Plates / Chest Armor (`armor`) — `armor/plates/in_use/`

**Тема**: Главный защитный слот. Макс HP, броня, резисты.
**Дроп**: Wild Boar (T5), Oni (T3), Dragon (T1). Beast King's Arena + Shadow Shogun Boss Maps.

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Plates:**

> **Bonelord's_Cuirass** — *Bone Fortress*
> `flat_armor` увеличен на **+1 за каждые 10 flat_hp** суммарно по всей экипировке.

> **Crimson_Harbinger_Plate** — *Harbinger's Will*
> При падении HP ниже **25%**: +30% phys_res на **5 секунд** (перезарядка 60с).

> **Goldenscale_Cuirass** — *Dragonscale*
> Каждые **10% gold_find** на всей экипировке дают **+5 flat_armor** к этому нагруднику.

> **Voidborn_Goldenscale_Cuirass** — *Void Mantle*
> `energy_shield` восстанавливается со скоростью **5% в секунду**, пока игрок не получает урон (задержка 2с).

---

### 4.3 Mantles — новый слот `mantle` — `armor/mantles/in_use/`

> **Предложение нового слота**: Мантии (плащи) занимают слот **`mantle`** (плечи/плащ).
> Доступные статы: `flat_evasion · pct_evasion · flat_energy_shield · cold_res · lightning_res · life_regen · gold_find · pct_hp`
> Кол-во статов: 2–3 (слот вспомогательный, не перегружаем).

**Дроп**: Forest Spirit (T4), Tengu (T2), Tengu Mountain Peak Boss Map.

| Предмет                        | iLvl  | Tier | Статы (2–3)                                             | Особое       |
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

**Уникальные механики — Mantles:**

> **Frostweaver's_Mantle** — *Permafrost*
> Cold resistance поглощает холодный урон, а затем **отражает 20% поглощённого** обратно атакующему.

> **Goldweave_Mantle** — *Gold Rush Aura*
> `gold_find` на этой мантии применяется ко **всей остальной экипировке** на +10% от значения мантии (аура).

> **Ravenwing_Shroud** — *Shadow Flight*
> `pct_evasion` **×1.5** пока HP игрока **выше 70%** от максимума.

> **Shroudweaver's_Mantle** — *Weave of Fates*
> `pct_energy_shield` также применяется к пулу **HP** на **50% своей величины** (например: 40% ES → +20% HP бонус).

---

### 4.4 Shields — новый слот `off_hand` — `armor/shields/in_use/`

> **Предложение нового слота**: Щит занимает слот **`off_hand`** (левая рука при одноручном оружии).
> Доступные статы: `block_chance · flat_armor · flat_hp · phys_res · fire_res · cold_res · lightning_res · flat_energy_shield`
> Кол-во статов: 2–3.

**Дроп**: Bandit (T5), Ronin (T3), Shogun (T1).

| Предмет                    | iLvl  | Tier | Статы (2–3)                                              | Особое       |
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

**Уникальные механики — Shields:**

> **Ancient_Voidpact_Aegis** — *Void Contract*
> `block_chance` применяется также к **элементальному урону** (огонь/холод/молния) — не только физическому.

> **Goldward_Bulwark** — *Midas Guard*
> `gold_find` со всей экипировки добавляет **+1% block_chance за каждые 10% gold_find** (макс +15%).

> **Ironbound_Citadel** — *Fortress Wall*
> Каждый 1% `block_chance` выше 10% конвертируется в **+10 flat_armor** (приоритет armor-билдов).

> **Lionheart_Aegis** — *Lionheart*
> При блокировании удара: восстанавливает **5% от max HP** мгновенно.

---

### 4.5 Gloves (`gloves`) — `armor/gloves/in_use/`

**Тема**: LoH, crit, evasion, броня. Ударный слот.
**Дроп**: Wild Boar (T5), Oni (T3), Beast King's Arena Boss Map.

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Gloves:**

> **Bloodhound's_Grasp** — *Scent of Blood*
> `life_on_hit` **утроен** против врагов, находящихся под эффектом DoT (яд, горение).

> **Bloodthorn_Gauntlets** — *Thorn Fist*
> **15% от flat_armor** этих перчаток отражается как урон врагу при каждом ударе.

> **Shadowpact_Grips** — *Shadow Pact*
> `crit_chance` также работает как **шанс удвоить gold_find** от следующего дропа после крита.

> **Wraithbound_Gauntlets** — *Wraith Touch*
> **25% от life_on_hit** конвертируется в восстановление **Energy Shield** вместо HP.

---

### 4.6 Belts (`belt`) — `armor/belts/in_use/`

**Тема**: HP, резисты, gold_find, life_regen.
**Дроп**: Bandit (T5), Ronin (T3), Bandit Lord's Fortress Boss Map.

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Belts:**

> **Abyssal_Cinch** — *Abyss Pull*
> `gold_find` имеет **5% шанс** вместо золота дропнуть **Map Key** текущего тира (только в Endgame Maps).

> **Bloodwarden's_Cincture** — *Blood Warden*
> `life_regen` **удваивается**, пока HP ниже **50% от максимума**.

> **Shadowbind_Cincture** — *Shadow Bind*
> Уникальный пояс — единственный пояс, дающий `flat_evasion` (не в стандартном пуле). Значение `flat_evasion` **утроено**, но `gold_find` снижен на **-15%**.

> **Voidstitched_Girdle** — *Void Stitching*
> `flat_hp` на этом поясе (включая implicit) также добавляет **равное количество Energy Shield** пассивно (1 HP = 1 ES). ES от этого эффекта не считается статом предмета.

---

### 4.7 Boots (`boots`) — `boots/boots/in_use/`

**Тема**: Evasion, резисты, HP, движение.
**Дроп**: Bandit (T5), Forest Spirit (T4), Spirit of the Ancient Wood Boss Map.

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                              | Особое       |
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

**Уникальные механики — Boots:**

> **Marrowstep_Treads** — *Bone Walk*
> `flat_hp` на ботинках **считается дважды** при расчёте максимального HP (двойной вклад этого слота).

> **Shadowstep_Greaves** — *Shadow Step*
> Весь `flat_evasion` (от ботинок + остальной экипировки) **удваивается** на **3 секунды** после убийства врага.

> **Umbralshard_Treads** — *Umbral Phase*
> **10% шанс** при получении удара: этот конкретный удар **полностью игнорируется** (фаза).

> **Voidborn_Embercinder_Treads** — *Cinder Walk*
> Пассивно наносит `flat_fire_dmg` (равный значению стата на ботинках) **всем врагам каждые 2 секунды** (fire trail).

---

### 4.8 Pants — новый слот `legs` — `armor/pants/in_use/`

> **Предложение нового слота**: Штаны занимают слот **`legs`**.
> Доступные статы: `flat_hp · flat_armor · flat_evasion · flat_energy_shield · fire_res · cold_res · lightning_res · phys_res · crit_chance`
> Кол-во статов: 2–3.

**Дроп**: Wild Boar (T5), Oni (T3), Dragon (T1).

| Предмет                           | iLvl  | Tier | Статы (2–3)                                         | Особое       |
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

**Уникальные механики — Pants:**

> **Abyssal_Wrath_Greaves** — *Wrath of Abyss*
> `crit_chance` с этих штанов **считается в двойном размере** при расчёте итогового крит. шанса.

> **Infernal_Cinderwraps** — *Infernal Heat*
> `fire_res` на этих штанах конвертируется в **+1 flat_fire_dmg за каждые 3% fire_res** (например 30% → +10 flat fire dmg).

> **Ravenwing_Chausses** — *Raven's Flight*
> `flat_evasion` применяется ко **всем типам урона** с эффективностью 20% (включая огонь/холод/молнию).

> **Voidweave_Breeches** — *Void Weave*
> Energy Shield восстанавливается со скоростью **2%/сек непрерывно** (независимо от получения урона, без задержки).

---

## 5. Аксессуары

### 5.1 Amulets Set A (`amulet`) — `accessory/amulets/in_use/`

**Тема**: Универсальный слот. Уникальные комбо атака+защита, passive DPS, gold/xp.
**Дроп**: Forest Spirit (T4), Dragon (T1), Spirit of the Ancient Wood Boss Map.

| Предмет                   | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Amulets A:**

> **Abyssal_Anchor** — *Soul Anchor*
> При получении смертельного урона: **выживаете с 1 HP** (120-секундный кулдаун). Эффект работает один раз.

> **Chalice_of_Cinders** — *Burning Chalice*
> `life_regen` конвертируется: каждые **2 HP/с regen → +1 flat_fire_dmg** к атаке (регенерация при этом сохраняется).

> **Gilded_Redemption_Cross** — *Holy Redemption*
> `gold_find` и `xp_bonus` оба **×1.5** (мультипликатор, не аддитивный бонус).

> **Raven's_Hollow_Eye** — *All-Seeing Eye*
> За каждого убитого врага Rare+: `crit_chance` и `crit_multiplier` увеличиваются на **+1%** (макс +20%, сессионный счётчик).

---

### 5.2 Amulets Set B (`amulet`) — `accessory/amulets2/in_use/`

**Тема**: Тёмные, проклятые, необычные амулеты. Чаще unique.

| Предмет                        | iLvl  | Tier | Статы (2–4)                                                               | Особое       |
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

**Уникальные механики — Amulets B:**

> **Arachnid's_Vigil** — *Spider's Web*
> `life_on_hit` также срабатывает от **тиков passive DPS** (каждый тик пассивного урона лечит как будто это был удар).

> **Pentagram_of_the_Void** — *Pentapact*
> Все 4 сопротивления на этом амулете работают на **×1.5** (например 30% fire_res → effective 45%).

> **Skull_of_Echoing_Dread** — *Echo of Death*
> При убийстве врага: наносит **20% от max HP жертвы** как **pure damage** следующему врагу в очереди.

> **Sundered_Chronometer** — *Fractured Time*
> `xp_bonus` также снижает **cooldown активных скиллов** на 1% за каждые 5% xp_bonus (макс -20%).

---

### 5.3 Rings (`ring`) — `accessory/rings/in_use/`

**Тема**: Универсальный аксессуар ×2. Элементальный урон, крит, резисты, gold.
**Дроп**: Forest Spirit (T4), Ronin (T3), любые враги (вся игра). Ronin's Haunted Dojo Boss Map.

| Предмет                         | iLvl  | Tier | Implicit              | Статы (2–3)                                                    | Особое       |
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

**Уникальные механики — Rings:**

> **Oathkeeper's_Seal** — *Sworn Oath*
> Все резист-статы этого кольца **действуют на оба слота колец** одновременно (не суммируется второй раз — это общий пул).

> **Sovereign's_Seal** — *Sovereign's Decree*
> `gold_find` на этом кольце также работает как `xp_bonus` на **25% своей величины**.

> **Stormveil_Sigil** — *Storm Veil*
> Lightning damage имеет **20% шанс** нанести удар **всем врагам** в текущей волне одновременно.

> **Voidborn_Serpent's_Coil_Ring_2** — *Void Coil*
> Energy Shield восстанавливается со скоростью **10%/сек** (пассивно, без условий задержки).

---

## 6. Расходуемые предметы — Фляги

### Система цветового кода

| Цвет    | Тип фляги          | Эффект                                          | Совместимость с типами     |
|---------|--------------------|-------------------------------------------------|----------------------------|
| 🟢 Green  | Life Flask         | Восстанавливает HP (healPercent от max HP)       | Все типы фляг              |
| 🔵 Blue   | Mana/ES Flask      | Восстанавливает Energy Shield                   | Все типы фляг              |
| 🔴 Red    | Attack Flask       | Временный бонус к flat_phys_dmg (+N%)           | Все типы фляг              |
| 🟡 Yellow | Speed Flask        | Временный passive_dps_bonus (+N%)               | Все типы фляг              |
| 🩵 Cyan   | Resistance Flask   | Временный бонус к всем резистам                | Все типы фляг              |
| 🟣 Purple | Utility Flask      | Комбо эффект (HP + бонус к атаке/защите)        | Все типы фляг              |

### Типы фляг по размеру (healPercent и charges)

| Тип фляги (`flaskType`)    | Dir                  | maxCharges | healPercent | Эффект длительность |
|----------------------------|----------------------|------------|-------------|---------------------|
| `small_vial`               | `consumables/small_vials` | 3     | 8%          | 3с                  |
| `round_flask`              | `consumables/round_flasks`| 4     | 14%         | 5с                  |
| `corked_flask`             | `consumables/corked_flasks`| 4    | 12%         | 4с                  |
| `jug`                      | `consumables/jugs`   | 5          | 22%         | 6с                  |
| `tall_bottle`              | `consumables/tall_bottles`| 5     | 18%         | 8с                  |
| `wide_bottle`              | `consumables/wide_bottles`| 6     | 25%         | 6с                  |

### Качество фляг (item rarity) → charges и heal%

| Rarity    | maxCharges бонус | healPercent бонус | Дополнительный эффект           |
|-----------|------------------|-------------------|---------------------------------|
| Common    | базовое          | базовое           | только heal                     |
| Rare      | +1               | +3%               | +бонус атаки/защиты (5с)        |
| Epic      | +2               | +5%               | +бонус атаки/защиты (8с) × 1.5  |
| Legendary | +3               | +8%               | +особый эффект по цвету         |

### Legendary Flask эффекты по цвету

| Цвет    | Legendary эффект                                                             |
|---------|------------------------------------------------------------------------------|
| Green   | Heal over time + восстанавливает 2 заряда при убийстве Rare+ врага          |
| Blue    | ES восстановление + щит блокирует следующий удар (1 раз)                    |
| Red     | +40% phys damage + следующий удар Critical Strike гарантированно           |
| Yellow  | +40% passive_dps_bonus + gold_find удвоен на 10с                            |
| Cyan    | +50% все резисты + иммунитет к элементальному урону на 3с                  |
| Purple  | Heal + сбрасывает cooldown одного активного скилла                          |

---

## 7. Сводная таблица — Вес дропа по категориям

### Шанс выпадения экипировки (vs gold/xp/keys)

| Контент                    | Шанс дропа предмета | Распределение по редкости   |
|----------------------------|---------------------|-----------------------------|
| Act 1–2 обычные монстры    | 8%                  | 70% Common / 25% Rare / 5% Epic |
| Act 3–4 обычные монстры    | 10%                 | 60% Common / 30% Rare / 9% Epic / 1% Legendary |
| Act 5 обычные монстры      | 12%                 | 50% Rare / 35% Epic / 15% Legendary |
| Редкие монстры (rare)      | +5% бонус           | сдвиг +10% к Epic/Legendary |
| Элитные монстры (epic)     | +10% бонус          | сдвиг +20% к Legendary      |
| Боссы локаций              | 40% (гарантировано 1 предмет) | 30% Epic / 70% Legendary |
| Endgame Map T1–4           | 15%                 | 40% Epic / 60% Legendary    |
| Endgame Map T5–10          | 20%                 | 20% Epic / 80% Legendary    |
| Boss Maps (все)            | 100% (2–3 предмета) | 100% Legendary              |

### Monster Affinity — детализация

| Монстр        | Дроп-пул категорий                                     | iLvl бонус |
|---------------|--------------------------------------------------------|------------|
| Bandit        | Belt, Boots, Helmet (физ. экипировка)                  | 0          |
| Wild Boar     | Plate, Gloves, Axes                                    | 0          |
| Forest Spirit | Mantle, Ring, Amulet, Bow, Boots                       | +2         |
| Ronin         | Sword, Blade, Shield, Belt                             | +5         |
| Oni           | Axe, Helmet, Plate (fire-themed)                       | +8         |
| Tengu         | Bow, Staff, Mantle, Evasion Armor                      | +12        |
| Dragon        | All categories (no restriction), Scrolls               | +18        |
| Shogun        | All categories, bias toward Legendary quality          | +25        |

---

## 8. Новые слоты — Резюме предложений

| Слот        | Код        | Источник ассетов    | Статы пула                                                         |
|-------------|------------|---------------------|--------------------------------------------------------------------|
| Mantle      | `mantle`   | `armor/mantles/`    | evasion · energy_shield · cold_res · lightning_res · life_regen · gold_find · pct_hp |
| Off-Hand    | `off_hand` | `armor/shields/`    | block_chance · flat_armor · flat_hp · phys_res · elemental_res · flat_energy_shield |
| Legs        | `legs`     | `armor/pants/`      | flat_hp · flat_armor · flat_evasion · flat_energy_shield · elemental_res · crit_chance |

> **Примечание**: Новые слоты (mantle, off_hand, legs) увеличивают общий потолок мощи персонажа.
> Рекомендуется ввести их постепенно — начиная с Act 2, 3 и 4 соответственно,
> чтобы не перегрузить игрока в ранней игре.

---

*Последнее обновление: 2026-02-28 | Версия: 1.0*
*Автор: Game Designer Agent × Tap of Exile Balance Team*
