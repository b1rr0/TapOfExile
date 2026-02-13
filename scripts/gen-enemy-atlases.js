/**
 * Generate Aseprite-compatible JSON atlas files for enemy sprite strips.
 *
 * Reads PNG dimensions, determines frame size, and writes JSON files
 * matching the format used by SpriteEngine.
 *
 * Usage: node scripts/gen-enemy-atlases.js
 */

const fs = require("fs");
const path = require("path");

const ENEMY_DIR = path.join(__dirname, "..", "bot", "src", "assets", "enemy");

// ── Manual overrides for ambiguous sprites ──────────────────
// { folder: { file: { frameW, frameH, frames, vertical } } }
const OVERRIDES = {
  // blue_witch: VERTICAL strips (frames stacked top-to-bottom)
  blue_witch: {
    "idle.png": { frameW: 32, frameH: 32, vertical: true }, // 32x288 = 9 frames
    "attack_1.png": { frameW: 104, frameH: 46, vertical: true }, // 104x414 = 9 frames
    "attack_2.png": { frameW: 48, frameH: 48, vertical: true }, // 48x240 = 5 frames
    "death.png": { frameW: 32, frameH: 32, vertical: true }, // 32x480 = 15 frames
    "run.png": { frameW: 32, frameH: 32, vertical: true }, // 32x384 = 12 frames
    "hurt.png": { frameW: 32, frameH: 48, vertical: true }, // 32x144 = 3 frames
  },
  // king: 128px tall, mostly 128x128 square frames
  king: {
    "idle.png": { frameW: 128, frameH: 128 }, // 2304/128 = 18
    "attack_1.png": { frameW: 128, frameH: 128 }, // 3840/128 = 30
    "attack_2.png": { frameW: 128, frameH: 128 }, // 9280/128 = 72.5 -> use as is, cut last partial
    "death.png": { frameW: 128, frameH: 128 }, // 4736/128 = 37
    "run.png": { frameW: 128, frameH: 128 }, // 1024/128 = 8
  },
  // knight_enemy: 64px tall but non-square attack/death
  knight_enemy: {
    "idle.png": { frameW: 64, frameH: 64 }, // 960/64 = 15
    "attack_1.png": { frameW: 48, frameH: 64 }, // 3168/48 = 66
    "death.png": { frameW: 48, frameH: 64 }, // 1440/48 = 30
    "run.png": { frameW: 64, frameH: 64 }, // 768/64 = 12
  },
  // necromancer_2: frame count from original filenames (_stripN)
  necromancer_2: {
    "idle.png": { frameW: 96, frameH: 96, frames: 50 }, // 4800/96 = 50
    "attack_1.png": { frameW: 128, frameH: 128, frames: 47 }, // 6016/128 = 47
    "death.png": { frameW: 96, frameH: 96, frames: 52 }, // 4992/96 = 52
    "run.png": { frameW: 96, frameH: 96, frames: 10 }, // 960/96 = 10
  },
  // paladin: frame count from _stripN
  paladin: {
    "idle.png": { frameW: 128, frameH: 128, frames: 27 }, // 3456/128 = 27
    "attack_1.png": { frameW: 160, frameH: 128, frames: 63 }, // 10080/160 = 63
    "death.png": { frameW: 128, frameH: 128, frames: 65 }, // 8320/128 = 65
    "run.png": { frameW: 128, frameH: 128, frames: 10 }, // 1280/128 = 10
  },
  // ronin_enemy: mixed heights, non-square attack frames
  ronin_enemy: {
    "idle.png": { frameW: 64, frameH: 64 }, // 512/64 = 8
    "attack_1.png": { frameW: 128, frameH: 96 }, // 3200/128 = 25
    "attack_2.png": { frameW: 128, frameH: 96 }, // 3200/128 = 25
    "death.png": { frameW: 64, frameH: 64 }, // 1024/64 = 16
    "run.png": { frameW: 64, frameH: 64 }, // 640/64 = 10
  },
  // reaper: 96px tall, try divisors
  reaper: {
    "idle.png": { frameW: 80, frameH: 96 }, // 2720/80 = 34
    "attack_1.png": { frameW: 100, frameH: 96 }, // 5100/100 = 51
    "attack_2.png": { frameW: 100, frameH: 96 }, // 5100/100 = 51
    "death.png": { frameW: 100, frameH: 96 }, // 6800/100 = 68
    "run.png": { frameW: 80, frameH: 96 }, // 1360/80 = 17
  },
  // striker: 96px tall, various frame widths
  striker: {
    "idle.png": { frameW: 96, frameH: 96 }, // 768/96 = 8
    "attack_1.png": { frameW: 128, frameH: 96 }, // 2048/128 = 16
    "attack_2.png": { frameW: 96, frameH: 96 }, // 1152/96 = 12
    "death.png": { frameW: 96, frameH: 96 }, // 1536/96 = 16
    "run.png": { frameW: 96, frameH: 96 }, // 768/96 = 8
    "hurt.png": { frameW: 96, frameH: 96 }, // 384/96 = 4
  },
};

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function generateAtlas(pngFile, enemyName, animName, imgW, imgH, override) {
  const vertical = override?.vertical || false;
  let frameW, frameH, numFrames;

  if (override) {
    frameW = override.frameW;
    frameH = override.frameH;
    if (override.frames) {
      numFrames = override.frames;
    } else if (vertical) {
      numFrames = Math.floor(imgH / frameH);
    } else {
      numFrames = Math.floor(imgW / frameW);
    }
  } else {
    // Auto-detect: assume square frames (frameW = imgH for horizontal)
    frameW = imgH;
    frameH = imgH;
    numFrames = Math.floor(imgW / frameW);
  }

  const frames = [];
  for (let i = 0; i < numFrames; i++) {
    const x = vertical ? 0 : frameW * i;
    const y = vertical ? frameH * i : 0;
    frames.push({
      filename: `${enemyName} #${animName} ${i}`,
      frame: { x, y, w: frameW, h: frameH },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
      sourceSize: { w: frameW, h: frameH },
      duration: 100,
    });
  }

  return {
    frames,
    meta: {
      app: "https://www.aseprite.org/",
      image: pngFile,
      format: "RGBA8888",
      size: { w: imgW, h: imgH },
      scale: "1",
    },
  };
}

