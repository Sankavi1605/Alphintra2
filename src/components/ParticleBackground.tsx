import { useEffect, useRef, useCallback } from 'react'

/**
 * Full-screen canvas background — ported from 2015/BackgroundParticlesObject3D
 * + BackgroundLinesObject3D + SmokeObject3D
 * 
 * Features:
 * - Floating particles (like BackgroundParticles with 1000 count)
 * - Fog/smoke cloud clusters (like SmokeObject3D)
 * - Falling-star vertical trail lines (like BackgroundLines scrolling)
 * - Glowing node squares at line heads
 * - Water-drop ripple effect on section transitions
 * - Connecting lines between nearby particles (neural network effect)
 */

interface ParticleBackgroundProps {
  currentSection: number
}

// ── Particle types ──────────────────────────────────────────

interface Particle {
  x: number; y: number
  size: number
  opacity: number
  baseOpacity: number
  vx: number; vy: number
  pulse: number
  pulseSpeed: number
  // For connection lines
  connections: number
}

interface FogCloud {
  x: number; y: number
  radius: number
  opacity: number
  vx: number; vy: number
  phase: number
  layer: number
}

interface FallingLine {
  x: number
  headY: number
  tailLength: number
  speed: number
  opacity: number
  nodeSize: number
  active: boolean
  glow: number
}

interface Ripple {
  x: number; y: number
  radius: number
  maxRadius: number
  opacity: number
  lineWidth: number
}

// ── Deterministic random ────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

