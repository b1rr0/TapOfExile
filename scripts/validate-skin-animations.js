/**
 * Skin Animation QA Validator
 *
 * Checks ALL hero and enemy skins:
 *  1. Required JSON animation files exist
 *  2. JSON is valid and parseable
 *  3. Frames are correctly cut (no overlap, covers full strip, sizes consistent)
 *  4. PNG exists and its dimensions match meta.size in JSON
 *  5. No frame rect goes outside PNG boundaries
 *  6. Rendered character size is comparable across the same class/role
 *
 * Run:  node scripts/validate-skin-animations.js
 * Optional flags:
 *   --heroes-only     — check only hero skins
 *   --enemies-only    — check only enemy skins
 *   --verbose         — show OK entries too (default: only errors/warnings)
 */

const fs   = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const ASSETS_ROOT  = path.join(__dirname, '..', 'shared', 'public', 'assets');
const HEROES_ROOT  = path.join(ASSETS_ROOT, 'characters');
const ENEMIES_ROOT = path.join(ASSETS_ROOT, 'enemy');

const VERBOSE      = process.argv.includes('--verbose');
const HEROES_ONLY  = process.argv.includes('--heroes-only');
const ENEMIES_ONLY = process.argv.includes('--enemies-only');

// ── Hero skin definitions (mirrors bot/src/data/sprite-registry.ts) ─────────
// Only base skins (variants inherit same animations, same frame sizes).

const HERO_SKINS = [
  {
    id: 'samurai_1', class: 'samurai', role: 'hero',
    path: 'characters/samurai/samurai_1',
    required: ['idle', 'attack_1', 'hurt', 'run'],
    optional: [],
    defaultSize: { w: 252, h: 336 }, scale: 1.34,
  },
  {
    id: 'samurai_2', class: 'samurai', role: 'hero',
    path: 'characters/samurai/samurai_2',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 400, h: 400 }, scale: 1.16,
  },
  {
    id: 'samurai_3', class: 'samurai', role: 'hero',
    path: 'characters/samurai/samurai_3',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 400, h: 400 }, scale: 1.23,
  },
  {
    id: 'samurai_4', class: 'samurai', role: 'hero',
    path: 'characters/samurai/samurai_4',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 196, h: 200 }, scale: 2.0,
  },
  {
    id: 'knight_1', class: 'warrior', role: 'hero',
    path: 'characters/knight/knight_1',
    required: ['idle', 'attack_1', 'hurt', 'walk', 'death'],
    optional: [],
    defaultSize: { w: 240, h: 210 }, scale: 1.82,
  },
  {
    id: 'knight_2', class: 'warrior', role: 'hero',
    path: 'characters/knight/knight_2',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 128, h: 128 }, scale: 1.70,
  },
  {
    id: 'knight_3', class: 'warrior', role: 'hero',
    path: 'characters/knight/knight_3',
    required: ['idle', 'attack_1', 'run'],
    optional: [],
    defaultSize: { w: 368, h: 274 }, scale: 0.71,
  },
  {
    id: 'knight_4', class: 'warrior', role: 'hero',
    path: 'characters/knight/knight_4',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 360, h: 360 }, scale: 1.14,
  },
  {
    id: 'wizard_1', class: 'mage', role: 'hero',
    path: 'characters/wizard/wizard_1',
    required: ['idle', 'attack_1', 'run', 'walk'],
    optional: ['dead'],
    defaultSize: { w: 256, h: 256 }, scale: 0.81,
  },
  {
    id: 'wizard_2', class: 'mage', role: 'hero',
    path: 'characters/wizard/wizard_2',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 300, h: 300 }, scale: 1.18,
  },
  {
    id: 'archer_1', class: 'archer', role: 'hero',
    path: 'characters/archer/archer_1',
    required: ['idle', 'attack_1', 'walk', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 256, h: 256 }, scale: 0.85,
  },
  {
    id: 'archer_2', class: 'archer', role: 'hero',
    path: 'characters/archer/archer_2',
    required: ['idle', 'attack_1', 'walk', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 184, h: 240 }, scale: 0.67,
  },
  {
    id: 'archer_3', class: 'archer', role: 'hero',
    path: 'characters/archer/archer_3',
    required: ['idle', 'attack_1', 'run', 'death'],
    optional: [],
    defaultSize: { w: 256, h: 256 }, scale: 0.62,
  },
  {
    id: 'archer_4', class: 'archer', role: 'hero',
    path: 'characters/archer/archer_4/Character',
    required: ['idle', 'attack_1', 'run', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 200, h: 200 }, scale: 1.78,
  },
];

