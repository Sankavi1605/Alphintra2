/**
 * NeonTubes — R3F port of 2015 NeonObject3D.js
 *
 * Faithful reproduction:
 *  - CylinderGeometry(0.2, 0.2, width, 6) tube with MeshLambertMaterial
 *  - 3 glow PlaneGeometry(5, width+3) planes rotated by i*0.7*PI
 *  - PlaneGeometry(width*2, 50) projection plane at z=-1
 *  - Flicker-on state machine: random blinks, then idle glow oscillation
 *  - Uses texture-neonGlow.png and texture-neonProjection.png
 */
import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface NeonTubesProps {
  position?: [number, number, number]
  active?: boolean
  count?: number
  spread?: number
  tubeWidth?: number
  color?: string
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

interface TubeState {
  group: THREE.Group
  tubeMat: THREE.MeshLambertMaterial
  glowMats: THREE.MeshBasicMaterial[]
  projMat: THREE.MeshBasicMaterial
  tweens: (gsap.core.Tween | gsap.core.Timeline)[]
}

export default function NeonTubes({
  position = [0, 0, 0],
  active = true,
  count = 5,
  spread = 16,
  tubeWidth = 20,
  color = '#ffffff',
}: NeonTubesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tubesRef = useRef<TubeState[]>([])
  const activeRef = useRef(active)
  activeRef.current = active

  // Load 2015 neon textures
  const [glowTex, projTex] = useLoader(THREE.TextureLoader, [
    '/texture-neonGlow.png',
    '/texture-neonProjection.png',
  ])

  const neonColor = useMemo(() => new THREE.Color(color), [color])

  // Build tube groups imperatively (like 2015)
  const tubes = useMemo(() => {
    const arr: TubeState[] = []

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group()
      const width = tubeWidth * random(0.6, 1.2)

      // Random placement
      group.position.set(
        random(-spread / 2, spread / 2),
        random(-2, 2),
        random(-3, 1)
      )
      group.rotation.z = random(-0.15, 0.15)

      // 1) Tube body — CylinderGeometry(0.2, 0.2, width, 6)
      const tubeMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color('#808080'),
        emissive: new THREE.Color('#000000'),
      })
      const tubeGeo = new THREE.CylinderGeometry(0.2, 0.2, width, 6)
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      tubeMesh.rotation.z = Math.PI / 2 // Horizontal orientation
      group.add(tubeMesh)

      // 2) Glow planes — 3 copies rotated by i * 0.7 * PI
      const glowMats: THREE.MeshBasicMaterial[] = []
      for (let p = 0; p < 3; p++) {
        const gMat = new THREE.MeshBasicMaterial({
          map: glowTex,
          color: neonColor,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
        })
        glowMats.push(gMat)

        const glowGeo = new THREE.PlaneGeometry(width + 3, 5)
        const glowMesh = new THREE.Mesh(glowGeo, gMat)
        glowMesh.rotation.x = p * 0.7 * Math.PI
        group.add(glowMesh)
      }

      // 3) Projection plane — PlaneGeometry(width*2, 50) at z=-1
      const projMat = new THREE.MeshBasicMaterial({
        map: projTex,
        color: neonColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      })
      const projGeo = new THREE.PlaneGeometry(width * 2, 50)
      const projMesh = new THREE.Mesh(projGeo, projMat)
      projMesh.position.z = -1
      group.add(projMesh)

      arr.push({ group, tubeMat, glowMats, projMat, tweens: [] })
    }
    return arr
  }, [count, spread, tubeWidth, neonColor, glowTex, projTex])

  useEffect(() => {
    tubesRef.current = tubes
  }, [tubes])

  // Flicker-on state machine + idle glow
  const startIdle = useCallback((t: TubeState) => {
    // Idle glow oscillation: glow 0.4→0.7, projection 0.08→0.15
    const state = { glowOp: 0.4, projOp: 0.08 }
    const breathe = gsap.to(
      state,
      {
        glowOp: 0.7,
        projOp: 0.15,
        duration: random(0.8, 5),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        onUpdate() {
          t.glowMats.forEach(m => { m.opacity = state.glowOp })
          t.projMat.opacity = state.projOp
        },
      }
    )
    t.tweens.push(breathe)

    // Random flick-offs (like 2015)
    const flickOff = () => {
      if (!activeRef.current) return
      // Turn off briefly
      t.glowMats.forEach(m => { m.opacity = 0 })
      t.projMat.opacity = 0
      t.tubeMat.emissive.setHex(0x000000)

      gsap.delayedCall(random(0.05, 0.1), () => {
        if (!activeRef.current) return
        t.tubeMat.emissive.copy(new THREE.Color(color))
        t.glowMats.forEach(m => { m.opacity = 0.4 })
        t.projMat.opacity = 0.08
      })

      const next = gsap.delayedCall(random(3, 10), flickOff)
      t.tweens.push(next)
    }
    const startFlick = gsap.delayedCall(random(1, 4), flickOff)
    t.tweens.push(startFlick)
  }, [color])

  useEffect(() => {
    if (!active) {
      tubes.forEach((t) => {
        t.tweens.forEach((tw) => tw.kill())
        t.tweens = []
        t.tubeMat.emissive.setHex(0x000000)
        t.glowMats.forEach(m => { m.opacity = 0 })
        t.projMat.opacity = 0
      })
      return
    }

    // Flicker-on sequence (like 2015)
    tubes.forEach((t, i) => {
      const delay = i * random(0.15, 0.4)
      const totalFlicker = Math.floor(random(3, 6))

      const flickerTl = gsap.timeline({ delay })

      for (let b = 0; b < totalFlicker; b++) {
        const flickDur = random(0.05, 0.07)
        // Flick ON
        flickerTl.call(() => {
          t.tubeMat.emissive.copy(new THREE.Color(color))
          t.glowMats.forEach(m => { m.opacity = 0.3 })
          t.projMat.opacity = 0.05
        })
        flickerTl.to({}, { duration: flickDur })
        // Flick OFF
        flickerTl.call(() => {
          t.tubeMat.emissive.setHex(0x000000)
          t.glowMats.forEach(m => { m.opacity = 0 })
          t.projMat.opacity = 0
        })
        flickerTl.to({}, { duration: random(0.05, 0.1) })
      }

      // Final ON — transition to idle
      flickerTl.call(() => {
        t.tubeMat.emissive.copy(new THREE.Color(color))
        t.glowMats.forEach(m => { m.opacity = 0.4 })
        t.projMat.opacity = 0.08
        startIdle(t)
      })

      t.tweens.push(flickerTl)
    })

    return () => {
      tubes.forEach((t) => {
        t.tweens.forEach((tw) => tw.kill())
        t.tweens = []
      })
    }
  }, [active, tubes, color, startIdle])

  // Idle breathe uses onUpdate, so we don't need useFrame for materials
  // But we can use it for subtle position drift
  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = performance.now() * 0.001
    tubes.forEach((tube, i) => {
      // Subtle sway
      tube.group.position.y += Math.sin(t * 0.5 + i) * 0.001 * delta * 60
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {tubes.map((t, i) => (
        <primitive key={i} object={t.group} />
      ))}
    </group>
  )
}
