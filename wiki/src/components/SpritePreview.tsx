import { useRef, useEffect } from 'react';

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
}
interface Atlas {
  frames: AtlasFrame[];
  meta: { image: string; size: { w: number; h: number } };
}

interface Props {
  basePath: string;
  /** Display size in CSS pixels */
  size?: number;
  className?: string;
}

/**
 * Renders the first idle frame of an Aseprite sprite-sheet on a <canvas>.
 * Loads {basePath}/idle.json → reads frame rect → draws from the PNG.
 */
export default function SpritePreview({ basePath, size = 128, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    (async () => {
      try {
        const res = await fetch(`${basePath}/idle.json`);
        if (!res.ok) return;
        const atlas: Atlas = await res.json();
        if (cancelled) return;

        const frame = atlas.frames[0].frame;
        const imgName = atlas.meta.image; // "idle.png" or "Idle.png"
        const img = new Image();
        img.src = `${basePath}/${imgName}`;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
        });
        if (cancelled) return;

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        // Scale the frame to fit inside the canvas, centered at bottom
        const scale = Math.min(
          (canvas.width * 0.9) / frame.w,
          (canvas.height * 0.9) / frame.h,
        );
        const dw = frame.w * scale;
        const dh = frame.h * scale;
        const dx = (canvas.width - dw) / 2;
        const dy = canvas.height - dh - canvas.height * 0.05;

        ctx.drawImage(
          img,
          frame.x, frame.y, frame.w, frame.h,
          dx, dy, dw, dh,
        );
      } catch {
        // silently fail — fallback icon will show
      }
    })();

    return () => { cancelled = true; };
  }, [basePath, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        imageRendering: 'pixelated',
        width: size,
        height: size,
      }}
    />
  );
}