// ── Enemy base skins ─────────────────────────────────────────────────────────

const ENEMY_BASE_SKINS = [
  {
    id: 'goblin_black', role: 'enemy',
    path: 'enemy/goblin/goblin_black',
    required: ['idle', 'run', 'death'],
    // attack uses "hit.json" (non-standard)
    optional: ['hit'],
    defaultSize: { w: 210, h: 210 }, scale: 1,
  },
  {
    id: 'yellow_ninja', role: 'enemy',
    path: 'enemy/ninja/yellow_ninja',
    required: ['idle', 'walk', 'death'],
    optional: ['hit', 'attack'],
    defaultSize: { w: 256, h: 256 }, scale: 1,
  },
  {
    id: 'necromancer_1', role: 'enemy',
    path: 'enemy/necromancer/necromancer_1',
    required: ['idle', 'run', 'death'],
    optional: ['attack'],
    defaultSize: { w: 280, h: 224 }, scale: 1,
  },
  {
    id: 'night_born_1', role: 'enemy',
    path: 'enemy/night_born/night_born_1',
    required: ['idle', 'run', 'death', 'hurt'],
    optional: ['attack'],
    defaultSize: { w: 200, h: 200 }, scale: 1,
  },
  {
    id: 'blue_witch', role: 'enemy',
    path: 'enemy/blue_witch/v0',
    required: ['idle', 'run', 'death', 'hurt', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 64, h: 64 }, scale: 3,
  },
  {
    id: 'king', role: 'enemy',
    path: 'enemy/king/v0',
    required: ['idle', 'run', 'death', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 128, h: 128 }, scale: 1.8,
  },
  {
    id: 'knight_enemy', role: 'enemy',
    path: 'enemy/knight_enemy/v0',
    required: ['idle', 'run', 'death', 'attack_1'],
    optional: [],
    defaultSize: { w: 64, h: 64 }, scale: 2.8,
  },
  {
    id: 'necromancer_2', role: 'enemy',
    path: 'enemy/necromancer_2/v0',
    required: ['idle', 'run', 'death', 'attack_1'],
    optional: [],
    defaultSize: { w: 128, h: 128 }, scale: 1.6,
  },
  {
    id: 'orc', role: 'enemy',
    path: 'enemy/orc/v0',
    required: ['idle', 'run', 'death', 'hurt', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 100, h: 100 }, scale: 2.2,
  },
  {
    id: 'paladin', role: 'enemy',
    path: 'enemy/paladin/v0',
    required: ['idle', 'run', 'death', 'attack_1'],
    optional: [],
    defaultSize: { w: 160, h: 128 }, scale: 1.6,
  },
  {
    id: 'ronin_enemy', role: 'enemy',
    path: 'enemy/ronin_enemy/v0',
    required: ['idle', 'run', 'death', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 64, h: 64 }, scale: 4,
  },
  {
    id: 'reaper', role: 'enemy',
    path: 'enemy/reaper/v0',
    required: ['idle', 'run', 'death', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 100, h: 96 }, scale: 2,
  },
  {
    id: 'soldier', role: 'enemy',
    path: 'enemy/soldier/v0',
    required: ['idle', 'run', 'death', 'hurt', 'attack_1', 'attack_2', 'attack_3'],
    optional: [],
    defaultSize: { w: 100, h: 100 }, scale: 3.3,
  },
  {
    id: 'striker', role: 'enemy',
    path: 'enemy/striker/v0',
    required: ['idle', 'run', 'death', 'hurt', 'attack_1', 'attack_2'],
    optional: [],
    defaultSize: { w: 128, h: 96 }, scale: 2,
  },
  {
    id: 'training_dummy', role: 'enemy',
    path: 'enemy/dummy',
    required: ['idle', 'hurt', 'death'],
    optional: [],
    defaultSize: { w: 32, h: 32 }, scale: 5,
  },
];

