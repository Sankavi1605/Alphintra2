import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Thin lines connecting nearby anchor points, creating a web/network
 * that spans the full scene. Like vaalentin.github.io/2015/ background.
 * Lines fade in/out with subtle animation.
 */
export default function BackgroundLines({ count = 200 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  // Generate anchor points spread across the scene
  const anchors = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 60,
          25 - Math.random() * 420,
          -4 + (Math.random() - 0.5) * 20
        )
      )
    }
    return pts
  }, [count])

  // Build line segments between nearby anchors (within threshold distance)
  const { geometries, lineData } = useMemo(() => {
    const threshold = 25
    const geos: THREE.BufferGeometry[] = []
    const data: { baseOpacity: number; speed: number; phase: number }[] = []

    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const dist = anchors[i].distanceTo(anchors[j])
        if (dist < threshold) {
          const positions = new Float32Array([
            anchors[i].x, anchors[i].y, anchors[i].z,
            anchors[j].x, anchors[j].y, anchors[j].z,
          ])
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          geos.push(geo)

          // Opacity inversely proportional to distance
          const opacity = (1 - dist / threshold) * 0.2
          data.push({
            baseOpacity: opacity,
            speed: 0.1 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
          })
        }
      }
    }
    return { geometries: geos, lineData: data }
  }, [anchors])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      const d = lineData[i]
      if (!d) return
      const mat = (child as THREE.LineSegments).material as THREE.LineBasicMaterial
      const pulse = 0.5 + Math.sin(t * d.speed + d.phase) * 0.5
      mat.opacity = d.baseOpacity * pulse
    })
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={lineData[i].baseOpacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      ))}
    </group>
  )
}
