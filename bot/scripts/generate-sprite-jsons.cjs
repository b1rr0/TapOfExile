/**
 * One-time script: generates Aseprite-format JSON atlas files
 * for all skins that only have PNG spritesheets.
 *
 * Run: node scripts/generate-sprite-jsons.js
 */

const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "src", "assets", "characters");

/* ── Helper: build a single JSON atlas ────────────────── */

function makeAtlas(skinId, animName, png, frameW, frameH, frameCount, stripW, stripH, cols) {
  const frames = [];
  const effectiveCols = cols || frameCount; // single-row by default
  for (let i = 0; i < frameCount; i++) {
    const col = i % effectiveCols;
    const row = Math.floor(i / effectiveCols);
    frames.push({
      filename: `${skinId} #${animName} ${i}`,
      frame: { x: col * frameW, y: row * frameH, w: frameW, h: frameH },
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
      version: "1.3-rc6-x64",
      image: png,
      format: "RGBA8888",
      size: { w: stripW, h: stripH },
      scale: "1",
    },
  };
}

/* ── Skin definitions ─────────────────────────────────── */

const SKINS = [
  // ─── samurai_2: 200×200 frames ──────────────────────
  {
    folder: path.join(BASE, "samurai", "samurai_2"),
    skinId: "samurai_2",
    anims: [
      { json: "idle.json",     png: "Idle.png",     fw: 200, fh: 200, fc: 8,  sw: 1600, sh: 200 },
      { json: "attack_1.json", png: "Attack1.png",  fw: 200, fh: 200, fc: 6,  sw: 1200, sh: 200 },
      { json: "run.json",      png: "Run.png",      fw: 200, fh: 200, fc: 8,  sw: 1600, sh: 200 },
      { json: "hurt.json",     png: "Take Hit.png", fw: 200, fh: 200, fc: 4,  sw: 800,  sh: 200 },
      { json: "death.json",    png: "Death.png",    fw: 200, fh: 200, fc: 6,  sw: 1200, sh: 200 },
    ],
  },

  // ─── samurai_3: 200×200 frames ──────────────────────
  {
    folder: path.join(BASE, "samurai", "samurai_3"),
    skinId: "samurai_3",
    anims: [
      { json: "idle.json",     png: "Idle.png",     fw: 200, fh: 200, fc: 4,  sw: 800,  sh: 200 },
      { json: "attack_1.json", png: "Attack1.png",  fw: 200, fh: 200, fc: 4,  sw: 800,  sh: 200 },
      { json: "run.json",      png: "Run.png",      fw: 200, fh: 200, fc: 8,  sw: 1600, sh: 200 },
      { json: "hurt.json",     png: "Take hit.png", fw: 200, fh: 200, fc: 3,  sw: 600,  sh: 200 },
      { json: "death.json",    png: "Death.png",    fw: 200, fh: 200, fc: 7,  sw: 1400, sh: 200 },
    ],
  },

  // ─── wizard_2: 150×150 frames ──────────────────────
  {
    folder: path.join(BASE, "wizard", "wizard_2"),
    skinId: "wizard_2",
    anims: [
      { json: "idle.json",     png: "Idle.png",      fw: 150, fh: 150, fc: 8, sw: 1200, sh: 150 },
      { json: "attack_1.json", png: "Attack.png",    fw: 150, fh: 150, fc: 8, sw: 1200, sh: 150 },
      { json: "run.json",      png: "Move.png",      fw: 150, fh: 150, fc: 8, sw: 1200, sh: 150 },
      { json: "hurt.json",     png: "Take Hit.png",  fw: 150, fh: 150, fc: 4, sw: 600,  sh: 150 },
      { json: "death.json",    png: "Death.png",     fw: 150, fh: 150, fc: 5, sw: 750,  sh: 150 },
    ],
  },

  // ─── knight_4: 180×180 frames ──────────────────────
  {
    folder: path.join(BASE, "knight", "knight_4"),
    skinId: "knight_4",
    anims: [
      { json: "idle.json",     png: "Idle.png",      fw: 180, fh: 180, fc: 11, sw: 1980, sh: 180 },
      { json: "attack_1.json", png: "Attack1.png",   fw: 180, fh: 180, fc: 7,  sw: 1260, sh: 180 },
      { json: "run.json",      png: "Run.png",       fw: 180, fh: 180, fc: 8,  sw: 1440, sh: 180 },
      { json: "hurt.json",     png: "Take Hit.png",  fw: 180, fh: 180, fc: 4,  sw: 720,  sh: 180 },
      { json: "death.json",    png: "Death.png",     fw: 180, fh: 180, fc: 11, sw: 1980, sh: 180 },
    ],
  },

  // ─── archer_4: 100×100 frames (in Character/ subfolder) ──
  {
    folder: path.join(BASE, "archer", "archer_4", "Character"),
    skinId: "archer_4",
    anims: [
      { json: "idle.json",     png: "Idle.png",     fw: 100, fh: 100, fc: 10, sw: 1000, sh: 100 },
      { json: "attack_1.json", png: "Attack.png",   fw: 100, fh: 100, fc: 6,  sw: 600,  sh: 100 },
      { json: "run.json",      png: "Run.png",      fw: 100, fh: 100, fc: 8,  sw: 800,  sh: 100 },
      { json: "hurt.json",     png: "Get Hit.png",  fw: 100, fh: 100, fc: 3,  sw: 300,  sh: 100 },
      { json: "death.json",    png: "Death.png",    fw: 100, fh: 100, fc: 10, sw: 1000, sh: 100 },
    ],
  },

  // ─── knight_3: 184×137 frames (no idle → Crouch) ───
  {
    folder: path.join(BASE, "knight", "knight_3"),
    skinId: "knight_3",
    anims: [
      { json: "idle.json",     png: "Crouch.png",   fw: 184, fh: 137, fc: 4, sw: 736,  sh: 137 },
      { json: "attack_1.json", png: "Attack3.png",  fw: 184, fh: 137, fc: 4, sw: 736,  sh: 137 },
      { json: "run.json",      png: "Run2.png",     fw: 184, fh: 137, fc: 8, sw: 1472, sh: 137 },
    ],
  },

  // ─── knight_2: 64×64 multi-row grids ───────────────
  {
    folder: path.join(BASE, "knight", "knight_2"),
    skinId: "knight_2",
    anims: [
      // Idle.png: 256×256 = 4×4 grid of 64×64 = 16 frames
      { json: "idle.json",     png: "Idle.png",     fw: 64, fh: 64, fc: 16, sw: 256, sh: 256, cols: 4 },
      // Run.png: 256×256 = 4×4 grid of 64×64 = 16 frames
      { json: "run.json",      png: "Run.png",      fw: 64, fh: 64, fc: 16, sw: 256, sh: 256, cols: 4 },
      // Attacks.png: 1024×320 = 8 cols × 5 rows of 128×64 — use first row (8 frames)
      { json: "attack_1.json", png: "Attacks.png",  fw: 128, fh: 64, fc: 8, sw: 1024, sh: 320, cols: 8 },
      // Hurt.png: 256×128 = 4×2 grid of 64×64 — but only 3 visible
      { json: "hurt.json",     png: "Hurt.png",     fw: 64, fh: 64, fc: 3, sw: 256, sh: 128, cols: 4 },
      // Death.png: 256×128 = 4×2 grid of 64×64 = 4 frames (visually 4)
      { json: "death.json",    png: "Death.png",    fw: 64, fh: 64, fc: 4, sw: 256, sh: 128, cols: 4 },
    ],
  },

  // ─── samurai_4: 98×100 frames (extracted from 882×700 tileset, 9-col grid) ──
  {
    folder: path.join(BASE, "samurai", "samurai_4"),
    skinId: "samurai_4",
    anims: [
      { json: "idle.json",     png: "Idle.png",      fw: 98, fh: 100, fc: 4, sw: 392, sh: 100 },
      { json: "attack_1.json", png: "Attack1.png",   fw: 98, fh: 100, fc: 8, sw: 784, sh: 100 },
      { json: "run.json",      png: "Run.png",       fw: 98, fh: 100, fc: 7, sw: 686, sh: 100 },
      { json: "hurt.json",     png: "Take Hit.png",  fw: 98, fh: 100, fc: 2, sw: 196, sh: 100 },
      { json: "death.json",    png: "Death.png",     fw: 98, fh: 100, fc: 6, sw: 588, sh: 100 },
    ],
  },

  // ─── archer_3: 128×128 (most), 168×128 (attack) ────
  {
    folder: path.join(BASE, "archer", "archer_3"),
    skinId: "archer_3",
    anims: [
      { json: "idle.json",     png: "spr_ArcherIdle_strip_WithBkg.png",   fw: 128, fh: 128, fc: 8,  sw: 1024, sh: 128 },
      { json: "attack_1.json", png: "spr_ArcherAttack_strip_WithBkg.png", fw: 168, fh: 128, fc: 15, sw: 2520, sh: 128 },
      { json: "run.json",      png: "spr_ArcherRun_strip_WithBkg.png",    fw: 128, fh: 128, fc: 8,  sw: 1024, sh: 128 },
      { json: "death.json",    png: "spr_ArcherDeath_strip_WithBkg.png",  fw: 128, fh: 128, fc: 24, sw: 3072, sh: 128 },
    ],
  },
];

/* ── Generate ─────────────────────────────────────────── */

let created = 0;

for (const skin of SKINS) {
  for (const anim of skin.anims) {
    const animName = anim.json.replace(".json", "");
    const atlas = makeAtlas(
      skin.skinId, animName,
      anim.png,
      anim.fw, anim.fh, anim.fc,
      anim.sw, anim.sh,
      anim.cols
    );

    const outPath = path.join(skin.folder, anim.json);
    fs.writeFileSync(outPath, JSON.stringify(atlas, null, 2));
    created++;
    console.log(`  ✓ ${path.relative(BASE, outPath)} (${anim.fc} frames, ${anim.fw}×${anim.fh})`);
  }
}

console.log(`\nDone! Created ${created} JSON files.`);
