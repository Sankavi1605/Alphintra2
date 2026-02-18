import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface IntroBeamSequenceProps {
  sectionSpacing?: number
}

interface BeamNode {
  x: number
  z: number
  anchors: [number, number, number, number]
  ys: [number, number, number, number]
  size: number
  color: string
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep01(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function sampleStage(stage: number, values: [number, number, number, number]): number {
  if (stage <= 0) return values[0]
  if (stage >= 3) return values[3]

  const segment = Math.floor(stage)
  const t = smoothstep01(stage - segment)

  if (segment === 0) return lerp(values[0], values[1], t)
  if (segment === 1) return lerp(values[1], values[2], t)
  return lerp(values[2], values[3], t)
}

export default function IntroBeamSequence({
  sectionSpacing = 50,
}: IntroBeamSequenceProps) {
  const flareTexture = useLoader(THREE.TextureLoader, '/texture-laserFlare.png')

  const lineRefs = useRef<Array<THREE.Mesh | null>>([])
  const squareRefs = useRef<Array<THREE.Mesh | null>>([])
  const glowRefs = useRef<Array<THREE.Sprite | null>>([])

  const nodes = useMemo<BeamNode[]>(() => {
    return [
      {
        x: 10,
        z: -5,
        anchors: [6, -22, -72, -122],
        ys: [-14, -50, -95, -138],
        size: 0.21,
        color: '#8f939d',
      },
      {
        x: 0,
        z: 0,
        anchors: [8, -24, -76, -126],
        ys: [-12, -52, -100, -145],
        size: 0.28,
        color: '#ffffff',
      },
      {
        x: -12,
        z: -10,
        anchors: [5, -22, -70, -121],
        ys: [-15, -49, -93, -136],
        size: 0.21,
        color: '#636873',
      },
    ]
  }, [])

  useFrame((state) => {
    const stage = -state.camera.position.y / sectionSpacing

    const enter = smoothstep01((stage + 0.2) / 0.45)
    const fadeOut = smoothstep01((stage - 3.1) / 0.35)
    const alpha = enter * (1 - fadeOut)

    nodes.forEach((node, i) => {
      const line = lineRefs.current[i]
      const square = squareRefs.current[i]
      const glow = glowRefs.current[i]
      if (!line || !square || !glow) return

      const y = sampleStage(stage, node.ys)
      const anchorY = sampleStage(stage, node.anchors)
      const lineLength = Math.max(0.28, anchorY - y)

      line.position.set(node.x, y + lineLength * 0.5, node.z)
      line.scale.set(1, lineLength, 1)
      line.visible = alpha > 0.01
      const lineMaterial = line.material as THREE.MeshBasicMaterial
      lineMaterial.opacity = (0.09 + 0.42 * alpha) * (i === 1 ? 1 : 0.86)

      square.position.set(node.x, y, node.z)
      square.scale.setScalar(node.size)
      square.visible = alpha > 0.01
      const squareMaterial = square.material as THREE.MeshBasicMaterial
      squareMaterial.opacity = (0.2 + alpha * 0.7) * (i === 1 ? 1 : 0.84)

      glow.position.set(node.x, y, node.z)
      glow.scale.setScalar(i === 1 ? 1.8 : 1.25)
      glow.visible = alpha > 0.01
      const glowMaterial = glow.material as THREE.SpriteMaterial
      glowMaterial.opacity = (i === 1 ? 0.2 : 0.12) * alpha
    })
  })

  return (
    <group>
      {nodes.map((node, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              lineRefs.current[i] = el
            }}
          >
            <planeGeometry args={[0.035, 1]} />
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={0.7}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          <mesh
            ref={(el) => {
              squareRefs.current[i] = el
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <sprite
            ref={(el) => {
              glowRefs.current[i] = el
            }}
          >
            <spriteMaterial
              map={flareTexture}
              color={node.color}
              transparent
              opacity={0.35}
              depthWrite={false}
              depthTest={true}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
    </group>
  )
}
