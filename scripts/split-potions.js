/**
 * Split potion spritesheets (96x80, 6x5 grid of 16x16 cells)
 * into individual PNG files organized by potion type.
 *
 * Input:  bot/src/assets/potions/{Color} Potions.png
 * Output: bot/public/assets/potions/{type}/{color}_{charges}.png
 *         bot/public/assets/potions/{type}/{type}.json
 *
 * Columns (potion shapes):
 *   0 = round_flask
 *   1 = tall_bottle
 *   2 = corked_flask
 *   3 = wide_bottle
 *   4 = small_vial
 *   5 = jug
 *
 * Rows (fill level / charges, top=nearly empty → bottom=full):
 *   Row 0 = charges_1 (nearly empty)
 *   Row 4 = charges_5 (full)
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "../bot/src/assets/potions");
const OUT_DIR = path.resolve(__dirname, "../bot/public/assets/potions");

const CELL = 16;
const COLS = 6;
const ROWS = 5;

const TYPES = [
  "round_flask",
  "tall_bottle",
  "corked_flask",
  "wide_bottle",
  "small_vial",
  "jug",
];

const COLORS = {
  "Red Potions.png":    "red",
  "Blue Potions.png":   "blue",
  "Cyan Potions.png":   "cyan",
  "Green Potions.png":  "green",
  "Purple Potions.png": "purple",
  "Yellow Potions.png": "yellow",
};

async function main() {
  // Create output dirs
  for (const type of TYPES) {
    fs.mkdirSync(path.join(OUT_DIR, type), { recursive: true });
  }

  for (const [file, color] of Object.entries(COLORS)) {
    const srcPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`SKIP: ${srcPath} not found`);
      continue;
    }

    for (let col = 0; col < COLS; col++) {
      const type = TYPES[col];
      for (let row = 0; row < ROWS; row++) {
        const charges = row + 1;
        const outPath = path.join(OUT_DIR, type, `${color}_${charges}.png`);

        await sharp(srcPath)
          .extract({ left: col * CELL, top: row * CELL, width: CELL, height: CELL })
          .toFile(outPath);
      }
    }

    console.log(`✓ ${file} → ${color} (${COLS * ROWS} sprites)`);
  }

  // Create JSON metadata for each potion type
  for (const type of TYPES) {
    const typeDir = path.join(OUT_DIR, type);
    const files = fs.readdirSync(typeDir).filter(f => f.endsWith(".png"));

    // Group by color
    const colors = {};
    for (const f of files) {
      const match = f.match(/^(\w+)_(\d+)\.png$/);
      if (!match) continue;
      const [, clr, charges] = match;
      if (!colors[clr]) colors[clr] = {};
      colors[clr][`charges_${charges}`] = f;
    }

    const meta = {
      type,
      spriteSize: { w: CELL, h: CELL },
      maxCharges: ROWS,
      tiers: {
        tier_1: `Tier 1 — basic ${type.replace(/_/g, " ")}`,
        tier_2: `Tier 2 — improved ${type.replace(/_/g, " ")}`,
      },
      colors,
    };

    fs.writeFileSync(
      path.join(typeDir, `${type}.json`),
      JSON.stringify(meta, null, 2),
    );
    console.log(`✓ ${type}.json`);
  }

  console.log(`\nDone! Output: ${OUT_DIR}`);
}

main().catch(console.error);
