/**
 * GlitchSphere — R3F component.
 *
 * Ported from 2015/objects3D/BallObject3D.js.
 * Original: Three.js sphere with stripe textures, GSAP-driven blink/glitch
 * idle tweens (random duration self-restart), appearance step-animation.
 *
 * This version uses BufferGeometry + ShaderMaterial for the stripe effect,
 * and replicates the GSAP idle patterns: yoyo rotation, random blinks
 * (emissive swap), and the step-reveal texture animation.
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { random } from '../../hooks/useGsapAnimations'

interface GlitchSphereProps {
  active?: boolean
  position?: [number, number, number]
  radius?: number
}

export default function GlitchSphere({
  active = false,
  position = [0, 0, 0],
  radius = 10,
}: GlitchSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const stateRef = useRef({
    stripeRepeat: 3,
    rotateY: 0,
    rotateX: 0,
    blinkFactor: 0,   // 0 = normal, 1 = inverted colors
    glitchFactor: 0,  // 0 = normal, 1 = noise pattern
    opacity: 0,
    posY: position[1] + 40,
  })

  const uniforms = useMemo(() => ({
    uStripeRepeat: { value: 3.0 },
    uBlinkFactor: { value: 0.0 },
    uGlitchFactor: { value: 0.0 },
    uOpacity: { value: 0.0 },
    uTime: { value: 0.0 },
  }), [])

  // ── Build GSAP tweens (2015 pattern) ──
  useEffect(() => {
    const s = stateRef.current

    // ── Yoyo rotation / stripe tween (idle) ──
    const rotateTween = gsap.to(s, {
      stripeRepeat: 8,
      duration: 5,
      paused: true,
      onComplete() { rotateTween.reverse() },
      onReverseComplete() { rotateTween.restart() },
    })

    // ── Random blink (2015: swap emissive colors) ──
    const blinkTween = gsap.to({}, {
      duration: random(0.5, 4),
      paused: true,
      onComplete() {
        // Flash inverted
        s.blinkFactor = 1
        gsap.delayedCall(random(0.05, 0.15), () => { s.blinkFactor = 0 })
        blinkTween.duration(random(0.5, 4))
        blinkTween.restart()
      },
    })

    // ── Random glitch (2015: material swap to noise) ──
    const glitchTween = gsap.to({}, {
      duration: random(2, 8),
      paused: true,
      onComplete() {
        s.glitchFactor = 1
        gsap.delayedCall(random(0.15, 0.6), () => { s.glitchFactor = 0 })
        glitchTween.duration(random(2, 8))
        glitchTween.restart()
      },
    })

    // ── Entrance tween ──
    const inTween = gsap.to(s, {
      posY: position[1],
      opacity: 1,
      duration: 1.5,
      paused: true,
      ease: 'power2.out',
    })

    tweensRef.current = [rotateTween, blinkTween, glitchTween, inTween]

    return () => { tweensRef.current.forEach(t => t.kill()) }
  }, [])

  // ── Start / stop based on active ──
  useEffect(() => {
    const [rotate, blink, glitch, inTween] = tweensRef.current
    if (active) {
      inTween?.play()
      rotate?.resume()
      blink?.resume()
      glitch?.resume()
    } else {
      rotate?.pause()
      blink?.pause()
      glitch?.pause()
      inTween?.reverse()
    }
  }, [active])

  // ── Each frame: push GSAP-driven state into uniforms ──
  useFrame((_, delta) => {
    const s = stateRef.current
    const mesh = meshRef.current
    if (!mesh) return

    // Continuous rotation independent of GSAP tweens
    s.rotateY += 0.01
    s.rotateX += 0.02
    mesh.rotation.y = s.rotateY
    mesh.rotation.x = s.rotateX
    mesh.position.y = s.posY
    mesh.position.x = position[0]
    mesh.position.z = position[2]

    uniforms.uStripeRepeat.value = s.stripeRepeat
    uniforms.uBlinkFactor.value = s.blinkFactor
    uniforms.uGlitchFactor.value = s.glitchFactor
    uniforms.uOpacity.value = s.opacity
    uniforms.uTime.value += delta
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uStripeRepeat;
          uniform float uBlinkFactor;
          uniform float uGlitchFactor;
          uniform float uOpacity;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vNormal;

          // Simple hash noise
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          void main() {
            // Stripe pattern (like 2015 texture-ball.png)
            float stripe = step(0.5, fract(vUv.y * uStripeRepeat));
            float base = mix(0.15, 0.9, stripe);

            // Fresnel edge glow
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

            // Blink: invert colors
            float color = mix(base, 1.0 - base, uBlinkFactor);

            // Glitch: noise overlay
            float noise = hash(vUv * 50.0 + uTime * 10.0);
            color = mix(color, noise, uGlitchFactor);

            color += fresnel * 0.3;

            gl_FragColor = vec4(vec3(color), uOpacity);
          }
        `}
      />
    </mesh>
  )
}
