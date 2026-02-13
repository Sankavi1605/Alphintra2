import { useEffect, useRef } from 'react'

/**
 * Flowing perspective wireframe lines — appears on the opposite side of
 * section headings that are aligned left or right.  Inspired by the
 * vaalentin "LET IT MORPH" contour-line effect.
 */

interface WireframeLinesProps {
  /** 'left' = lines render on the LEFT half, 'right' = RIGHT half */
  side: 'left' | 'right'
  /** Whether this section is currently active / visible */
  active: boolean
}

export default function WireframeLines({ side, active }: WireframeLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const opacityRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      // Smooth opacity transition
      const targetOpacity = active ? 1 : 0
      opacityRef.current += (targetOpacity - opacityRef.current) * 0.04
      if (opacityRef.current < 0.005 && !active) {
        ctx.clearRect(0, 0, w, h)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      timeRef.current += 0.003
      const t = timeRef.current
      const globalAlpha = opacityRef.current

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.globalAlpha = globalAlpha

      // Vanishing point — on the text side
      const vpX = side === 'right' ? w * 0.15 : w * 0.85
      const vpY = h * 0.35

      const lineCount = 28
      const layerCount = 3

      for (let layer = 0; layer < layerCount; layer++) {
        const layerOffset = layer * 0.35
        const layerOpacity = [0.12, 0.08, 0.05][layer]

        for (let i = 0; i < lineCount; i++) {
          const progress = i / (lineCount - 1) // 0..1
          // Spread lines vertically from vanishing point
          const angle = -0.6 + progress * 1.2
          const length = 300 + progress * (w * 0.7)

          // Start near vanishing point
          const sx = vpX
          const sy = vpY

          // End point radiates outward
          const baseEx = side === 'right'
            ? vpX + Math.cos(angle + 0.3) * length
            : vpX - Math.cos(angle + 0.3) * length
          const baseEy = vpY + Math.sin(angle) * length * 0.8

          // Animated wave displacement
          const wave1 = Math.sin(t * 2 + progress * 4 + layerOffset) * (15 + progress * 25)
          const wave2 = Math.cos(t * 1.3 + progress * 3 + layerOffset * 2) * (8 + progress * 15)

          const ex = baseEx + wave2 * 0.3
          const ey = baseEy + wave1

          // Control point for bezier — creates the flowing curve
          const cpx = sx + (ex - sx) * (0.4 + Math.sin(t + progress * 2) * 0.1)
          const cpy = sy + (ey - sy) * 0.3 + wave1 * 0.5 + wave2 * 0.3

          // Second control point
          const cp2x = sx + (ex - sx) * (0.7 + Math.cos(t * 0.8 + progress) * 0.05)
          const cp2y = sy + (ey - sy) * 0.65 + wave1 * 0.8

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.bezierCurveTo(cpx, cpy, cp2x, cp2y, ex, ey)

          // Thinner lines farther from center, thicker near edges
          const thickness = 0.4 + progress * 0.8
          ctx.lineWidth = thickness

          // Gradient along the line — bright near VP, fading out
          const lineAlpha = layerOpacity * (0.3 + progress * 0.7) * (1 - Math.abs(progress - 0.5) * 0.4)
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`
          ctx.stroke()
        }
      }

      // Add small scattered dots along some lines
      const dotCount = 12
      for (let d = 0; d < dotCount; d++) {
        const progress = (d + Math.sin(t + d) * 0.3) / dotCount
        const angle = -0.6 + progress * 1.2
        const dist = 150 + progress * w * 0.5
        const wave = Math.sin(t * 2 + progress * 5) * 20

        const dx = side === 'right'
          ? vpX + Math.cos(angle + 0.3) * dist
          : vpX - Math.cos(angle + 0.3) * dist
        const dy = vpY + Math.sin(angle) * dist * 0.8 + wave

        const dotAlpha = 0.15 + Math.sin(t * 3 + d * 1.5) * 0.1
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, dotAlpha)})`
        const dotSize = 1 + Math.sin(t * 2 + d) * 0.5
        ctx.fillRect(dx - dotSize / 2, dy - dotSize / 2, dotSize, dotSize)
      }

      // Add a few accent lines (brighter, thinner)
      for (let a = 0; a < 5; a++) {
        const progress = 0.15 + (a / 5) * 0.7
        const angle = -0.6 + progress * 1.2
        const length = 250 + progress * w * 0.6
        const wave = Math.sin(t * 1.5 + a * 2.5) * (20 + a * 8)

        const ax1 = vpX
        const ay1 = vpY
        const ax2 = side === 'right'
          ? vpX + Math.cos(angle + 0.3) * length
          : vpX - Math.cos(angle + 0.3) * length
        const ay2 = vpY + Math.sin(angle) * length * 0.8 + wave

        const cpax = ax1 + (ax2 - ax1) * 0.5
        const cpay = ay1 + (ay2 - ay1) * 0.4 + wave * 0.6

        ctx.beginPath()
        ctx.moveTo(ax1, ay1)
        ctx.quadraticCurveTo(cpax, cpay, ax2, ay2)
        ctx.lineWidth = 0.3
        ctx.strokeStyle = `rgba(255, 255, 255, 0.18)`
        ctx.stroke()
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [side, active])

  return (
    <canvas
      ref={canvasRef}
      className={`wireframe-lines wireframe-lines--${side}`}
    />
  )
}
