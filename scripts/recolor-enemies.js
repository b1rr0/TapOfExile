/**
 * Enemy Sprite Recolor Script v2
 *
 * Creates 7 color variants for each enemy sprite.
 * Handles both colorful and dark/monochrome sprites:
 *  - Colorful sprites: HSL hue-shift (preserves outlines)
 *  - Dark sprites (>70% low-chroma): full tinting + 1px colored outline
 *
 * Run:  node scripts/recolor-enemies.js [--clean]
 *   --clean  removes old variant folders before generating
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ─── 7 Color Variants ───────────────────────────────────────────
const VARIANTS = [
  { name: 'crimson',  hueShift: 0,   satMul: 1.3, brightAdd: 0,   tint: [200, 50, 50],   outline: [255, 60, 60]   },
  { name: 'emerald',  hueShift: 90,  satMul: 1.1, brightAdd: 0,   tint: [40, 160, 60],   outline: [50, 220, 80]   },
  { name: 'azure',    hueShift: 180, satMul: 1.1, brightAdd: 5,   tint: [50, 100, 200],  outline: [70, 140, 255]  },
  { name: 'golden',   hueShift: 40,  satMul: 1.2, brightAdd: 10,  tint: [210, 175, 45],  outline: [255, 220, 50]  },
  { name: 'violet',   hueShift: 240, satMul: 1.2, brightAdd: -5,  tint: [140, 55, 180],  outline: [180, 70, 240]  },
  { name: 'frost',    hueShift: 150, satMul: 0.8, brightAdd: 15,  tint: [120, 190, 210], outline: [160, 230, 255] },
  { name: 'shadow',   hueShift: 300, satMul: 0.6, brightAdd: -20, tint: [100, 50, 90],   outline: [150, 70, 140]  },
];

const DEFAULT_DIR = path.join(__dirname, '..', 'bot', 'public', 'assets', 'enemy');
const DARK_THRESHOLD = 0.70; // 70%+ low-chroma pixels → use tinting mode

// Support --dir <path> to recolor any sprite folder (e.g. skils_sprites)
function getTargetDir() {
  const idx = process.argv.indexOf('--dir');
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  return DEFAULT_DIR;
}
const ENEMY_DIR = getTargetDir();

// ─── Color helpers ───────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Sprite analysis ─────────────────────────────────────────────

/** Returns fraction of opaque pixels with chroma < 15 */
function analyzeDarkness(buf) {
  let transparent = 0, lowChroma = 0;
  const total = buf.length / 4;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) { transparent++; continue; }
    const chroma = Math.max(buf[i], buf[i+1], buf[i+2]) - Math.min(buf[i], buf[i+1], buf[i+2]);
    if (chroma < 15) lowChroma++;
  }
  const opaque = total - transparent;
  return opaque > 0 ? lowChroma / opaque : 0;
}

// ─── Recolor functions ───────────────────────────────────────────

/**
 * MODE 1: Hue-shift for colorful sprites.
 * Gray/dark pixels (chroma<15) get a gentle tint instead of being skipped.
 */
function recolorNormal(buf, variant) {
  const { hueShift, satMul, brightAdd, tint } = variant;
  const out = Buffer.from(buf);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2], a = out[i+3];
    if (a === 0) continue;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    if (chroma < 15) {
      // Gentle tint for dark/gray pixels: mix 15% of tint color
      const lum = (r + g + b) / 3;
      const t = 0.15;
      out[i]   = clamp(Math.round(r * (1 - t) + tint[0] * (lum / 255) * t), 0, 255);
      out[i+1] = clamp(Math.round(g * (1 - t) + tint[1] * (lum / 255) * t), 0, 255);
      out[i+2] = clamp(Math.round(b * (1 - t) + tint[2] * (lum / 255) * t), 0, 255);
      continue;
    }

    if (maxC < 10 || minC > 245) continue;

    let [h, s, l] = rgbToHsl(r, g, b);
    h = (h + hueShift) % 360;
    s = clamp(s * satMul, 0, 1);
    l = clamp(l + brightAdd / 100, 0, 1);
    const [nr, ng, nb] = hslToRgb(h, s, l);
    out[i] = nr; out[i+1] = ng; out[i+2] = nb;
  }
  return out;
}

/**
 * MODE 2: Full tinting for dark/monochrome sprites.
 * Every opaque pixel is recolored based on its luminance + tint color.
 * Preserves shape through luminance mapping.
 */
