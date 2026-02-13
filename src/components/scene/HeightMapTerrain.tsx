/**
 * HeightMapTerrain — R3F port of 2015 HeightMapObject3D.js
 *
 * Procedural terrain wireframe that morphs between random height maps
 * using GSAP Elastic easing. Vertex colors change based on height.
 */
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface HeightMapTerrainProps {
  position?: [number, number, number]
  active?: boolean
  divisionsX?: number
  divisionsY?: number
  size?: number
  amplitude?: number
  fromColor?: string
  toColor?: string
  mapCount?: number
}

/** Simple seeded noise-like function for procedural height maps */
function pseudoNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7585) * 43758.5453
  return n - Math.floor(n)
}

function generateHeightData(
  divX: number,
  divY: number,
  seed: number,
  amplitude: number
): Float32Array {
  const total = (divX + 1) * (divY + 1)
  const data = new Float32Array(total)
  for (let y = 0; y <= divY; y++) {
    for (let x = 0; x <= divX; x++) {
      // Layered noise for more interesting terrain
      const nx = x / divX
      const ny = y / divY
      const v =
        pseudoNoise(nx * 3, ny * 3, seed) * 0.6 +
        pseudoNoise(nx * 7, ny * 7, seed + 100) * 0.25 +
        pseudoNoise(nx * 13, ny * 13, seed + 200) * 0.15
      data[y * (divX + 1) + x] = v * amplitude
    }
  }
  return data
}

