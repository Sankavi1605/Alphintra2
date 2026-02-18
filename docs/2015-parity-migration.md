# 2015 Codebase Analysis and Exact-Parity Migration Plan for Aphintra2

## Goal
Rebuild the `2015` WebGL experience inside `Aphintra2` with:
- Exact section-based 3D animation behavior.
- Smooth camera/object transitions.
- One section using two scroll stages:
  - Stage 1: heading only
  - Stage 2: detail cards
- SEO + AEO upgrades for production discoverability.

## 1) What `2015` Actually Does (Source of Truth)

### Core runtime model
- Entry: `2015/app/src/js/main3D.js`.
- Scene controller: `2015/app/src/js/modules/sceneModule.js`.
- Section abstraction: `2015/app/src/js/classes/SectionClass.js`.
- Section change lifecycle:
  - `section:changeBegin` -> trigger `in/start` for target and `out` for previous.
  - `section:changeComplete` -> stop/hide non-adjacent sections.

### Camera rail and timing
- Section spacing: `50` units (`sectionHeight`).
- Camera tween on section change:
  - duration: `1.5s`
  - easing: `Quart.easeInOut`
  - position: `camera.position.y = -index * 50`
- Intro camera push-in (`SCENE.in()`):
  - FOV `200 -> 60` over `2s`
  - with background line z-speed kick.

### Input behavior
- Wheel + key-driven discrete section navigation.
- Scroll smoothing gate: ignore high-frequency wheel noise (elapsed > `50ms`).
- Map dot navigation (`MapObject2D`) jumps directly to section index.

### Global visual system
- Fog: `FogExp2('#0a0a0a', 0.01)`.
- Camera baseline: perspective ~20 deg, z ~40.
- Background:
  - floating particles (`BackgroundParticlesObject3D`)
  - thin animated lines (`BackgroundLinesObject3D`)
- Ambient camera micro-motion:
  - mouse-parallax x
  - tiny shake on y

## 2) Section/Object Parity Map (2015 -> Aphintra2)

| 2015 section | 2015 objects | Aphintra2 target |
|---|---|---|
| `hello` | `HelloTitleObject3D`, `SmokeObject3D` | hero text + `FogClouds` |
| `beams` | `BeamObject3D` x3 | `BeamColumns` |
| `drop` | `DropObject3D` + text panel | `RippleDrop` + heading layer |
| `ball` | `BallObject3D` + `GridObject3D` + text | `GlitchSphere` + `AnimatedGrid` + heading |
| `flow` | `FlowFieldObject3D` + text | flow-like section behavior (heading + stage logic) |
| `neons` | `NeonObject3D` + smoke | `NeonTubes` + optional fog carryover |
| `height` | `HeightMapObject3D` + text | `HeightMapTerrain` + heading |
| `wave` | `WaveObject3D` + text | `WaveGrid` + heading |
| `face` | `FaceHpObject3D` + `StripsObject3D` + text | `LowPolyHead` + heading |
| `rocks` | `RocksObject3D` + text | ring/mesh parity in section visuals |
| `galaxy` | `GalaxyObject3D` + text | `GalaxyRings` + heading |
| `gravity` | `GravityGridObject3D` | grid/force field section |
| `end` | `LookAtFieldObject3D` + text | final CTA/contact section |

## 3) Exact Animation Constraints to Keep

### Text panels (critical)
From `TextPanelObject3D.js`:
- `in`: `y -20 -> 0`, `opacity 0 -> 1`, duration `1.5s`
- `out`: `y 0 -> +/-20`, `opacity 1 -> 0`, duration `1s`

### Section transition cadence
- Transition duration between sections stays `1.5s`.
- Outgoing content exits immediately at transition start.
- Incoming content animates in the same transition window.

### Visibility discipline
- Sections are not all active at once.
- Non-neighbor sections should stop expensive loops (flickers/noise updates).
- Keep `start/stop` semantics to control GPU workload.

## 4) Requested Scroll Change: One Section, Two Scroll Stages

### Requirement interpretation
Only one selected section should split into:
1. Heading stage.
2. Detail card stage.

### Implementation rule
- Define one `dualScrollSectionId` (default: `hero`).
- Build steps as:
  - all sections: title step only
  - `dualScrollSectionId`: title step + detail step
  - portfolio retains its own internal horizontal behavior

### Expected UX
- Scroll into section -> heading enters first.
- Next scroll in same section -> detail card appears, heading hides.
- Next scroll exits to next section.

## 5) SEO + AEO Plan

### SEO baseline
Update `index.html` with:
- canonical URL
- robots
- richer title/description
- OpenGraph + Twitter cards
- theme-color and app metadata polish

### AEO (answer-engine optimization)
Add JSON-LD:
- `Organization`
- `WebSite`
- `Service` entries (core offerings)
- `FAQPage` for concise Q/A retrieval

Also ensure semantic clarity:
- meaningful section IDs
- descriptive `aria-label` on nav controls
- stable heading hierarchy in main content

## 6) Implementation Order
1. Wire `Scene3D` as persistent background and sync with scroll progress.
2. Align section step engine to single dual-scroll section behavior.
3. Keep 2015 transition timings/easing and smooth camera interpolation.
4. Add SEO + AEO metadata and structured data.
5. Build/verify and adjust any visual regressions.

## 7) Files to Touch in Aphintra2
- `src/App.tsx`
- `src/components/ScrollSections.tsx`
- `src/index.css` (only if layering/visibility tuning is needed)
- `index.html` (SEO/AEO metadata + JSON-LD)