// ── Color variants to check for v-based enemies ──────────────────────────────

const V_VARIANT_SUFFIXES = [
  'v1_crimson', 'v2_emerald', 'v3_azure',
  'v4_golden', 'v5_violet', 'v6_frost', 'v7_shadow',
];

const V_BASES = [
  'blue_witch', 'king', 'knight_enemy', 'necromancer_2',
  'orc', 'paladin', 'reaper', 'ronin_enemy', 'soldier', 'striker',
];

// Old-style enemy color variants
const OLD_STYLE_VARIANTS = {
  goblin:       ['goblin_crimson','goblin_emerald','goblin_azure','goblin_golden','goblin_violet','goblin_frost','goblin_shadow'],
  ninja:        ['yellow_crimson','yellow_emerald','yellow_azure','yellow_golden','yellow_violet','yellow_frost','yellow_shadow'],
  necromancer:  ['necromancer_crimson','necromancer_emerald','necromancer_azure','necromancer_golden','necromancer_violet','necromancer_frost','necromancer_shadow'],
  night_born:   ['night_born_crimson','night_born_emerald','night_born_azure','night_born_golden','night_born_violet','night_born_frost','night_born_shadow'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Read and parse a JSON file. Returns { ok, data, error }. */
function readJson(absPath) {
  if (!fs.existsSync(absPath)) return { ok: false, error: 'FILE MISSING' };
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const data = JSON.parse(raw);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'JSON PARSE ERROR: ' + e.message };
  }
}

/** Read PNG dimensions without a native dep — parse IHDR chunk. */
function pngDimensions(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    const buf = fs.readFileSync(absPath);
    // PNG signature: 8 bytes, then IHDR chunk (4 len + 4 "IHDR" + 4w + 4h + ...)
    if (buf.length < 24) return null;
    const sig = buf.slice(0, 8);
    const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!sig.equals(expected)) return null;
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h };
  } catch (_) {
    return null;
  }
}

/** Get normalized frames array from an Aseprite JSON (array or hash format). */
function getFrames(data) {
  if (Array.isArray(data.frames)) return data.frames;
  // hash format: { "name 0": {...}, "name 1": {...}, ... }
  if (data.frames && typeof data.frames === 'object') {
    return Object.values(data.frames);
  }
  return [];
}

// ── Issue tracking ────────────────────────────────────────────────────────────

const issues = [];    // { severity, skinId, anim, msg }
const summaries = []; // { skinId, role, animCount, frameTotal }

function issue(severity, skinId, anim, msg) {
  issues.push({ severity, skinId, anim, msg });
}

function logOk(msg) {
  if (VERBOSE) console.log('  ✅ ' + msg);
}

// ── Core animation validator ─────────────────────────────────────────────────

/**
 * Validate a single animation JSON for a skin.
 * Returns { frameW, frameH, frameCount } or null on failure.
 */
