/**
 * NeonText — DOM-based neon flicker effect.
 *
 * Ported from 2015/objects3D/NeonObject3D.js.
 * Original used Three.js tube geometry + glow planes with additive blending.
 * This version applies the same GSAP state-machine (initial flicker-on →
 * idle glow oscillation + random flick-offs) to CSS text-shadow / opacity.
 */

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { random } from '../hooks/useGsapAnimations'

interface NeonTextProps {
  text: string
  color?: string
  className?: string
  active?: boolean
  /** Delay before the flicker sequence begins (seconds) */
  delay?: number
}

export default function NeonText({
  text,
  color = '#ffffff',
  className = '',
  active = true,
  delay = 0,
}: NeonTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Start invisible
    gsap.set(el, { opacity: 0 })

    let currentFlicker = 0
    const totalFlicker = random(3, 6, true)

    // ── flick on (brief visible flash then off) ──
    function flickOn() {
      if (!el) return
      el.style.opacity = '1'
      el.style.textShadow = `0 0 10px ${color}, 0 0 30px ${color}, 0 0 60px ${color}40`
      gsap.delayedCall(random(0.04, 0.07), () => {
        if (!el) return
        el.style.opacity = '0.05'
        el.style.textShadow = 'none'
      })
    }

    // ── flick off (brief darkness during idle) ──
    function flickOff() {
      if (!el) return
      const prev = el.style.opacity
      el.style.opacity = '0.08'
      el.style.textShadow = 'none'
      gsap.delayedCall(random(0.05, 0.12), () => {
        if (!el) return
        el.style.opacity = prev || '1'
        el.style.textShadow = `0 0 8px ${color}50, 0 0 20px ${color}25`
      })
    }

    // ── Phase 2: idle glow oscillation (yoyo pattern) ──
    const idleGlow = gsap.to(el, {
      opacity: 1,
      textShadow: `0 0 12px ${color}70, 0 0 30px ${color}35, 0 0 50px ${color}18`,
      duration: random(1, 3),
      paused: true,
      onComplete() { idleGlow.reverse() },
      onReverseComplete() { idleGlow.restart() },
    })

    // ── Random flick-off timer ──
    const idleFlick = gsap.to({}, {
      duration: random(2, 8),
      paused: true,
      onComplete() {
        flickOff()
        idleFlick.duration(random(2, 8))
        idleFlick.restart()
      },
    })

    // ── Phase 1: initial flicker-on sequence ──
    const inTween = gsap.to({}, {
      duration: random(0.08, 0.2),
      delay,
      paused: true,
      onComplete() {
        if (currentFlicker++ < totalFlicker) {
          flickOn()
          inTween.duration(random(0.08, 0.3))
          inTween.restart()
        } else {
          // Transition to idle
          gsap.set(el, {
            opacity: 0.7,
            textShadow: `0 0 8px ${color}50, 0 0 20px ${color}25`,
          })
          idleGlow.resume()
          idleFlick.resume()
        }
      },
    })

    tweensRef.current = [inTween, idleGlow, idleFlick]

    return () => {
      tweensRef.current.forEach(t => t.kill())
    }
  }, [color, delay])

  // Start / stop based on active prop
  useEffect(() => {
    if (active && !startedRef.current) {
      startedRef.current = true
      tweensRef.current[0]?.resume()
    } else if (!active && startedRef.current) {
      startedRef.current = false
      tweensRef.current.forEach(t => t.pause())
      if (ref.current) {
        ref.current.style.opacity = '0'
        ref.current.style.textShadow = 'none'
      }
    }
  }, [active])

  return (
    <span ref={ref} className={`neon-text ${className}`}>
      {text}
    </span>
  )
}
