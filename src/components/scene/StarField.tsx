import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function StarField({ count = 1200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const brightRef = useRef<THREE.Points>(null)

  // Main star layer
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100
      pos[i * 3 + 1] = 30 - Math.random() * 450
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return pos
  }, [count])

  // Brighter accent stars (fewer, bigger)
  const brightCount = Math.floor(count * 0.08)
  const brightPositions = useMemo(() => {
    const pos = new Float32Array(brightCount * 3)
    for (let i = 0; i < brightCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90
      pos[i * 3 + 1] = 25 - Math.random() * 430
      pos[i * 3 + 2] = (Math.random() - 0.5) * 45
    }
    return pos
  }, [brightCount])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t * 0.008) * 0.006
    }
    if (brightRef.current) {
      // Gentle twinkle
      const mat = brightRef.current.material as THREE.PointsMaterial
      mat.opacity = 0.6 + Math.sin(t * 0.5) * 0.2
    }
  })

  return (
    <>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.1}
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <points ref={brightRef}>
        <bufferGeometry>
          <bufferAttribute args={[brightPositions, 3]} attach="attributes-position" />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.25}
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}