function validateAnimation(skinId, animName, absDir) {
  const jsonFile = path.join(absDir, animName + '.json');
  const { ok, data, error } = readJson(jsonFile);

  if (!ok) {
    issue('HIGH', skinId, animName, error);
    return null;
  }

  const frames = getFrames(data);
  if (frames.length === 0) {
    issue('HIGH', skinId, animName, 'No frames in JSON');
    return null;
  }

  // ── 1. All frame rects have same w and h ───────────────────────────────────
  const fw0 = frames[0].frame.w;
  const fh0 = frames[0].frame.h;
  let inconsistentSize = false;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i].frame;
    if (f.w !== fw0 || f.h !== fh0) {
      issue('MEDIUM', skinId, animName,
        `Frame ${i} size ${f.w}x${f.h} ≠ frame 0 size ${fw0}x${fh0}`);
      inconsistentSize = true;
    }
  }

  // ── 2. PNG exists and its size matches meta.size ───────────────────────────
  const metaImg = (data.meta && data.meta.image) || (animName + '.png');
  const pngPath = path.join(absDir, metaImg);
  const dim = pngDimensions(pngPath);

  if (!dim) {
    issue('HIGH', skinId, animName,
      `PNG missing or unreadable: ${metaImg}`);
    return null;
  }

  const metaW = data.meta && data.meta.size ? data.meta.size.w : null;
  const metaH = data.meta && data.meta.size ? data.meta.size.h : null;

  if (metaW && metaH && (dim.w !== metaW || dim.h !== metaH)) {
    issue('HIGH', skinId, animName,
      `PNG actual ${dim.w}x${dim.h} ≠ meta.size ${metaW}x${metaH}`);
  }

  // ── 3. No frame extends outside the PNG bounds ─────────────────────────────
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i].frame;
    if (f.x < 0 || f.y < 0 || f.x + f.w > dim.w || f.y + f.h > dim.h) {
      issue('CRITICAL', skinId, animName,
        `Frame ${i} rect (${f.x},${f.y} ${f.w}x${f.h}) outside PNG ${dim.w}x${dim.h}`);
    }
  }

  // ── 4. Frame positions form a coherent strip (no gaps, no overlap) ─────────
  // Detect layout: horizontal strip (y same, x increases) or grid/vertical.
  const allSameY = frames.every(f => f.frame.y === frames[0].frame.y);
  const allSameX = frames.every(f => f.frame.x === frames[0].frame.x);

  if (allSameY && !inconsistentSize) {
    // Horizontal strip: each frame should be exactly fw0 apart in x
    for (let i = 0; i < frames.length; i++) {
      const expectedX = frames[0].frame.x + i * fw0;
      if (frames[i].frame.x !== expectedX) {
        issue('MEDIUM', skinId, animName,
          `Frame ${i} x=${frames[i].frame.x}, expected ${expectedX} (horizontal strip)`);
      }
    }
    // Strip should cover full PNG width (no trailing gap > 1 empty column)
    const usedW = frames.length * fw0;
    if (dim.w - usedW > fw0) {
      issue('LOW', skinId, animName,
        `Spritesheet ${dim.w}px wide but only ${usedW}px used (${frames.length} frames × ${fw0}px) — possible extra frames?`);
    }
  } else if (allSameX && !inconsistentSize) {
    // Vertical strip: each frame should be exactly fh0 apart in y
    for (let i = 0; i < frames.length; i++) {
      const expectedY = frames[0].frame.y + i * fh0;
      if (frames[i].frame.y !== expectedY) {
        issue('MEDIUM', skinId, animName,
          `Frame ${i} y=${frames[i].frame.y}, expected ${expectedY} (vertical strip)`);
      }
    }
    const usedH = frames.length * fh0;
    if (dim.h - usedH > fh0) {
      issue('LOW', skinId, animName,
        `Spritesheet ${dim.h}px tall but only ${usedH}px used (${frames.length} frames × ${fh0}px) — possible extra frames?`);
    }
  } else if (!inconsistentSize) {
    // Grid layout — check row/col order makes sense
    // Just verify no overlapping frames
    const rects = frames.map(f => f.frame);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x &&
                        a.y < b.y + b.h && a.y + a.h > b.y;
        if (overlap) {
          issue('CRITICAL', skinId, animName,
            `Frame ${i} and frame ${j} overlap!`);
        }
      }
    }
  }

  // ── 5. Duration sanity (0 or null duration is suspicious) ─────────────────
  const zeroDur = frames.filter(f => !f.duration || f.duration <= 0);
  if (zeroDur.length > 0) {
    issue('LOW', skinId, animName,
      `${zeroDur.length} frame(s) have duration ≤ 0`);
  }

  logOk(`${skinId} / ${animName}: ${frames.length} frames, ${fw0}x${fh0}, PNG ${dim.w}x${dim.h} ✓`);

  return { frameW: fw0, frameH: fh0, frameCount: frames.length };
}

// ── Skin validator ────────────────────────────────────────────────────────────

