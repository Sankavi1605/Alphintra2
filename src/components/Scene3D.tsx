import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import StarField from './scene/StarField'
import VerticalBeams from './scene/VerticalBeams'
import BackgroundParticles from './scene/BackgroundParticles'
import BackgroundLines from './scene/BackgroundLines'
import LowPolyHead from './scene/LowPolyHead'
// ── 2015 ported components ──
import GlitchSphere from './scene/GlitchSphere'
import WaveGrid from './scene/WaveGrid'
import RippleDrop from './scene/RippleDrop'
import BeamColumns from './scene/BeamColumns'
import HeightMapTerrain from './scene/HeightMapTerrain'
import NeonTubes from './scene/NeonTubes'
import AnimatedGrid from './scene/AnimatedGrid'
import GalaxyRings from './scene/GalaxyRings'
import FogClouds from './scene/FogClouds'

/*
  10-section layout — one 3D object per section.
  Camera travels DOWNWARD along Y-axis (like the 2015 site).
  Each section is spaced 50 units apart (matching 2015 sectionHeight).
  Camera: fov 20, z=40 — narrow telephoto look, objects appear large & centered.

  Section 0   y≈    0   ALPHINTRA — stars only (hero text covers this)
  Section 1   y≈  -50   ENGINEERING THE FUTURE — BeamColumns (2015 Beam)
  Section 2   y≈ -100   WEB & MOBILE — RippleDrop (2015 Drop)
  Section 3   y≈ -150   AI & AUTOMATION — GlitchSphere + AnimatedGrid (2015 Ball+Grid)
  Section 4   y≈ -200   ENTERPRISE BACKEND — HeightMapTerrain (2015 HeightMap)
  Section 5   y≈ -250   UI/UX & 3D DESIGN — WaveGrid (2015 Wave, like "EYES ON THE HORIZON")
  Section 6   y≈ -300   OUR WORK — GalaxyRings (2015 Galaxy)
  Section 7   y≈ -350   THE ALPHINTRA WAY — LowPolyHead (2015 Face)
  Section 8   y≈ -400   THE TEAM — NeonTubes (2015 Neon)
  Section 9   y≈ -450   LET'S TALK — particles only
*/

const TOTAL_DEPTH = 450
const SECTION_SPACING = 50

function sectionVisibility(
  cameraY: number,
  objectY: number,
  fadeRange: number = 28
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
    // Smooth exponential interpolation — ~98% settled in 1.5s (like 2015 Quart.easeInOut)
    const lerpFactor = 1 - Math.exp(-3 * delta)
    currentY.current += (targetYRef.current - currentY.current) * lerpFactor

    // Subtle horizontal sway — mimics 2015 mouse parallax
    const swayX = Math.sin(currentY.current * 0.004) * 0.6
    // Tiny camera shake like 2015
    const shake = Math.cos(performance.now() * 0.002) * 0.02

    camera.position.set(swayX, currentY.current + shake, 40)
    // Look straight at the objects (no downward offset — keeps objects centered)
    camera.lookAt(0, currentY.current, 0)
  })

  return null
}

function ScrollDrivenObjects(_props: { scrollProgress: number }) {
  const S = SECTION_SPACING

  // Visibility refs for 2015-ported active props
  const visRef = useRef<Record<string, number>>({})

  // Head group ref for smooth scale
  const headRef = useRef<THREE.Group | null>(null)
  const headScale = useRef(0)

  useFrame(({ camera }) => {
    const camY = camera.position.y

    // Update visibility for all sections
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
    }

    // Smooth scale for head group
    const headVis = sectionVisibility(camY, -7 * S, 30)
    headScale.current += (headVis - headScale.current) * 0.06
    if (headRef.current) {
      const s = Math.max(headScale.current, 0.001)
      headRef.current.scale.setScalar(s)
    }
  })

  return (
    <>
      {/* ── All objects CENTERED at (0, -N*S, 0) like 2015 ── */}

      {/* Section 1: BeamColumns — 2015 light beams with laser textures (3 beams) */}
      <BeamColumns
        position={[0, -1 * S, 0]}
        active={(visRef.current.sec1 ?? 0) > 0.2}
      />

      {/* Section 2: RippleDrop — 2015 concentric drop rings */}
      <RippleDrop
        position={[0, -2 * S, 0]}
        active={(visRef.current.sec2 ?? 0) > 0.2}
        count={6}
        amplitude={2}
      />

      {/* Section 3: GlitchSphere + AnimatedGrid — "GIVE SHAPE" style, centered */}
      <GlitchSphere
        position={[0, -3 * S, 0]}
        radius={4.5}
        active={(visRef.current.sec3 ?? 0) > 0.2}
      />
      <AnimatedGrid
        position={[0, -3 * S - 2, 0]}
        active={(visRef.current.sec3 ?? 0) > 0.2}
        divisionsX={10}
        divisionsY={10}
        divisionSize={3.5}
      />

      {/* Section 4: HeightMapTerrain — "LET IT MORPH" style, centered & large */}
      <HeightMapTerrain
        position={[0, -4 * S, 0]}
        active={(visRef.current.sec4 ?? 0) > 0.2}
        divisionsX={40}
        divisionsY={40}
        size={50}
        amplitude={8}
      />

      {/* Section 5: WaveGrid — "EYES ON THE HORIZON" style, centered full-width */}
      <WaveGrid
        position={[0, -5 * S - 3, 0]}
        active={(visRef.current.sec5 ?? 0) > 0.2}
        divisionsX={50}
        divisionsY={50}
        divisionSize={0.8}
        opacity={0.3}
      />

      {/* Section 6: GalaxyRings — "WORK AS A TEAM" style, centered */}
      <GalaxyRings
        position={[0, -6 * S, 0]}
        active={(visRef.current.sec6 ?? 0) > 0.2}
        ringCount={6}
      />

      {/* Section 7: LowPolyHead — "KEEP TRYING" face, centered */}
      <group ref={headRef}>
        <LowPolyHead position={[0, -7 * S, 0]} size={4} />
      </group>

      {/* Section 8: NeonTubes — 2015 flickering neon with glow textures */}
      <NeonTubes
        position={[0, -8 * S, 0]}
        active={(visRef.current.sec8 ?? 0) > 0.2}
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
        style={{ background: '#0a0a0a' }}
      >
        {/* Exponential fog like 2015 — subtle atmospheric depth */}
        <fogExp2 attach="fog" args={['#0a0a0a', 0.012]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 10]} intensity={0.7} color="#ccddff" />
        <directionalLight position={[-3, -2, -5]} intensity={0.25} color="#8899bb" />
        <pointLight position={[0, 0, 35]} intensity={0.2} color="#ffffff" distance={80} />

        <CameraController scrollProgress={scrollProgress} />

        <BackgroundParticles count={600} />
        <BackgroundLines count={120} />
        <StarField count={500} />
        <VerticalBeams />

        {/* Fog clouds — hero section (y ≈ 0), like 2015 SmokeObject3D */}
        <FogClouds yOffset={0} layers={6} opacity={0.16} />

        <ScrollDrivenObjects scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  )
}
