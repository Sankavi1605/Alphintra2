import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import StarField from './scene/StarField'
import BackgroundParticles from './scene/BackgroundParticles'
import LowPolyHead from './scene/LowPolyHead'
import GlitchSphere from './scene/GlitchSphere'
import WaveGrid from './scene/WaveGrid'
import HeightMapTerrain from './scene/HeightMapTerrain'
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
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseCurrent = useRef({ x: 0, y: 0 })

  useEffect(() => {
    targetYRef.current = -scrollProgress * TOTAL_DEPTH
  }, [scrollProgress])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1
      const ny = (event.clientY / window.innerHeight) * 2 - 1
      mouseTarget.current.x = nx
      mouseTarget.current.y = ny
    }

    const onMouseLeave = () => {
      mouseTarget.current.x = 0
      mouseTarget.current.y = 0
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  useFrame((state, delta) => {
    // Slower easing keeps neighboring sections visually connected.
    const lerpFactor = 1 - Math.exp(-2.45 * delta)
    currentY.current += (targetYRef.current - currentY.current) * lerpFactor

    const mouseLerp = 1 - Math.exp(-7.2 * delta)
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * mouseLerp
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * mouseLerp

    const swayX = Math.sin(currentY.current * 0.003) * 0.28
    const pointerX = mouseCurrent.current.x * 0.88
    const pointerY = -mouseCurrent.current.y * 0.42
    const pointerEnergy = Math.min(
      1,
      Math.hypot(mouseCurrent.current.x, mouseCurrent.current.y)
    )
    const time = state.clock.getElapsedTime()
    const shakeAmp = 0.025 + pointerEnergy * 0.055
    const shakeX = Math.sin(time * 6.2 + mouseCurrent.current.x * 3.9) * shakeAmp
    const shakeY = Math.cos(time * 5.6 + mouseCurrent.current.y * 3.3) * shakeAmp * 0.72

    camera.position.set(
      swayX + pointerX + shakeX,
      currentY.current + pointerY + shakeY,
      40
    )
    camera.lookAt(pointerX * 0.32, currentY.current + pointerY * 0.45, 0)
  })

  return null
}

interface ScrollDrivenObjectsProps {
  currentSection: number
}

function ScrollDrivenObjects({ currentSection }: ScrollDrivenObjectsProps) {
  const S = SECTION_SPACING

  const headRef = useRef<THREE.Group | null>(null)
  const headScale = useRef(0)

  useFrame(({ camera }) => {
    const camY = camera.position.y

    const headVis = sectionVisibility(camY, -7 * S, 30)
    headScale.current += (headVis - headScale.current) * 0.06
    if (headRef.current) {
      const s = Math.max(headScale.current, 0.001)
      headRef.current.scale.setScalar(s)
    }
  })

  // Activation windows keep neighboring sections visually connected.
  const ballActive = currentSection >= 3 && currentSection <= 4
  // Delay terrain one section so Enterprise card stays clean.
  const heightActive = currentSection === 5
  const waveActive = currentSection >= 5 && currentSection <= 6
  // Keep galaxy away from "Our Work" (section 6) to avoid section overlap bleed.
  const galaxyActive = currentSection === 7

  return (
    <>
      <GlitchSphere
        position={[0, -3 * S + 3, -8]}
        radius={3.6}
        active={ballActive}
        entryStartY={-2 * S - 8}
        entryStartZ={0}
        entryStartScale={0.48}
        entryDuration={1.2}
      />
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

      <GalaxyRings position={[0, -7 * S, 0]} active={galaxyActive} ringCount={6} />

      <group ref={headRef}>
        <LowPolyHead position={[0, -7 * S, 0]} size={4} />
      </group>

    </>
  )
}

interface Scene3DProps {
  scrollProgress: number
  currentSection: number
}

export default function Scene3D({ scrollProgress, currentSection }: Scene3DProps) {
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
        <StarField count={500} />

        <FogClouds yOffset={0} layers={6} opacity={0.06} />
        <FogClouds yOffset={-95} layers={4} opacity={0.03} />

        <ScrollDrivenObjects currentSection={currentSection} />
      </Canvas>
    </div>
  )
}
