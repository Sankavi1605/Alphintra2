/**
 * GalaxyRings — R3F port of 2015 GalaxyObject3D.js
 *
 * Concentric orbital rings with planets (spheres) orbiting at
 * different radii and speeds. Ring colours cycle with a gradient
 * shimmer effect. The whole group tilts for a 3D perspective.
 */
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface GalaxyRingsProps {
  position?: [number, number, number]
  active?: boolean
  ringCount?: number
  ringDivisions?: number
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

interface PlanetData {
  mesh: THREE.Mesh
  radius: number
  theta: number
  speed: number
}

export default function GalaxyRings({
  position = [0, 0, 0],
  active = true,
  ringCount = 5,
  ringDivisions = 100,
}: GalaxyRingsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const planetsRef = useRef<PlanetData[]>([])
  const baseRingRef = useRef<THREE.Line | null>(null)
  const colorOffsetRef = useRef(0)

  const radii = useMemo(
    () => [4, 6, 10, 15, 19].slice(0, ringCount),
    [ringCount]
  )

  const planetConfigs = useMemo(
    () => [
      { radius: 4, scale: 0.15, color: '#ffffff', speed: 0.03 },
      { radius: 6, scale: 0.08, color: '#4c4c4c', speed: 0.025 },
      { radius: 10, scale: 0.35, color: '#4c4c4c', speed: 0.018 },
      { radius: 15, scale: 0.5, color: '#ffffff', speed: 0.01 },
      { radius: 19, scale: 0.3, color: '#000000', speed: 0.04 },
    ].slice(0, ringCount),
    [ringCount]
  )

  // Build ring geometry (unit circle, scaled per ring)
  const ringGeometry = useMemo(() => {
    const positions: number[] = []
    const step = (2 * Math.PI) / ringDivisions
    for (let i = 0; i <= ringDivisions; i++) {
      const theta = i * step
      positions.push(Math.cos(theta), Math.sin(theta), 0)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )

    // Initial colors — gradient shimmer
    const fromColor = new THREE.Color('#ffffff')
    const toColor = new THREE.Color('#333333')
    const colors: number[] = []
    const gradientSteps = 30
    for (let i = 0; i <= ringDivisions; i++) {
      const ci = i % gradientSteps
      const pct = mapRange(ci, 0, gradientSteps, 0, 1)
      const c = fromColor.clone().lerp(toColor, pct)
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    return geo
  }, [ringDivisions])

  // Build planet meshes
  const planets = useMemo(() => {
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16)
    return planetConfigs.map((cfg) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.9,
      })
      const mesh = new THREE.Mesh(sphereGeo, mat)
      const theta = random(0, 2 * Math.PI)
      mesh.position.set(
        cfg.radius * Math.cos(theta),
        cfg.radius * Math.sin(theta),
        0
      )
      mesh.scale.setScalar(cfg.scale)
      return { mesh, radius: cfg.radius, theta, speed: cfg.speed }
    })
  }, [planetConfigs])

  useEffect(() => {
    planetsRef.current = planets
  }, [planets])

  // Animate colour cycling (shift colors array)
  useEffect(() => {
    if (!active) {
      tweenRef.current?.kill()
      return
    }

    tweenRef.current = gsap.to(colorOffsetRef, {
      current: ringDivisions,
      duration: 20,
      repeat: -1,
      ease: 'none',
    })

    return () => {
      tweenRef.current?.kill()
    }
  }, [active, ringDivisions])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = active
    }
  }, [active])

  useFrame((_, delta) => {
    if (!active) return

    // Orbit planets
    planetsRef.current.forEach((p) => {
      p.theta -= p.speed
      p.mesh.position.x = p.radius * Math.cos(p.theta)
      p.mesh.position.y = p.radius * Math.sin(p.theta)
    })

    // Color cycling on base ring
    if (baseRingRef.current) {
      const colAttr = baseRingRef.current.geometry.getAttribute(
        'color'
      ) as THREE.BufferAttribute
      const arr = colAttr.array as Float32Array
      const count = colAttr.count

      const fromColor = new THREE.Color('#ffffff')
      const toColor = new THREE.Color('#333333')
      const gradientSteps = 30
      const offset = Math.floor(colorOffsetRef.current) % ringDivisions

      for (let i = 0; i < count; i++) {
        const shifted = (i + offset) % gradientSteps
        const pct = mapRange(shifted, 0, gradientSteps, 0, 1)
        const c = fromColor.clone().lerp(toColor, pct)
        arr[i * 3] = c.r
        arr[i * 3 + 1] = c.g
        arr[i * 3 + 2] = c.b
      }
      colAttr.needsUpdate = true
    }

    // Gentle group rotation
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.01
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[-1, 0.2, 0]}
    >
      {radii.map((r, i) => {
        const geo = ringGeometry.clone()
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 })
        const line = new THREE.Line(geo, mat)
        line.scale.set(r, r, r)
        line.rotation.z = random(0, Math.PI)
        return (
          <primitive
            key={`ring-${i}`}
            ref={i === 0 ? (ref: THREE.Line | null) => { baseRingRef.current = ref } : undefined}
            object={line}
          />
        )
      })}

      {planets.map((p, i) => (
        <primitive key={`planet-${i}`} object={p.mesh} />
      ))}
    </group>
  )
}
