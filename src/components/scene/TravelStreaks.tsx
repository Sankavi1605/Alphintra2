import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TravelStreaksProps {
  count?: number
  color?: string
  baseOpacity?: number
  rangeY?: [number, number]
}

interface StreakData {
  x: number
  y: number
  z: number
  idleLength: number
  trailLength: number
  thickness: number
  headSize: number
  driftSpeed: number
  trailGain: number
}

export default function TravelStreaks({
  count = 30,
  color = '#ffffff',
  baseOpacity = 0.26,
  rangeY = [50, -500],
}: TravelStreaksProps) {
  const lineRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  const lineMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const prevCamY = useRef<number | null>(null)
  const stretchRef = useRef(0)
  const driftRef = useRef(0)

  const lineDummy = useMemo(() => new THREE.Object3D(), [])
  const headDummy = useMemo(() => new THREE.Object3D(), [])
  const topY = Math.max(rangeY[0], rangeY[1])
  const bottomY = Math.min(rangeY[0], rangeY[1])
  const rangeHeight = Math.max(1, topY - bottomY)

  const streaks = useMemo<StreakData[]>(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 46,
      y: bottomY + Math.random() * rangeHeight,
      // Keep depth in front of camera so lines are clearly visible.
      z: -36 + Math.random() * 46,
      idleLength: 0.05 + Math.random() * 0.1,
      trailLength: 6 + Math.random() * 14,
      thickness: 0.05 + Math.random() * 0.05,
      headSize: 0.26 + Math.random() * 0.26,
      driftSpeed: 1 + Math.random() * 1.3,
      // Only a small subset stretches strongly during transitions.
      trailGain: Math.random() < 0.32 ? 1 : 0.08,
    }))
  }, [count, bottomY, rangeHeight])

  useFrame((_state, delta) => {
    if (!lineRef.current || !headRef.current) return

    const camY = _state.camera.position.y
    if (prevCamY.current === null) prevCamY.current = camY

    const velocity = Math.abs((camY - prevCamY.current) / Math.max(delta, 0.0001))
    prevCamY.current = camY

    // 2015-like travel trigger: almost static at rest, elongated trails only during section move.
    const targetStretch = THREE.MathUtils.clamp((velocity - 0.8) / 20, 0, 1)
    stretchRef.current += (targetStretch - stretchRef.current) * (1 - Math.exp(-10 * delta))
    const stretch = stretchRef.current

    // Falling movement appears only while traveling between sections.
    driftRef.current += stretch * delta * 34

    streaks.forEach((s, i) => {
      const travel = driftRef.current * s.driftSpeed
      let y = s.y - travel
      while (y < bottomY) y += rangeHeight
      while (y > topY) y -= rangeHeight

      const localStretch = stretch * s.trailGain
      const length = s.idleLength + s.trailLength * localStretch

      // Vertical hanging trail, square head at the bottom.
      lineDummy.position.set(s.x, y + length * 0.5, s.z)
      lineDummy.rotation.set(0, 0, 0)
      lineDummy.scale.set(s.thickness, length, s.thickness)
      lineDummy.updateMatrix()
      lineRef.current!.setMatrixAt(i, lineDummy.matrix)

      headDummy.position.set(s.x, y, s.z)
      headDummy.rotation.set(0, 0, 0)
      headDummy.scale.setScalar(s.headSize)
      headDummy.updateMatrix()
      headRef.current!.setMatrixAt(i, headDummy.matrix)
    })

    lineRef.current.instanceMatrix.needsUpdate = true
    headRef.current.instanceMatrix.needsUpdate = true

    if (lineMatRef.current) {
      lineMatRef.current.opacity = 0.1 + stretch * (baseOpacity + 0.34)
    }
    if (headMatRef.current) {
      headMatRef.current.opacity = 0.72 + stretch * 0.22
    }
  })

  return (
    <>
      <instancedMesh
        ref={lineRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={lineMatRef}
          color={color}
          transparent
          opacity={baseOpacity}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={headMatRef}
          color={color}
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  )
}
