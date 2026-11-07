import { useEffect, useRef } from 'react';

const CREAM = '#F4F2E8';
const STEP_MS = 75;
const SHAPES = [
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [1, 0]]
];

/** Decorative hero animation: blocks drop and stack into a skyline, then the pile clears. */
export function FallingBlocks({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let size = 48;
    let cols = 0;
    let rows = 0;
    let grid = new Set();
    let piece = null;
    let visible = true;
    let fade = 1;

    const key = (x, y) => `${x},${y}`;
    const fits = (cells, x, y) => cells.every(([cx, cy]) => {
      const px = x + cx;
      const py = y + cy;
      return px >= 0 && px < cols && py < rows && !grid.has(key(px, py));
    });
    const spawn = () => {
      const cells = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const span = Math.max(...cells.map(([x]) => x)) + 1;
      piece = { cells, x: Math.floor(Math.random() * Math.max(1, cols - span + 1)), y: -3 };
    };
    const lock = () => piece.cells.forEach(([cx, cy]) => grid.add(key(piece.x + cx, piece.y + cy)));
    const pileTop = () => Math.min(rows, ...[...grid].map(k => Number(k.split(',')[1])));
    const seed = () => {
      grid = new Set();
      const target = rows * 0.65;
      while (pileTop() > target) {
        spawn();
        while (fits(piece.cells, piece.x, piece.y + 1)) piece.y += 1;
        lock();
      }
      spawn();
    };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = CREAM;
      ctx.globalAlpha = fade;
      const originY = height - rows * size;
      const square = (x, y) => ctx.fillRect(x * size + 1, originY + y * size + 1, size - 2, size - 2);
      grid.forEach((k) => { const [x, y] = k.split(',').map(Number); square(x, y); });
      ctx.globalAlpha = 1;
      if (piece && fade === 1) piece.cells.forEach(([cx, cy]) => square(piece.x + cx, piece.y + cy));
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = Math.max(30, Math.min(56, Math.round(width / 22)));
      cols = Math.ceil(width / size);
      rows = Math.ceil(height / size);
      seed();
      draw();
    };
    const step = () => {
      if (!visible || !width) return;
      if (fade < 1) {
        fade -= 0.08;
        if (fade <= 0) { fade = 1; seed(); }
      } else if (fits(piece.cells, piece.x, piece.y + 1)) {
        piece.y += 1;
      } else {
        lock();
        if (pileTop() < rows * 0.3) fade = 0.99;
        spawn();
      }
      draw();
    };

    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    const viewport = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; });
    viewport.observe(canvas);
    const timer = still ? null : setInterval(step, STEP_MS);

    return () => {
      sizeObserver.disconnect();
      viewport.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
