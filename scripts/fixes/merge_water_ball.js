const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'shared/public/assets/skils_sprites/cold');
const VARIANTS = ['v0', 'v1_crimson', 'v2_emerald', 'v3_azure', 'v4_golden', 'v5_violet', 'v6_frost', 'v7_shadow'];

const FRAME_W = 64;
const FRAME_H = 64;
const COLS = 5;

async function merge(variant) {
  const ballDir = path.join(BASE, 'water_ball', variant);
  const impactDir = path.join(BASE, 'water_ball_impact', variant);

  const ballJson = JSON.parse(fs.readFileSync(path.join(ballDir, 'water_ball_sprite.json'), 'utf8'));
  const impactJson = JSON.parse(fs.readFileSync(path.join(impactDir, 'water_ball_impact_sprite.json'), 'utf8'));

  const ballFrames = ballJson.frames;   // 25
  const impactFrames = impactJson.frames; // 16
  const totalFrames = ballFrames.length + impactFrames.length; // 41
  const rows = Math.ceil(totalFrames / COLS); // 9
  const sheetW = COLS * FRAME_W;  // 320
  const sheetH = rows * FRAME_H;  // 576

  // Read both PNGs
  const ballPng = path.join(ballDir, 'water_ball_sprite.png');
  const impactPng = path.join(impactDir, 'water_ball_impact_sprite.png');

  const ballImg = sharp(ballPng);
  const impactImg = sharp(impactPng);

  // Extract all individual frames
  const composites = [];

  // water_ball frames (0..24) — keep their grid positions, just re-layout
  for (let i = 0; i < ballFrames.length; i++) {
    const src = ballFrames[i].frame;
    const destCol = i % COLS;
    const destRow = Math.floor(i / COLS);

    const frameBuf = await sharp(ballPng)
      .extract({ left: src.x, top: src.y, width: FRAME_W, height: FRAME_H })
      .toBuffer();

    composites.push({
      input: frameBuf,
      left: destCol * FRAME_W,
      top: destRow * FRAME_H,
    });
  }

  // water_ball_impact frames (25..40)
  for (let i = 0; i < impactFrames.length; i++) {
    const globalIdx = ballFrames.length + i;
    const src = impactFrames[i].frame;
    const destCol = globalIdx % COLS;
    const destRow = Math.floor(globalIdx / COLS);

    const frameBuf = await sharp(impactPng)
      .extract({ left: src.x, top: src.y, width: FRAME_W, height: FRAME_H })
      .toBuffer();

    composites.push({
      input: frameBuf,
      left: destCol * FRAME_W,
      top: destRow * FRAME_H,
    });
  }

  // Create output image
  const output = await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  // Build combined JSON
  const allFrames = [];

  for (let i = 0; i < ballFrames.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    allFrames.push({
      filename: `water_ball ${i}`,
      frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H },
      duration: ballFrames[i].duration,
    });
  }

  for (let i = 0; i < impactFrames.length; i++) {
    const globalIdx = ballFrames.length + i;
    const col = globalIdx % COLS;
    const row = Math.floor(globalIdx / COLS);
    allFrames.push({
      filename: `water_ball ${globalIdx}`,
      frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H },
      duration: impactFrames[i].duration,
    });
  }

  const combinedJson = {
    frames: allFrames,
    meta: {
      app: "https://www.aseprite.org/",
      image: "water_ball_sprite.png",
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
      skill: {
        renderType: "projectile",
        renderDurationMs: ballJson.meta.skill.renderDurationMs + impactJson.meta.skill.renderDurationMs,
        drawW: ballJson.meta.skill.drawW,
        drawH: ballJson.meta.skill.drawH,
      },
    },
  };

  // Write output
  await sharp(output).toFile(path.join(ballDir, 'water_ball_sprite.png'));
  fs.writeFileSync(
    path.join(ballDir, 'water_ball_sprite.json'),
    JSON.stringify(combinedJson, null, 2)
  );

  console.log(`  ${variant}: ${totalFrames} frames → ${sheetW}x${sheetH}`);
}

(async () => {
  console.log('Merging water_ball + water_ball_impact...');
  for (const v of VARIANTS) {
    await merge(v);
  }
  console.log('Done!');
})();
