/**
 * Loader — ported from the 2015 site's "LOADING" preloader.
 * 
 * Features:
 * - Glitchy "ALPHINTRA" text animation during load
 * - Animated progress bar with glow
 * - Particle burst on completion
 * - Smooth fade-out reveal
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'

interface LoaderProps {
  onComplete: () => void
  /** Minimum display time in ms (ensures the animation is visible) */
  minDuration?: number
}

export default function Loader({ onComplete, minDuration = 2800 }: LoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const particlesRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())

  // Particle burst on complete
  const triggerBurst = useCallback(() => {
    const canvas = particlesRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)

    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2

    interface Particle {
      x: number; y: number; vx: number; vy: number
      size: number; alpha: number; decay: number
    }

    const particles: Particle[] = []
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 8
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0.96 + Math.random() * 0.03,
      })
    }

    let frame = 0
    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = false
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.alpha *= p.decay
        p.vx *= 0.98
        p.vy *= 0.98
        if (p.alpha > 0.01) {
          alive = true
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        }
      })
      frame++
      if (alive && frame < 120) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [])

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const elapsed = Date.now() - startTime.current
        const target = Math.min(elapsed / minDuration, 1)
        const eased = 1 - Math.pow(1 - target, 3) // ease-out cubic
        const next = Math.min(prev + (eased - prev) * 0.1 + 0.005, eased)
        return Math.min(next, 1)
      })
    }, 30)

    return () => clearInterval(interval)
  }, [minDuration])

  // Glitch text animation
  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const chars = el.querySelectorAll('.loader-char')
    gsap.set(chars, { opacity: 0, y: 30, scale: 0.5, filter: 'blur(10px)' })

    // Stagger entrance
    gsap.to(chars, {
      opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
      duration: 0.8,
      stagger: { each: 0.05, from: 'center' },
      ease: 'expo.out',
      delay: 0.3,
    })

    // Recurring subtle glitch
    const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 1.5, delay: 1.2 })
    glitchTl.to(chars, {
      x: () => (Math.random() - 0.5) * 6,
      skewX: () => (Math.random() - 0.5) * 8,
      duration: 0.04,
      stagger: { each: 0.01, from: 'random' },
    })
    glitchTl.to(chars, {
      x: 0, skewX: 0, duration: 0.15, ease: 'power2.out',
    })

    return () => { glitchTl.kill() }
  }, [])

  // Complete animation
  useEffect(() => {
    if (progress >= 0.99) {
      triggerBurst()

      const tl = gsap.timeline({
        onComplete: () => { onComplete() },
      })

      // Flash + scale out
      tl.to(textRef.current, {
        scale: 1.15, opacity: 0, filter: 'blur(12px)',
        duration: 0.6, ease: 'power2.in',
      })
      tl.to(progressRef.current, {
        opacity: 0, scaleX: 2, duration: 0.4, ease: 'power2.in',
      }, 0)
      tl.to(containerRef.current, {
        opacity: 0, duration: 0.8, ease: 'power2.inOut',
      }, 0.3)
    }
  }, [progress, onComplete, triggerBurst])

  const letters = 'ALPHINTRA'.split('')

  return (
    <div ref={containerRef} className="loader">
      <canvas ref={particlesRef} className="loader__particles" />

      <div className="loader__content">
        <h3 ref={textRef} className="loader__title">
          {letters.map((ch, i) => (
            <span key={i} className="loader-char">{ch}</span>
          ))}
        </h3>

        <div className="loader__bar-track">
          <div
            ref={progressRef}
            className="loader__bar-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

        <div className="loader__percentage">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  )
}
