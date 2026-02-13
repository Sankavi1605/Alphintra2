/**
 * WaveGrid — R3F component.
 *
 * Ported from 2015/objects3D/WaveObject3D.js.
 * Original: THREE.PlaneGeometry with vertices displaced by a double-sine
 * wave function, animated via a GSAP loop tween (TweenLite.to + onComplete: loop).
 *
 * This version uses BufferGeometry vertex displacement in useFrame,
 * with GSAP controlling slide-in/out transitions (the in/out pattern).
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface WaveGridProps {
  active?: boolean
  position?: [number, number, number]
  divisionsX?: number
  divisionsY?: number
  divisionSize?: number
  color?: string
  opacity?: number
}

export default function WaveGrid({
  active = false,
  position = [0, -15, 0],
  divisionsX = 50,
  divisionsY = 50,
  divisionSize = 1.5,
  color = '#ffffff',
  opacity = 0.25,
}: WaveGridProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const offY = position[1] + 40 // hide below the section when inactive
  const stateRef = useRef({ yPos: offY, targetY: position[1], time: 0 })

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      divisionsX * divisionSize,
      divisionsY * divisionSize,
      divisionsX,
      divisionsY
    )
    return geo
  }, [divisionsX, divisionsY, divisionSize])

  // Store original positions for displacement
  const basePositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array)
  }, [geometry])

  // ── GSAP in/out transitions (same pattern as 2015) ──
  useEffect(() => {
    const s = stateRef.current
    if (active) {
      gsap.to(s, { yPos: s.targetY, duration: 1.5, ease: 'power2.out' })
    } else {
      gsap.to(s, { yPos: s.targetY + 40, duration: 1, ease: 'power2.in' })
    }
  }, [active])

  // ── Animation loop: sine wave vertex displacement ──
  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const s = stateRef.current
    s.time += delta * 2 // speed factor

    mesh.position.y = s.yPos

    const pos = geometry.attributes.position.array as Float32Array
    const countX = divisionsX + 1
    const countY = divisionsY + 1
    let idx = 0

    for (let x = 0; x < countX; x++) {
      for (let y = 0; y < countY; y++) {
        // z displacement = sine wave (same formula as 2015)
        const z =
          Math.sin(((x + 1) + s.time) * 0.2) * 2 +
          Math.sin(((y + 1) + s.time) * 0.2) * 5

        pos[idx * 3 + 2] = basePositions[idx * 3 + 2] + z
        idx++
      }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[position[0], offY, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
