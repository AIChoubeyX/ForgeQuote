const BLUE = '#0755B5';
const CREAM = '#F4F2E8';
const GHOST = 'rgba(244, 242, 232, 0.65)';

const W = 245;
const H = 142;
const DEPTH = 62;
const LEVEL = 56;
const BASE_Y = 346;
const DX = 17;
const DY = 10;

const TOP_FACE = `M${-DX} ${-H + DY}Q0 ${-H} ${DX} ${-H + DY}L${W - DX} ${-DY}Q${W} 0 ${W - DX} ${DY}L${DX} ${H - DY}Q0 ${H} ${-DX} ${H - DY}L${-W + DX} ${DY}Q${-W} 0 ${-W + DX} ${-DY}Z`;
const EDGE = W - DX / 2; // Where the rounded top corner actually reaches, so the side meets it cleanly.
const SIDE_FACE = `M${-EDGE} 0V${DEPTH}Q${-EDGE} ${DEPTH + DY / 2} ${-W + DX} ${DEPTH + DY}L${-DX} ${H + DEPTH - DY}Q0 ${H + DEPTH} ${DX} ${H + DEPTH - DY}L${W - DX} ${DEPTH + DY}Q${EDGE} ${DEPTH + DY / 2} ${EDGE} ${DEPTH}V0Z`;
const SPINE = `M0 ${H}V${H + DEPTH}`;

const Lines = ({ x, y, width, count, gap = 4 }) => Array.from({ length: count }, (_, i) => (
  <path key={i} d={`M${x} ${y + i * gap}H${x + width}`} />
));

/* Plate artwork, drawn flat in a 100x100 space and projected onto the plate's top face. */
const ART = [
  // RFQ intake: a part drawing whose fields are lifted into structured rows.
  () => (
    <>
      <rect x="10" y="14" width="42" height="62" rx="2" />
      <circle cx="31" cy="34" r="11" />
      <circle cx="31" cy="34" r="4" />
      <path d="M31 18V50M15 34H47" strokeDasharray="1.5 1.5" />
      <Lines x={16} y={56} width={30} count={4} />
      <path d="M52 34H60V24H64M52 46H64M52 58H60V68H64" />
      <rect x="64" y="18" width="26" height="12" rx="1.5" />
      <rect x="64" y="40" width="26" height="12" rx="1.5" />
      <rect x="64" y="62" width="26" height="12" rx="1.5" />
      <Lines x={68} y={24} width={16} count={1} />
      <Lines x={68} y={46} width={18} count={1} />
      <Lines x={68} y={68} width={12} count={1} />
    </>
  ),
  // Cost estimation: rate table, cost build-up bars, and a resolved total.
  () => (
    <>
      <rect x="10" y="12" width="46" height="40" rx="2" />
      <path d="M10 22H56M10 32H56M10 42H56M28 12V52" />
      <rect x="62" y="12" width="28" height="40" rx="2" />
      <path d="M68 46V38M74 46V30M80 46V22" strokeWidth="3" />
      <rect x="10" y="60" width="80" height="26" rx="2" />
      <path d="M18 73H26M22 69V77M36 69H44M36 77H44" />
      <Lines x={56} y={70} width={26} count={2} gap={6} />
    </>
  ),
  // Plant review: machines along a route, with a sign-off at the end.
  () => (
    <>
      <rect x="10" y="12" width="24" height="24" rx="2" />
      <circle cx="22" cy="24" r="7" />
      <path d="M22 17V31M15 24H29" />
      <path d="M34 24H56" strokeDasharray="1.5 1.5" />
      <rect x="56" y="12" width="32" height="24" rx="2" />
      <path d="M62 30V20L68 26L74 20V30M78 30V18" />
      <path d="M72 36V50H28V60" strokeDasharray="1.5 1.5" />
      <rect x="14" y="60" width="28" height="26" rx="2" />
      <path d="M20 68H36M20 74H36M20 80H30" />
      <path d="M42 73H58" strokeDasharray="1.5 1.5" />
      <circle cx="72" cy="73" r="14" />
      <path d="M65 73L70 79L80 67" />
    </>
  ),
  // Sales approval: the issued quotation, stamped and signed.
  () => (
    <>
      <rect x="14" y="8" width="52" height="82" rx="2" />
      <path d="M14 22H66" />
      <Lines x={20} y={15} width={18} count={1} />
      <Lines x={20} y={30} width={40} count={5} gap={5} />
      <path d="M20 80C26 70 30 86 36 76C40 70 42 82 50 76" />
      <circle cx="72" cy="58" r="17" fill={CREAM} />
      <circle cx="72" cy="58" r="13" />
      <path d="M65 58L70 64L80 52" />
    </>
  )
];

/** A stack of isometric plates. Plates up to `active` are placed; earlier ones become outlines. */
export function IsoStack({ active = 0, className = '' }) {
  return (
    <svg viewBox="0 0 520 560" className={className} fill="none" aria-hidden="true">
      {ART.map((Art, i) => {
        const placed = i <= active;
        const solid = i === active;
        const stroke = solid ? BLUE : GHOST;
        // Outlined plates keep an opaque cobalt fill so they hide the plate beneath them.
        const fill = solid ? CREAM : BLUE;
        return (
          <g key={i} transform="translate(260 0)">
            <g
              style={{
                transform: `translateY(${BASE_Y - i * LEVEL - (placed ? 0 : 150)}px)`,
                opacity: placed ? 1 : 0,
                transition: 'transform .8s cubic-bezier(.22,1,.36,1), opacity .35s linear'
              }}
            >
              <path d={SIDE_FACE} fill={fill} stroke={stroke} strokeWidth="1.25" style={{ transition: 'fill .3s' }} />
              <path d={SPINE} stroke={stroke} strokeWidth="1.25" />
              <path d={TOP_FACE} fill={fill} stroke={stroke} strokeWidth="1.25" style={{ transition: 'fill .3s' }} />
              <g
                className="iso-art"
                transform={`matrix(${W / 100} ${H / 100} ${-W / 100} ${H / 100} 0 ${-H})`}
                stroke={BLUE}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: solid ? 1 : 0, transition: 'opacity .3s' }}
              >
                <Art />
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