function validateSkin(skin) {
  const absDir = path.join(ASSETS_ROOT, skin.path);

  if (!fs.existsSync(absDir)) {
    issue('CRITICAL', skin.id, '*', `Skin folder missing: ${skin.path}`);
    return;
  }

  let animCount = 0;
  let frameTotal = 0;

  // Check required animations
  for (const anim of skin.required) {
    const result = validateAnimation(skin.id, anim, absDir);
    if (result) {
      animCount++;
      frameTotal += result.frameCount;
    }
  }

  // Check optional animations (only if file exists — no error if absent)
  for (const anim of skin.optional) {
    const jsonPath = path.join(absDir, anim + '.json');
    if (fs.existsSync(jsonPath)) {
      const result = validateAnimation(skin.id, anim, absDir);
      if (result) {
        animCount++;
        frameTotal += result.frameCount;
      }
    }
  }

  summaries.push({ skinId: skin.id, role: skin.role, class: skin.class,
                   animCount, frameTotal,
                   renderedH: skin.defaultSize.h * skin.scale,
                   renderedW: skin.defaultSize.w * skin.scale,
                   defaultSize: skin.defaultSize, scale: skin.scale });
}

// ── Discover on-disk variant folders and validate them ───────────────────────

/**
 * For v-based enemies (blue_witch, king, …), discover v1_crimson…v7_shadow
 * subfolders and validate that they exist and have the same animations as v0.
 */
function validateVVariants(baseSkin) {
  const baseDir = path.join(ASSETS_ROOT, baseSkin.path); // ends with /v0
  const parentDir = path.dirname(baseDir);

  for (const suffix of V_VARIANT_SUFFIXES) {
    const varDir = path.join(parentDir, suffix);
    const varId  = baseSkin.id + '__' + suffix;

    if (!fs.existsSync(varDir)) {
      issue('HIGH', varId, '*', `Variant folder missing: enemy/${path.basename(parentDir)}/${suffix}`);
      continue;
    }

    // Must have same required animations as base
    for (const anim of baseSkin.required) {
      const jsonPath = path.join(varDir, anim + '.json');
      if (!fs.existsSync(jsonPath)) {
        issue('HIGH', varId, anim, 'JSON missing in variant folder');
        continue;
      }
      validateAnimation(varId, anim, varDir);
    }

    logOk(`variant ${varId} folder OK`);
  }
}

/**
 * For old-style enemies (goblin, ninja, necromancer_1, night_born),
 * discover named variant folders and validate them.
 */
function validateOldStyleVariants(baseId, subfolderNames, parentRelPath, baseSkin) {
  for (const sub of subfolderNames) {
    const varDir = path.join(ASSETS_ROOT, parentRelPath, sub);
    const varId  = baseId + '_variant_' + sub;

    if (!fs.existsSync(varDir)) {
      issue('HIGH', sub, '*', `Old-style variant folder missing: ${parentRelPath}/${sub}`);
      continue;
    }

    for (const anim of baseSkin.required) {
      const jsonPath = path.join(varDir, anim + '.json');
      if (!fs.existsSync(jsonPath)) {
        issue('MEDIUM', sub, anim, 'JSON missing in old-style variant folder');
        continue;
      }
      validateAnimation(sub, anim, varDir);
    }

    logOk(`old variant ${sub} OK`);
  }
}

// ── Size consistency check ────────────────────────────────────────────────────

/**
 * For heroes: rendered height should be within ±40% of class median.
 * For enemies: rendered height should be reasonable (> 80px, < 600px).
 * Prints a table for human review.
 */