function recolorDark(buf, variant) {
  const { tint } = variant;
  const out = Buffer.from(buf);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2], a = out[i+3];
    if (a === 0) continue;

    // Luminance 0..1
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Map luminance to tint color:
    // - Very dark pixels (lum < 0.1) stay nearly black with slight tint
    // - Mid pixels get full tint at their luminance
    // - Bright pixels get lighter version of tint
    if (lum < 0.08) {
      // Near-black: subtle tint
      const factor = 0.3;
      out[i]   = clamp(Math.round(tint[0] * lum * factor), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] * lum * factor), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] * lum * factor), 0, 255);
    } else if (lum < 0.5) {
      // Dark to mid: scale tint by luminance (boosted)
      const factor = lum * 1.8;
      out[i]   = clamp(Math.round(tint[0] * factor), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] * factor), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] * factor), 0, 255);
    } else {
      // Bright: lighten towards white
      const factor = (lum - 0.5) * 2; // 0..1
      out[i]   = clamp(Math.round(tint[0] + (255 - tint[0]) * factor * 0.6), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] + (255 - tint[1]) * factor * 0.6), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] + (255 - tint[2]) * factor * 0.6), 0, 255);
    }
  }
  return out;
}

/**
 * Add a 1px colored outline around opaque pixels.
 * Checks 4-directional neighbors. If a pixel is transparent
 * and has an opaque neighbor, it becomes an outline pixel.
 */
function addOutline(buf, width, height, channels, outlineColor) {
  const out = Buffer.from(buf);
  const [oR, oG, oB] = outlineColor;

  // We need to read from original, write to copy
  const getAlpha = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return buf[(y * width + x) * channels + 3];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const a = buf[idx + 3];

      // Only draw outline on transparent pixels that neighbor opaque ones
      if (a > 0) continue;

      const hasOpaqueNeighbor =
        getAlpha(x - 1, y) > 0 ||
        getAlpha(x + 1, y) > 0 ||
        getAlpha(x, y - 1) > 0 ||
        getAlpha(x, y + 1) > 0;

      if (hasOpaqueNeighbor) {
        out[idx]     = oR;
        out[idx + 1] = oG;
        out[idx + 2] = oB;
        out[idx + 3] = 220; // Slightly transparent outline
      }
    }
  }
  return out;
}

// ─── PNG processing ──────────────────────────────────────────────

/**
 * Analyze all PNGs in a folder to determine if the sprite set is "dark".
 * Returns true if average darkness across PNGs > threshold.
 */
async function isDarkSpriteSet(folderPath) {
  const pngs = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
  if (pngs.length === 0) return false;

  let totalDarkness = 0;
  for (const png of pngs) {
    const { data } = await sharp(path.join(folderPath, png))
      .raw().toBuffer({ resolveWithObject: true });
    totalDarkness += analyzeDarkness(data);
  }
  return (totalDarkness / pngs.length) > DARK_THRESHOLD;
}

/**
 * Process a single PNG: recolor + optionally add outline
 */