// ── Folders that already have JSON files — skip them ────────
const SKIP_FOLDERS = new Set([
  "goblin",
  "necromancer",
  "night_born",
  "ninja",
]);

let totalCreated = 0;

const folders = fs.readdirSync(ENEMY_DIR, { withFileTypes: true });
for (const folder of folders) {
  if (!folder.isDirectory()) continue;
  if (SKIP_FOLDERS.has(folder.name)) continue;

  const folderPath = path.join(ENEMY_DIR, folder.name);
  const pngs = fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".png"));

  const overrideSet = OVERRIDES[folder.name] || {};

  for (const png of pngs) {
    const jsonName = png.replace(".png", ".json");
    const jsonPath = path.join(folderPath, jsonName);

    // Skip if JSON already exists
    if (fs.existsSync(jsonPath)) {
      console.log(`  SKIP ${folder.name}/${jsonName} (exists)`);
      continue;
    }

    const pngPath = path.join(folderPath, png);
    const dim = getPngDimensions(pngPath);
    const animName = png.replace(".png", "");
    const override = overrideSet[png];

    const atlas = generateAtlas(png, folder.name, animName, dim.w, dim.h, override);
    fs.writeFileSync(jsonPath, JSON.stringify(atlas, null, 2) + "\n");
    console.log(
      `  CREATE ${folder.name}/${jsonName} — ${atlas.frames.length} frames ` +
        `(${atlas.frames[0].frame.w}x${atlas.frames[0].frame.h})` +
        (override?.vertical ? " [vertical]" : "")
    );
    totalCreated++;
  }
}

console.log(`\nDone! Created ${totalCreated} JSON atlas files.`);