function checkSizeConsistency(skins) {
  console.log('\n─── Rendered Size Report ───────────────────────────────────────────\n');

  // Group heroes by class
  const heroesByClass = {};
  const enemies = [];

  for (const s of skins) {
    if (s.role === 'hero') {
      if (!heroesByClass[s.class]) heroesByClass[s.class] = [];
      heroesByClass[s.class].push(s);
    } else {
      enemies.push(s);
    }
  }

  // ── Hero size table ────────────────────────────────────────────────────────
  if (Object.keys(heroesByClass).length > 0) {
    console.log('  Heroes (rendered height = defaultSize.h × scale):');
    console.log('  ' + '─'.repeat(70));
    console.log('  ' +
      'Skin'.padEnd(14) +
      'Class'.padEnd(10) +
      'Frame'.padEnd(12) +
      'Scale'.padEnd(8) +
      'Rendered H'.padEnd(12) +
      'Rendered W'
    );
    console.log('  ' + '─'.repeat(70));

    for (const [cls, group] of Object.entries(heroesByClass)) {
      const heights = group.map(s => s.renderedH);
      const median  = heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)];

      for (const s of group) {
        const diffPct = Math.abs(s.renderedH - median) / median * 100;
        const flag = diffPct > 40 ? ' ⚠️ ' : '   ';
        if (diffPct > 40) {
          issue('LOW', s.skinId, 'size',
            `Rendered height ${s.renderedH.toFixed(0)}px is ${diffPct.toFixed(0)}% off class "${cls}" median ${median.toFixed(0)}px`);
        }
        console.log('  ' + flag +
          s.skinId.padEnd(14) +
          cls.padEnd(10) +
          `${s.defaultSize.w}x${s.defaultSize.h}`.padEnd(12) +
          ('×' + s.scale).padEnd(8) +
          s.renderedH.toFixed(0).padEnd(12) +
          s.renderedW.toFixed(0)
        );
      }
      console.log('  ' + `  Class "${cls}" median height: ${median.toFixed(0)}px`);
      console.log('');
    }
  }

  // ── Enemy size table ───────────────────────────────────────────────────────
  if (enemies.length > 0) {
    console.log('  Enemies (rendered height = defaultSize.h × scale):');
    console.log('  ' + '─'.repeat(70));
    console.log('  ' +
      'Skin'.padEnd(20) +
      'Frame'.padEnd(12) +
      'Scale'.padEnd(8) +
      'Rendered H'.padEnd(12) +
      'Rendered W'
    );
    console.log('  ' + '─'.repeat(70));

    for (const s of enemies) {
      const tooSmall = s.renderedH < 60;
      const tooBig   = s.renderedH > 700;
      const flag = (tooSmall || tooBig) ? ' ⚠️ ' : '   ';
      if (tooSmall) issue('LOW', s.skinId, 'size', `Rendered height ${s.renderedH.toFixed(0)}px seems too small (< 60px)`);
      if (tooBig)   issue('LOW', s.skinId, 'size', `Rendered height ${s.renderedH.toFixed(0)}px seems too large (> 700px)`);

      console.log('  ' + flag +
        s.skinId.padEnd(20) +
        `${s.defaultSize.w}x${s.defaultSize.h}`.padEnd(12) +
        ('×' + s.scale).padEnd(8) +
        s.renderedH.toFixed(0).padEnd(12) +
        s.renderedW.toFixed(0)
      );
    }
    console.log('');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        SKIN ANIMATION QA REPORT                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log('Assets root: ' + ASSETS_ROOT);
  console.log('Mode:        ' + (HEROES_ONLY ? 'heroes only' : ENEMIES_ONLY ? 'enemies only' : 'all skins'));
  console.log('Verbose:     ' + VERBOSE);
  console.log('');

  const checkedSkins = [];

  // ── Heroes ─────────────────────────────────────────────────────────────────
  if (!ENEMIES_ONLY) {
    console.log('─── Hero Skins (' + HERO_SKINS.length + ') ─────────────────────────────────────────────\n');
    for (const skin of HERO_SKINS) {
      if (!VERBOSE) process.stdout.write('  Checking ' + skin.id + ' ...\r');
      validateSkin(skin);
      const s = summaries.find(s => s.skinId === skin.id);
      if (s) checkedSkins.push(s);
    }
    console.log('  Checked ' + HERO_SKINS.length + ' hero skins.\n');
  }

  // ── Enemy base skins ────────────────────────────────────────────────────────
  if (!HEROES_ONLY) {
    console.log('─── Enemy Base Skins (' + ENEMY_BASE_SKINS.length + ') ──────────────────────────────────────\n');
    for (const skin of ENEMY_BASE_SKINS) {
      if (!VERBOSE) process.stdout.write('  Checking ' + skin.id + ' ...\r');
      validateSkin(skin);
      const s = summaries.find(s => s.skinId === skin.id);
      if (s) checkedSkins.push(s);
    }
    console.log('  Checked ' + ENEMY_BASE_SKINS.length + ' base enemy skins.\n');

    // ── v-based color variants ────────────────────────────────────────────────
    console.log('─── v-Based Color Variants ─────────────────────────────────────────\n');
    for (const baseId of V_BASES) {
      const baseSkin = ENEMY_BASE_SKINS.find(s => s.id === baseId);
      if (!baseSkin) continue;
      if (!VERBOSE) process.stdout.write('  Variants of ' + baseId + ' ...\r');
      validateVVariants(baseSkin);
    }
    console.log('  Checked v1–v7 variants for: ' + V_BASES.join(', ') + '\n');

    // ── Old-style color variants ───────────────────────────────────────────────
    console.log('─── Old-Style Color Variants ────────────────────────────────────────\n');

    const goblinBase = ENEMY_BASE_SKINS.find(s => s.id === 'goblin_black');
    validateOldStyleVariants('goblin', OLD_STYLE_VARIANTS.goblin, 'enemy/goblin', goblinBase);

    const ninjaBase = ENEMY_BASE_SKINS.find(s => s.id === 'yellow_ninja');
    validateOldStyleVariants('yellow_ninja', OLD_STYLE_VARIANTS.ninja, 'enemy/ninja', ninjaBase);

    const necro1Base = ENEMY_BASE_SKINS.find(s => s.id === 'necromancer_1');
    validateOldStyleVariants('necromancer_1', OLD_STYLE_VARIANTS.necromancer, 'enemy/necromancer', necro1Base);

    const nbBase = ENEMY_BASE_SKINS.find(s => s.id === 'night_born_1');
    validateOldStyleVariants('night_born_1', OLD_STYLE_VARIANTS.night_born, 'enemy/night_born', nbBase);

    console.log('  Checked old-style color variants for goblin, ninja, necromancer, night_born.\n');
  }

  // ── Size consistency report ───────────────────────────────────────────────
  checkSizeConsistency(summaries);

  // ── Issue summary ─────────────────────────────────────────────────────────
  const CRITICAL = issues.filter(i => i.severity === 'CRITICAL');
  const HIGH     = issues.filter(i => i.severity === 'HIGH');
  const MEDIUM   = issues.filter(i => i.severity === 'MEDIUM');
  const LOW      = issues.filter(i => i.severity === 'LOW');

  console.log('─── Issues Found ────────────────────────────────────────────────────\n');

  function printIssues(label, list) {
    if (list.length === 0) return;
    console.log(`  ${label} (${list.length}):`);
    for (const i of list) {
      console.log(`    [${i.severity}] ${i.skinId} / ${i.anim}: ${i.msg}`);
    }
    console.log('');
  }

  printIssues('🔴 CRITICAL', CRITICAL);
  printIssues('🟠 HIGH',     HIGH);
  printIssues('🟡 MEDIUM',   MEDIUM);
  printIssues('🔵 LOW',      LOW);

  if (issues.length === 0) {
    console.log('  ✅ No issues found!\n');
  }

  // ── Final summary ────────────────────────────────────────────────────────
  console.log('─── Summary ─────────────────────────────────────────────────────────\n');
  console.log(`  Total skins checked:   ${summaries.length}`);
  console.log(`  Total animations:      ${summaries.reduce((a, s) => a + s.animCount, 0)}`);
  console.log(`  Total frames:          ${summaries.reduce((a, s) => a + s.frameTotal, 0)}`);
  console.log(`  CRITICAL issues:       ${CRITICAL.length}`);
  console.log(`  HIGH issues:           ${HIGH.length}`);
  console.log(`  MEDIUM issues:         ${MEDIUM.length}`);
  console.log(`  LOW issues:            ${LOW.length}`);
  console.log(`  Total issues:          ${issues.length}`);
  console.log('');

  const exitCode = (CRITICAL.length + HIGH.length) > 0 ? 1 : 0;
  process.exit(exitCode);
}

main();
