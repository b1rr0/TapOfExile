const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'shared/public/assets/skils_sprites/cold/water_ball');
const VARIANTS = ['v0', 'v1_crimson', 'v2_emerald', 'v3_azure', 'v4_golden', 'v5_violet', 'v6_frost', 'v7_shadow'];

const FRAME_W = 64;
const FRAME_H = 64;
const COLS = 5;
const SKIP_INDEX = 24; // empty frame between the two animations

async function fix(variant) {
  const dir = path.join(BASE, variant);
  const jsonPath = path.join(dir, 'water_ball_sprite.json');
  const pngPath = path.join(dir, 'water_ball_sprite.png');

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const oldFrames = data.frames; // 41

  // Remove the empty frame
  const keptFrames = oldFrames.filter((_, i) => i !== SKIP_INDEX);
  const totalFrames = keptFrames.length; // 40
  const rows = Math.ceil(totalFrames / COLS); // 8
  const sheetW = COLS * FRAME_W;  // 320
  const sheetH = rows * FRAME_H;  // 512

  // Extract each kept frame from old PNG and place in new grid
  const composites = [];
  for (let i = 0; i < keptFrames.length; i++) {
    const src = keptFrames[i].frame;
    const destCol = i % COLS;
    const destRow = Math.floor(i / COLS);

    const frameBuf = await sharp(pngPath)
      .extract({ left: src.x, top: src.y, width: FRAME_W, height: FRAME_H })
      .toBuffer();

    composites.push({
      input: frameBuf,
      left: destCol * FRAME_W,
      top: destRow * FRAME_H,
    });
  }

  // Build new PNG
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

  // Build new JSON
  const newFrames = keptFrames.map((f, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      ...f,
      filename: `water_ball ${i}`,
      frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
    };
  });

  data.frames = newFrames;
  data.meta.size = { w: sheetW, h: sheetH };

  await sharp(output).toFile(pngPath);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

  console.log(`  ${variant}: ${totalFrames} frames → ${sheetW}x${sheetH} (removed frame ${SKIP_INDEX})`);
}

(async () => {
  console.log('Fixing water_ball — removing empty frame...');
  for (const v of VARIANTS) {
    await fix(v);
  }
  console.log('Done!');
})();
