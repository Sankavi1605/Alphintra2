import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShapeFlowFieldProps {
  active?: boolean
  position?: [number, number, number]
  lineCount?: number
  shardCount?: number
}

interface FlowLineData {
  geometry: THREE.BufferGeometry
  baseOpacity: number
  speed: number
  phase: number
}

interface ShardData {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  scale: number
  drift: number
  phase: number
  spin: number
}

function makeFlowLine(): FlowLineData {
  const baseRadius = 10 + Math.random() * 17
  const a0 = Math.random() * Math.PI * 2
  const a1 = a0 + 0.55 + Math.random() * 0.75

  const p0 = new THREE.Vector3(
    Math.cos(a0) * baseRadius,
    (Math.random() - 0.5) * 24,
    -6 + (Math.random() - 0.5) * 18
  )
  const p1 = new THREE.Vector3(
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 16,
    -11 + (Math.random() - 0.5) * 14
  )
  const p2 = new THREE.Vector3(
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 14,
    -10 + (Math.random() - 0.5) * 16
  )
  const p3 = new THREE.Vector3(
    Math.cos(a1) * (baseRadius * (0.82 + Math.random() * 0.4)),
    (Math.random() - 0.5) * 22,
    -6 + (Math.random() - 0.5) * 22
  )

  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3], false, 'catmullrom', 0.5)
  const points = curve.getPoints(26)
  const positions = new Float32Array(points.length * 3)

  points.forEach((point, i) => {
    positions[i * 3] = point.x
    positions[i * 3 + 1] = point.y
    positions[i * 3 + 2] = point.z
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  return {
    geometry,
    baseOpacity: 0.03 + Math.random() * 0.11,
    speed: 0.32 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
  }
}

function makeShard(): ShardData {
  return {
    x: (Math.random() - 0.5) * 24,
    y: -8 + Math.random() * 12,
    z: -14 + Math.random() * 10,
    rx: Math.random() * Math.PI,
    ry: Math.random() * Math.PI,
    rz: Math.random() * Math.PI,
    scale: 0.65 + Math.random() * 1.35,
    drift: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.1,
  }
}

export default function ShapeFlowField({
  active = false,
  position = [0, 0, 0],
  lineCount = 22,
  shardCount = 7,
}: ShapeFlowFieldProps) {
  const groupRef = useRef<THREE.Group>(null)
  const shardRefs = useRef<Array<THREE.Mesh | null>>([])
  const alphaRef = useRef(0)

  const flowLines = useMemo(() => {
    return Array.from({ length: lineCount }, () => makeFlowLine())
  }, [lineCount])

  const lineObjects = useMemo(() => {
    return flowLines.map((line) => {
      const material = new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: line.baseOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      return new THREE.Line(line.geometry, material)
    })
  }, [flowLines])

  useEffect(() => {
    return () => {
      lineObjects.forEach((line) => {
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      })
    }
  }, [lineObjects])

  const shards = useMemo(() => {
    return Array.from({ length: shardCount }, () => makeShard())
  }, [shardCount])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    const targetAlpha = active ? 1 : 0
    alphaRef.current += (targetAlpha - alphaRef.current) * (1 - Math.exp(-5.2 * delta))
    const alpha = alphaRef.current

    group.visible = alpha > 0.008
    if (!group.visible) return

    const t = state.clock.elapsedTime
    group.rotation.z = Math.sin(t * 0.22) * 0.08
    group.rotation.y = Math.cos(t * 0.18) * 0.06
    group.position.y = position[1] + Math.sin(t * 0.44) * 0.35

    lineObjects.forEach((line, i) => {
      if (!line) return
      const material = line.material as THREE.LineBasicMaterial
      const lineData = flowLines[i]
      const pulse = 0.68 + Math.sin(t * lineData.speed + lineData.phase) * 0.32
      material.opacity = lineData.baseOpacity * alpha * pulse
    })

    shardRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const shard = shards[i]
      const lift = Math.sin(t * shard.drift + shard.phase) * 0.65
      const sway = Math.cos(t * shard.drift * 0.9 + shard.phase) * 0.85
      mesh.position.set(shard.x + sway, shard.y + lift, shard.z)
      mesh.rotation.x = shard.rx + t * shard.spin * 0.35
      mesh.rotation.y = shard.ry + t * shard.spin * 0.6
      mesh.rotation.z = shard.rz + t * shard.spin * 0.25
      mesh.scale.setScalar(shard.scale * (0.8 + alpha * 0.2))
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = (0.08 + (i % 2 === 0 ? 0.06 : 0.11)) * alpha
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {lineObjects.map((line, i) => (
        <primitive key={`shape-flow-line-${i}`} object={line} />
      ))}

      {shards.map((_, i) => (
        <mesh
          key={`shape-shard-${i}`}
          ref={(el) => {
            shardRefs.current[i] = el
          }}
        >
          <coneGeometry args={[0.72, 1.4, 3]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
