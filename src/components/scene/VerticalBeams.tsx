import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function VerticalBeams() {
  const groupRef = useRef<THREE.Group>(null)

  const beams = useMemo(() => {
    const result = []

    // Long vertical beams — thin bright lines running through the scene
    for (let i = 0; i < 24; i++) {
      result.push({
        x: (Math.random() - 0.5) * 35,
        y: 20 - i * 18 - Math.random() * 10,
        length: 50 + Math.random() * 80,
        baseOpacity: 0.04 + Math.random() * 0.08,
        speed: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        z: (Math.random() - 0.5) * 8,
        angle: 0, // vertical
      })
    }

    // Diagonal / angled beams for depth
    for (let i = 0; i < 12; i++) {
      const angle = (Math.random() - 0.5) * 0.3 // slight tilt
      result.push({
        x: (Math.random() - 0.5) * 40,
        y: 10 - Math.random() * 400,
        length: 40 + Math.random() * 60,
        baseOpacity: 0.02 + Math.random() * 0.05,
        speed: 0.12 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        z: (Math.random() - 0.5) * 12,
        angle,
      })
    }

    return result
  }, [])

  const geometries = useMemo(() => {
    return beams.map((beam) => {
      const halfLen = beam.length / 2
      const dx = Math.sin(beam.angle) * halfLen
      const positions = new Float32Array([
        beam.x - dx, beam.y - halfLen, beam.z,
        beam.x + dx, beam.y + halfLen, beam.z,
      ])
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      return geo
    })
  }, [beams])

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime
      groupRef.current.children.forEach((child, i) => {
        const beam = beams[i]
        if (beam) {
          const mat = (child as THREE.LineSegments).material as THREE.LineBasicMaterial
          // Smooth pulsating glow
          const pulse = 0.3 + Math.sin(t * beam.speed + beam.phase) * 0.5
            + Math.sin(t * beam.speed * 0.7 + beam.phase * 1.3) * 0.2
          mat.opacity = beam.baseOpacity * Math.max(0, pulse)
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={beams[i].baseOpacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      ))}
    </group>
  )
}
