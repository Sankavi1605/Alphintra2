import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import StarField from './scene/StarField'
import VerticalBeams from './scene/VerticalBeams'
import BackgroundParticles from './scene/BackgroundParticles'
import BackgroundLines from './scene/BackgroundLines'
import LowPolyHead from './scene/LowPolyHead'
import GlitchSphere from './scene/GlitchSphere'
import WaveGrid from './scene/WaveGrid'
import RippleDrop from './scene/RippleDrop'
import BeamColumns from './scene/BeamColumns'
import HeightMapTerrain from './scene/HeightMapTerrain'
import NeonTubes from './scene/NeonTubes'
import AnimatedGrid from './scene/AnimatedGrid'
import GalaxyRings from './scene/GalaxyRings'
import FogClouds from './scene/FogClouds'

const TOTAL_DEPTH = 450
const SECTION_SPACING = 50

function sectionVisibility(
  cameraY: number,
  objectY: number,
  fadeRange: number = 34
): number {
  const dist = Math.abs(cameraY - objectY)
  if (dist > fadeRange) return 0
  return 1 - dist / fadeRange
}

interface CameraControllerProps {
  scrollProgress: number
}

function CameraController({ scrollProgress }: CameraControllerProps) {
  const { camera } = useThree()
  const currentY = useRef(0)
  const targetYRef = useRef(0)

  useEffect(() => {
    targetYRef.current = -scrollProgress * TOTAL_DEPTH
  }, [scrollProgress])

  useFrame((_state, delta) => {
    // Slower easing keeps neighboring sections visually connected.
    const lerpFactor = 1 - Math.exp(-2.45 * delta)
    currentY.current += (targetYRef.current - currentY.current) * lerpFactor

    const swayX = Math.sin(currentY.current * 0.004) * 0.5
    const shake = Math.cos(performance.now() * 0.002) * 0.02

    camera.position.set(swayX, currentY.current + shake, 40)
    camera.lookAt(0, currentY.current, 0)
  })

  return null
}

function ScrollDrivenObjects() {
  const S = SECTION_SPACING
  const visRef = useRef<Record<string, number>>({})

  const headRef = useRef<THREE.Group | null>(null)
  const headScale = useRef(0)

  useFrame(({ camera }) => {
    const camY = camera.position.y

    visRef.current = {
      sec0: sectionVisibility(camY, 0),
      sec1: sectionVisibility(camY, -1 * S),
      sec2: sectionVisibility(camY, -2 * S),
      sec3: sectionVisibility(camY, -3 * S),
      sec4: sectionVisibility(camY, -4 * S),
      sec5: sectionVisibility(camY, -5 * S),
      sec6: sectionVisibility(camY, -6 * S),
      sec7: sectionVisibility(camY, -7 * S),
      sec8: sectionVisibility(camY, -8 * S),
      sec9: sectionVisibility(camY, -9 * S),
    }

    const headVis = sectionVisibility(camY, -7 * S, 30)
    headScale.current += (headVis - headScale.current) * 0.06
    if (headRef.current) {
      const s = Math.max(headScale.current, 0.001)
      headRef.current.scale.setScalar(s)
    }
  })

  const sec = (index: number) => visRef.current[`sec${index}`] ?? 0

  // Overlap adjacent sections for a chained flow similar to 2015.
  const beamActive = sec(1) > 0.08 || sec(0) > 0.28 || sec(2) > 0.24
  const dropActive = sec(2) > 0.08 || sec(1) > 0.22 || sec(3) > 0.22
  const ballActive = sec(3) > 0.08 || sec(2) > 0.22 || sec(4) > 0.2
  const heightActive = sec(4) > 0.08 || sec(3) > 0.2 || sec(5) > 0.2
  const waveActive = sec(5) > 0.08 || sec(4) > 0.18 || sec(6) > 0.18
  const galaxyActive = sec(6) > 0.08 || sec(5) > 0.16 || sec(7) > 0.16
  const neonActive = sec(8) > 0.08 || sec(7) > 0.18 || sec(9) > 0.18

  return (
    <>
      <BeamColumns position={[0, -1 * S, 0]} active={beamActive} />

      <RippleDrop
        position={[0, -2 * S, 0]}
        active={dropActive}
        count={6}
        amplitude={2}
      />

      <GlitchSphere position={[0, -3 * S, 0]} radius={4.5} active={ballActive} />
      <AnimatedGrid
        position={[0, -3 * S - 2, 0]}
        active={ballActive}
        divisionsX={10}
        divisionsY={10}
        divisionSize={3.5}
      />

      <HeightMapTerrain
        position={[0, -4 * S, 0]}
        active={heightActive}
        divisionsX={40}
        divisionsY={40}
        size={50}
        amplitude={8}
      />

      <WaveGrid
        position={[0, -5 * S - 3, 0]}
        active={waveActive}
        divisionsX={50}
        divisionsY={50}
        divisionSize={0.8}
        opacity={0.3}
      />

      <GalaxyRings position={[0, -6 * S, 0]} active={galaxyActive} ringCount={6} />

      <group ref={headRef}>
        <LowPolyHead position={[0, -7 * S, 0]} size={4} />
      </group>

      <NeonTubes
        position={[0, -8 * S, 0]}
        active={neonActive}
        count={5}
        spread={16}
        tubeWidth={20}
      />
    </>
  )
}

interface Scene3DProps {
  scrollProgress: number
}

export default function Scene3D({ scrollProgress }: Scene3DProps) {
  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: [0, 0, 40], fov: 22, near: 0.1, far: 600 }}
        gl={{ alpha: false, antialias: true }}
        style={{ background: '#050507' }}
      >
        <fogExp2 attach="fog" args={['#050507', 0.0115]} />

        <ambientLight intensity={0.28} />
        <directionalLight position={[5, 8, 10]} intensity={0.64} color="#d5d8df" />
        <directionalLight position={[-3, -2, -5]} intensity={0.2} color="#9fa4af" />
        <pointLight position={[0, 0, 35]} intensity={0.2} color="#ffffff" distance={80} />

        <CameraController scrollProgress={scrollProgress} />

        <BackgroundParticles count={600} />
        <BackgroundLines count={120} />
        <StarField count={500} />
        <VerticalBeams />

        <FogClouds yOffset={0} layers={6} opacity={0.14} />
        <FogClouds yOffset={-95} layers={4} opacity={0.08} />

        <ScrollDrivenObjects />
      </Canvas>
    </div>
  )
}
