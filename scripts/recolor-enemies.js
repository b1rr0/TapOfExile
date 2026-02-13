/**
 * Enemy Sprite Recolor Script
 *
 * Takes each enemy's sprites and creates 7 color variants using hue rotation.
 *
 * Structure BEFORE:
 *   enemy/blue_witch/idle.png, attack_1.png, ...         (flat)
 *   enemy/goblin/goblin_black/idle.png, ...               (subfolder)
 *
 * Structure AFTER:
 *   enemy/blue_witch/v0/idle.png, ...                     (original)
 *   enemy/blue_witch/v1/idle.png, ...                     (crimson)
 *   enemy/blue_witch/v2/idle.png, ...                     (emerald)
 *   ...
 *   enemy/goblin/goblin_black/idle.png, ...               (original, untouched)
 *   enemy/goblin/goblin_crimson/idle.png, ...             (recolored)
 *   ...
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ─── 7 Color Variants ───────────────────────────────────────────
// Each variant shifts hue by a different amount (0-360 degrees)
// and optionally adjusts saturation/brightness for distinct looks.
// Inspired by triadic/complementary color harmony schemes.
const VARIANTS = [
  { name: 'crimson',    hueShift: 0,   satMul: 1.3, brightAdd: 0,   tint: [220, 40, 40]   },  // Red/crimson
  { name: 'emerald',    hueShift: 90,  satMul: 1.1, brightAdd: 0,   tint: [30, 180, 60]   },  // Green
  { name: 'azure',      hueShift: 180, satMul: 1.1, brightAdd: 5,   tint: [40, 100, 220]  },  // Blue
  { name: 'golden',     hueShift: 40,  satMul: 1.2, brightAdd: 10,  tint: [230, 190, 40]  },  // Gold/yellow
  { name: 'violet',     hueShift: 240, satMul: 1.2, brightAdd: -5,  tint: [150, 50, 200]  },  // Purple
  { name: 'frost',      hueShift: 150, satMul: 0.8, brightAdd: 15,  tint: [140, 210, 230] },  // Icy cyan
  { name: 'shadow',     hueShift: 300, satMul: 0.6, brightAdd: -20, tint: [80, 60, 80]    },  // Dark/shadow
];

const ENEMY_DIR = path.join(__dirname, '..', 'bot', 'src', 'assets', 'enemy');

// ─── Helpers ─────────────────────────────────────────────────────

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
  h = ((h % 360) + 360) % 360;
  h /= 360;
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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Recolor a pixel buffer (RGBA) using hue shift + saturation multiply + brightness adjust.
 * Skips near-grayscale pixels (outlines/shadows) to preserve them.
 */
function recolorBuffer(buf, variant) {
  const { hueShift, satMul, brightAdd } = variant;
  const out = Buffer.from(buf);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2], a = out[i+3];

    // Skip fully transparent pixels
    if (a === 0) continue;

    // Skip very dark pixels (outlines) and near-grayscale
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    // Only recolor pixels that have some color (chroma > 15)
    // and aren't pure black/white
    if (chroma < 15 || maxC < 20 || minC > 240) continue;

    let [h, s, l] = rgbToHsl(r, g, b);

    h = (h + hueShift) % 360;
    s = clamp(s * satMul, 0, 1);
    l = clamp(l + brightAdd / 100, 0, 1);

    const [nr, ng, nb] = hslToRgb(h, s, l);
    out[i] = nr;
    out[i+1] = ng;
    out[i+2] = nb;
    // alpha stays the same
  }

  return out;
}

/**
 * Process a single PNG file: read → recolor → write
 */
async function recolorPng(srcPath, dstPath, variant) {
  const image = sharp(srcPath);
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const recolored = recolorBuffer(data, variant);

  await sharp(recolored, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    }
  })
    .png()
    .toFile(dstPath);
}

/**
 * Copy a JSON file as-is (atlas data doesn't change)
 */
function copyJson(srcPath, dstPath) {
  fs.copyFileSync(srcPath, dstPath);
}

// ─── Main Logic ──────────────────────────────────────────────────

async function processEnemy(enemyName) {
  const enemyDir = path.join(ENEMY_DIR, enemyName);
  const entries = fs.readdirSync(enemyDir, { withFileTypes: true });

  const hasPngFiles = entries.some(e => e.isFile() && e.name.endsWith('.png'));
  const subDirs = entries.filter(e => e.isDirectory());

  if (hasPngFiles) {
    // FLAT structure: files directly in enemy folder
    // Move them to v0/, then create v1-v7
    console.log(`  [flat] ${enemyName} → creating v0 + 7 variants`);

    const files = entries.filter(e => e.isFile());
    const v0Dir = path.join(enemyDir, 'v0');
    fs.mkdirSync(v0Dir, { recursive: true });

    // Move files to v0/
    for (const f of files) {
      const src = path.join(enemyDir, f.name);
      const dst = path.join(v0Dir, f.name);
      fs.renameSync(src, dst);
    }

    // Create v1-v7
    for (let vi = 0; vi < VARIANTS.length; vi++) {
      const variant = VARIANTS[vi];
      const vDir = path.join(enemyDir, `v${vi + 1}_${variant.name}`);
      fs.mkdirSync(vDir, { recursive: true });

      for (const f of files) {
        const srcFile = path.join(v0Dir, f.name);
        const dstFile = path.join(vDir, f.name);

        if (f.name.endsWith('.png')) {
          await recolorPng(srcFile, dstFile, variant);
        } else {
          copyJson(srcFile, dstFile);
        }
      }
      console.log(`    ✓ ${vDir.split(path.sep).pop()}`);
    }

  } else if (subDirs.length > 0) {
    // NESTED structure: has subfolders with sprites
    // Keep original subfolder, create sibling folders with variants
    console.log(`  [nested] ${enemyName} → ${subDirs.length} sub(s) + 7 variants each`);

    for (const sub of subDirs) {
      const srcSubDir = path.join(enemyDir, sub.name);
      const subFiles = fs.readdirSync(srcSubDir, { withFileTypes: true })
        .filter(e => e.isFile());

      for (let vi = 0; vi < VARIANTS.length; vi++) {
        const variant = VARIANTS[vi];
        // e.g. goblin_black → goblin_crimson
        const baseName = sub.name.replace(/_[^_]+$/, '');
        const variantDirName = `${baseName}_${variant.name}`;
        const vDir = path.join(enemyDir, variantDirName);
        fs.mkdirSync(vDir, { recursive: true });

        for (const f of subFiles) {
          const srcFile = path.join(srcSubDir, f.name);
          const dstFile = path.join(vDir, f.name);

          if (f.name.endsWith('.png')) {
            await recolorPng(srcFile, dstFile, variant);
          } else {
            copyJson(srcFile, dstFile);
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
  console.log('Enemy Sprite Recolor Script');
  console.log('==========================\n');
  console.log(`Enemy directory: ${ENEMY_DIR}`);
  console.log(`Variants: ${VARIANTS.map(v => v.name).join(', ')}\n`);

  const enemies = fs.readdirSync(ENEMY_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  console.log(`Found ${enemies.length} enemies: ${enemies.join(', ')}\n`);

  for (const enemy of enemies) {
    console.log(`Processing: ${enemy}`);
    try {
      await processEnemy(enemy);
    } catch (err) {
      console.error(`  ERROR processing ${enemy}:`, err.message);
    }
  }

  console.log('\nDone! All color variants generated.');
}

main().catch(console.error);
