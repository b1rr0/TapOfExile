import { useRef, useEffect, useCallback, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FrameRect { x: number; y: number; w: number; h: number }

interface CharAnim {
  img: HTMLImageElement;
  frames: FrameRect[];
  fps: number;
  loop: boolean;
}

interface CharState {
  anims: Map<string, CharAnim>;
  current: string;
  frameIndex: number;
  elapsed: number;
  defaultSize: { w: number; h: number };
  anchorOffsetY: number;
  scale: number;
  flipX: boolean;
  xRatio: number;
  groundLine: number;
  yOffset: number;
  onComplete: (() => void) | null;
}

interface SkillMeta {
  renderType: 'projectile' | 'spawn_at_enemy' | 'spawn_at_hero' | 'fullscreen';
  renderDurationMs: number;
  drawW: number;
  drawH: number;
}

interface SkillSprite {
  frames: FrameRect[];
  img: HTMLImageElement;
  fps: number;
  meta: SkillMeta;
}

interface ActiveEffect {
  sprite: SkillSprite;
  renderType: string;
  startX: number; startY: number;
  endX: number;   endY: number;
  elapsed: number;
  duration: number;
  frameIndex: number;
  frameElapsed: number;
  playOnce: boolean;
  dmgColor: string;
  impactFired: boolean;
}

interface FloatingText {
  text: string;
  color: string;
  x: number;
  y: number;
  elapsed: number;
  duration: number;
  isCrit: boolean;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const HERO_CFG = {
  basePath: '/assets/characters/samurai/samurai_2',
  animations: {
    idle:    { json: 'idle.json',      fps: 8,  loop: true },
    attack1: { json: 'attack_1.json',  fps: 14, loop: false },
  },
  defaultSize: { w: 400, h: 400 },
  anchorOffsetY: 0.39,
  scale: 1.16,
};

const ENEMY_CFG = {
  basePath: '/assets/enemy/striker/v7_shadow',
  animations: {
    idle:    { json: 'idle.json',      fps: 8,  loop: true },
  },
  defaultSize: { w: 128, h: 96 },
  anchorOffsetY: 0,
  scale: 2.5,
};

const SKILL_LIST: { key: string; label: string; json: string; slowdown?: number; dmgColor: string }[] = [
  { key: 'ice_shard',    label: 'Ice Shard',    json: '/assets/skils_sprites/cold/ice_shard/v0/ice_shard_sprite.json',               dmgColor: '#5eaaff' },
  { key: 'water_blast',  label: 'Water Blast',  json: '/assets/skils_sprites/cold/water_blast_full/v0/water_blast_full_sprite.json',  dmgColor: '#5eaaff' },
  { key: 'thunder_ball', label: 'Thunder Ball', json: '/assets/skils_sprites/lightning/thunder_ball/v0/thunder_ball_sprite.json',      dmgColor: '#ffd700' },
  { key: 'slash_arc',    label: 'Slash Arc',    json: '/assets/skils_sprites/physical/slash_arc/v2/slash_arc_sprite.json',            dmgColor: '#b0b0b0' },
  { key: 'slash_cross',  label: 'Slash Cross',  json: '/assets/skils_sprites/physical/slash_cross/v1/slash_cross_sprite.json',        dmgColor: '#b0b0b0' },
  { key: 'slash_sweep',  label: 'Slash Sweep',  json: '/assets/skils_sprites/physical/slash_sweep/v3/slash_sweep_sprite.json',        dmgColor: '#ffd700' },
];

const ATTACK_DMG_COLOR = '#ffffff';
const CRIT_COLOR = '#ff3333';
const CRIT_CHANCE = 0.4;
const FLOAT_DURATION = 1.0;

const BG_PATH = '/assets/background/fields/field_empty.png';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${src}`));
    img.src = src;
  });
}

async function loadCharAnims(
  basePath: string,
  anims: Record<string, { json: string; fps: number; loop: boolean }>,
): Promise<Map<string, CharAnim>> {
  const map = new Map<string, CharAnim>();
  await Promise.all(
    Object.entries(anims).map(async ([name, cfg]) => {
      const resp = await fetch(`${basePath}/${cfg.json}`);
      const atlas = await resp.json();
      const rawFrames = Array.isArray(atlas.frames) ? atlas.frames : Object.values(atlas.frames);
      const frames = (rawFrames as any[]).map((f: any) => f.frame as FrameRect);
      const pngFile = atlas.meta?.image;
      const img = await loadImage(`${basePath}/${pngFile}`);
      const fps = cfg.fps || (((rawFrames as any[])[0]?.duration)
        ? Math.round(1000 / (rawFrames as any[])[0].duration) : 10);
      map.set(name, { img, frames, fps, loop: cfg.loop });
    }),
  );
  return map;
}

async function loadSkillSprite(jsonPath: string): Promise<SkillSprite> {
  const resp = await fetch(jsonPath);
  const data = await resp.json();
  const rawFrames = Array.isArray(data.frames) ? data.frames : Object.values(data.frames);
  const frames = (rawFrames as any[]).map((f: any) => (f.frame ?? f) as FrameRect);
  const fps = (rawFrames as any[])[0]?.duration
    ? Math.round(1000 / (rawFrames as any[])[0].duration) : 12;
  const imgPath = jsonPath.replace(/[^/]+$/, '') + (data.meta?.image || '');
  const img = await loadImage(imgPath);
  const s = data.meta?.skill ?? {};
  const meta: SkillMeta = {
    renderType: s.renderType || 'projectile',
    renderDurationMs: s.renderDurationMs || 800,
    drawW: s.drawW || 100,
    drawH: s.drawH || 100,
  };
  return { frames, img, fps, meta };
}

/* ------------------------------------------------------------------ */
/*  Character helpers                                                  */
/* ------------------------------------------------------------------ */

function makeCharState(
  anims: Map<string, CharAnim>,
  cfg: typeof HERO_CFG | typeof ENEMY_CFG,
  xRatio: number,
  flipX: boolean,
  yOffset: number = 0,
): CharState {
  return {
    anims,
    current: 'idle',
    frameIndex: 0,
    elapsed: 0,
    defaultSize: cfg.defaultSize,
    anchorOffsetY: cfg.anchorOffsetY,
    scale: cfg.scale,
    flipX,
    xRatio,
    groundLine: 0.90,
    yOffset,
    onComplete: null,
  };
}

function charPlay(ch: CharState, name: string, onComplete?: () => void) {
  const anim = ch.anims.get(name);
  if (!anim) return;
  if (ch.current === name && anim.loop) return;
  ch.current = name;
  ch.frameIndex = 0;
  ch.elapsed = 0;
  ch.onComplete = onComplete ?? null;
}

function charUpdate(ch: CharState, dt: number) {
  const anim = ch.anims.get(ch.current);
  if (!anim) return;
  ch.elapsed += dt;
  const dur = 1 / anim.fps;
  if (ch.elapsed >= dur) {
    ch.elapsed -= dur;
    if (ch.elapsed > dur) ch.elapsed = 0;
    ch.frameIndex++;
    if (ch.frameIndex >= anim.frames.length) {
      if (anim.loop) {
        ch.frameIndex = 0;
      } else {
        ch.frameIndex = anim.frames.length - 1;
        const cb = ch.onComplete;
        ch.onComplete = null;
        if (cb) cb();
      }
    }
  }
}

function charDraw(
  ctx: CanvasRenderingContext2D,
  ch: CharState,
  canvasW: number,
  canvasH: number,
  dpr: number,
) {
  const anim = ch.anims.get(ch.current);
  if (!anim) return;
  const frame = anim.frames[ch.frameIndex];
  if (!frame) return;

  const baseW = ch.defaultSize.w * dpr * 1.092 * ch.scale;
  const baseH = ch.defaultSize.h * dpr * 1.092 * ch.scale;

  const idleAnim = ch.anims.get('idle');
  const idleFrame = idleAnim ? idleAnim.frames[0] : frame;
  const ratioW = frame.w / idleFrame.w;
  const ratioH = frame.h / idleFrame.h;
  const w = baseW * ratioW;
  const h = baseH * ratioH;

  let x = canvasW * ch.xRatio;
  x -= w / 2;
  const y = canvasH * ch.groundLine - h + h * ch.anchorOffsetY + 10 * dpr + ch.yOffset * dpr;

  ctx.imageSmoothingEnabled = false;
  if (ch.flipX) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(anim.img, frame.x, frame.y, frame.w, frame.h, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(anim.img, frame.x, frame.y, frame.w, frame.h, x, y, w, h);
  }
}

/* ------------------------------------------------------------------ */
/*  Effect helpers                                                     */
/* ------------------------------------------------------------------ */

function launchEffect(
  sprite: SkillSprite,
  heroX: number, heroY: number,
  enemyX: number, enemyY: number,
  slowdown: number = 1,
  dmgColor: string = '#ffffff',
): ActiveEffect {
  return {
    sprite: slowdown > 1
      ? { ...sprite, fps: sprite.fps / slowdown }
      : sprite,
    renderType: sprite.meta.renderType,
    startX: heroX, startY: heroY,
    endX: enemyX,  endY: enemyY,
    elapsed: 0,
    duration: (sprite.meta.renderDurationMs / 1000) * slowdown,
    frameIndex: 0,
    frameElapsed: 0,
    playOnce: sprite.meta.renderType !== 'projectile',
    dmgColor,
    impactFired: false,
  };
}

function advanceEffects(effects: ActiveEffect[], dt: number): void {
  for (const e of effects) {
    e.elapsed += dt;
    e.frameElapsed += dt;
    const interval = 1 / e.sprite.fps;
    if (e.frameElapsed >= interval) {
      e.frameElapsed -= interval;
      if (e.playOnce) {
        if (e.frameIndex < e.sprite.frames.length - 1) e.frameIndex++;
      } else {
        e.frameIndex = (e.frameIndex + 1) % e.sprite.frames.length;
      }
    }
  }
}

function isEffectDone(e: ActiveEffect): boolean {
  if (e.playOnce) {
    const onLast = e.frameIndex >= e.sprite.frames.length - 1;
    return (onLast && e.elapsed >= e.duration) || e.elapsed >= e.duration * 2;
  }
  return e.elapsed >= e.duration;
}

function pruneEffects(effects: ActiveEffect[]): ActiveEffect[] {
  return effects.filter(e => !isEffectDone(e));
}

function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
  dpr: number,
  canvasW: number,
  canvasH: number,
) {
  ctx.imageSmoothingEnabled = false;
  for (const e of effects) {
    const frame = e.sprite.frames[e.frameIndex];
    if (!frame) continue;
    let x: number, y: number, w: number, h: number;

    switch (e.renderType) {
      case 'projectile': {
        const t = Math.min(e.elapsed / e.duration, 1);
        x = e.startX + (e.endX - e.startX) * t;
        y = e.startY + (e.endY - e.startY) * t;
        w = e.sprite.meta.drawW * dpr;
        h = e.sprite.meta.drawH * dpr;
        break;
      }
      case 'spawn_at_enemy': {
        x = e.endX; y = e.endY;
        w = e.sprite.meta.drawW * dpr;
        h = e.sprite.meta.drawH * dpr;
        break;
      }
      case 'spawn_at_hero': {
        x = e.startX; y = e.startY;
        w = e.sprite.meta.drawW * dpr;
        h = e.sprite.meta.drawH * dpr;
        break;
      }
      case 'fullscreen': {
        x = canvasW / 2; y = canvasH / 2;
        const aspect = frame.w / frame.h;
        const cAspect = canvasW / canvasH;
        if (aspect > cAspect) { h = canvasH; w = h * aspect; }
        else { w = canvasW; h = w / aspect; }
        break;
      }
      default: {
        x = e.endX; y = e.endY;
        w = e.sprite.meta.drawW * dpr;
        h = e.sprite.meta.drawH * dpr;
      }
    }

    ctx.drawImage(
      e.sprite.img,
      frame.x, frame.y, frame.w, frame.h,
      x! - w! / 2, y! - h! / 2, w!, h!,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Floating damage text                                               */
/* ------------------------------------------------------------------ */

function spawnDmgText(
  floats: FloatingText[],
  x: number, y: number,
  dmgColor: string,
  dpr: number,
) {
  const isCrit = Math.random() < CRIT_CHANCE;
  const text = isCrit ? 'CRIT!' : 'Damage';
  const color = isCrit ? CRIT_COLOR : dmgColor;
  const offsetX = (Math.random() - 0.5) * 60 * dpr;
  floats.push({ text, color, x: x + offsetX, y, elapsed: 0, duration: FLOAT_DURATION, isCrit });
}

function updateFloats(floats: FloatingText[], dt: number): FloatingText[] {
  for (const f of floats) {
    f.elapsed += dt;
    f.y -= 60 * dt; // float upward
  }
  return floats.filter(f => f.elapsed < f.duration);
}

function drawFloats(ctx: CanvasRenderingContext2D, floats: FloatingText[], dpr: number) {
  for (const f of floats) {
    const t = f.elapsed / f.duration;
    const alpha = 1 - t;
    const size = f.isCrit ? 18 * dpr : 14 * dpr;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3 * dpr;
    ctx.lineJoin = 'round';
    ctx.strokeText(f.text, f.x, f.y);

    // fill
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type ActionHandler = (action: 'attack' | string) => void;

const CPS_WINDOW = 10_000; // 10 seconds

export default function BattleMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handlerRef = useRef<ActionHandler | null>(null);
  const clickTimesRef = useRef<number[]>([]);
  const [ready, setReady] = useState(false);
  const [cps, setCps] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let destroyed = false;
    let rafId = 0;

    (async () => {
      /* ---------- load assets ---------- */
      const [bgImg, heroAnims, enemyAnims, ...skillSprites] = await Promise.all([
        loadImage(BG_PATH),
        loadCharAnims(HERO_CFG.basePath, HERO_CFG.animations),
        loadCharAnims(ENEMY_CFG.basePath, ENEMY_CFG.animations),
        ...SKILL_LIST.map(s => loadSkillSprite(s.json)),
      ]);

      if (destroyed) return;

      const skills = new Map<string, SkillSprite>();
      SKILL_LIST.forEach((s, i) => skills.set(s.key, skillSprites[i]));

      /* ---------- init characters ---------- */
      const hero  = makeCharState(heroAnims,  HERO_CFG,  0.18, false);
      const enemy = makeCharState(enemyAnims, ENEMY_CFG, 0.82, true, 50);
      charPlay(hero,  'idle');
      charPlay(enemy, 'idle');

      /* ---------- animation state ---------- */
      let effects: ActiveEffect[] = [];
      let floats: FloatingText[] = [];

      /* ---------- sizing ---------- */
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        const rect = container!.getBoundingClientRect();
        canvas!.width  = rect.width  * dpr;
        canvas!.height = rect.height * dpr;
        canvas!.style.width  = rect.width  + 'px';
        canvas!.style.height = rect.height + 'px';
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);

      /* ---------- action handler (exposed to buttons) ---------- */
      handlerRef.current = (action: string) => {
        const cw = canvas!.width;
        const ch = canvas!.height;
        const heroX  = cw * 0.18 + 20 * dpr;
        const heroY  = ch * 0.78;
        const enemyX = cw * 0.82 - 20 * dpr;
        const enemyY = ch * 0.78 + 50 * dpr - 60 * dpr;

        if (action === 'attack') {
          charPlay(hero, 'attack1', () => {
            charPlay(hero, 'idle');
            spawnDmgText(floats, enemyX, enemyY - 40 * dpr, ATTACK_DMG_COLOR, dpr);
          });
          return;
        }

        // find skill
        const skillCfg = SKILL_LIST.find(s => s.key === action);
        if (!skillCfg) return;
        const sprite = skills.get(skillCfg.key);
        if (!sprite) return;
        const slow = skillCfg.slowdown ?? 1;
        effects.push(launchEffect(sprite, heroX, heroY, enemyX, enemyY, slow, skillCfg.dmgColor));
      };
      setReady(true);

      /* ---------- draw ---------- */
      function draw() {
        const ctx = canvas!.getContext('2d')!;
        const cw = canvas!.width;
        const ch = canvas!.height;

        ctx.clearRect(0, 0, cw, ch);
        ctx.imageSmoothingEnabled = false;

        // background — cover-fit
        const bgAspect = bgImg.width / bgImg.height;
        const cAspect  = cw / ch;
        let bw: number, bh: number, bx: number, by: number;
        if (bgAspect > cAspect) {
          bh = ch; bw = bh * bgAspect;
        } else {
          bw = cw; bh = bw / bgAspect;
        }
        bx = (cw - bw) / 2;
        by = (ch - bh) / 2;
        ctx.drawImage(bgImg, bx, by, bw, bh);

        // characters
        charDraw(ctx, hero,  cw, ch, dpr);
        charDraw(ctx, enemy, cw, ch, dpr);

        // effects on top of everything
        drawEffects(ctx, effects, dpr, cw, ch);

        // floating damage text
        drawFloats(ctx, floats, dpr);
      }

      /* ---------- main loop ---------- */
      let lastTs = performance.now();

      function tick(now: number) {
        if (destroyed) return;
        const dt = Math.min((now - lastTs) / 1000, 0.2);
        lastTs = now;

        const cw = canvas!.width;
        const ch = canvas!.height;
        const enemyX = cw * 0.82 - 20 * dpr;
        const enemyY = ch * 0.78 + 50 * dpr - 60 * dpr;

        charUpdate(hero,  dt);
        charUpdate(enemy, dt);

        // 1) advance elapsed / frames
        advanceEffects(effects, dt);

        // 2) check for impacts on effects that just finished
        for (const e of effects) {
          if (e.impactFired) continue;
          if (isEffectDone(e)) {
            e.impactFired = true;
            spawnDmgText(floats, enemyX, enemyY - 40 * dpr, e.dmgColor, dpr);
          }
        }

        // 3) remove finished effects
        effects = pruneEffects(effects);
        floats = updateFloats(floats, dt);

        draw();
        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);

      /* ---------- cleanup ---------- */
      return () => {
        destroyed = true;
        cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleAction = useCallback((action: string) => {
    handlerRef.current?.(action);
    const now = performance.now();
    const times = clickTimesRef.current;
    times.push(now);
    // prune older than window
    const cutoff = now - CPS_WINDOW;
    while (times.length > 0 && times[0] < cutoff) times.shift();
    setCps(+(times.length / (CPS_WINDOW / 1000)).toFixed(1));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0.3rem 0.5rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary, #a0a8c0)',
          fontFamily: 'monospace',
        }}
      >
        {cps > 0 && <span>CPS: <span style={{ color: 'var(--text-primary, #F9CF87)' }}>{cps}</span></span>}
      </div>
      <div
        ref={containerRef}
        className="battle-mockup"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'var(--radius-md, 12px) var(--radius-md, 12px) 0 0',
          overflow: 'hidden',
          border: '2px solid var(--border-color, #1e2a45)',
          borderBottom: 'none',
          background: '#0a0e1a',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
      <div
        className="battle-mockup-controls"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          padding: '0.6rem',
          background: 'var(--bg-card, #151a2e)',
          border: '2px solid var(--border-color, #1e2a45)',
          borderTop: '1px solid var(--border-color, #1e2a45)',
          borderRadius: '0 0 var(--radius-md, 12px) var(--radius-md, 12px)',
          justifyContent: 'center',
        }}
      >
        <button
          disabled={!ready}
          onClick={() => handleAction('attack')}
          style={{
            padding: '0.4rem 0.9rem',
            background: 'var(--accent-primary, #A40239)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm, 6px)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: ready ? 'pointer' : 'default',
            opacity: ready ? 1 : 0.5,
            borderBottom: '3px solid var(--accent-primary-dark, #832154)',
          }}
        >
          Attack
        </button>
        {SKILL_LIST.map(s => (
          <button
            key={s.key}
            disabled={!ready}
            onClick={() => handleAction(s.key)}
            style={{
              padding: '0.4rem 0.9rem',
              background: 'var(--bg-surface, #1a2035)',
              color: 'var(--text-primary, #F9CF87)',
              border: '1px solid var(--border-color, #1e2a45)',
              borderRadius: 'var(--radius-sm, 6px)',
              fontWeight: 500,
              fontSize: '0.8rem',
              cursor: ready ? 'pointer' : 'default',
              opacity: ready ? 1 : 0.5,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
