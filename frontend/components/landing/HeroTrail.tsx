import { CheckCircle2 } from 'lucide-react'

// Illustration coordinates live in a 600×260 box; nodes are placed by
// percentage so they stay glued to the SVG trail at any width.
const W = 600
const H = 260
const TRAIL = 'M120 62 C 190 150, 230 168, 300 168 C 380 168, 420 120, 480 72'

const NODES = [
  { x: 120, y: 62, color: '#7EC8F5', label: 'Learn basics', delay: 200, checkAt: 1700 },
  { x: 300, y: 168, color: '#6EDEA0', label: 'Build a project', delay: 650, checkAt: 2300 },
  { x: 480, y: 72, color: '#FFD233', label: 'Ship it 🏆', delay: 1100 },
]

/** Animated mock canvas for the landing hero: the trail draws itself, nodes
 *  pop in and float, steps get ticked off and a marker walks the path. */
export function HeroTrail() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07190f] p-4 shadow-2xl shadow-emerald-950/50 sm:p-6">
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          aspectRatio: `${W} / ${H}`,
          backgroundColor: '#07190f',
          backgroundImage: 'radial-gradient(#1e4535 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        {/* progress pill */}
        <div
          className="tm-fade-up absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur sm:text-xs"
          style={{ '--tm-delay': '1500ms' } as React.CSSProperties}
        >
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10 sm:w-20">
            <span
              className="tm-fill block h-full w-2/3 rounded-full bg-emerald-500"
              style={{ '--tm-delay': '1900ms' } as React.CSSProperties}
            />
          </span>
          2/3 done
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <filter id="tm-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <path d={TRAIL} fill="none" stroke="#1e4535" strokeWidth="2" strokeDasharray="4 6" />
          <path
            d={TRAIL}
            pathLength={1}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="tm-draw"
            style={{ '--tm-delay': '400ms' } as React.CSSProperties}
          />
          <g className="tm-motion-only">
            <circle r="9" fill="#34d399" opacity="0.6" filter="url(#tm-glow)">
              <animateMotion dur="5s" begin="1.8s" repeatCount="indefinite" path={TRAIL} />
            </circle>
            <circle r="4" fill="#d1fae5">
              <animateMotion dur="5s" begin="1.8s" repeatCount="indefinite" path={TRAIL} />
            </circle>
          </g>
        </svg>

        {NODES.map((n, i) => (
          <div
            key={n.label}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
          >
            <div className="tm-pop-in" style={{ '--tm-delay': `${n.delay}ms` } as React.CSSProperties}>
              <div className="tm-float" style={{ '--tm-delay': `${i * 900}ms` } as React.CSSProperties}>
                <div
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[10px] font-bold text-black/80 shadow-lg sm:px-3 sm:py-2 sm:text-xs"
                  style={{ background: n.color }}
                >
                  {n.checkAt !== undefined && (
                    <CheckCircle2
                      size={14}
                      className="tm-pop-in text-emerald-900"
                      style={{ '--tm-delay': `${n.checkAt}ms` } as React.CSSProperties}
                    />
                  )}
                  {n.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
