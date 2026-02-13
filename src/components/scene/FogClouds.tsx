/**
 * FogClouds — R3F component.
 *
 * Smooth volumetric fog using additive-blended smoke planes with the
 * sprite-smoke.png texture. Each plane uses a FIXED frame from the
 * sheet and slowly drifts/rotates for a continuous smooth effect.
 * No sprite animation = no choppy frame jumps.
 *
 * Placed in the hero section (y ≈ 0) to match the 2015 "HELLO" foggy look.
 */

import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface SmokePlaneData {
  x: number
  y: number
  z: number
  rotZ: number
  scale: number
  driftSpeed: number
  driftPhase: number
  rotSpeed: number
}

interface FogCloudsProps {
  yOffset?: number
  layers?: number
  opacity?: number
  active?: boolean
}

const COLS = 8
const ROWS = 8

export default function FogClouds({
  yOffset = 0,
  layers = 10,
  opacity = 0.12,
  active = true,
}: FogCloudsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useLoader(THREE.TextureLoader, '/sprite-smoke.png')

  const planesData = useMemo<SmokePlaneData[]>(() => {
    const fixed: Partial<SmokePlaneData>[] = [
      { x: 10.7, y: 3.9, z: 17.8, rotZ: 2.7, scale: 5.5 },
      { x: -2.8, y: 2.6, z: -11, rotZ: 0.7, scale: 9 },
      { x: 13, y: 19.5, z: -1.3, rotZ: 2, scale: 4 },
      { x: -12, y: -5, z: 8, rotZ: 1.2, scale: 7 },
      { x: 5, y: 8, z: -6, rotZ: 3.5, scale: 6 },
      { x: -8, y: -3, z: 14, rotZ: 0.4, scale: 8 },
      { x: 15, y: -8, z: -4, rotZ: 1.8, scale: 5 },
      { x: -15, y: 12, z: 5, rotZ: 2.2, scale: 6.5 },
      { x: 0, y: -10, z: 10, rotZ: 0.9, scale: 7.5 },
      { x: 8, y: 15, z: -8, rotZ: 3.1, scale: 5.5 },
    ]

    const result: SmokePlaneData[] = []
    for (let i = 0; i < layers; i++) {
      const f = fixed[i]
      result.push({
        x: f?.x ?? (Math.random() - 0.5) * 40,
        y: (f?.y ?? (Math.random() - 0.5) * 25) + yOffset,
        z: f?.z ?? (Math.random() - 0.5) * 30,
        rotZ: f?.rotZ ?? Math.random() * Math.PI,
        scale: f?.scale ?? 3 + Math.random() * 6,
        driftSpeed: 0.015 + Math.random() * 0.025,
        driftPhase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.06,
      })
    }
    return result
  }, [layers, yOffset])

  // Each plane gets a FIXED random frame — no frame animation = smooth
  const materials = useMemo(() => {
    return planesData.map((pd, i) => {
      const tex = texture.clone()
      tex.needsUpdate = true
      tex.flipY = false
      tex.repeat.set(1 / COLS, 1 / ROWS)
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter

      const frame = (i * 7 + 3) % 64
      const col = frame % COLS
      const row = Math.floor(frame / COLS)
      tex.offset.set(col / COLS, 1 - (row + 1) / ROWS)

      return new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: opacity * (0.7 + Math.random() * 0.6),
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        color: pd.z > 0 ? new THREE.Color('#555555') : new THREE.Color('#ffffff'),
        side: THREE.DoubleSide,
      })
    })
  }, [planesData, texture, opacity])

  const geometry = useMemo(() => new THREE.PlaneGeometry(10, 10), [])

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return

    const t = performance.now() * 0.001

    groupRef.current.children.forEach((child, i) => {
      const pd = planesData[i]
      if (!pd) return

      const mesh = child as THREE.Mesh

      // Smooth continuous rotation
      mesh.rotation.z += pd.rotSpeed * delta

      // Smooth sinusoidal drift
      mesh.position.x = pd.x + Math.sin(t * pd.driftSpeed + pd.driftPhase) * 2
      mesh.position.y = pd.y + Math.cos(t * pd.driftSpeed * 0.7 + pd.driftPhase) * 1.2

      // Subtle breathing opacity
      const breathe = 0.85 + Math.sin(t * 0.3 + pd.driftPhase) * 0.15
      materials[i].opacity = opacity * (0.7 + (i % 3) * 0.2) * breathe
    })
  })

  return (
    <group ref={groupRef}>
      {planesData.map((pd, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={materials[i]}
          position={[pd.x, pd.y, pd.z]}
          rotation={[0, 0, pd.rotZ]}
          scale={[pd.scale, pd.scale, 1]}
        />
      ))}
    </group>
  )
}