export default function HeightMapTerrain({
  position = [0, 0, 0],
  active = true,
  divisionsX = 30,
  divisionsY = 30,
  size = 50,
  amplitude = 8,
  fromColor = '#4c4c4c',
  toColor = '#ffffff',
  mapCount = 4,
}: HeightMapTerrainProps) {
  const groupRef = useRef<THREE.Group>(null)
  const geoRef = useRef<THREE.PlaneGeometry>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const currentMap = useRef(0)
  const prevData = useRef<Float32Array | null>(null)

  const fromCol = useMemo(() => new THREE.Color(fromColor), [fromColor])
  const toCol = useMemo(() => new THREE.Color(toColor), [toColor])

  // Pre-generate procedural height maps
  const maps = useMemo(() => {
    const arr: Float32Array[] = []
    for (let i = 0; i < mapCount; i++) {
      arr.push(generateHeightData(divisionsX, divisionsY, i * 17 + 42, amplitude))
    }
    return arr
  }, [divisionsX, divisionsY, amplitude, mapCount])

  // Build horizontal line segments (like the 2015 version)
  const linePositions = useMemo(() => {
    const verts: number[] = []
    const halfW = size / 2
    const halfH = size / 2
    const stepX = size / divisionsX
    const stepY = size / divisionsY
    // Horizontal lines
    for (let y = 0; y <= divisionsY; y++) {
      for (let x = 0; x < divisionsX; x++) {
        const x0 = -halfW + x * stepX
        const x1 = -halfW + (x + 1) * stepX
        const yPos = -halfH + y * stepY
        // start vertex
        verts.push(x0, yPos, 0)
        // end vertex
        verts.push(x1, yPos, 0)
      }
    }
    return new Float32Array(verts)
  }, [divisionsX, divisionsY, size])

  // Initial color buffer
  const lineColors = useMemo(() => {
    const count = linePositions.length / 3
    const cols = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      cols[i * 3] = fromCol.r
      cols[i * 3 + 1] = fromCol.g
      cols[i * 3 + 2] = fromCol.b
    }
    return cols
  }, [linePositions, fromCol])

  // Apply height data to line positions + vertex colours
  const applyHeights = (positions: Float32Array, colors: Float32Array, data: Float32Array) => {
    let vi = 0
    const tmpColor = new THREE.Color()
    for (let y = 0; y <= divisionsY; y++) {
      for (let x = 0; x < divisionsX; x++) {
        const idx0 = y * (divisionsX + 1) + x
        const idx1 = y * (divisionsX + 1) + x + 1
        const z0 = data[idx0]
        const z1 = data[idx1]

        // start
        positions[vi * 3 + 2] = z0
        const p0 = Math.min(1, Math.max(0, z0 / amplitude))
        tmpColor.copy(fromCol).lerp(toCol, p0)
        colors[vi * 3] = tmpColor.r
        colors[vi * 3 + 1] = tmpColor.g
        colors[vi * 3 + 2] = tmpColor.b
        vi++

        // end
        positions[vi * 3 + 2] = z1
        const p1 = Math.min(1, Math.max(0, z1 / amplitude))
        tmpColor.copy(fromCol).lerp(toCol, p1)
        colors[vi * 3] = tmpColor.r
        colors[vi * 3 + 1] = tmpColor.g
        colors[vi * 3 + 2] = tmpColor.b
        vi++
      }
    }
  }

  // Morph between maps with Elastic ease
  const morphTo = (nextIndex: number) => {
    const prev = prevData.current ?? maps[0]
    const next = maps[nextIndex]

    tweenRef.current?.kill()
    tweenRef.current = gsap.to({ factor: 1 }, {
      factor: 0,
      duration: 1.5,
      ease: 'elastic.out(1, 0.5)',
      onUpdate: function () {
        const f = (this as any).targets()[0].factor as number
        const geo = geoRef.current
        if (!geo) return
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
        const colAttr = geo.getAttribute('color') as THREE.BufferAttribute
        const posArr = posAttr.array as Float32Array
        const colArr = colAttr.array as Float32Array
        const tmpColor = new THREE.Color()

        let vi = 0
        for (let y = 0; y <= divisionsY; y++) {
          for (let x = 0; x < divisionsX; x++) {
            const idx0 = y * (divisionsX + 1) + x
            const idx1 = y * (divisionsX + 1) + x + 1
            const z0 = next[idx0] + (prev[idx0] - next[idx0]) * f
            const z1 = next[idx1] + (prev[idx1] - next[idx1]) * f

            posArr[vi * 3 + 2] = z0
            const p0 = Math.min(1, Math.max(0, z0 / amplitude))
            tmpColor.copy(fromCol).lerp(toCol, p0)
            colArr[vi * 3] = tmpColor.r
            colArr[vi * 3 + 1] = tmpColor.g
            colArr[vi * 3 + 2] = tmpColor.b
            vi++

            posArr[vi * 3 + 2] = z1
            const p1 = Math.min(1, Math.max(0, z1 / amplitude))
            tmpColor.copy(fromCol).lerp(toCol, p1)
            colArr[vi * 3] = tmpColor.r
            colArr[vi * 3 + 1] = tmpColor.g
            colArr[vi * 3 + 2] = tmpColor.b
            vi++
          }
        }

        posAttr.needsUpdate = true
        colAttr.needsUpdate = true
      },
    })

    prevData.current = next
  }

  // Idle cycling between maps
  useEffect(() => {
    if (!active) {
      tweenRef.current?.kill()
      return
    }

    // Apply first map immediately
    const geo = geoRef.current
    if (geo) {
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute
      applyHeights(
        posAttr.array as Float32Array,
        colAttr.array as Float32Array,
        maps[currentMap.current]
      )
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      prevData.current = maps[currentMap.current]
    }

    // Cycle maps
    const cycle = () => {
      currentMap.current = (currentMap.current + 1) % maps.length
      morphTo(currentMap.current)
    }

    const interval = setInterval(cycle, 3000 + Math.random() * 2000)
    // Kick off first morph after a short delay
    const timeout = setTimeout(cycle, 800)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      tweenRef.current?.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Gentle idle rotation
  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z += delta * 0.03
  })

  return (
    <group ref={groupRef} position={position} rotation={[-Math.PI / 2.5, 0, 0]}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions.slice(), 3]}
            count={linePositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColors.slice(), 3]}
            count={lineColors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} />
      </lineSegments>
    </group>
  )
}
