/**
 * New Skill Sprites Processor
 *
 * Reads sprite sheets from NEW_SKILS, creates proper skill folders:
 *   skill_name/v0/  (original PNG + JSON atlas)
 *   skill_name/v1_crimson/ .. v7_shadow/  (recolored PNG + JSON)
 *
 * Run:  node scripts/process-new-skills.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────
const NEW_SKILS_DIR = path.join(__dirname, '..', 'bot', 'public', 'assets', 'skils_sprites', 'NEW_SKILS');
const OUTPUT_DIR = path.join(__dirname, '..', 'bot', 'public', 'assets', 'skils_sprites');

const VARIANTS = [
  { name: 'crimson',  hueShift: 0,   satMul: 1.3, brightAdd: 0,   tint: [200, 50, 50],   outline: [255, 60, 60]   },
  { name: 'emerald',  hueShift: 90,  satMul: 1.1, brightAdd: 0,   tint: [40, 160, 60],   outline: [50, 220, 80]   },
  { name: 'azure',    hueShift: 180, satMul: 1.1, brightAdd: 5,   tint: [50, 100, 200],  outline: [70, 140, 255]  },
  { name: 'golden',   hueShift: 40,  satMul: 1.2, brightAdd: 10,  tint: [210, 175, 45],  outline: [255, 220, 50]  },
  { name: 'violet',   hueShift: 240, satMul: 1.2, brightAdd: -5,  tint: [140, 55, 180],  outline: [180, 70, 240]  },
  { name: 'frost',    hueShift: 150, satMul: 0.8, brightAdd: 15,  tint: [120, 190, 210], outline: [160, 230, 255] },
  { name: 'shadow',   hueShift: 300, satMul: 0.6, brightAdd: -20, tint: [100, 50, 90],   outline: [150, 70, 140]  },
];

// ─── Skill definitions ──────────────────────────────────────────
// Each skill: { name, src (relative to NEW_SKILS), frameW, frameH, cols, rows, renderType, drawW, drawH, durationPerFrame }
const SKILLS = [
  // === SLASH ===
  {
    name: 'slash',
    src: 'Slash Sprite Sheet.png',
    frameW: 64, frameH: 64, cols: 1, rows: 8,
    renderType: 'overlay', drawW: 120, drawH: 120, durationPerFrame: 60,
  },
  // === HEAL ===
  {
    name: 'heal',
    src: 'Heal Effect Sprite Sheet.png',
    frameW: 128, frameH: 128, cols: 4, rows: 4,
    renderType: 'overlay', drawW: 200, drawH: 200, durationPerFrame: 80,
  },
  // === THRUST 1 ===
  {
    name: 'thrust_1',
    src: 'Thrust/Thrusts 1 SpriteSheet.png',
    frameW: 64, frameH: 64, cols: 1, rows: 3,
    renderType: 'projectile', drawW: 120, drawH: 120, durationPerFrame: 80,
  },
  // === THRUST 2 ===
  {
    name: 'thrust_2',
    src: 'Thrust/Thrust 2 SpriteSheet.png',
    frameW: 64, frameH: 64, cols: 1, rows: 3,
    renderType: 'projectile', drawW: 120, drawH: 120, durationPerFrame: 80,
  },
  // === EFFECT 1 (star burst - yellow) ===
  {
    name: 'effect_star',
    src: 'Effects/Effect 1 - Sprite Sheet.png',
    frameW: 64, frameH: 64, cols: 1, rows: 3,
    renderType: 'overlay', drawW: 100, drawH: 100, durationPerFrame: 100,
  },
  // === EFFECT 2 (sparkle) ===
  {
    name: 'effect_sparkle',
    src: 'Effects/Effect 2 - Sprite Sheet.png',
    frameW: 64, frameH: 32, cols: 1, rows: 5,
    renderType: 'overlay', drawW: 100, drawH: 50, durationPerFrame: 80,
  },
  // === EFFECT 3 (small sparks) ===
  {
    name: 'effect_sparks',
    src: 'Effects/Effect 3 - Sprite Sheet.png',
    frameW: 32, frameH: 32, cols: 1, rows: 5,
    renderType: 'overlay', drawW: 60, drawH: 60, durationPerFrame: 60,
  },
  // === EFFECT 4 (tiny sparks) ===
  {
    name: 'effect_embers',
    src: 'Effects/Effect 4 - Sprite Sheet.png',
    frameW: 32, frameH: 32, cols: 1, rows: 5,
    renderType: 'overlay', drawW: 60, drawH: 60, durationPerFrame: 60,
  },
  // === FIRE BREATH ===
  {
    name: 'fire_breath',
    src: 'Fire Effect 1/Fire Effect 1/Fire Breath SpriteSheet.png',
    frameW: 48, frameH: 48, cols: 8, rows: 3,
    renderType: 'projectile', drawW: 140, drawH: 140, durationPerFrame: 60,
  },
  // === FIREBOLT ===
  {
    name: 'firebolt',
    src: 'Fire Effect 1/Fire Effect 1/Firebolt SpriteSheet.png',
    frameW: 48, frameH: 48, cols: 11, rows: 1,
    renderType: 'projectile', drawW: 120, drawH: 120, durationPerFrame: 60,
  },
  // === FIRE HIT ===
  {
    name: 'fire_hit',
    src: 'Fire Effect 1/Fire Effect 1/Fire Breath hit effect SpriteSheet.png',
    frameW: 48, frameH: 48, cols: 5, rows: 1,
    renderType: 'overlay', drawW: 120, drawH: 120, durationPerFrame: 80,
  },
  // === EXPLOSION 1 (grid) ===
  {
    name: 'explosion',
    src: 'Fire Effect 2/Fire Effect 2/Explosion SpriteSheet.png',
    frameW: 64, frameH: 64, cols: 4, rows: 4,
    renderType: 'overlay', drawW: 160, drawH: 160, durationPerFrame: 60,
  },
  // === EXPLOSION 2 (horizontal strip) ===
  {
    name: 'explosion_2',
    src: 'Fire Effect 2/Fire Effect 2/Explosion 2 SpriteSheet.png',
    frameW: 48, frameH: 48, cols: 18, rows: 1,
    renderType: 'overlay', drawW: 140, drawH: 140, durationPerFrame: 50,
  },
  // === EARTH PROJECTILE ===
  {
    name: 'earth_projectile',
    src: 'Earth Effect 01/Earth Effect 01/Earth projectile Spritesheet .png',
    frameW: 32, frameH: 32, cols: 9, rows: 2,
    renderType: 'projectile', drawW: 80, drawH: 80, durationPerFrame: 60,
  },
  // === EARTH IMPACT ===
  {
    name: 'earth_impact',
    src: 'Earth Effect 01/Earth Effect 01/Impact Spritesheet.png',
    frameW: 48, frameH: 48, cols: 7, rows: 1,
    renderType: 'overlay', drawW: 100, drawH: 100, durationPerFrame: 80,
  },
  // === EARTH ROCKS ===
  {
    name: 'earth_rocks',
    src: 'Earth Effect 01/Earth Effect 01/Irregular rock Spritesheet.png',
    frameW: 32, frameH: 32, cols: 9, rows: 3,
    renderType: 'overlay', drawW: 80, drawH: 80, durationPerFrame: 50,
  },
  // === EARTH BUMP ===
  {
    name: 'earth_bump',
    src: 'Earth Effect 02/Earth Effect 02/Earth Bump.png',
    frameW: 48, frameH: 48, cols: 4, rows: 4,
    renderType: 'overlay', drawW: 120, drawH: 120, durationPerFrame: 70,
  },
  // === EARTH WALL ===
  {
    name: 'earth_wall',
    src: 'Earth Effect 02/Earth Effect 02/Earth Wall.png',
    frameW: 48, frameH: 48, cols: 4, rows: 4,
    renderType: 'overlay', drawW: 120, drawH: 120, durationPerFrame: 70,
  },
  // === THUNDER PROJECTILE 1 ===
  {
    name: 'thunder_projectile',
    src: 'Thunder Effect 01/Thunder Effect 01/Thunder Projectile 1/Thunder projectile1 wo blur.png',
    frameW: 32, frameH: 32, cols: 5, rows: 1,
    renderType: 'projectile', drawW: 80, drawH: 80, durationPerFrame: 80,
  },
  // === THUNDER HIT ===
  {
    name: 'thunder_hit',
    src: 'Thunder Effect 01/Thunder Effect 01/Thunder Hit/Thunder hit wo blur.png',
    frameW: 48, frameH: 32, cols: 4, rows: 1,
    renderType: 'overlay', drawW: 100, drawH: 70, durationPerFrame: 80,
  },
  // === THUNDER PROJECTILE 2 (large lightning ball) ===
  {
    name: 'thunder_ball',
    src: 'Thunder Effect 01/Thunder Effect 01/Projectile 2/Projectile 2 wo blur.png',
    frameW: 48, frameH: 48, cols: 16, rows: 1,
    renderType: 'projectile', drawW: 120, drawH: 120, durationPerFrame: 50,
  },
  // === THUNDER SPLASH ===
  {
    name: 'thunder_splash',
    src: 'Thunder Effect 02/Thunder Effect 02/Thunder Splash/Thunder splash wo blur.png',
    frameW: 48, frameH: 48, cols: 14, rows: 1,
    renderType: 'overlay', drawW: 120, drawH: 120, durationPerFrame: 50,
  },
  // === THUNDER STRIKE ===
  {
    name: 'thunder_strike',
    src: 'Thunder Effect 02/Thunder Effect 02/Thunder Strike/Thunderstrike wo blur.png',
    frameW: 64, frameH: 64, cols: 13, rows: 1,
    renderType: 'overlay', drawW: 160, drawH: 160, durationPerFrame: 50,
  },
  // === WATER STARTUP 1 ===
  {
    name: 'water_startup',
    src: 'Water Effect 01/Water Effect 01/Start Up/Water StartUp 1 SpriteSheet.png',
    frameW: 64, frameH: 16, cols: 1, rows: 11,
    renderType: 'overlay', drawW: 100, drawH: 30, durationPerFrame: 60,
  },
  // === WATER SPIKE ===
  {
    name: 'water_spike',
    src: 'Water Effect 01/Water Effect 01/Water Effect SpriteSheet/Water Spike 01 - SpriteSheet.png',
    frameW: 64, frameH: 64, cols: 5, rows: 5,
    renderType: 'overlay', drawW: 150, drawH: 150, durationPerFrame: 60,
  },
  // === WATER SPLASH 01 ===
  {
    name: 'water_splash',
    src: 'Water Effect 01/Water Effect 01/Water Effect SpriteSheet/Water Splash 01 - Spritesheet.png',
    frameW: 66, frameH: 44, cols: 5, rows: 7,
    renderType: 'overlay', drawW: 150, drawH: 100, durationPerFrame: 50,
  },
  // === WATER BALL ===
  {
    name: 'water_ball',
    src: 'Water Effect 2/Water Ball - Spritesheet/WaterBall - Startup and Infinite.png',
    frameW: 64, frameH: 64, cols: 5, rows: 5,
    renderType: 'projectile', drawW: 140, drawH: 140, durationPerFrame: 60,
  },
  // === WATER BALL IMPACT ===
  {
    name: 'water_ball_impact',
    src: 'Water Effect 2/Water Ball - Spritesheet/WaterBall - Impact.png',
    frameW: 64, frameH: 64, cols: 4, rows: 4,
    renderType: 'overlay', drawW: 140, drawH: 140, durationPerFrame: 60,
  },
  // === WATER BLAST ===
  {
    name: 'water_blast',
    src: 'Water Effect 2/Water Blast - Spritesheet/Water Blast - Startup and Infinite.png',
    frameW: 128, frameH: 128, cols: 4, rows: 3,
    renderType: 'projectile', drawW: 200, drawH: 200, durationPerFrame: 70,
  },
  // === WATER BLAST END ===
  {
    name: 'water_blast_end',
    src: 'Water Effect 2/Water Blast - Spritesheet/Water Blast - End.png',
    frameW: 128, frameH: 128, cols: 3, rows: 3,
    renderType: 'overlay', drawW: 200, drawH: 200, durationPerFrame: 70,
  },
  // === ICE VFX 1 (small projectile strips) ===
  {
    name: 'ice_shard',
    src: 'Ice Effect 01/Ice Effect 01/Ice VFX 1/IceVFX 1 Repeatable.png',
    frameW: 48, frameH: 32, cols: 10, rows: 1,
    renderType: 'projectile', drawW: 100, drawH: 70, durationPerFrame: 60,
  },
  // === ICE HIT ===
  {
    name: 'ice_hit',
    src: 'Ice Effect 01/Ice Effect 01/Ice VFX 1/Ice VFX 1 Hit.png',
    frameW: 48, frameH: 32, cols: 8, rows: 1,
    renderType: 'overlay', drawW: 100, drawH: 70, durationPerFrame: 60,
  },
  // === ICE VFX 2 (active loop) ===
  {
    name: 'ice_burst',
    src: 'Ice Effect 01/Ice Effect 01/Ice VFX 2/Ice VFX 2 Active.png',
    frameW: 32, frameH: 32, cols: 8, rows: 1,
    renderType: 'overlay', drawW: 80, drawH: 80, durationPerFrame: 70,
  },
  // === ICE VFX 2 ENDING ===
  {
    name: 'ice_shatter',
    src: 'Ice Effect 01/Ice Effect 01/Ice VFX 2/Ice VFX 2 Ending.png',
    frameW: 32, frameH: 32, cols: 18, rows: 1,
    renderType: 'overlay', drawW: 80, drawH: 80, durationPerFrame: 40,
  },
  // === WOOD VFX 01 REPEATABLE ===
  {
    name: 'wood_projectile',
    src: 'Wood VFX 01 - 02/Wood VFX 01 - 02/Wood VFX 01/Wood VFX 01 Repeatable.png',
    frameW: 32, frameH: 32, cols: 8, rows: 1,
    renderType: 'projectile', drawW: 80, drawH: 80, durationPerFrame: 60,
  },
  // === WOOD HIT ===
  {
    name: 'wood_hit',
    src: 'Wood VFX 01 - 02/Wood VFX 01 - 02/Wood VFX 01/Wood VFX 01 Hit.png',
    frameW: 32, frameH: 32, cols: 7, rows: 1,
    renderType: 'overlay', drawW: 80, drawH: 80, durationPerFrame: 60,
  },
  // === WOOD VFX 02 ===
  {
    name: 'wood_thorns',
    src: 'Wood VFX 01 - 02/Wood VFX 01 - 02/Wood VFX 02/Wood VFX 02.png',
    frameW: 32, frameH: 32, cols: 14, rows: 1,
    renderType: 'overlay', drawW: 80, drawH: 80, durationPerFrame: 50,
  },
];

// ─── Color helpers (from recolor-enemies.js) ─────────────────────

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
      if (t < 0) t += 1; if (t > 1) t -= 1;
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

function recolorNormal(buf, variant) {
  const { hueShift, satMul, brightAdd, tint } = variant;
  const out = Buffer.from(buf);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2], a = out[i+3];
    if (a === 0) continue;
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b), chroma = maxC - minC;
    if (chroma < 15) {
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

function recolorDark(buf, variant) {
  const { tint } = variant;
  const out = Buffer.from(buf);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2], a = out[i+3];
    if (a === 0) continue;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum < 0.08) {
      const factor = 0.3;
      out[i]   = clamp(Math.round(tint[0] * lum * factor), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] * lum * factor), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] * lum * factor), 0, 255);
    } else if (lum < 0.5) {
      const factor = lum * 1.8;
      out[i]   = clamp(Math.round(tint[0] * factor), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] * factor), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] * factor), 0, 255);
    } else {
      const factor = (lum - 0.5) * 2;
      out[i]   = clamp(Math.round(tint[0] + (255 - tint[0]) * factor * 0.6), 0, 255);
      out[i+1] = clamp(Math.round(tint[1] + (255 - tint[1]) * factor * 0.6), 0, 255);
      out[i+2] = clamp(Math.round(tint[2] + (255 - tint[2]) * factor * 0.6), 0, 255);
    }
  }
  return out;
}

// ─── JSON atlas generator ────────────────────────────────────────

function generateAtlas(skill, pngFilename, imgWidth, imgHeight) {
  const { name, frameW, frameH, cols, rows, renderType, drawW, drawH, durationPerFrame } = skill;
  const frames = [];
  let frameIndex = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * frameW;
      const y = row * frameH;
      // Skip frames that extend beyond the actual image
      if (x + frameW > imgWidth || y + frameH > imgHeight) continue;
      frames.push({
        filename: `${name} ${frameIndex}`,
        frame: { x, y, w: frameW, h: frameH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
        sourceSize: { w: frameW, h: frameH },
        duration: durationPerFrame,
      });
      frameIndex++;
    }
  }

  const totalDuration = frames.length * durationPerFrame;

  return {
    frames,
    meta: {
      app: 'https://www.aseprite.org/',
      image: pngFilename,
      format: 'RGBA8888',
      size: { w: imgWidth, h: imgHeight },
      scale: '1',
      skill: {
        renderType,
        renderDurationMs: totalDuration,
        drawW,
        drawH,
      },
    },
  };
}

// ─── Main processing ─────────────────────────────────────────────

async function processSkill(skill) {
  const srcPath = path.join(NEW_SKILS_DIR, skill.src);

  if (!fs.existsSync(srcPath)) {
    console.error(`  ✗ Source not found: ${skill.src}`);
    return false;
  }

  const skillDir = path.join(OUTPUT_DIR, skill.name);
  const v0Dir = path.join(skillDir, 'v0');

  // Create v0 directory
  fs.mkdirSync(v0Dir, { recursive: true });

  // Read source image
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const imgWidth = info.width;
  const imgHeight = info.height;

  // Copy original to v0
  const pngFilename = `${skill.name}_sprite.png`;
  const jsonFilename = `${skill.name}_sprite.json`;

  await sharp(srcPath).png().toFile(path.join(v0Dir, pngFilename));

  // Generate and write JSON atlas
  const atlas = generateAtlas(skill, pngFilename, imgWidth, imgHeight);
  fs.writeFileSync(
    path.join(v0Dir, jsonFilename),
    JSON.stringify(atlas, null, 2)
  );

  console.log(`  ✓ v0 (${atlas.frames.length} frames, ${imgWidth}x${imgHeight})`);

  // Analyze darkness for recolor mode
  const darkness = analyzeDarkness(data);
  const isDark = darkness > 0.70;
  if (isDark) console.log(`    [DARK mode — ${(darkness * 100).toFixed(0)}% low-chroma]`);

  // Generate 7 color variants
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const variant = VARIANTS[vi];
    const vDir = path.join(skillDir, `v${vi + 1}_${variant.name}`);
    fs.mkdirSync(vDir, { recursive: true });

    // Recolor PNG
    const recolored = isDark ? recolorDark(data, variant) : recolorNormal(data, variant);
    await sharp(recolored, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).png().toFile(path.join(vDir, pngFilename));

    // Copy JSON (identical atlas, same image filename)
    fs.writeFileSync(
      path.join(vDir, jsonFilename),
      JSON.stringify(atlas, null, 2)
    );

    console.log(`    ✓ v${vi + 1}_${variant.name}`);
  }

  return true;
}

async function main() {
  console.log('Skill Sprites Processor');
  console.log('======================\n');
  console.log(`Source:  ${NEW_SKILS_DIR}`);
  console.log(`Output:  ${OUTPUT_DIR}`);
  console.log(`Skills:  ${SKILLS.length}`);
  console.log(`Variants: v0 + ${VARIANTS.map(v => v.name).join(', ')}\n`);

  let ok = 0, fail = 0;
  for (const skill of SKILLS) {
    console.log(`Processing: ${skill.name}`);
    try {
      const success = await processSkill(skill);
      if (success) ok++; else fail++;
    } catch (err) {
      console.error(`  ✗ ERROR: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n✅ Done! ${ok} skills processed, ${fail} failed.`);
  console.log(`Each skill has v0 (original) + 7 color variants = ${ok * 8} total sprite sets.`);
}

main().catch(console.error);
