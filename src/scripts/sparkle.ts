// Port of SparkleBurst from FunStyle.swift: a ring expanding from the center
// and sparkle stars flying outward, drawn once.

const DURATION = 850;
const COUNT = 18;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, turn: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4 + turn;
    const r = k % 2 === 0 ? size : size * 0.32;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Bursts sparkles centered on `anchor`, in `tint` (any CSS color). */
export function sparkle(anchor: Element, tint: string, scale = 1) {
  if (reduceMotion()) return;
  const rect = anchor.getBoundingClientRect();
  const box = 200 * scale;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = box * dpr;
  canvas.height = box * dpr;
  Object.assign(canvas.style, {
    position: 'fixed',
    left: `${rect.left + rect.width / 2 - box / 2}px`,
    top: `${rect.top + rect.height / 2 - box / 2}px`,
    width: `${box}px`,
    height: `${box}px`,
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr * scale, dpr * scale);

  // Follow the anchor if the page scrolls during the burst.
  const startY = window.scrollY;
  const start = performance.now();

  const frame = (now: number) => {
    const progress = Math.min((now - start) / DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    canvas.style.transform = `translateY(${startY - window.scrollY}px)`;
    ctx.clearRect(0, 0, 200, 200);
    const c = 100;

    ctx.globalAlpha = 0.8 * (1 - progress);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 3 * (1 - progress) + 0.5;
    ctx.beginPath();
    ctx.arc(c, c, 22 + 46 * eased, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1 - progress * progress;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + (i % 3) * 0.2;
      const distance = (30 + (i % 4) * 14) * eased;
      const size = (i % 2 === 0 ? 9 : 6) * (1 - progress * 0.6);
      ctx.fillStyle = i % 3 === 0 ? '#fff' : tint;
      star(ctx, c + Math.cos(angle) * distance, c + Math.sin(angle) * distance, size, progress * 2);
    }

    if (progress < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

export function tintColor(el: Element): string {
  return getComputedStyle(el).getPropertyValue('--tint').trim() || '#ffc247';
}