async function recolorPng(srcPath, dstPath, variant, isDark) {
  const { data, info } = await sharp(srcPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  let result;
  if (isDark) {
    // Full tinting + outline for dark sprites
    result = recolorDark(data, variant);
    result = addOutline(result, info.width, info.height, info.channels, variant.outline);
  } else {
    // Hue-shift for colorful sprites
    result = recolorNormal(data, variant);
  }

  await sharp(result, {
    raw: { width: info.width, height: info.height, channels: info.channels }
  }).png().toFile(dstPath);
}

function copyFile(srcPath, dstPath) {
  fs.copyFileSync(srcPath, dstPath);
}

// ─── Cleanup ─────────────────────────────────────────────────────

/** Remove previously generated variant folders */
function cleanVariants(enemyDir) {
  const entries = fs.readdirSync(enemyDir, { withFileTypes: true });
  const variantNames = VARIANTS.map(v => v.name);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;

    // Match v0, v1_crimson, v2_emerald, etc. (flat style)
    const isVFolder = /^v\d+/.test(name);

    // Match goblin_crimson, necromancer_azure, etc. (nested style)
    const isVariantSuffix = variantNames.some(vn => name.endsWith('_' + vn));

    if (isVFolder || isVariantSuffix) {
      const fullPath = path.join(enemyDir, name);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

/**
 * If v0/ exists (from previous flat run), move its contents back up.
 * This restores the original flat structure so we can re-process.
 */
function restoreV0(enemyDir) {
  const v0Dir = path.join(enemyDir, 'v0');
  if (!fs.existsSync(v0Dir)) return false;

  const v0Files = fs.readdirSync(v0Dir, { withFileTypes: true }).filter(e => e.isFile());
  for (const f of v0Files) {
    const src = path.join(v0Dir, f.name);
    const dst = path.join(enemyDir, f.name);
    if (!fs.existsSync(dst)) {
      fs.renameSync(src, dst);
    }
  }
  fs.rmSync(v0Dir, { recursive: true, force: true });
  return true;
}

// ─── Main Logic ──────────────────────────────────────────────────

async function processEnemy(enemyName) {
  const enemyDir = path.join(ENEMY_DIR, enemyName);

  // Step 1: Clean old variants
  restoreV0(enemyDir);
  cleanVariants(enemyDir);

  const entries = fs.readdirSync(enemyDir, { withFileTypes: true });
  const hasPngFiles = entries.some(e => e.isFile() && e.name.endsWith('.png'));
  const subDirs = entries.filter(e => e.isDirectory());

  if (hasPngFiles) {
    // ── FLAT structure ──
    const isDark = await isDarkSpriteSet(enemyDir);
    console.log(`  [flat${isDark ? '/DARK' : ''}] ${enemyName} → v0 + 7 variants`);

    const files = entries.filter(e => e.isFile());
    const v0Dir = path.join(enemyDir, 'v0');
    fs.mkdirSync(v0Dir, { recursive: true });

    // Move originals to v0/
    for (const f of files) {
      fs.renameSync(path.join(enemyDir, f.name), path.join(v0Dir, f.name));
    }

    // Generate variants
    for (let vi = 0; vi < VARIANTS.length; vi++) {
      const variant = VARIANTS[vi];
      const vDir = path.join(enemyDir, `v${vi + 1}_${variant.name}`);
      fs.mkdirSync(vDir, { recursive: true });

      for (const f of files) {
        const srcFile = path.join(v0Dir, f.name);
        const dstFile = path.join(vDir, f.name);
        if (f.name.endsWith('.png')) {
          await recolorPng(srcFile, dstFile, variant, isDark);
        } else {
          copyFile(srcFile, dstFile);
        }
      }
      console.log(`    ✓ v${vi + 1}_${variant.name}`);
    }

  } else if (subDirs.length > 0) {
    // ── NESTED structure ──
    // Only process original subfolder(s), not previously generated variants
    const origSubs = subDirs; // after cleanup, only originals remain

    for (const sub of origSubs) {
      const srcSubDir = path.join(enemyDir, sub.name);
      const isDark = await isDarkSpriteSet(srcSubDir);
      console.log(`  [nested${isDark ? '/DARK' : ''}] ${enemyName}/${sub.name} → 7 variants`);

      const subFiles = fs.readdirSync(srcSubDir, { withFileTypes: true }).filter(e => e.isFile());

      for (let vi = 0; vi < VARIANTS.length; vi++) {
        const variant = VARIANTS[vi];
        const baseName = sub.name.replace(/_[^_]+$/, '');
        const variantDirName = `${baseName}_${variant.name}`;
        const vDir = path.join(enemyDir, variantDirName);
        fs.mkdirSync(vDir, { recursive: true });

        for (const f of subFiles) {
          const srcFile = path.join(srcSubDir, f.name);
          const dstFile = path.join(vDir, f.name);
          if (f.name.endsWith('.png')) {
            await recolorPng(srcFile, dstFile, variant, isDark);
          } else {
            copyFile(srcFile, dstFile);
          }
        }
        console.log(`    ✓ ${variantDirName}`);
      }
    }
  } else {
    console.log(`  [skip] ${enemyName} — empty`);
  }
}

async function main() {
  console.log('Enemy Sprite Recolor Script v2');
  console.log('==============================\n');
  console.log(`Enemy directory: ${ENEMY_DIR}`);
  console.log(`Dark threshold: ${(DARK_THRESHOLD * 100).toFixed(0)}% low-chroma pixels`);
  console.log(`Variants: ${VARIANTS.map(v => v.name).join(', ')}\n`);

  const enemies = fs.readdirSync(ENEMY_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  console.log(`Found ${enemies.length} enemies: ${enemies.join(', ')}\n`);

  let processed = 0;
  for (const enemy of enemies) {
    console.log(`Processing: ${enemy}`);
    try {
      await processEnemy(enemy);
      processed++;
    } catch (err) {
      console.error(`  ERROR processing ${enemy}:`, err.message);
      console.error(err.stack);
    }
  }

  console.log(`\n✅ Done! Processed ${processed}/${enemies.length} enemies.`);
  console.log('Each enemy now has v0 (original) + 7 color variants.');
}

main().catch(console.error);
