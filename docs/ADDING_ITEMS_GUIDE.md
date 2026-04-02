# Guide: Adding New Items

## System Overview

Each item in the game = a specific icon from the `in_use/` folder.
The icon filename determines:
- **Item name** in the game (e.g. `Ashborn_Katana.png` → "Ashborn Katana")
- **Personal stat pool** — deterministically computed via hash of the filename

## Folder Structure

```
shared/public/assets/equipments/
├── weapon/
│   ├── swords/in_use/     ← oh_sword, th_sword
│   ├── axes/in_use/       ← oh_axe, oh_mace, th_axe, th_mace
│   ├── blades/in_use/     ← oh_dagger
│   ├── scrolls/in_use/    ← oh_wand
│   ├── bows/in_use/       ← th_bow
│   └── staffs/in_use/     ← th_staff
├── armor/
│   ├── helmets/in_use/    ← helm_heavy, helm_light, helm_circlet
│   ├── plates/in_use/     ← arm_plate
│   ├── mantles/in_use/    ← arm_leather, arm_robe, arm_chain
│   ├── gloves/in_use/     ← glov_gauntlet, glov_bracer, glov_wrap
│   └── belts/in_use/      ← belt_leather, belt_chain, belt_heavy, belt_cloth
├── boots/
│   └── boots/in_use/      ← boot_plate, boot_leather, boot_silk, boot_chain
└── accessory/
    ├── rings/in_use/      ← ring_ruby, ring_sapphire, ring_topaz, ring_gold, ring_iron
    └── amulets/in_use/    ← amu_pendant, amu_talisman, amu_locket
```

## How to Add a New Item

### Step 1: Prepare the icon

- Format: PNG
- Filename: `Item_Name.png` (CamelCase with underscores)
- Suffixes `_2`, `_3` at the end of the name are trimmed on display
- Example: `Crimson_Flameblade.png` → displayed as "Crimson Flameblade"

### Step 2: Place the icon in the appropriate `in_use/` folder

Choose the folder by item type (see structure above).

### Step 3: Add the filename to `IN_USE_ICONS`

**File:** `shared/equipment-icons.ts`

Find the `IN_USE_ICONS` array → the relevant set (e.g. `swords`) → add a line:

```ts
const IN_USE_ICONS: Record<string, string[]> = {
  swords: [
    "Ancient_Thornspire_Cleaver.png",
    "Ashborn_Katana.png",
    "Crimson_Flameblade.png",  // ← new item
    // ...
  ],
```

### Step 4: Copy the file to the server folder

```bash
cp shared/equipment-icons.ts server/shared/equipment-icons.ts
```

**Important!** The files `shared/equipment-defs.ts` and `shared/equipment-icons.ts` are duplicated in `server/shared/`. After any changes, you need to copy the updated files.

### Step 5: Done!

Stats for the new item will be generated automatically:
- The hash of the filename determines a subset of 7 stats (from the slot pool)
- On each drop, 2-6 of those 7 are randomly selected (depends on rarity)
- The same item always has the same stat pool

## How the Stat System Works

### Pool Hierarchy

```
Slot (helmet, armor, ring...)
  └── SLOT_STAT_POOLS[slot]  ← full pool (7-22 stats)
        └── getItemStatPool(filename, slotPool)  ← item's personal pool (7 stats)
              └── rollEquipment() ← selects 2-6 from personal pool
```

### Number of Stats by Rarity

| Rarity     | Stat Count    | Drop Chance |
|-----------|:------------:|:----------:|
| Common    |      2       |    60%     |
| Rare      |     2-3      |    25%     |
| Epic      |     3-5      |    12%     |
| Legendary |     5-6      |     3%     |

### Limitations

- Maximum 2 resistance stats per item
- Implicit stat (on rings and belts) does not count toward the limit

## How to Add a New Item Type/Subtype

If you need a completely new subtype (not just a new icon):

1. Add the subtype to `SUBTYPES[]` in `shared/equipment-defs.ts`
2. Add stat ranges to `STAT_RANGES` (if new slot)
3. Add mapping to `SUBTYPE_ICON_SET` in `equipment-icons.ts`
4. Create an `in_use/` folder with icons
5. Add an array to `IN_USE_ICONS`
6. Copy both files to `server/shared/`

## Files to Edit

| File | Contents |
|------|----------|
| `shared/equipment-defs.ts` | Slots, subtypes, stat pools, ranges, rollEquipment function |
| `shared/equipment-icons.ts` | Icon mappings, IN_USE_ICONS, getItemStatPool/iconToDisplayName functions |
| `server/src/combat/combat.service.ts` | Item drop logic |
| `server/shared/` | Copies of shared files for the server |
