import { useEffect, useRef } from 'react';

const BLUE = '#0755B5';
const CREAM_ONLY = ['#F4F2E8']; // Module-level so the default stays referentially stable across renders.

/**
 * Slowly shifting grid of squares. `colors` are the lit tones; unlit cells show `background`.
 * Fills its nearest positioned ancestor, so the canvas's bitmap size can't feed back into layout.
 */
export function PixelField({ cell = 34, density = 0.45, colors = CREAM_ONLY, background = BLUE, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let grid = [];
    let cols = 0;
    let rows = 0;
    let visible = true;

    const pick = () => (Math.random() < density ? colors[Math.floor(Math.random() * colors.length)] : null);
    const paint = (i) => {
      const x = (i % cols) * cell;
      const y = Math.floor(i / cols) * cell;
      ctx.fillStyle = background;
      ctx.fillRect(x, y, cell, cell);
      if (grid[i]) {
        ctx.fillStyle = grid[i];
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    };
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      grid = Array.from({ length: cols * rows }, pick);
      grid.forEach((_, i) => paint(i));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const viewport = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; });
    viewport.observe(canvas);

    const timer = still ? null : setInterval(() => {
      if (!visible || !grid.length) return;
      for (let n = 0; n < Math.max(2, grid.length / 120); n += 1) {
        const i = Math.floor(Math.random() * grid.length);
        grid[i] = pick();
        paint(i);
      }
    }, 140);

    return () => {
      observer.disconnect();
      viewport.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [cell, density, colors, background]);

  return <canvas ref={ref} aria-hidden="true" className={`absolute inset-0 block h-full w-full ${className}`} style={{ background }} />;
}
