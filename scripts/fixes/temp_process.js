const fs = require('fs');
const path = require('path');

const BASE_SRC = 'D:\programs\code\TapOfExile\shared\public\assets\skils_sprites\not_processed';
const BASE_DST_LIGHTNING = 'D:\programs\code\TapOfExile\shared\public\assets\skils_sprites\lightning';
const BASE_DST_PHYSICAL = 'D:\programs\code\TapOfExile\shared\public\assets\skils_sprites\physical';

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  fs.copyFileSync(src, dst);
}

// Generate JSON for a horizontal sprite strip (frames laid out left to right, then next row)
function genJson(skillName, frameCount, frameW, frameH, sheetW, sheetH, durationMs, drawW, drawH, renderType) {
  const framesPerRow = Math.floor(sheetW / frameW);
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const col = i % framesPerRow;
    const row = Math.floor(i / framesPerRow);
    frames.push({
      filename: `${skillName} ${i}`,
      frame: { x: col * frameW, y: row * frameH, w: frameW, h: frameH },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
      sourceSize: { w: frameW, h: frameH },
      duration: Math.round(durationMs / frameCount)
    });
  }
  return {
    frames,
    meta: {
      app: "https://www.aseprite.org/",
      image: `${skillName}_sprite.png`,
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
      skill: {
        renderType,
        renderDurationMs: durationMs,
        drawW,
        drawH
      }
    }
  };
}

// VFX color versions mapping (5 versions)
const vfxColorMap = [
  { color: 'color1', version: 'v0' },
  { color: 'color2', version: 'v1_crimson' },
  { color: 'color3', version: 'v5_violet' },
  { color: 'color4', version: 'v4_golden' },
  { color: 'color5', version: 'v6_frost' },
];

// Slash color versions mapping
const slashColorMap = [
  { color: 'color1', version: 'v0' },
  { color: 'color2', version: 'v1_crimson' },
  { color: 'color3', version: 'v5_violet' },
  { color: 'color4', version: 'v4_golden' },
  { color: 'color5', version: 'v6_frost' },
];

// ============ VFX LIGHTNING SKILLS ============

// VFX1: lightning_wave
{
  const skillName = 'lightning_wave';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX1', 'Sprite-sheet', 'Sprite-sheet.png');
  const version = 'v0';
  const versionDir = path.join(skillDir, version);
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 4, 256, 128, 1024, 128, 400, 300, 150, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// VFX2: lightning_arc
{
  const skillName = 'lightning_arc';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX2', 'Sprite-sheet', 'Sprite-sheet.png');
  const versionDir = path.join(skillDir, 'v0');
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 4, 256, 128, 1024, 128, 400, 300, 150, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// VFX3: lightning_bolt
{
  const skillName = 'lightning_bolt';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX3', 'Sprite-sheet', 'Sprite-sheet.png');
  const versionDir = path.join(skillDir, 'v0');
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 5, 128, 256, 640, 256, 500, 150, 300, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// VFX4: lightning_strike_2
{
  const skillName = 'lightning_strike_2';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX4', 'Sprite-sheet', 'Sprite-sheet.png');
  const versionDir = path.join(skillDir, 'v0');
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 5, 128, 256, 640, 256, 500, 150, 300, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// VFX5: lightning_ring
{
  const skillName = 'lightning_ring';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX5', 'Sprite-sheet', 'Sprite-sheet.png');
  const versionDir = path.join(skillDir, 'v0');
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 4, 128, 128, 512, 128, 400, 200, 200, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// VFX6: lightning_sparks
{
  const skillName = 'lightning_sparks';
  const skillDir = path.join(BASE_DST_LIGHTNING, skillName);
  const src = path.join(BASE_SRC, 'VFX6', 'Sprite-sheet', 'Sprite-sheet.png');
  const versionDir = path.join(skillDir, 'v0');
  mkdirp(versionDir);
  copyFile(src, path.join(versionDir, `${skillName}_sprite.png`));
  const json = genJson(skillName, 8, 128, 128, 640, 256, 640, 200, 200, 'overlay');
  fs.writeFileSync(path.join(versionDir, `${skillName}_sprite.json`), JSON.stringify(json, null, 2));
  console.log(`Created ${skillName}/v0`);
}

// ============ SLASH PHYSICAL SKILLS ============

function processSlash(srcSkillDir, dstSkillName, frameCount, colorMap, sheetW, sheetH, frameW, frameH, durationMs, drawW, drawH) {
  const skillDir = path.join(BASE_DST_PHYSICAL, dstSkillName);
  for (const { color, version } of colorMap) {
    const srcPng = path.join(srcSkillDir, color, 'sprite-sheet.png');
    if (!fs.existsSync(srcPng)) {
      console.log(`SKIP: ${srcPng} not found`);
      continue;
    }
    const versionDir = path.join(skillDir, version);
    mkdirp(versionDir);
    copyFile(srcPng, path.join(versionDir, `${dstSkillName}_sprite.png`));
    const json = genJson(dstSkillName, frameCount, frameW, frameH, sheetW, sheetH, durationMs, drawW, drawH, 'overlay');
    fs.writeFileSync(path.join(versionDir, `${dstSkillName}_sprite.json`), JSON.stringify(json, null, 2));
    console.log(`Created ${dstSkillName}/${version}`);
  }
}

// Slash 1: slash_arc
processSlash(
  path.join(BASE_SRC, 'Slash 1'), 'slash_arc',
  9, slashColorMap, 640, 256, 128, 128, 540, 200, 200
);

// Slash 2: slash_cross
processSlash(
  path.join(BASE_SRC, 'Slash 2'), 'slash_cross',
  7, slashColorMap, 640, 256, 128, 128, 420, 200, 200
);

// Slash 3: slash_sweep
processSlash(
  path.join(BASE_SRC, 'Slash 3'), 'slash_sweep',
  9, slashColorMap, 640, 256, 128, 128, 540, 200, 200
);

console.log('DONE');
