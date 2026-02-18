import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Floating particles (small squares + dots) that drift subtly.
 * Inspired by vaalentin.github.io/2015/ — scattered small cubes & dots
 * spanning the full depth of the scene.
 */
export default function BackgroundParticles({ count = 800 }: { count?: number }) {
  const dotsRef = useRef<THREE.Points>(null)
  const cubesRef = useRef<THREE.InstancedMesh>(null)

  const cubeCount = Math.floor(count * 0.16)

  // Dot particle positions — spread across the full scene depth
  const dotPositions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120
      pos[i * 3 + 1] = 30 - Math.random() * 450
      pos[i * 3 + 2] = -5 + (Math.random() - 0.5) * 50
    }
    return pos
  }, [count])

  const dotSizes = useMemo(() => {
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      sizes[i] = 0.02 + Math.random() * 0.06
    }
    return sizes
  }, [count])

  // Small cubes — transforms
  const cubeData = useMemo(() => {
    const data = []
    for (let i = 0; i < cubeCount; i++) {
      data.push({
        x: (Math.random() - 0.5) * 100,
        y: 20 - Math.random() * 420,
        z: -3 + (Math.random() - 0.5) * 30,
        size: 0.14 + Math.random() * 0.24,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        driftSpeed: 0.01 + Math.random() * 0.03,
        driftPhase: Math.random() * Math.PI * 2,
      })
    }
    return data
  }, [cubeCount])

  // Initialize cube instance matrices
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Dots — gentle sway
    if (dotsRef.current) {
      dotsRef.current.rotation.y = Math.sin(t * 0.01) * 0.003
    }

    // Cubes — rotate + drift
    if (cubesRef.current) {
      cubeData.forEach((cube, i) => {
        const driftX = Math.sin(t * cube.driftSpeed + cube.driftPhase) * 0.3
        const driftY = Math.cos(t * cube.driftSpeed * 0.7 + cube.driftPhase) * 0.14

        dummy.position.set(cube.x + driftX, cube.y + driftY, cube.z)
        dummy.rotation.set(
          t * cube.rotSpeed * 0.1,
          t * cube.rotSpeed * 0.2,
          t * cube.rotSpeed * 0.1
        )
        dummy.scale.setScalar(cube.size)
        dummy.updateMatrix()
        cubesRef.current!.setMatrixAt(i, dummy.matrix)
      })
      cubesRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {/* Small dots */}
      <points ref={dotsRef}>
        <bufferGeometry>
          <bufferAttribute args={[dotPositions, 3]} attach="attributes-position" />
          <bufferAttribute args={[dotSizes, 1]} attach="attributes-size" />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.07}
          transparent
          opacity={0.24}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Floating small cubes */}
      <instancedMesh
        ref={cubesRef}
        args={[undefined, undefined, cubeCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  )
}
