import { Link } from 'react-router-dom';

const MARK_CELLS = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2]];

export function Logo({ light = false }) {
  return (
    <Link
      className={`flex items-center gap-2 font-display text-lg font-normal transition-opacity hover:opacity-80 ${light ? 'text-paper' : 'text-ink'}`}
      to="/"
      aria-label="ForgeQuote home"
    >
      <svg width="16" height="16" viewBox="0 0 23 23" fill="currentColor" aria-hidden="true">
        {MARK_CELLS.map(([x, y]) => <rect key={`${x}-${y}`} x={x * 8} y={y * 8} width="7" height="7" />)}
      </svg>
      <span>Forge<span className="font-light">Quote</span></span>
    </Link>
  );
}
