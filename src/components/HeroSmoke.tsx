import { useEffect, useRef } from 'react'

/**
 * Hero section volumetric smoke/cloud effect
 * Ported from 2015 SmokeObject3D using monochrome tones.
 *
 * Uses Canvas 2D with animated radial gradients that drift, breathe,
 * and rotate — creating a dynamic, organic smoke feel.
 */

interface SmokeCloud {
    x: number
    y: number
    radius: number
    baseRadius: number
    opacity: number
    baseOpacity: number
    rotation: number
    rotSpeed: number
    vx: number
    vy: number
    phase: number
    phaseSpeed: number
    color: string  // rgba base
    stretch: number // horizontal stretch factor
}

function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 16807 + 0) % 2147483647
        return s / 2147483647
    }
}

interface HeroSmokeProps {
    active?: boolean
}

export default function HeroSmoke({ active = true }: HeroSmokeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animRef = useRef(0)
    const clouds = useRef<SmokeCloud[]>([])
    const dims = useRef({ w: 0, h: 0 })
    const fadeIn = useRef(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')!

        const initClouds = () => {
            const { w, h } = dims.current
            const rand = seededRandom(77)
            const cl: SmokeCloud[] = []

            // Back layer: large dark gray clouds
            for (let i = 0; i < 6; i++) {
                const cx = w * 0.1 + rand() * w * 0.8
                const cy = h * 0.2 + rand() * h * 0.6
                cl.push({
                    x: cx, y: cy,
                    radius: 150 + rand() * 350,
                    baseRadius: 150 + rand() * 350,
                    opacity: 0,
                    baseOpacity: 0.026 + rand() * 0.024,
                    rotation: rand() * Math.PI * 2,
                    rotSpeed: (rand() - 0.5) * 0.002,
                    vx: (rand() - 0.5) * 0.4,
                    vy: (rand() - 0.5) * 0.15,
                    phase: rand() * Math.PI * 2,
                    phaseSpeed: 0.003 + rand() * 0.005,
                    color: `${52 + Math.floor(rand() * 30)}, ${58 + Math.floor(rand() * 32)}, ${66 + Math.floor(rand() * 35)}`,
                    stretch: 1.2 + rand() * 0.6,
                })
            }

            // Mid layer: medium neutral smoke
            for (let i = 0; i < 5; i++) {
                const cx = w * 0.15 + rand() * w * 0.7
                const cy = h * 0.25 + rand() * h * 0.5
                cl.push({
                    x: cx, y: cy,
                    radius: 120 + rand() * 280,
                    baseRadius: 120 + rand() * 280,
                    opacity: 0,
                    baseOpacity: 0.02 + rand() * 0.02,
                    rotation: rand() * Math.PI * 2,
                    rotSpeed: (rand() - 0.5) * 0.003,
                    vx: (rand() - 0.5) * 0.3,
                    vy: (rand() - 0.5) * 0.12,
                    phase: rand() * Math.PI * 2,
                    phaseSpeed: 0.004 + rand() * 0.006,
                    color: `${90 + Math.floor(rand() * 28)}, ${99 + Math.floor(rand() * 28)}, ${112 + Math.floor(rand() * 28)}`,
                    stretch: 1.1 + rand() * 0.5,
                })
            }

            // Front layer: light gray wisps
            for (let i = 0; i < 5; i++) {
                const cx = w * 0.2 + rand() * w * 0.6
                const cy = h * 0.3 + rand() * h * 0.4
                cl.push({
                    x: cx, y: cy,
                    radius: 80 + rand() * 200,
                    baseRadius: 80 + rand() * 200,
                    opacity: 0,
                    baseOpacity: 0.016 + rand() * 0.02,
                    rotation: rand() * Math.PI * 2,
                    rotSpeed: (rand() - 0.5) * 0.004,
                    vx: (rand() - 0.5) * 0.5,
                    vy: (rand() - 0.5) * 0.2,
                    phase: rand() * Math.PI * 2,
                    phaseSpeed: 0.005 + rand() * 0.008,
                    color: `${128 + Math.floor(rand() * 24)}, ${136 + Math.floor(rand() * 24)}, ${148 + Math.floor(rand() * 24)}`,
                    stretch: 1.0 + rand() * 0.4,
                })
            }

            // Accent wisps: near-white highlights
            for (let i = 0; i < 3; i++) {
                const cx = w * 0.25 + rand() * w * 0.5
                const cy = h * 0.35 + rand() * h * 0.3
                cl.push({
                    x: cx, y: cy,
                    radius: 60 + rand() * 120,
                    baseRadius: 60 + rand() * 120,
                    opacity: 0,
                    baseOpacity: 0.008 + rand() * 0.012,
                    rotation: rand() * Math.PI * 2,
                    rotSpeed: (rand() - 0.5) * 0.005,
                    vx: (rand() - 0.5) * 0.6,
                    vy: (rand() - 0.5) * 0.25,
                    phase: rand() * Math.PI * 2,
                    phaseSpeed: 0.006 + rand() * 0.01,
                    color: `${188 + Math.floor(rand() * 24)}, ${195 + Math.floor(rand() * 20)}, ${206 + Math.floor(rand() * 18)}`,
                    stretch: 0.8 + rand() * 0.6,
                })
            }

            clouds.current = cl
        }

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            dims.current = { w: canvas.parentElement?.clientWidth || window.innerWidth, h: canvas.parentElement?.clientHeight || window.innerHeight }
            canvas.width = dims.current.w * dpr
            canvas.height = dims.current.h * dpr
            canvas.style.width = `${dims.current.w}px`
            canvas.style.height = `${dims.current.h}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            initClouds()
        }

        resize()
        window.addEventListener('resize', resize)

        const draw = () => {
            const { w, h } = dims.current

            // Fade in/out
            if (active && fadeIn.current < 1) {
                fadeIn.current = Math.min(1, fadeIn.current + 0.008)
            } else if (!active && fadeIn.current > 0) {
                fadeIn.current = Math.max(0, fadeIn.current - 0.015)
            }

            ctx.clearRect(0, 0, w, h)

            const globalFade = fadeIn.current * 0.62

            clouds.current.forEach((cloud) => {
                cloud.x += cloud.vx
                cloud.y += cloud.vy
                cloud.rotation += cloud.rotSpeed
                cloud.phase += cloud.phaseSpeed

                // Wrap
                if (cloud.x < -cloud.radius * 2) cloud.x = w + cloud.radius
                if (cloud.x > w + cloud.radius * 2) cloud.x = -cloud.radius
                if (cloud.y < -cloud.radius) cloud.y = h + cloud.radius * 0.5
                if (cloud.y > h + cloud.radius) cloud.y = -cloud.radius * 0.5

                // Breathing radius
                const breathe = 1 + Math.sin(cloud.phase) * 0.2
                cloud.radius = cloud.baseRadius * breathe

                // Fade in individual clouds smoothly
                if (cloud.opacity < cloud.baseOpacity) {
                    cloud.opacity += cloud.baseOpacity * 0.005
                }

                const alpha = cloud.opacity * globalFade
                if (alpha < 0.001) return

                const r = cloud.radius

                ctx.save()
                ctx.translate(cloud.x, cloud.y)
                ctx.rotate(cloud.rotation)
                ctx.scale(cloud.stretch, 1)

                // Main radial gradient
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
                grad.addColorStop(0, `rgba(${cloud.color}, ${alpha})`)
                grad.addColorStop(0.4, `rgba(${cloud.color}, ${alpha * 0.6})`)
                grad.addColorStop(0.7, `rgba(${cloud.color}, ${alpha * 0.25})`)
                grad.addColorStop(1, `rgba(${cloud.color}, 0)`)

                ctx.fillStyle = grad
                ctx.fillRect(-r, -r, r * 2, r * 2)

                ctx.restore()
            })

            animRef.current = requestAnimationFrame(draw)
        }

        animRef.current = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(animRef.current)
            window.removeEventListener('resize', resize)
        }
    }, [active])

    return (
        <canvas
            ref={canvasRef}
            className="hero-smoke"
        />
    )
}
