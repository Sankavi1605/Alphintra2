/**
 * GSAP animation utilities ported from 2015 WebGL experiment.
 *
 * Original patterns:
 *  - yoyoUtil.js  → useYoyoTween()
 *  - loopUtil.js  → useLoopTween()
 *  - randomUtil.js → random()
 *  - Paused-tween + resume/pause control
 *  - Dynamic-duration self-restart (neon flicker, glitch)
 *
 * Modernised for GSAP 3.x + React hooks.
 */

import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

// ── random helper (same as 2015 randomUtil.js) ──────────────
export function random(low: number, high: number, round = false): number {
  const v = Math.random() * (high - low) + low
  return round ? Math.floor(v) : v
}

// ── map helper (same as 2015 mapUtil.js) ────────────────────
export function mapRange(
  value: number,
  [inMin, inMax]: [number, number],
  [outMin, outMax]: [number, number]
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

// ── useYoyoTween ────────────────────────────────────────────
/**
 * Creates a GSAP tween that yoyos via onComplete / onReverseComplete
 * callbacks — the exact pattern from the 2015 codebase.
 */
export function useYoyoTween(
  target: gsap.TweenTarget,
  duration: number,
  vars: gsap.TweenVars,
  autoStart = false
) {
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const tween = gsap.to(target, {
      ...vars,
      duration,
      paused: !autoStart,
      onComplete() {
        tween.reverse()
      },
      onReverseComplete() {
        tween.restart()
      },
    })
    tweenRef.current = tween
    return () => { tween.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => tweenRef.current?.resume(), [])
  const stop = useCallback(() => tweenRef.current?.pause(), [])

  return { tweenRef, start, stop }
}

// ── useLoopTween ────────────────────────────────────────────
/**
 * Creates a GSAP tween that restarts on complete — the loop
 * pattern from the 2015 codebase.
 */
export function useLoopTween(
  target: gsap.TweenTarget,
  duration: number,
  vars: gsap.TweenVars,
  autoStart = false
) {
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const tween = gsap.to(target, {
      ...vars,
      duration,
      paused: !autoStart,
      onComplete() {
        tween.restart()
      },
    })
    tweenRef.current = tween
    return () => { tween.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => tweenRef.current?.resume(), [])
  const stop = useCallback(() => tweenRef.current?.pause(), [])

  return { tweenRef, start, stop }
}

// ── useNeonFlicker ──────────────────────────────────────────
/**
 * Replicates the 2015 NeonObject3D flicker state-machine:
 *   Phase 1 — rapid on/off flickers (inTween)
 *   Phase 2 — idle glow oscillation + random flick-offs
 *
 * Works on DOM elements via CSS opacity / text-shadow / box-shadow.
 */
export function useNeonFlicker(
  elementRef: React.RefObject<HTMLElement | null>,
  options: {
    color?: string
    flickerCount?: [number, number]   // min/max initial flickers
    flickerSpeed?: [number, number]   // duration range for each flicker
    idleGlowRange?: [number, number]  // opacity oscillation range
    idleDuration?: [number, number]   // glow cycle duration range
    flickOffInterval?: [number, number] // seconds between random flick-offs
    autoStart?: boolean
  } = {}
) {
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const activeRef = useRef(false)

  const {
    color = '#ffffff',
    flickerCount = [3, 6],
    flickerSpeed = [0.05, 0.15],
    idleGlowRange = [0.6, 1],
    idleDuration = [0.8, 3],
    flickOffInterval = [2, 8],
    autoStart = false,
  } = options

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    let currentFlicker = 0
    const totalFlicker = random(flickerCount[0], flickerCount[1], true)

    // ── flickOn: brief visible flash then off ──
    function flickOn() {
      if (!el) return
      el.style.opacity = '1'
      el.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`
      gsap.delayedCall(random(0.04, 0.07), () => {
        if (!el) return
        el.style.opacity = '0.05'
        el.style.textShadow = 'none'
      })
    }

    // ── flickOff: brief off blink during idle ──
    function flickOff() {
      if (!el) return
      const prevOpacity = el.style.opacity
      el.style.opacity = '0.05'
      el.style.textShadow = 'none'
      gsap.delayedCall(random(0.05, 0.1), () => {
        if (!el) return
        el.style.opacity = prevOpacity || '1'
        el.style.textShadow = `0 0 8px ${color}60`
      })
    }

    // ── Phase 2: idle glow yoyo + random flick-off ──
    const idleIntensity = gsap.to(el, {
      opacity: idleGlowRange[1],
      duration: random(idleDuration[0], idleDuration[1]),
      paused: true,
      onComplete() { idleIntensity.reverse() },
      onReverseComplete() { idleIntensity.restart() },
    })
    gsap.set(el, { opacity: idleGlowRange[0] })

    const idleFlick = gsap.to({}, {
      duration: random(flickOffInterval[0], flickOffInterval[1]),
      paused: true,
      onComplete() {
        flickOff()
        idleFlick.duration(random(flickOffInterval[0], flickOffInterval[1]))
        idleFlick.restart()
      },
    })

    // ── Phase 1: initial flicker-on sequence ──
    const inTween = gsap.to({}, {
      duration: random(flickerSpeed[0], flickerSpeed[1]),
      paused: true,
      onComplete() {
        if (currentFlicker++ < totalFlicker) {
          flickOn()
          inTween.duration(random(flickerSpeed[0], flickerSpeed[1]))
          inTween.restart()
        } else {
          // transition to idle
          el.style.opacity = String(idleGlowRange[0])
          el.style.textShadow = `0 0 8px ${color}60`
          idleIntensity.resume()
          idleFlick.resume()
        }
      },
    })

    tweensRef.current = [inTween, idleIntensity, idleFlick]

    if (autoStart) {
      activeRef.current = true
      inTween.resume()
    }

    return () => {
      tweensRef.current.forEach(t => t.kill())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => {
    if (!activeRef.current && tweensRef.current.length > 0) {
      activeRef.current = true
      tweensRef.current[0].resume()
    }
  }, [])

  const stop = useCallback(() => {
    activeRef.current = false
    tweensRef.current.forEach(t => t.pause())
  }, [])

  return { start, stop }
}
