import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface LowPolyHeadProps {
  position?: [number, number, number]
  size?: number
}

function createHeadGeometry(radius: number): THREE.BufferGeometry {
  // Low-poly sphere as base (detail=3 ≈ 162 vertices)
  const geo = new THREE.IcosahedronGeometry(radius, 3)
  const positions = geo.attributes.position

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i)
    let y = positions.getY(i)
    let z = positions.getZ(i)

    // Normalize to get direction, then re-apply
    const r = Math.sqrt(x * x + y * y + z * z)
    const nx = x / r
    const ny = y / r
    const nz = z / r

    // Elongate vertically (head proportions)
    y *= 1.25

    // Flatten back of head
    if (nz < -0.3) {
      z *= 0.75
    }

    // Only modify front-facing hemisphere for facial features
    if (nz > 0.2) {
      // Eye sockets (two symmetrical indentations)
      const eyeY = 0.35
      const eyeSpacing = 0.35

      // Left eye
      const dxL = nx - (-eyeSpacing)
      const dyL = ny - eyeY
      const distL = Math.sqrt(dxL * dxL + dyL * dyL)
      if (distL < 0.25) {
        z -= (0.25 - distL) * radius * 0.6
      }

      // Right eye
      const dxR = nx - eyeSpacing
      const dyR = ny - eyeY
      const distR = Math.sqrt(dxR * dxR + dyR * dyR)
      if (distR < 0.25) {
        z -= (0.25 - distR) * radius * 0.6
      }

      // Brow ridge (slight protrusion above eyes)
      if (ny > 0.45 && ny < 0.65 && Math.abs(nx) < 0.65) {
        z += radius * 0.08
      }

      // Nose bridge
      if (Math.abs(nx) < 0.12 && ny > -0.1 && ny < 0.4) {
        z += radius * 0.12
      }

      // Nose tip
      if (Math.abs(nx) < 0.1 && ny > -0.25 && ny < -0.05) {
        z += radius * 0.18
      }

      // Mouth indent
      if (Math.abs(nx) < 0.25 && ny > -0.5 && ny < -0.3) {
        z -= radius * 0.06
      }

      // Cheek slight protrusion
      if (Math.abs(nx) > 0.35 && Math.abs(nx) < 0.7 && ny > -0.3 && ny < 0.2) {
        z += radius * 0.04
      }
    }

    // Chin definition
    if (ny < -0.7 && nz > 0) {
      z -= radius * 0.05
      y -= radius * 0.08
    }

    positions.setX(i, x)
    positions.setY(i, y)
    positions.setZ(i, z)
  }

  // Convert to non-indexed for flat shading
  const nonIndexed = geo.toNonIndexed()
  nonIndexed.computeVertexNormals()
  return nonIndexed
}

export default function LowPolyHead({
  position = [0, 0, 0],
  size = 3,
}: LowPolyHeadProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => createHeadGeometry(size), [size])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.15) * 0.12
      meshRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.04
    }
  })

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <meshStandardMaterial
        color="#1a1a22"
        roughness={0.9}
        metalness={0.05}
        flatShading
      />
    </mesh>
  )
}
