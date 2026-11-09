/**
 * The lactate curve. Pure SVG + CSS, no client JS.
 * Two uniformly scaled variants (wide / narrow) so strokes never distort;
 * CSS shows one at a time. Labels are HTML overlays so text stays crisp and
 * a fixed pixel size on every screen.
 *
 * Motion: stroke-dashoffset draw-in (2.4s, ease-out). prefers-reduced-motion
 * shows it already drawn via CSS; pass `reducedMotion` to force that state.
 */

const MAX = 10; // mmol/L at the top of the chart
const START = 1.2;
const END = 8;
const BAND: [number, number] = [2.0, 3.2];
const K = 3.2; // curvature

const lactate = (t: number) => START + (END - START) * ((Math.exp(K * t) - 1) / (Math.exp(K) - 1));
// Threshold marker sits where the curve leaves the band.
const tThreshold = Math.log(1 + ((BAND[1] - START) / (END - START)) * (Math.exp(K) - 1)) / K;

function Variant({ w, h, className, hidden }: { w: number; h: number; className: string; hidden?: boolean }) {
  const y = (v: number) => h - (v / MAX) * h;
  const pts = Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    return `${(t * w).toFixed(1)} ${y(lactate(t)).toFixed(1)}`;
  });
  const d = `M${pts.join(" L")}`;
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const gutter = "max(24px, calc((100% - 1040px) / 2))";
  const dotX = tThreshold;
  const dotY = 1 - BAND[1] / MAX;

  return (
    <div className={`relative ${className}`} aria-hidden={hidden || undefined} style={{ aspectRatio: `${w} / ${h}` }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" focusable="false">
        {[2, 4, 6, 8].map((v) => (
          <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 6" opacity={0.7} />
        ))}
        <rect x={0} y={y(BAND[1])} width={w} height={y(BAND[0]) - y(BAND[1])} fill="var(--accent-band)" />
        <path d={d} pathLength={1} className="curve-line" fill="none" stroke="var(--text)" strokeWidth={2.5} strokeLinecap="butt" strokeLinejoin="round" />
      </svg>

      <span
        className="absolute text-[13px] leading-none text-text-2"
        style={{ left: gutter, top: pct(1 - BAND[1] / MAX), height: pct((BAND[1] - BAND[0]) / MAX), display: "flex", alignItems: "center" }}
      >
        <span className="font-medium">sub-threshold</span>
        <span className="ml-2 hidden sm:inline">2.0–3.2 mmol/L</span>
      </span>

      <div className="curve-fade">
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: pct(dotX), top: pct(dotY), boxShadow: "0 0 0 5px rgb(47 191 113 / 0.2)" }}
        />
        <span
          className="display absolute -translate-y-full whitespace-nowrap pb-4 pr-4 text-right text-[16px] font-semibold leading-none"
          style={{ right: `calc(100% - ${pct(dotX)})`, top: pct(dotY) }}
        >
          your threshold
        </span>
      </div>

      <span className="absolute right-[max(24px,calc((100%-1040px)/2))] bottom-2 text-[12px] leading-none text-muted">
        effort →
      </span>
    </div>
  );
}

export default function Curve({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <figure
      className={`m-0 w-full overflow-hidden border-y border-line ${reducedMotion ? "curve-static" : ""}`}
      role="img"
      aria-label="A lactate curve rising from about 1.2 to 8 millimoles per litre as effort increases. A shaded band between 2.0 and 3.2 is labelled sub-threshold. A marker where the curve leaves the band is labelled your threshold."
    >
      <Variant w={1000} h={300} className="hidden md:block" hidden />
      <Variant w={420} h={300} className="md:hidden" hidden />
    </figure>
  );
}