export default function ParticleBackground({ currentSection }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const prevSection = useRef(currentSection)

  // State refs for animation loop
  const particles = useRef<Particle[]>([])
  const fogClouds = useRef<FogCloud[]>([])
  const fallingLines = useRef<FallingLine[]>([])
  const ripples = useRef<Ripple[]>([])
  const scrollVelocity = useRef(0)
  const dims = useRef({ w: window.innerWidth, h: window.innerHeight })
  const mousePos = useRef({ x: 0, y: 0 })

  // ── Initialize particles ────────────────────────────────
  const initParticles = useCallback(() => {
    const { w, h } = dims.current
    const rand = seededRandom(42)

    // ── Floating particles (2015 BackgroundParticles style) ──
    // Original used count=1000, rangeY spanning all sections
    const pts: Particle[] = []
    const count = Math.max(80, Math.floor((w * h) / 8000))
    for (let i = 0; i < count; i++) {
      const size = 1 + rand() * 4
      pts.push({
        x: rand() * w,
        y: rand() * h,
        size,
        opacity: 0,
        baseOpacity: 0.15 + rand() * 0.55, // Much brighter than before
        vx: (rand() - 0.5) * 0.3,
        vy: (rand() - 0.5) * 0.2,
        pulse: rand() * Math.PI * 2,
        pulseSpeed: 0.008 + rand() * 0.02,
        connections: 0,
      })
    }
    particles.current = pts

    // ── Fog clouds (2015 SmokeObject3D style) ──
    const fc: FogCloud[] = []
    // Layer 0: large dark background smoke
    for (let i = 0; i < 5; i++) {
      fc.push({
        x: rand() * w,
        y: h * 0.15 + rand() * h * 0.7,
        radius: 250 + rand() * 400,
        opacity: 0.08 + rand() * 0.12,
        vx: (rand() - 0.5) * 0.35,
        vy: (rand() - 0.5) * 0.1,
        phase: rand() * Math.PI * 2,
        layer: 0,
      })
    }
    // Layer 1: mid-tone clouds
    for (let i = 0; i < 4; i++) {
      fc.push({
        x: w * 0.2 + rand() * w * 0.6,
        y: h * 0.1 + rand() * h * 0.6,
        radius: 180 + rand() * 300,
        opacity: 0.1 + rand() * 0.14,
        vx: (rand() - 0.5) * 0.3,
        vy: (rand() - 0.5) * 0.08,
        phase: rand() * Math.PI * 2,
        layer: 1,
      })
    }
    // Layer 2: bright front wisps
    for (let i = 0; i < 4; i++) {
      fc.push({
        x: w * 0.1 + rand() * w * 0.8,
        y: h * 0.25 + rand() * h * 0.5,
        radius: 100 + rand() * 200,
        opacity: 0.06 + rand() * 0.1,
        vx: (rand() - 0.5) * 0.5,
        vy: (rand() - 0.5) * 0.15,
        phase: rand() * Math.PI * 2,
        layer: 2,
      })
    }
    fogClouds.current = fc

    // ── Pre-generate falling line slots (2015 BackgroundLines) ──
    const fl: FallingLine[] = []
    for (let i = 0; i < 10; i++) {
      fl.push({
        x: 0.1 * w + rand() * 0.8 * w,
        headY: -100,
        tailLength: 100 + rand() * 250,
        speed: 2 + rand() * 4,
        opacity: 0.2 + rand() * 0.35,
        nodeSize: 3 + rand() * 5,
        active: false,
        glow: 0,
      })
    }
    fallingLines.current = fl
  }, [])

  // ── Trigger falling lines on section change ─────────────
  const triggerFallingLines = useCallback(() => {
    const { w } = dims.current
    const rand = Math.random

    fallingLines.current.forEach((line) => {
      if (!line.active && rand() > 0.2) {
        line.active = true
        line.headY = -50 - rand() * 200
        line.x = 0.05 * w + rand() * 0.9 * w
        line.speed = 2.5 + rand() * 5
        line.opacity = 0.3 + rand() * 0.4
        line.glow = 0.7 + rand() * 0.3
        line.tailLength = 120 + rand() * 300
      }
    })
  }, [])

  // ── Trigger ripple effect ──────────────────────────────
  const triggerRipple = useCallback((sectionDiff: number) => {
    const { w, h } = dims.current
    const count = Math.min(Math.abs(sectionDiff) + 1, 4)
    for (let i = 0; i < count; i++) {
      ripples.current.push({
        x: w * 0.2 + Math.random() * w * 0.6,
        y: h * 0.3 + Math.random() * h * 0.4,
        radius: 0,
        maxRadius: 100 + Math.random() * 180,
        opacity: 0.25 + Math.random() * 0.2,
        lineWidth: 1 + Math.random() * 2,
      })
    }
  }, [])

  // ── Handle section changes ──────────────────────────────
  useEffect(() => {
    const diff = currentSection - prevSection.current
    if (diff !== 0) {
      scrollVelocity.current = diff * 3
      triggerFallingLines()
      triggerRipple(diff)
    }
    prevSection.current = currentSection
  }, [currentSection, triggerFallingLines, triggerRipple])

  // ── Main animation loop ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      dims.current = { w: window.innerWidth, h: window.innerHeight }
      canvas.width = dims.current.w * dpr
      canvas.height = dims.current.h * dpr
      canvas.style.width = `${dims.current.w}px`
      canvas.style.height = `${dims.current.h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles()
    }

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)

    let time = 0

    const draw = () => {
      const { w, h } = dims.current
      time++

      // Clear
      ctx.clearRect(0, 0, w, h)

      // ── 1. Fog/smoke clouds ─────────────────────────
      fogClouds.current.forEach((fog) => {
        fog.x += fog.vx
        fog.y += fog.vy
        fog.phase += 0.003 + fog.layer * 0.001

        // Wrap around
        if (fog.x < -fog.radius * 1.5) fog.x = w + fog.radius
        if (fog.x > w + fog.radius * 1.5) fog.x = -fog.radius
        if (fog.y < -fog.radius) fog.y = h + fog.radius * 0.5
        if (fog.y > h + fog.radius) fog.y = -fog.radius * 0.5

        const breathe = 1 + Math.sin(fog.phase) * 0.3
        const drift = Math.sin(fog.phase * 0.7) * 25
        const currentOpacity = fog.opacity * breathe
        const fx = fog.x + drift

        let c0: string, c1: string, c2: string
        if (fog.layer === 0) {
          c0 = `rgba(45, 48, 56, ${currentOpacity})`
          c1 = `rgba(34, 36, 42, ${currentOpacity * 0.5})`
          c2 = 'rgba(20, 21, 24, 0)'
        } else if (fog.layer === 1) {
          c0 = `rgba(115, 120, 130, ${currentOpacity})`
          c1 = `rgba(82, 88, 98, ${currentOpacity * 0.4})`
          c2 = 'rgba(52, 56, 62, 0)'
        } else {
          c0 = `rgba(176, 180, 192, ${currentOpacity})`
          c1 = `rgba(142, 147, 160, ${currentOpacity * 0.35})`
          c2 = 'rgba(112, 116, 125, 0)'
        }

        const r = fog.radius * breathe
        const gradient = ctx.createRadialGradient(fx, fog.y, 0, fx, fog.y, r)
        gradient.addColorStop(0, c0)
        gradient.addColorStop(0.5, c1)
        gradient.addColorStop(1, c2)

        ctx.fillStyle = gradient
        ctx.fillRect(fx - r, fog.y - r, r * 2, r * 2)
      })

      // ── 2. Floating particles + connection lines ────
      const CONNECTION_DIST = 120
      const mx = mousePos.current.x
      const my = mousePos.current.y

      particles.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed
        p.connections = 0

        // Wrap around
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20

        // Smooth fade-in
        if (p.opacity < p.baseOpacity) {
          p.opacity += 0.005
        }

        // Mouse interaction: subtle attraction
        const dmx = mx - p.x
        const dmy = my - p.y
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy)
        if (distMouse < 200) {
          const force = (200 - distMouse) / 200 * 0.15
          p.vx += dmx * force * 0.001
          p.vy += dmy * force * 0.001
        }

        // Dampen velocity
        p.vx *= 0.998
        p.vy *= 0.998
      })

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.current.length; i++) {
        const a = particles.current[i]
        if (a.connections >= 3) continue
        for (let j = i + 1; j < particles.current.length; j++) {
          const b = particles.current[j]
          if (b.connections >= 3) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const lineAlpha = (1 - dist / CONNECTION_DIST) * 0.15 * Math.min(a.opacity, b.opacity)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
            a.connections++
            b.connections++
          }
        }
      }

      // Draw particles
      particles.current.forEach((p) => {
        const pulse = 0.6 + Math.sin(p.pulse) * 0.4
        const alpha = p.opacity * pulse

        ctx.save()
        ctx.globalAlpha = alpha

        // Square particle (matching 2015 style)
        ctx.fillStyle = '#ffffff'
        const half = p.size / 2
        ctx.fillRect(p.x - half, p.y - half, p.size, p.size)

        // Glow halo on larger particles
        if (p.size > 2.5) {
          const glow = ctx.createRadialGradient(
            p.x, p.y, 0, p.x, p.y, p.size * 4
          )
          glow.addColorStop(0, `rgba(235, 240, 250, ${alpha * 0.4})`)
          glow.addColorStop(0.4, `rgba(220, 225, 235, ${alpha * 0.1})`)
          glow.addColorStop(1, 'rgba(220, 225, 235, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4,
            p.size * 8, p.size * 8)
        }
        ctx.restore()
      })

      // ── 3. Falling star trail lines ──────────────────
      fallingLines.current.forEach((line) => {
        if (!line.active) return

        line.headY += line.speed

        const tailY = line.headY - line.tailLength

        const lineGrad = ctx.createLinearGradient(0, tailY, 0, line.headY)
        lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        lineGrad.addColorStop(0.6, `rgba(220, 225, 235, ${line.opacity * 0.4})`)
        lineGrad.addColorStop(1, `rgba(255, 255, 255, ${line.opacity})`)

        ctx.beginPath()
        ctx.moveTo(line.x, Math.max(tailY, 0))
        ctx.lineTo(line.x, line.headY)
        ctx.strokeStyle = lineGrad
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Glowing node at head
        if (line.glow > 0.01) {
          ctx.save()
          ctx.globalAlpha = line.glow
          ctx.fillStyle = '#ffffff'
          const ns = line.nodeSize
          ctx.fillRect(line.x - ns / 2, line.headY - ns / 2, ns, ns)

          // Glow halo
          const haloGrad = ctx.createRadialGradient(
            line.x, line.headY, 0,
            line.x, line.headY, ns * 8
          )
          haloGrad.addColorStop(0, `rgba(255, 255, 255, ${line.glow * 0.6})`)
          haloGrad.addColorStop(0.2, `rgba(215, 220, 230, ${line.glow * 0.2})`)
          haloGrad.addColorStop(1, 'rgba(215, 220, 230, 0)')
          ctx.fillStyle = haloGrad
          ctx.fillRect(line.x - ns * 8, line.headY - ns * 8, ns * 16, ns * 16)
          ctx.restore()

          line.glow *= 0.993
        }

        // Deactivate when off-screen
        if (tailY > h + 50) {
          line.active = false
        }
      })

      // ── 4. Ripple rings ──────────────────────────────
      ripples.current = ripples.current.filter((r) => {
        r.radius += 1.5
        r.opacity *= 0.982

        if (r.opacity < 0.005 || r.radius > r.maxRadius) return false

        // Draw concentric rings
        for (let ring = 0; ring < 3; ring++) {
          const ringRadius = r.radius - ring * 15
          if (ringRadius <= 0) continue

          ctx.beginPath()
          ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(220, 224, 232, ${r.opacity * (1 - ring * 0.3)})`
          ctx.lineWidth = r.lineWidth * (1 - ring * 0.2)
          ctx.stroke()
        }

        // Center glow
        if (r.radius < 30) {
          const centerGlow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 20)
          centerGlow.addColorStop(0, `rgba(255, 255, 255, ${r.opacity * 0.5})`)
          centerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = centerGlow
          ctx.fillRect(r.x - 20, r.y - 20, 40, 40)
        }

        return true
      })

      // ── 5. Parallax drift based on scroll velocity ───
      const vel = scrollVelocity.current
      if (Math.abs(vel) > 0.01) {
        particles.current.forEach((p) => {
          p.y += vel * p.size * 0.5
        })
        fogClouds.current.forEach((fog) => {
          fog.y += vel * 3
        })
        scrollVelocity.current *= 0.92
      }

      // ── Continue loop ────────────────────────────────
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [initParticles])

  return (
    <canvas
      ref={canvasRef}
      className="particle-background"
    />
  )
}
