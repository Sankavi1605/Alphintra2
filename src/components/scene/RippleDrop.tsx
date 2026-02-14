/**
 * RippleDrop — R3F component.
 *
 * Faithful port of 2015 DropObject3D.js.
 * Uses the original texture-drop.png with PlaneGeometry (20×20) per ring.
 * 6 rings scale from 0.1 → (index+1)*amplitude/count and fade out in a
 * staggered loop. Additive blending for glow effect.
 *
 * 2015 Parameters:
 *  - PlaneGeometry(20, 20) per ring
 *  - count: 6, amplitude: 2
 *  - scale: 0.1 → maxScale, opacity: 1 → 0, duration: 1.5s, stagger 0.1s
 *  - In: z → 0, Out: z → ±(count-i)*5
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface RippleDropProps {
  active?: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
  count?: number
  color?: string
  amplitude?: number
}

export default function RippleDrop({
  active = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 6,
  color = '#ffffff',
  amplitude = 2,
}: RippleDropProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const tweensRef = useRef<gsap.core.Tween[]>([])

  // Load 2015 drop texture
  const dropTex = useLoader(THREE.TextureLoader, '/texture-drop.png')

  // Per-ring animated state (matching 2015 exactly)
  const ringStates = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        scale: 0.1,
        opacity: 1,
        maxScale: ((i + 1) * amplitude) / count,
        zOffset: (count - i) * 5, // 2015: (count-i)*5
        zPos: (count - i) * 5,
      })),
    [count, amplitude]
  )

  // Build GSAP idle tweens — loop pattern from 2015
  useEffect(() => {
    const tweens = ringStates.map((rs, i) => {
      const tween = gsap.to(rs, {
        scale: rs.maxScale,
        opacity: 0,
        duration: 1.5,
        delay: (i * 100) / 1000,
        paused: true,
        ease: 'power1.out',
        onComplete() {
          rs.scale = 0.1
          rs.opacity = 1
          tween.restart()
        },
      })
      return tween
    })

    tweensRef.current = tweens
    return () => { tweens.forEach(t => t.kill()) }
  }, [ringStates])

  // In / Out transitions
  useEffect(() => {
    if (active) {
      ringStates.forEach((rs) => {
        rs.scale = 0.1
        rs.opacity = 1
      })
      tweensRef.current.forEach(t => t.restart())
      ringStates.forEach((rs, i) => {
        const duration = (10 + i) / 10
        gsap.to(rs, { zPos: 0, duration, ease: 'power2.out' })
      })
    } else {
      tweensRef.current.forEach(t => t.pause())
      ringStates.forEach((rs, i) => {
        const duration = (10 + i) / 10
        gsap.to(rs, { zPos: rs.zOffset, duration, ease: 'power2.in' })
      })
    }
  }, [active, ringStates])

  // Render loop
  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    group.children.forEach((child, i) => {
      if (i < ringStates.length) {
        const rs = ringStates[i]
        child.scale.set(rs.scale, rs.scale, rs.scale)
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        if (mat) mat.opacity = rs.opacity
        child.position.z = rs.zPos
      }
    })
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {ringStates.map((_, i) => (
        <mesh key={i}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial
            map={dropTex}
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={true}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
