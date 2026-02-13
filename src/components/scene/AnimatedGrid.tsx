/**
 * AnimatedGrid — R3F port of 2015 GridObject3D.js
 *
 * Wireframe grid where each line segment animates from its
 * centre outward with a yoyo GSAP tween (random delay + duration).
 * Vertex colors gradient from fromColor → toColor.
 */
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface AnimatedGridProps {
  position?: [number, number, number]
  active?: boolean
  divisionsX?: number
  divisionsY?: number
  divisionSize?: number
  fromColor?: string
  toColor?: string
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function AnimatedGrid({
  position = [0, 0, 0],
  active = true,
  divisionsX = 11,
  divisionsY = 11,
  divisionSize = 4,
  fromColor = '#ffffff',
  toColor = '#0a0a0a',
}: AnimatedGridProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tweensRef = useRef<gsap.core.Tween[]>([])

  const width = (divisionsX - 1) * divisionSize
  const height = (divisionsY - 1) * divisionSize

  const fromCol = useMemo(() => new THREE.Color(fromColor), [fromColor])
  const toCol = useMemo(() => new THREE.Color(toColor), [toColor])

  // Build line geometries: each line is 3 vertices (start, centre, end)
  // The start & end animate from centre outward via GSAP
  const lines = useMemo(() => {
    const result: {
      geometry: THREE.BufferGeometry
      startTarget: { x: number; y: number; z: number }
      endTarget: { x: number; y: number; z: number }
      posAttr: THREE.BufferAttribute
    }[] = []

    // Vertical lines (along Y axis)
    for (let x = 0; x < divisionsX; x++) {
      const xPos = x * divisionSize - width / 2
      const centre = new THREE.Vector3(xPos, 0, 0)
      const top = new THREE.Vector3(xPos, height / 2, 0)
      const bottom = new THREE.Vector3(xPos, -height / 2, 0)

      const positions = new Float32Array([
        centre.x, centre.y, centre.z, // start (will animate to bottom)
        centre.x, centre.y, centre.z, // centre
        centre.x, centre.y, centre.z, // end (will animate to top)
      ])

      const colors = new Float32Array(9)
      const pct = Math.abs(xPos / width)
      const col = fromCol.clone().lerp(toCol, pct + 0.2)
      // start colour (dark)
      colors[0] = toCol.r; colors[1] = toCol.g; colors[2] = toCol.b
      // centre colour
      colors[3] = col.r; colors[4] = col.g; colors[5] = col.b
      // end colour (dark)
      colors[6] = toCol.r; colors[7] = toCol.g; colors[8] = toCol.b

      const geo = new THREE.BufferGeometry()
      const posAttr = new THREE.BufferAttribute(positions, 3)
      geo.setAttribute('position', posAttr)
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      result.push({
        geometry: geo,
        startTarget: { x: bottom.x, y: bottom.y, z: bottom.z },
        endTarget: { x: top.x, y: top.y, z: top.z },
        posAttr,
      })
    }

    // Horizontal lines (along X axis)
    for (let y = 0; y < divisionsY; y++) {
      const yPos = y * divisionSize - height / 2
      const centre = new THREE.Vector3(0, yPos, 0)
      const left = new THREE.Vector3(-width / 2, yPos, 0)
      const right = new THREE.Vector3(width / 2, yPos, 0)

      const positions = new Float32Array([
        centre.x, centre.y, centre.z,
        centre.x, centre.y, centre.z,
        centre.x, centre.y, centre.z,
      ])

      const colors = new Float32Array(9)
      const pct = Math.abs(yPos / height)
      const col = fromCol.clone().lerp(toCol, pct + 0.2)
      colors[0] = toCol.r; colors[1] = toCol.g; colors[2] = toCol.b
      colors[3] = col.r; colors[4] = col.g; colors[5] = col.b
      colors[6] = toCol.r; colors[7] = toCol.g; colors[8] = toCol.b

      const geo = new THREE.BufferGeometry()
      const posAttr = new THREE.BufferAttribute(positions, 3)
      geo.setAttribute('position', posAttr)
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      result.push({
        geometry: geo,
        startTarget: { x: left.x, y: left.y, z: left.z },
        endTarget: { x: right.x, y: right.y, z: right.z },
        posAttr,
      })
    }

    return result
  }, [divisionsX, divisionsY, divisionSize, width, height, fromCol, toCol])

  // Start yoyo tweens when active
  useEffect(() => {
    if (!active) {
      tweensRef.current.forEach((t) => t.pause())
      return
    }

    // Kill old tweens
    tweensRef.current.forEach((t) => t.kill())
    tweensRef.current = []

    lines.forEach((line) => {
      const posArr = line.posAttr.array as Float32Array

      // Animate start vertex (index 0) toward startTarget
      const startProxy = { x: posArr[0], y: posArr[1], z: posArr[2] }
      const tw1 = gsap.to(startProxy, {
        x: line.startTarget.x,
        y: line.startTarget.y,
        z: line.startTarget.z,
        duration: random(1, 2.5),
        delay: random(0, 2),
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut',
        onUpdate: () => {
          posArr[0] = startProxy.x
          posArr[1] = startProxy.y
          posArr[2] = startProxy.z
          line.posAttr.needsUpdate = true
        },
      })

      // Animate end vertex (index 2) toward endTarget
      const endProxy = { x: posArr[6], y: posArr[7], z: posArr[8] }
      const tw2 = gsap.to(endProxy, {
        x: line.endTarget.x,
        y: line.endTarget.y,
        z: line.endTarget.z,
        duration: random(1, 2.5),
        delay: random(0, 2),
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut',
        onUpdate: () => {
          posArr[6] = endProxy.x
          posArr[7] = endProxy.y
          posArr[8] = endProxy.z
          line.posAttr.needsUpdate = true
        },
      })

      tweensRef.current.push(tw1, tw2)
    })

    return () => {
      tweensRef.current.forEach((t) => t.kill())
      tweensRef.current = []
    }
  }, [active, lines])

  // Subtle rotation
  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z += delta * 0.015
  })

  return (
    <group ref={groupRef} position={position}>
      {lines.map((line, i) => (
        <lineSegments key={i} geometry={line.geometry} frustumCulled={false}>
          <lineBasicMaterial vertexColors transparent opacity={0.6} />
        </lineSegments>
      ))}
    </group>
  )
}
