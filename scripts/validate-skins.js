/**
 * Validate ALL enemy skin references:
 * 1. Check every registered ENEMY_SKINS path exists on disk with sprites
 * 2. Check every skinVariant in locations.ts resolves correctly
 * 3. Report mismatches
 */

const fs = require('fs');
const path = require('path');

// Assets served from public/ at runtime; code (locations.ts etc.) still in src/
const BOT_PUBLIC = path.join(__dirname, '..', 'bot', 'public');
const BOT_SRC = path.join(__dirname, '..', 'bot', 'src');

// ── 1. Rebuild ENEMY_SKINS registry (mirrors sprite-registry.ts) ──

const BASE_SKINS = {
  goblin_black:   '/assets/enemy/goblin/goblin_black',
  yellow_ninja:   '/assets/enemy/ninja/yellow_ninja',
  necromancer_1:  '/assets/enemy/necromancer/necromancer_1',
  night_born_1:   '/assets/enemy/night_born/night_born_1',
  blue_witch:     '/assets/enemy/blue_witch/v0',
  king:           '/assets/enemy/king/v0',
  knight_enemy:   '/assets/enemy/knight_enemy/v0',
  necromancer_2:  '/assets/enemy/necromancer_2/v0',
  orc:            '/assets/enemy/orc/v0',
  paladin:        '/assets/enemy/paladin/v0',
  reaper:         '/assets/enemy/reaper/v0',
  ronin_enemy:    '/assets/enemy/ronin_enemy/v0',
  soldier:        '/assets/enemy/soldier/v0',
  striker:        '/assets/enemy/striker/v0',
};

const COLORS = [
  { suffix: 'crimson', sub: 'v1_crimson' },
  { suffix: 'emerald', sub: 'v2_emerald' },
  { suffix: 'azure',   sub: 'v3_azure' },
  { suffix: 'golden',  sub: 'v4_golden' },
  { suffix: 'violet',  sub: 'v5_violet' },
  { suffix: 'frost',   sub: 'v6_frost' },
  { suffix: 'shadow',  sub: 'v7_shadow' },
];

const V_BASES = ['blue_witch','king','knight_enemy','necromancer_2','orc','paladin','reaper','ronin_enemy','soldier','striker'];

const SKINS = {};
// Base skins
for (const [k, v] of Object.entries(BASE_SKINS)) SKINS[k] = v;

// v0-based variants: soldier__v1_crimson etc.
for (const baseId of V_BASES) {
  const parent = BASE_SKINS[baseId].replace(/\/v0$/, '');
  for (const c of COLORS) {
    SKINS[baseId + '__' + c.sub] = parent + '/' + c.sub;
  }
}

// Goblin: goblin_crimson etc.
for (const c of COLORS) SKINS['goblin_' + c.suffix] = '/assets/enemy/goblin/goblin_' + c.suffix;

// Ninja: ninja_crimson etc.
for (const c of COLORS) SKINS['ninja_' + c.suffix] = '/assets/enemy/ninja/yellow_' + c.suffix;

// Necromancer_1: necromancer_1_crimson etc.
for (const c of COLORS) SKINS['necromancer_1_' + c.suffix] = '/assets/enemy/necromancer/necromancer_' + c.suffix;

// Night Born: night_born_crimson etc.
for (const c of COLORS) SKINS['night_born_' + c.suffix] = '/assets/enemy/night_born/night_born_' + c.suffix;

// Monster name → base skin id
const M2S = {
  Goblin: 'goblin_black', Ninja: 'yellow_ninja', Necromancer: 'necromancer_1',
  'Night Born': 'night_born_1', 'Dark Knight': 'knight_enemy', Reaper: 'reaper',
  Bandit: 'soldier', 'Wild Boar': 'orc', 'Forest Spirit': 'blue_witch',
  Ronin: 'ronin_enemy', Oni: 'king', Tengu: 'necromancer_2',
  Dragon: 'paladin', Shogun: 'striker',
};

function resolve(skinId, skinVariant, monsterName) {
  if (skinId && skinVariant) {
    const k1 = skinId + '__' + skinVariant;
    if (SKINS[k1]) return { key: k1, method: 'constructed', path: SKINS[k1] };
    if (SKINS[skinVariant]) return { key: skinVariant, method: 'direct', path: SKINS[skinVariant] };
  }
  if (skinId && SKINS[skinId]) return { key: skinId, method: 'base', path: SKINS[skinId] };
  const m = M2S[monsterName];
  if (m && SKINS[m]) return { key: m, method: 'fallback', path: SKINS[m] };
  return { key: 'UNKNOWN', method: 'FAILED', path: null };
}

