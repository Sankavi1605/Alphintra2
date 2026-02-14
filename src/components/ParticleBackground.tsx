import { useEffect, useRef, useCallback } from 'react'

interface ParticleBackgroundProps {
  currentSection: number
}

type ParticleShape = 'dot' | 'square'

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  baseOpacity: number
  vx: number
  vy: number
  pulse: number
  pulseSpeed: number
  shape: ParticleShape
}

interface FogCloud {
  x: number
  y: number
  radius: number
  opacity: number
  vx: number
  vy: number
  phase: number
}

interface IntroNode {
  baseX: number
  size: number
  sway: number
  phase: number
  color: string
  yRatios: [number, number, number, number]
  anchorRatios: [number, number, number, number]
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function smoothstep01(v: number) {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sampleStage(stage: number, values: [number, number, number, number]) {
  if (stage <= 0) return values[0]
  if (stage >= 3) return values[3]
  const seg = Math.floor(stage)
  const t = smoothstep01(stage - seg)
  if (seg === 0) return lerp(values[0], values[1], t)
  if (seg === 1) return lerp(values[1], values[2], t)
  return lerp(values[2], values[3], t)
}

export default function ParticleBackground({ currentSection }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const currentSectionRef = useRef(currentSection)

  const particles = useRef<Particle[]>([])
  const fogClouds = useRef<FogCloud[]>([])
  const introNodes = useRef<IntroNode[]>([])
  const introStage = useRef(0)
  const sceneTime = useRef(0)
  const dims = useRef({ w: window.innerWidth, h: window.innerHeight })
  const mousePos = useRef({ x: 0, y: 0 })

  const initParticles = useCallback(() => {
    const { w, h } = dims.current
    const rand = seededRandom(42)
    const introRand = seededRandom(777)

    const pts: Particle[] = []
    const count = Math.max(120, Math.floor((w * h) / 7000))

    for (let i = 0; i < count; i++) {
      const size = 0.9 + rand() * 3.1
      pts.push({
        x: rand() * w,
        y: rand() * h,
        size,
        opacity: 0,
        baseOpacity: 0.12 + rand() * 0.56,
        vx: (rand() - 0.5) * 0.25,
        vy: (rand() - 0.5) * 0.18,
        pulse: rand() * Math.PI * 2,
        pulseSpeed: 0.008 + rand() * 0.018,
        shape: rand() > 0.62 ? 'square' : 'dot',
      })
    }
    particles.current = pts

    const fc: FogCloud[] = []
    for (let i = 0; i < 6; i++) {
      fc.push({
        x: rand() * w,
        y: h * 0.12 + rand() * h * 0.76,
        radius: 180 + rand() * 320,
        opacity: 0.018 + rand() * 0.03,
        vx: (rand() - 0.5) * 0.28,
        vy: (rand() - 0.5) * 0.08,
        phase: rand() * Math.PI * 2,
      })
    }
    fogClouds.current = fc

    const spread = Math.min(220, w * 0.18)
    const centerX = w * 0.5
    introNodes.current = [
      {
        baseX: centerX - spread,
        size: 6.2,
        sway: 4.1,
        phase: introRand() * Math.PI * 2,
        color: '#c7ccd6',
        yRatios: [0.81, 0.24, 0.27, 0.1],
        anchorRatios: [0.75, 0.02, 0.015, -0.06],
      },
      {
        baseX: centerX + (introRand() - 0.5) * 8,
        size: 8.4,
        sway: 2.5,
        phase: introRand() * Math.PI * 2,
        color: '#ffffff',
        yRatios: [0.81, 0.59, 0.66, 0.09],
        anchorRatios: [0.74, 0.02, 0.015, -0.06],
      },
      {
        baseX: centerX + spread,
        size: 6.2,
        sway: 4.2,
        phase: introRand() * Math.PI * 2,
        color: '#b3b8c3',
        yRatios: [0.82, 0.28, 0.31, 0.11],
        anchorRatios: [0.76, 0.02, 0.015, -0.06],
      },
    ]
  }, [])

  useEffect(() => {
    currentSectionRef.current = currentSection
  }, [currentSection])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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

    const draw = () => {
      const { w, h } = dims.current
      const mx = mousePos.current.x
      const my = mousePos.current.y
      sceneTime.current += 1

      ctx.clearRect(0, 0, w, h)

      fogClouds.current.forEach((fog) => {
        fog.x += fog.vx
        fog.y += fog.vy
        fog.phase += 0.0024

        if (fog.x < -fog.radius * 1.5) fog.x = w + fog.radius
        if (fog.x > w + fog.radius * 1.5) fog.x = -fog.radius
        if (fog.y < -fog.radius) fog.y = h + fog.radius * 0.5
        if (fog.y > h + fog.radius) fog.y = -fog.radius * 0.5

        const breathe = 1 + Math.sin(fog.phase) * 0.25
        const drift = Math.sin(fog.phase * 0.65) * 18
        const currentOpacity = fog.opacity * breathe
        const fx = fog.x + drift
        const r = fog.radius * breathe

        const gradient = ctx.createRadialGradient(fx, fog.y, 0, fx, fog.y, r)
        gradient.addColorStop(0, `rgba(140, 147, 160, ${currentOpacity})`)
        gradient.addColorStop(0.58, `rgba(82, 88, 98, ${currentOpacity * 0.36})`)
        gradient.addColorStop(1, 'rgba(50, 54, 60, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(fx - r, fog.y - r, r * 2, r * 2)
      })

      const targetStage = Math.max(0, Math.min(3.3, currentSectionRef.current))
      introStage.current += (targetStage - introStage.current) * 0.09
      const stage = introStage.current

      const introFadeIn = smoothstep01((stage + 0.2) / 0.5)
      const introFadeOut = smoothstep01((stage - 3.02) / 0.34)
      const introAlpha = introFadeIn * (1 - introFadeOut)
      const lineAlphaStrength =
        smoothstep01((stage - 0.42) / 0.44) * (1 - smoothstep01((stage - 2.96) / 0.24))

      let ringX = w * 0.5
      let ringY = h * 0.66

      if (introAlpha > 0.004) {
        introNodes.current.forEach((node, i) => {
          const driftX = Math.sin(sceneTime.current * 0.014 + node.phase) * node.sway
          const drawX = node.baseX + driftX
          const drawY = sampleStage(stage, node.yRatios) * h
          const anchorY = sampleStage(stage, node.anchorRatios) * h
          const topY = Math.min(drawY - 6, anchorY)
          const headAlpha = introAlpha * (i === 1 ? 0.98 : 0.82)
          const lineAlpha = headAlpha * lineAlphaStrength

          if (lineAlpha > 0.003) {
            const lineGrad = ctx.createLinearGradient(drawX, topY, drawX, drawY)
            lineGrad.addColorStop(0, 'rgba(255,255,255,0)')
            lineGrad.addColorStop(0.7, `rgba(235,240,248,${lineAlpha * 0.42})`)
            lineGrad.addColorStop(1, `rgba(255,255,255,${lineAlpha * 0.9})`)

            ctx.beginPath()
            ctx.moveTo(drawX, topY)
            ctx.lineTo(drawX, drawY)
            ctx.strokeStyle = lineGrad
            ctx.lineWidth = i === 1 ? 1.2 : 0.95
            ctx.stroke()
          }

          const size = i === 1 ? node.size * 1.06 : node.size
          ctx.save()
          ctx.globalAlpha = headAlpha
          ctx.fillStyle = node.color
          ctx.fillRect(drawX - size * 0.5, drawY - size * 0.5, size, size)

          const glow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, size * 8)
          glow.addColorStop(0, `rgba(255,255,255,${headAlpha * 0.48})`)
          glow.addColorStop(0.26, `rgba(220,225,235,${headAlpha * 0.24})`)
          glow.addColorStop(1, 'rgba(220,225,235,0)')
          ctx.fillStyle = glow
          ctx.fillRect(drawX - size * 8, drawY - size * 8, size * 16, size * 16)
          ctx.restore()

          if (i === 1) {
            ringX = drawX
            ringY = drawY + size * 1.25
          }
        })
      }

      const ringIn = smoothstep01((stage - 1.48) / 0.36)
      const ringOut = smoothstep01((stage - 2.64) / 0.34)
      const ringAlpha = ringIn * (1 - ringOut) * 0.78
      if (ringAlpha > 0.003) {
        const pulse = (sceneTime.current * 0.018) % 1
        const ringCount = 7
        for (let i = 0; i < ringCount; i++) {
          const t = i / (ringCount - 1)
          const r = 34 + i * 32 + pulse * 18
          const a = ringAlpha * (1 - t) * (0.9 - pulse * 0.25)
          if (a <= 0.002) continue

          const flatY = Math.max(7, r * 0.24)
          ctx.beginPath()
          ctx.ellipse(ringX, ringY + 2, r, flatY, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(220,225,235,${a})`
          ctx.lineWidth = 2.2 - t * 1.25
          ctx.stroke()
        }
      }

      particles.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed

        if (p.x < -24) p.x = w + 24
        if (p.x > w + 24) p.x = -24
        if (p.y < -24) p.y = h + 24
        if (p.y > h + 24) p.y = -24

        if (p.opacity < p.baseOpacity) p.opacity += 0.005

        const dmx = mx - p.x
        const dmy = my - p.y
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy)
        if (distMouse < 180) {
          const force = (180 - distMouse) / 180
          p.vx += dmx * force * 0.0009
          p.vy += dmy * force * 0.0009
        }

        p.vx *= 0.9975
        p.vy *= 0.9975

        const pulse = 0.68 + Math.sin(p.pulse) * 0.32
        const alpha = p.opacity * pulse
        if (alpha <= 0.006) return

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#ffffff'

        if (p.shape === 'square') {
          const half = p.size * 0.5
          ctx.fillRect(p.x - half, p.y - half, p.size, p.size)
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }

        if (p.size > 2.2) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
          glow.addColorStop(0, `rgba(235, 240, 250, ${alpha * 0.42})`)
          glow.addColorStop(0.45, `rgba(220, 225, 235, ${alpha * 0.14})`)
          glow.addColorStop(1, 'rgba(220, 225, 235, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(
            p.x - p.size * 4,
            p.y - p.size * 4,
            p.size * 8,
            p.size * 8
          )
        }
        ctx.restore()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [initParticles])

  return <canvas ref={canvasRef} className="particle-background" />
}
