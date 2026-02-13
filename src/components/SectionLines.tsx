import { useEffect, useRef, useMemo, useCallback, useState } from 'react'

/**
 * Decorative flowing SVG lines connecting sections —
 * like the diagonal web lines on vaalentin.github.io/2015/.
 * Drawn in a fixed SVG overlay. Lines shift as the user
 * scrolls between sections.
 */

interface SectionLinesProps {
  sectionCount: number
  currentSection: number
}

// Deterministic pseudo-random
function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

interface LineData {
  // Percentages: x 0–100, y in section units (0 = top of section 0)
  x1: number; y1: number
  x2: number; y2: number
  cx: number // bezier control offset %
  accent: boolean
}

interface DotData {
  x: number; y: number; r: number
}

function generateLines(n: number): LineData[] {
  const rand = makeRand(42)
  const out: LineData[] = []

  for (let i = 0; i < n - 1; i++) {
    // Primary connecting line
    out.push({
      x1: 15 + rand() * 70, y1: i + 0.2 + rand() * 0.5,
      x2: 15 + rand() * 70, y2: i + 0.9 + rand() * 0.4,
      cx: (rand() - 0.5) * 35, accent: false,
    })
    // Secondary accent line (sometimes)
    if (rand() > 0.35) {
      out.push({
        x1: 8 + rand() * 84, y1: i + rand() * 0.5,
        x2: 8 + rand() * 84, y2: i + 0.7 + rand() * 0.8,
        cx: (rand() - 0.5) * 50, accent: true,
      })
    }
  }

  // Long sweeping lines spanning 2–3 sections
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const start = Math.floor(rand() * (n - 2))
    const span = 2 + Math.floor(rand() * 2)
    out.push({
      x1: 5 + rand() * 90, y1: start + rand() * 0.3,
      x2: 5 + rand() * 90, y2: start + span + rand() * 0.3,
      cx: (rand() - 0.5) * 55, accent: rand() > 0.5,
    })
  }

  return out
}

function generateDots(n: number): DotData[] {
  const rand = makeRand(77)
  const out: DotData[] = []
  for (let i = 0; i < n; i++) {
    const count = 2 + Math.floor(rand() * 3)
    for (let j = 0; j < count; j++) {
      out.push({ x: 8 + rand() * 84, y: i + rand(), r: 1.5 + rand() * 2 })
    }
  }
  return out
}

export default function SectionLines({ sectionCount, currentSection }: SectionLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight })

  const lines = useMemo(() => generateLines(sectionCount), [sectionCount])
  const dots  = useMemo(() => generateDots(sectionCount), [sectionCount])

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { w, h } = dims

  // The "camera" offset: which section-unit is at the center of the viewport
  // currentSection is 0-based index. We offset so section 0 = center.
  const camY = currentSection // section units at center

  // Convert section-unit Y to viewport px (0 = top, h = bottom)
  const toY = useCallback(
    (sectionY: number) => {
      // Map: camY maps to h/2. Each section = 1 viewport height.
      return (sectionY - camY) * h + h / 2
    },
    [camY, h]
  )

  const toX = useCallback((pct: number) => (pct / 100) * w, [w])

  return (
    <svg
      ref={svgRef}
      className="section-lines"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {lines.map((l, i) => {
        const x1 = toX(l.x1)
        const y1 = toY(l.y1)
        const x2 = toX(l.x2)
        const y2 = toY(l.y2)
        const mx = (x1 + x2) / 2 + (l.cx / 100) * w
        const my = (y1 + y2) / 2

        // Only render if any part is within ~1 viewport of view
        const minY = Math.min(y1, y2, my)
        const maxY = Math.max(y1, y2, my)
        if (maxY < -h || minY > h * 2) return null

        return (
          <path
            key={`l${i}`}
            d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
            className={l.accent ? 'section-line--accent' : undefined}
          />
        )
      })}

      {dots.map((d, i) => {
        const cx = toX(d.x)
        const cy = toY(d.y)
        if (cy < -100 || cy > h + 100) return null
        return <circle key={`d${i}`} cx={cx} cy={cy} r={d.r} />
      })}
    </svg>
  )
}
