import { useMemo } from 'react';

const CREAM = '#F4F2E8';
const TILE_W = 64;
const TILE_H = 37;

function cubePoints(x, y, s) {
  const h = s * 0.577;
  return {
    h,
    top: `${x},${y - 2 * h} ${x + s},${y - h} ${x},${y} ${x - s},${y - h}`,
    left: `${x - s},${y - h} ${x},${y} ${x},${y + 2 * h} ${x - s},${y + h}`,
    right: `${x + s},${y - h} ${x},${y} ${x},${y + 2 * h} ${x + s},${y + h}`
  };
}

function Cube({ x, y, s, icon: Icon, hue }) {
  const { h, top, left, right } = cubePoints(x, y, s);
  const k = 0.6;
  return (
    <g stroke={hue} strokeWidth="1" strokeLinejoin="round">
      <polygon points={left} fill={CREAM} />
      <polygon points={right} fill={CREAM} />
      <polygon points={top} fill={CREAM} />
      {Icon && (
        <g transform={`matrix(${(k * s) / 24} ${(-k * h) / 24} 0 ${(k * 2 * h) / 24} ${x + 0.2 * s} ${y + 0.2 * h})`}>
          <Icon width={24} height={24} color={hue} strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}

/** Coloured diamond floor with isometric cubes; `cubes` are {x, y, s, icon} in a 400x240 frame. */
export function IsoTile({ hue, cubes, seed = 1, className = '' }) {
  const tiles = useMemo(() => {
    let state = seed * 9301 + 49297;
    const next = () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
    const list = [];
    for (let row = -1; row < 15; row += 1) {
      for (let col = -1; col < 8; col += 1) {
        const x = col * TILE_W + (row % 2 ? TILE_W / 2 : 0);
        const y = row * (TILE_H / 2);
        const tone = next();
        list.push({
          points: `${x},${y - TILE_H / 2} ${x + TILE_W / 2},${y} ${x},${y + TILE_H / 2} ${x - TILE_W / 2},${y}`,
          fill: tone > 0.5 ? '#FFFFFF' : '#000000',
          opacity: Math.abs(tone - 0.5) * 0.3
        });
      }
    }
    return list;
  }, [seed]);

  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} aria-hidden="true">
      <rect width="400" height="240" fill={hue} />
      {tiles.map((tile, i) => <polygon key={i} points={tile.points} fill={tile.fill} opacity={tile.opacity} />)}
      <polyline
        points={cubes.map(c => `${c.x},${c.y}`).join(' ')}
        fill="none"
        stroke={CREAM}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {cubes.map((cube, i) => <Cube key={i} {...cube} hue={hue} />)}
    </svg>
  );
}
