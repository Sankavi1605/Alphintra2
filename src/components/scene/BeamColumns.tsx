/**
 * BeamColumns — R3F component.
 *
 * Faithful port of 2015 BeamObject3D.js + BeamsSection.js.
 *
 * Each beam "draws" from top to bottom by animating the body plane's
 * bottom vertices downward. At the bottom tip sits a cube connected to
 * the top by a thin line, and a moving flare that travels upward.
 *
 * 2015 layout: 3 beams at different positions/depths/colors.
 * Uses laser textures + additive blending for glow.
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

interface BeamConfig {
  x: number
  y: number
  z: number
  height: number
  width: number
  cubeSize: number
  color: string
  delay: number
}

interface BeamColumnsProps {
  active?: boolean
  position?: [number, number, number]
  beams?: BeamConfig[]
}

const defaultBeams: BeamConfig[] = [
  // 2015 leftBeam: pos (15,25,-10), color #808080, delay 0.2
  { x: 10, y: 8, z: -5, height: 15, width: 2, cubeSize: 0.5, color: '#808080', delay: 0.2 },
  // 2015 middleBeam: pos (0,15,0), color #fff, width 4, cubeSize 1, delay 0.1
  { x: 0, y: 5, z: 0, height: 15, width: 4, cubeSize: 1, color: '#ffffff', delay: 0.1 },
  // 2015 rightBeam: pos (-20,30,-20), color #4c4c4c, delay 0.4
  { x: -12, y: 10, z: -10, height: 15, width: 2, cubeSize: 0.5, color: '#4c4c4c', delay: 0.4 },
]

interface CacheState {
  y: number
  flareScale: number
  flareOpacity: number
  movingFlareY: number
  movingFlareScale: number
  movingFlareOpacity: number
  bodyOpacity: number
}

interface BeamObjects {
  group: THREE.Group
  bodyGeo: THREE.PlaneGeometry
  lineGeo: THREE.BufferGeometry
  bodyMat: THREE.MeshBasicMaterial
  capMat: THREE.MeshBasicMaterial
  flareMat: THREE.MeshBasicMaterial
  movingFlareMat: THREE.MeshBasicMaterial
  capBot: THREE.Mesh
  flareMesh: THREE.Mesh
  cubeGroup: THREE.Group
}

export default function BeamColumns({
  active = false,
  position = [0, 0, 0],
  beams = defaultBeams,
}: BeamColumnsProps) {
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const wasActiveRef = useRef(false)

  // Load laser textures
  const [bodyTex, capTex, flareTex] = useLoader(THREE.TextureLoader, [
    '/texture-laserBody.png',
    '/texture-laserCap.png',
    '/texture-laserFlare.png',
  ])

  // Per-beam animation state (GSAP drives these values)
  const cacheStates = useMemo<CacheState[]>(
    () =>
      beams.map((b) => ({
        y: b.height / 2 + b.width / 2, // collapsed at top
        flareScale: 1,
        flareOpacity: 1,
        movingFlareY: 0,
        movingFlareScale: 3,
        movingFlareOpacity: 1,
        bodyOpacity: 1,
      })),
    [beams]
  )

  // Build all Three.js objects imperatively (needed for vertex manipulation)
  const beamObjects = useMemo<BeamObjects[]>(() => {
    return beams.map((beam) => {
      const color = new THREE.Color(beam.color)
      const h = beam.height
      const w = beam.width
      const matOpts = {
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      }

      const bodyMat = new THREE.MeshBasicMaterial({ ...matOpts, map: bodyTex, color })
      const capMat = new THREE.MeshBasicMaterial({ ...matOpts, map: capTex, color })
      const flareMat = new THREE.MeshBasicMaterial({ ...matOpts, map: flareTex, color })
      const movingFlareMat = new THREE.MeshBasicMaterial({ ...matOpts, map: flareTex, color })
      const cubeMat = new THREE.MeshBasicMaterial({ ...matOpts, color })
      const lineMat = new THREE.LineBasicMaterial({ color })

      // ── Body plane ── bottom vertices start collapsed at top
      const bodyGeo = new THREE.PlaneGeometry(w, h, 1, 1)
      const posAttr = bodyGeo.getAttribute('position')
      // Indices: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
      posAttr.setY(2, h / 2 + w / 2)
      posAttr.setY(3, h / 2 + w / 2)
      posAttr.needsUpdate = true
      bodyGeo.computeBoundingSphere()
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)

      // ── Caps ──
      const capGeo = new THREE.PlaneGeometry(w, w)
      const capTop = new THREE.Mesh(capGeo, capMat)
      capTop.position.y = h / 2 + w / 2

      const capBot = new THREE.Mesh(capGeo.clone(), capMat)
      capBot.position.y = -(h / 2) - w / 2
      capBot.rotation.z = Math.PI

      // ── Floor flare ──
      const flareGeo = new THREE.PlaneGeometry(10, 10)
      const flareMesh = new THREE.Mesh(flareGeo, flareMat)
      flareMesh.position.y = -(h / 2) - w / 2

      // ── Line from top to extremity ──
      const lineGeo = new THREE.BufferGeometry()
      const lp = new Float32Array([0, h / 2 + w / 2, 0, 0, h / 2 + w / 2, 0])
      lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3))
      const lineMesh = new THREE.Line(lineGeo, lineMat)

      // ── Cube at extremity + moving flare (in a cubeGroup like 2015) ──
      const cubeGeo = new THREE.BoxGeometry(beam.cubeSize, beam.cubeSize, beam.cubeSize)
      const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat)

      const movingFlareGeo = new THREE.PlaneGeometry(10, 40)
      const movingFlareMesh = new THREE.Mesh(movingFlareGeo, movingFlareMat)
      movingFlareMesh.scale.x = 3

      const cubeGroup = new THREE.Group()
      cubeGroup.add(cubeMesh)
      cubeGroup.add(movingFlareMesh)

      // ── Assemble beam group (matches 2015 hierarchy) ──
      const group = new THREE.Group()
      group.position.set(beam.x, beam.y, beam.z)

      const bodyPlane = new THREE.Group()
      bodyPlane.add(bodyMesh)
      bodyPlane.add(capTop)
      bodyPlane.add(capBot)

      const body = new THREE.Group()
      body.add(bodyPlane)

      group.add(lineMesh)
      group.add(body)
      group.add(flareMesh)
      group.add(cubeGroup)

      return {
        group,
        bodyGeo,
        lineGeo,
        bodyMat,
        capMat,
        flareMat,
        movingFlareMat,
        capBot,
        flareMesh,
        cubeGroup,
      }
    })
  }, [beams, bodyTex, capTex, flareTex])

  // Build GSAP idle tweens
  useEffect(() => {
    const tweens: gsap.core.Tween[] = []
    cacheStates.forEach((cs) => {
      tweens.push(
        gsap.to(cs, {
          flareScale: 2,
          flareOpacity: 0.6,
          duration: random(1, 2),
          paused: true,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        })
      )
      tweens.push(
        gsap.to(cs, {
          movingFlareY: 30,
          movingFlareScale: 1,
          movingFlareOpacity: 0,
          duration: random(2, 6),
          paused: true,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        })
      )
      tweens.push(
        gsap.to(cs, {
          bodyOpacity: 0.5,
          duration: random(1, 2),
          paused: true,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        })
      )
    })
    tweensRef.current = tweens
    return () => {
      tweens.forEach((t) => t.kill())
    }
  }, [cacheStates])

  // In / Out transitions
  useEffect(() => {
    if (active && !wasActiveRef.current) {
      cacheStates.forEach((cs, i) => {
        gsap.to(cs, {
          y: -5,
          duration: 1,
          delay: beams[i].delay,
          ease: 'power2.out',
        })
      })
      tweensRef.current.forEach((t) => t.resume())
      wasActiveRef.current = true
    } else if (!active && wasActiveRef.current) {
      tweensRef.current.forEach((t) => t.pause())
      cacheStates.forEach((cs, i) => {
        gsap.to(cs, {
          y: -70,
          duration: 1,
          delay: beams[i].delay * 0.5,
          ease: 'power2.in',
        })
      })
      wasActiveRef.current = false
    }
  }, [active, cacheStates, beams])

  // Per-frame: sync GSAP cache into vertex positions & meshes
  useFrame(() => {
    beamObjects.forEach((bo, i) => {
      const cs = cacheStates[i]
      const w = beams[i].width

      // ── Draw effect: move body bottom vertices ──
      const posAttr = bo.bodyGeo.getAttribute('position')
      posAttr.setY(2, cs.y)
      posAttr.setY(3, cs.y)
      posAttr.needsUpdate = true
      bo.bodyGeo.computeBoundingSphere()

      const extremity = cs.y - w / 2

      // Bottom cap, flare, cubeGroup → track extremity
      bo.capBot.position.y = extremity
      bo.flareMesh.position.y = extremity
      bo.cubeGroup.position.y = extremity

      // Line bottom vertex → extremity
      const lineAttr = bo.lineGeo.getAttribute('position')
      lineAttr.setY(1, extremity)
      lineAttr.needsUpdate = true

      // Flare idle animation
      bo.flareMesh.scale.set(cs.flareScale, cs.flareScale, 1)
      bo.flareMat.opacity = cs.flareOpacity

      // Moving flare (local to cubeGroup, y=0 = at extremity)
      const movingFlare = bo.cubeGroup.children[1] as THREE.Mesh
      if (movingFlare) {
        movingFlare.position.y = cs.movingFlareY
        movingFlare.scale.x = cs.movingFlareScale
        bo.movingFlareMat.opacity = cs.movingFlareOpacity
      }

      // Body + cap opacity pulse
      bo.bodyMat.opacity = cs.bodyOpacity
      bo.capMat.opacity = cs.bodyOpacity
    })
  })

  return (
    <group position={position}>
      {beamObjects.map((bo, i) => (
        <primitive key={i} object={bo.group} />
      ))}
    </group>
  )
}