function checkDisk(relPath) {
  if (!relPath) return { exists: false, hasSprites: false };
  const abs = path.join(BOT_PUBLIC, relPath);
  const exists = fs.existsSync(abs);
  if (!exists) return { exists: false, hasSprites: false };
  const files = fs.readdirSync(abs);
  const hasSprites = files.some(f => f === 'idle.json' || f === 'spritesheet.png');
  return { exists, hasSprites };
}

// ── 2. Check ALL registered skins on disk ──

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         ENEMY SKIN VALIDATION REPORT                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('─── Registered Skins: Disk Check ─────────────────────────────\n');

let regTotal = 0, regOk = 0, regFail = 0;
for (const [id, skinPath] of Object.entries(SKINS)) {
  regTotal++;
  const { exists, hasSprites } = checkDisk(skinPath);
  if (exists && hasSprites) {
    regOk++;
  } else {
    regFail++;
    const reason = !exists ? 'FOLDER MISSING' : 'NO SPRITES';
    console.log('  ❌ ' + id.padEnd(35) + ' → ' + skinPath + ' (' + reason + ')');
  }
}
if (regFail === 0) {
  console.log('  ✅ All ' + regTotal + ' registered skins have valid paths on disk\n');
} else {
  console.log('\n  Result: ' + regOk + '/' + regTotal + ' OK, ' + regFail + ' broken\n');
}

// ── 3. Check ALL skinVariant in locations.ts ──

console.log('─── locations.ts: skinVariant Resolution Check ────────────────\n');

const loc = fs.readFileSync(path.join(BOT_SRC, 'data', 'locations.ts'), 'utf8');

const re = /type:\s*"([^"]+)"[^}]*?rarity:\s*"([^"]+)"[^}]*?skinVariant:\s*"([^"]+)"/g;
let m;
const seen = new Set();
let locErrors = 0;

while ((m = re.exec(loc)) !== null) {
  const monster = m[1];
  const rarity = m[2];
  const variant = m[3];

  const dedupKey = monster + '|' + variant;
  if (seen.has(dedupKey)) continue;
  seen.add(dedupKey);

  const skinId = M2S[monster] || '';
  const r = resolve(skinId, variant, monster);
  const disk = checkDisk(r.path);
  const ok = disk.exists && disk.hasSprites;

  if (!ok) {
    locErrors++;
    console.log('  ❌ ' + monster.padEnd(15) + ' skinVariant="' + variant + '"');
    console.log('     skinId="' + skinId + '" → resolved="' + r.key + '" (via ' + r.method + ')');
    console.log('     path=' + (r.path || 'N/A') + (disk.exists ? ' (no sprites!)' : ' (MISSING!)'));
    console.log('');
  } else {
    console.log('  ✅ ' + monster.padEnd(15) + ' skinVariant="' + variant.padEnd(30) + '" → ' + r.key.padEnd(30) + ' (' + r.method + ')');
  }
}

console.log('');
if (locErrors === 0) {
  console.log('  ✅ All ' + seen.size + ' unique (monster, variant) pairs resolve correctly\n');
} else {
  console.log('  Result: ' + (seen.size - locErrors) + '/' + seen.size + ' OK, ' + locErrors + ' broken\n');
}

// ── 4. Check resolution METHOD warnings ──
// "direct" method means skinVariant is a fully-qualified key like "soldier__v3_azure"
// instead of just the variant part "v3_azure". This works but is fragile.

console.log('─── Resolution Method Audit ────────────────────────────────────\n');

const re2 = /type:\s*"([^"]+)"[^}]*?rarity:\s*"([^"]+)"[^}]*?skinVariant:\s*"([^"]+)"/g;
const seen2 = new Set();
let directCount = 0;
let constructedCount = 0;

while ((m = re2.exec(loc)) !== null) {
  const monster = m[1];
  const variant = m[3];
  const dedupKey2 = monster + '|' + variant;
  if (seen2.has(dedupKey2)) continue;
  seen2.add(dedupKey2);

  const skinId = M2S[monster] || '';
  const r = resolve(skinId, variant, monster);
  if (r.method === 'direct') directCount++;
  else if (r.method === 'constructed') constructedCount++;
}

console.log('  Constructed (skinId + "__" + skinVariant = key):  ' + constructedCount);
console.log('  Direct fallback (skinVariant IS the key):        ' + directCount);
console.log('');
if (directCount > 0) {
  console.log('  ⚠️  ' + directCount + ' variants use "direct" resolution — the skinVariant');
  console.log('     already contains the full registry key (e.g. "soldier__v3_azure").');
  console.log('     This works via fallback but is fragile.\n');
}
