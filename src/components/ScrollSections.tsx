/**
 * ScrollSections — ported from vaalentin/2015 sceneModule + sections.
 *
 * Faithfully reproduces the original animation architecture:
 *
 *  ┌──────────────────────────────────────────────────┐
 *  │  SCENE.on('section:changeBegin', …)              │
 *  │    → section.in()   → TweenLite.to(cache, 1.5, { y:0, opacity:1 })  │
 *  │    → section.out(way) → TweenLite.to(cache, 1, { y:±20, opacity:0 })│
 *  │                                                  │
 *  │  Camera tween  → TweenLite.to(camera.position, 1.5, {               │
 *  │                     y: nextPosition,                                  │
 *  │                     ease: Quart.easeInOut                            │
 *  │                  })                                                  │
 *  │                                                  │
 *  │  Scroll hijacking → wheel / key / touch          │
 *  │  Section map → dot navigation                    │
 *  └──────────────────────────────────────────────────┘
 *
 *  Each section text uses the TextPanelObject3D in/out pattern:
 *    in()  → position.y: -20 → 0, opacity: 0 → 1, duration: 1.5
 *    out() → position.y: 0 → ±20, opacity: 1 → 0, duration: 1
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { ReactElement, MutableRefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import PortfolioHorizontal from './PortfolioHorizontal'
import SectionLines from './SectionLines'
import ParticleBackground from './ParticleBackground'
import WireframeLines from './WireframeLines'
import NeonText from './NeonText'
import HeroSmoke from './HeroSmoke'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// ── Char splitter (for per-character animation) ─────────────
function splitToChars(text: string): ReactElement[] {
  return text.split('').map((ch, i) => (
    <span key={i} className="char" style={{ display: 'inline-block' }}>
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ))
}

// ── Section data ────────────────────────────────────────────
interface SectionData {
  id: string
  line1: string
  line2: string
  subtitle: string
  detail?: ReactElement | string
  isPortfolio?: boolean
  align: 'left' | 'right' | 'center'
}

const sections: SectionData[] = [
  {
    id: 'hello',
    line1: 'ALPHINTRA',
    line2: '',
    subtitle: '',
    detail: '',
    align: 'center',
  },
  {
    id: 'hero',
    line1: 'ENGINEERING',
    line2: 'THE FUTURE',
    subtitle: 'OF DIGITAL INTELLIGENCE',
    align: 'left',
    detail: (
      <>
        <h4>Building Scalable Digital Solutions</h4>
        <p>
          From AI-driven trading platforms to enterprise-grade logistics — we
          build scalable solutions that define industries. Our team combines deep
          technical expertise with a relentless focus on user experience.
        </p>
        <div className="glass-card__cta-row">
          <a href="#portfolio" className="glass-card__btn glass-card__btn--primary">View Our Work</a>
          <a href="#contact" className="glass-card__btn glass-card__btn--outline">Start a Project</a>
        </div>
      </>
    ),
  },
  {
    id: 'web',
    line1: 'WEB &',
    line2: 'MOBILE',
    subtitle: 'NEXT.JS • FLUTTER • REACT',
    align: 'right',
    detail: (
      <>
        <h4>High-Performance Applications</h4>
        <p>
          We craft SEO-optimized web applications with Next.js and stunning
          cross-platform mobile experiences with Flutter. Blazing fast, pixel
          perfect, and built to scale.
        </p>
        <div className="glass-card__tags">
          <span>Next.js</span><span>React</span><span>Flutter</span><span>TypeScript</span><span>Tailwind</span>
        </div>
      </>
    ),
  },
  {
    id: 'ai',
    line1: 'AI &',
    line2: 'AUTOMATION',
    subtitle: 'RAG • LLM • LANGCHAIN',
    align: 'left',
    detail: (
      <>
        <h4>Intelligent Systems</h4>
        <p>
          Moving beyond basic apps with LangChain and RAG workflows. We integrate
          LLMs into business processes to make organizations smarter, faster, and
          more data-driven.
        </p>
        <div className="glass-card__tags">
          <span>LangChain</span><span>RAG</span><span>GPT</span><span>Python</span><span>Vector DB</span>
        </div>
      </>
    ),
  },
  {
    id: 'enterprise',
    line1: 'ENTERPRISE',
    line2: 'BACKEND',
    subtitle: 'SPRING BOOT • MICROSERVICES • GCP',
    align: 'right',
    detail: (
      <>
        <h4>Rock-Solid Infrastructure</h4>
        <p>
          Spring Boot microservices deployed on GCP with Docker. Designed for
          99.9% uptime, horizontal scaling, and enterprise-grade security.
        </p>
        <div className="glass-card__tags">
          <span>Spring Boot</span><span>Java</span><span>Docker</span><span>GCP</span><span>PostgreSQL</span>
        </div>
      </>
    ),
  },
  {
    id: 'design',
    line1: 'UI/UX &',
    line2: '3D DESIGN',
    subtitle: 'FIGMA • THREE.JS • INTERACTIVE',
    align: 'left',
    detail: (
      <>
        <h4>Immersive Experiences</h4>
        <p>
          High-fidelity prototyping in Figma, interactive 3D experiences with
          Three.js, and designs that captivate. We bridge creativity and code.
        </p>
        <div className="glass-card__tags">
          <span>Figma</span><span>Three.js</span><span>GSAP</span><span>Framer Motion</span><span>WebGL</span>
        </div>
      </>
    ),
  },
  {
    id: 'portfolio',
    line1: 'OUR',
    line2: 'WORK',
    subtitle: 'CIPERLUX • BUSHUBLK • APEX FINANCE',
    align: 'center',
    isPortfolio: true,
  },
  {
    id: 'process',
    line1: 'THE',
    line2: 'ALPHINTRA WAY',
    subtitle: 'DISCOVERY → DESIGN → SPRINT → DEPLOY',
    align: 'left',
    detail: (
      <div className="glass-card__timeline">
        <div className="glass-card__step"><span>01</span><h5>Discovery</h5><p>Understanding business goals and user needs</p></div>
        <div className="glass-card__step"><span>02</span><h5>Design</h5><p>High-fidelity Figma prototyping</p></div>
        <div className="glass-card__step"><span>03</span><h5>Sprint Dev</h5><p>Agile development with weekly demos</p></div>
        <div className="glass-card__step"><span>04</span><h5>Deploy</h5><p>GCP hosting with continuous monitoring</p></div>
      </div>
    ),
  },
  {
    id: 'team',
    line1: 'THE',
    line2: 'TEAM',
    subtitle: 'FRONTEND • BACKEND • DESIGN',
    align: 'right',
    detail: (
      <>
        <h4>Built by Makers</h4>
        <p>
          Born from UCSC, grown into a full-service tech agency. Our team spans
          frontend engineering, cloud architecture, AI/ML, and UI/UX design.
        </p>
        <div className="glass-card__roles">
          <div>Frontend Engineering</div>
          <div>Backend &amp; Cloud Architecture</div>
          <div>AI &amp; Machine Learning</div>
          <div>UI/UX &amp; 3D Design</div>
        </div>
      </>
    ),
  },
  {
    id: 'contact',
    line1: "LET'S",
    line2: 'TALK',
    subtitle: 'START YOUR PROJECT TODAY',
    align: 'center',
    detail: (
      <>
        <h4>Start Your Project</h4>
        <p>
          Tell us what you're building. Web, mobile, AI, or enterprise — we'll
          make it happen.
        </p>
        <div className="glass-card__cta-row">
          <a href="mailto:hello@alphintra.com" className="glass-card__btn glass-card__btn--primary">
            Get in Touch
          </a>
        </div>
      </>
    ),
  },
]

// ── Step system ─────────────────────────────────────────────
interface Step {
  sectionIndex: number
  subStep: 'title' | 'detail' | 'portfolio'
}

const steps: Step[] = []
sections.forEach((s, i) => {
  steps.push({ sectionIndex: i, subStep: 'title' })
  if (s.isPortfolio) {
    steps.push({ sectionIndex: i, subStep: 'portfolio' })
  } else if (s.detail) {
    steps.push({ sectionIndex: i, subStep: 'detail' })
  }
})

// ═══════════════════════════════════════════════════════════
// ══ COMPONENT ═════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════

interface ScrollSectionsProps {
  onScrollProgress: (progress: number) => void
}

export default function ScrollSections({
  onScrollProgress,
}: ScrollSectionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const isAnimating = useRef(false)
  const currentStepRef = useRef(0)
  const wheelAccum = useRef(0)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track which detail cards are visible
  const [visibleDetails, setVisibleDetails] = useState<Set<number>>(new Set())
  const [portfolioVisible, setPortfolioVisible] = useState(false)

  // Ref to portfolio navigation
  const portfolioNavRef = useRef<{
    next: () => boolean
    prev: () => boolean
  } | null>(null)

  // ── Refs for GSAP (2015-style) ──────────────────────────────
  // Keep track of which sections' text is "in" (visible)
  const activeTextSections = useRef<Set<number>>(new Set())

  // Hero-specific idle tweens
  const heroGlitchLoop = useRef<gsap.core.Timeline | null>(null)
  const heroShimmer = useRef<gsap.core.Tween | null>(null)
  const heroFloat = useRef<gsap.core.Tween | null>(null)

  // Track any running entrance/exit tweens so we can kill them if needed
  const runningTweens = useRef<gsap.core.Timeline[]>([])

  const syncProgress = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? scrollTop / docHeight : 0
    onScrollProgress(progress)
  }, [onScrollProgress])

  // ── Helper: get section's chars and subtitle from DOM ───────
  const getSectionElements = useCallback((sectionIndex: number) => {
    const sectionEls = containerRef.current?.querySelectorAll('.scroll-section')
    if (!sectionEls || !sectionEls[sectionIndex]) return null
    const el = sectionEls[sectionIndex]
    return {
      chars: el.querySelectorAll('.char'),
      subtitle: el.querySelector('.section-subtitle'),
    }
  }, [])

  // ══ ANIMATE SECTION TEXT IN ══════════════════════════════
  // Creates fresh GSAP tweens each time — immune to React lifecycle issues
  const animateTextIn = useCallback((sectionIndex: number, isHero: boolean) => {
    const els = getSectionElements(sectionIndex)
    if (!els || els.chars.length === 0) return

    const { chars, subtitle } = els

    if (isHero) {
      // Hero ALPHINTRA entrance: glitch burst
      const tl = gsap.timeline()

      // Start from hidden
      gsap.set(chars, {
        opacity: 0, y: 120, scale: 0.2,
        filter: 'blur(20px)', rotateX: 90,
        transformOrigin: '50% 100%',
      })

      // Phase 1: chars fly in
      tl.to(chars, {
        opacity: 1, y: 0, scale: 1,
        filter: 'blur(0px)', rotateX: 0,
        duration: 1.4,
        stagger: { each: 0.07, from: 'center' },
        ease: 'expo.out',
      })

      // Phase 2: Glitch burst
      tl.to(chars, {
        x: () => (Math.random() - 0.5) * 12,
        skewX: () => (Math.random() - 0.5) * 15,
        duration: 0.05,
        stagger: { each: 0.02, from: 'random' },
      }, '-=0.2')
      tl.to(chars, {
        x: () => (Math.random() - 0.5) * 8,
        skewX: () => (Math.random() - 0.5) * 10,
        opacity: () => 0.3 + Math.random() * 0.7,
        duration: 0.04,
        stagger: { each: 0.015, from: 'random' },
      })
      tl.to(chars, {
        x: () => (Math.random() - 0.5) * 16,
        y: () => (Math.random() - 0.5) * 6,
        skewX: () => (Math.random() - 0.5) * 20,
        duration: 0.05,
        stagger: { each: 0.01, from: 'random' },
      })
      // Snap back
      tl.to(chars, {
        x: 0, y: 0, skewX: 0, opacity: 1,
        duration: 0.08, ease: 'power4.out',
      })
      // Bright flash
      tl.to(chars, {
        color: '#fff',
        textShadow: '0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(255,255,255,0.4)',
        duration: 0.1,
        stagger: { each: 0.03, from: 'random' },
      }, '-=0.04')
      // Second burst
      tl.to(chars, {
        x: () => (Math.random() - 0.5) * 10,
        skewX: () => (Math.random() - 0.5) * 12,
        textShadow: () => {
          const r = Math.random()
          return r > 0.5
            ? `${2 + Math.random() * 3}px 0 rgba(255,0,0,0.5), ${-2 - Math.random() * 3}px 0 rgba(0,255,255,0.5)`
            : `0 ${2 + Math.random() * 2}px rgba(255,0,100,0.4), 0 ${-2 - Math.random() * 2}px rgba(0,200,255,0.4)`
        },
        duration: 0.06,
        stagger: { each: 0.02, from: 'random' },
      })
      tl.to(chars, {
        x: () => (Math.random() - 0.5) * 6,
        duration: 0.04,
        stagger: { each: 0.01, from: 'random' },
      })
      // Final settle
      tl.to(chars, {
        x: 0, y: 0, skewX: 0,
        color: 'rgba(255, 255, 255, 0.9)',
        textShadow: '0 0 0px transparent',
        duration: 0.5, ease: 'power2.out',
      })

      runningTweens.current.push(tl)

      // Start hero idle animations after entrance finishes
      tl.eventCallback('onComplete', () => {
        // Glitch loop
        heroGlitchLoop.current?.kill()
        const glitchLoop = gsap.timeline({ repeat: -1, repeatDelay: 3 })
        glitchLoop.to(chars, {
          x: () => (Math.random() - 0.5) * 10,
          skewX: () => (Math.random() - 0.5) * 8,
          textShadow: () =>
            `${1 + Math.random() * 2}px 0 rgba(255,0,0,0.35), ${-1 - Math.random() * 2}px 0 rgba(0,255,255,0.35)`,
          duration: 0.06,
          stagger: { each: 0.015, from: 'random' },
        })
        glitchLoop.to(chars, {
          x: () => (Math.random() - 0.5) * 14,
          opacity: () => 0.4 + Math.random() * 0.6,
          duration: 0.04,
          stagger: { each: 0.01, from: 'random' },
        })
        glitchLoop.to(chars, {
          x: 0, skewX: 0, opacity: 1,
          textShadow: '0 0 0px transparent',
          duration: 0.3, ease: 'power2.out',
        })
        heroGlitchLoop.current = glitchLoop

        // Shimmer
        heroShimmer.current?.kill()
        heroShimmer.current = gsap.to(chars, {
          keyframes: [
            { color: 'rgba(255,255,255,0.9)', textShadow: '0 0 0px transparent', duration: 0.4 },
            { color: '#fff', textShadow: '0 0 25px rgba(255,255,255,0.7)', duration: 0.25 },
            { color: 'rgba(255,255,255,0.9)', textShadow: '0 0 0px transparent', duration: 0.5 },
          ],
          stagger: { each: 0.12, repeat: -1, repeatDelay: 5 },
        })

        // Float
        heroFloat.current?.kill()
        heroFloat.current = gsap.to(chars, {
          y: -3, duration: 2.5,
          stagger: 0.1, ease: 'sine.inOut',
          yoyo: true, repeat: -1,
        })
      })
    } else {
      // Regular section entrance (TextPanelObject3D.in())
      gsap.set(chars, {
        opacity: 0, y: 80, scale: 0.3,
        filter: 'blur(12px)', x: 0, skewX: 0, rotateX: 0,
      })

      const tl = gsap.timeline()
      tl.to(chars, {
        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
        duration: 1.5,
        stagger: { each: 0.04, from: 'center' },
        ease: 'power3.out',
      })
      runningTweens.current.push(tl)

      // Subtitle entrance with delay
      if (subtitle) {
        gsap.set(subtitle, { opacity: 0, y: 30 })
        gsap.to(subtitle, {
          opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.5,
        })
      }
    }

    activeTextSections.current.add(sectionIndex)
  }, [getSectionElements])

  // ══ ANIMATE SECTION TEXT OUT ═════════════════════════════
  const animateTextOut = useCallback((sectionIndex: number, _way: 'up' | 'down') => {
    const els = getSectionElements(sectionIndex)
    if (!els || els.chars.length === 0) return

    const { chars, subtitle } = els
    const exitY = _way === 'down' ? -60 : 60

    gsap.to(chars, {
      opacity: 0, y: exitY, scale: 0.4,
      filter: 'blur(10px)',
      duration: 1, stagger: 0.02, ease: 'power2.in',
    })

    if (subtitle) {
      gsap.to(subtitle, {
        opacity: 0, y: exitY * 0.5, duration: 0.7, ease: 'power2.in',
      })
    }

    // Kill hero idle animations if leaving section 0
    if (sectionIndex === 0) {
      heroGlitchLoop.current?.kill()
      heroShimmer.current?.kill()
      heroFloat.current?.kill()
      heroGlitchLoop.current = null
      heroShimmer.current = null
      heroFloat.current = null
    }

    activeTextSections.current.delete(sectionIndex)
  }, [getSectionElements])

  // ══ SECTION TRANSITION CONTROLLER (2015 port) ═══════════
  const animateSectionChange = useCallback((
    fromStep: number,
    toStep: number,
  ) => {
    const from = steps[fromStep]
    const to = steps[toStep]
    const way = toStep > fromStep ? 'down' : 'up'

    // ── "out" the departing section's text ──
    if (from && to && from.sectionIndex !== to.sectionIndex) {
      if (activeTextSections.current.has(from.sectionIndex)) {
        animateTextOut(from.sectionIndex, way)
      }
    }

    // ── "in" the arriving section's text ──
    if (to.subStep === 'title') {
      if (!activeTextSections.current.has(to.sectionIndex)) {
        const isHero = to.sectionIndex === 0
        animateTextIn(to.sectionIndex, isHero)
      }
    }
  }, [animateTextIn, animateTextOut])

  // ══ GO TO STEP (2015's animateCamera()) ═════════════════
  const goToStep = useCallback(
    (stepIndex: number) => {
      const clamped = Math.max(0, Math.min(stepIndex, steps.length - 1))
      if (clamped === currentStepRef.current) return
      if (isAnimating.current) return

      const previousStep = currentStepRef.current
      currentStepRef.current = clamped
      setCurrentStep(clamped)
      isAnimating.current = true

      const step = steps[clamped]

      // Update detail / portfolio visibility state
      if (step.subStep === 'detail') {
        setVisibleDetails((prev) => new Set(prev).add(step.sectionIndex))
      } else if (step.subStep === 'title') {
        setVisibleDetails((prev) => {
          const next = new Set(prev)
          next.delete(step.sectionIndex)
          return next
        })
        if (sections[step.sectionIndex].isPortfolio) {
          setPortfolioVisible(false)
        }
      } else if (step.subStep === 'portfolio') {
        setPortfolioVisible(true)
      }

      // ── Fire section animations ──
      animateSectionChange(previousStep, clamped)

      // ── Camera tween → scroll to section ──
      const sectionEls = containerRef.current?.querySelectorAll('.scroll-section')
      if (!sectionEls) return

      const targetEl = sectionEls[step.sectionIndex] as HTMLElement
      if (!targetEl) return

      gsap.to(window, {
        scrollTo: { y: targetEl.offsetTop, autoKill: false },
        duration: 1.5,
        ease: 'quart.inOut',
        onUpdate: syncProgress,
        onComplete: () => {
          isAnimating.current = false
          syncProgress()
        },
      })
    },
    [syncProgress, animateSectionChange]
  )

  // ══ INITIAL ENTRANCE (2015's SCENE.in()) ════════════════
  useEffect(() => {
    // Hide all section text initially
    const sectionEls = containerRef.current?.querySelectorAll('.scroll-section')
    if (sectionEls) {
      sectionEls.forEach((sectionEl) => {
        const chars = sectionEl.querySelectorAll('.char')
        const subtitle = sectionEl.querySelector('.section-subtitle')
        if (chars.length > 0) {
          gsap.set(chars, { opacity: 0, y: 80 })
        }
        if (subtitle) {
          gsap.set(subtitle, { opacity: 0, y: 30 })
        }
      })
    }

    // Play hero entrance after delay
    const timer = gsap.delayedCall(0.6, () => {
      animateTextIn(0, true)
    })
    return () => {
      timer.kill()
      runningTweens.current.forEach(t => t.kill())
      heroGlitchLoop.current?.kill()
      heroShimmer.current?.kill()
      heroFloat.current?.kill()
    }
  }, [animateTextIn])


  // ══ SCROLL HIJACKING (2015's navigation()) ══════════════
  useEffect(() => {
    // Original: elapsed > 50 && !isScrolling threshold
    const THRESHOLD = 50

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      const step = steps[currentStepRef.current]

      // Portfolio sub-navigation
      if (step.subStep === 'portfolio') {
        if (isAnimating.current) return

        wheelAccum.current += e.deltaY
        if (wheelTimer.current) clearTimeout(wheelTimer.current)
        wheelTimer.current = setTimeout(() => { wheelAccum.current = 0 }, 200)

        if (Math.abs(wheelAccum.current) >= THRESHOLD) {
          const direction = wheelAccum.current > 0 ? 1 : -1
          wheelAccum.current = 0

          const nav = portfolioNavRef.current
          if (nav) {
            if (direction > 0) {
              const handled = nav.next()
              if (!handled) goToStep(currentStepRef.current + 1)
            } else {
              const handled = nav.prev()
              if (!handled) goToStep(currentStepRef.current - 1)
            }
          } else {
            goToStep(currentStepRef.current + direction)
          }
        }
        return
      }

      if (isAnimating.current) return

      wheelAccum.current += e.deltaY
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(() => { wheelAccum.current = 0 }, 200)

      if (Math.abs(wheelAccum.current) >= THRESHOLD) {
        const direction = wheelAccum.current > 0 ? 1 : -1
        wheelAccum.current = 0
        goToStep(currentStepRef.current + direction)
      }
    }

    // Touch handling (mobile)
    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (isAnimating.current) return
      const delta = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(delta) > 50) {
        goToStep(currentStepRef.current + (delta > 0 ? 1 : -1))
      }
    }

    // Keyboard (2015: keyCode 38/40)
    const onKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        goToStep(currentStepRef.current + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goToStep(currentStepRef.current - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goToStep(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goToStep(steps.length - 1)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
    }
  }, [goToStep])

  // Scroll sync
  useEffect(() => {
    window.addEventListener('scroll', syncProgress, { passive: true })
    syncProgress()
    return () => window.removeEventListener('scroll', syncProgress)
  }, [syncProgress])

  // Scroll indicator fade
  useEffect(() => {
    const indicator = document.querySelector('.scroll-indicator')
    if (!indicator) return
    const ctx = gsap.context(() => {
      gsap.to(indicator, {
        opacity: 0,
        scrollTrigger: { trigger: document.body, start: '80px top', end: '250px top', scrub: true },
      })
    })
    return () => ctx.revert()
  }, [])

  // ── Derived state ──
  const currentSectionIndex = steps[currentStep]?.sectionIndex ?? 0

  // Portfolio callbacks
  const onPortfolioDone = useCallback(() => {
    goToStep(currentStepRef.current + 1)
  }, [goToStep])

  const onPortfolioBack = useCallback(() => {
    goToStep(currentStepRef.current - 1)
  }, [goToStep])

  return (
    <>
      {/* ── Particle background canvas ── */}
      <ParticleBackground currentSection={currentSectionIndex} />

      {/* ── Scroll-down indicator ── */}
      <div className="scroll-indicator">
        <div className="scroll-indicator__inner">
          <span className="scroll-indicator__text">SCROLL</span>
          <svg width="14" height="28" viewBox="0 0 14 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 2V26M7 26L1 20M7 26L13 20" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── Section counter ── */}
      <div className="section-counter">
        <span className="section-counter__current">
          {String(currentSectionIndex + 1).padStart(2, '0')}
        </span>
        <span className="section-counter__separator">/</span>
        <span className="section-counter__total">
          {String(sections.length).padStart(2, '0')}
        </span>
      </div>

      {/* ── Side navigation dots (2015's MapObject2D) ── */}
      <nav className="section-nav">
        {sections.map((s, i) => (
          <button
            key={s.id}
            className={`section-nav__dot${i === currentSectionIndex ? ' section-nav__dot--active' : ''}`}
            onClick={() => {
              const titleStep = steps.findIndex((st) => st.sectionIndex === i && st.subStep === 'title')
              if (titleStep >= 0) goToStep(titleStep)
            }}
            aria-label={s.id}
          />
        ))}
      </nav>

      {/* ── Connecting lines between sections ── */}
      <SectionLines sectionCount={sections.length} currentSection={currentSectionIndex} />

      {/* ── Sections ── */}
      <div ref={containerRef} className="scroll-overlay">
        {sections.map((s, i) => {
          const detailActive = visibleDetails.has(i)
          const portfolioActive = s.isPortfolio && portfolioVisible
          const hideTitle = detailActive || portfolioActive
          const isActive = currentSectionIndex === i
          const showLines = s.align !== 'center'
          const linesSide = s.align === 'left' ? 'right' : 'left'

          return (
            <div key={s.id} className={`scroll-section scroll-section--${s.align}`} data-section-id={s.id}>
              {/* Hero smoke clouds (2015 SmokeObject3D) */}
              {i === 0 && <HeroSmoke active={isActive} />}
              {/* Wireframe line decoration on opposite side */}
              {showLines && (
                <WireframeLines side={linesSide} active={isActive && !hideTitle} />
              )}

              {/* Title text */}
              <div className={`section-text section-text--${s.align}${hideTitle ? ' section-text--hidden' : ''}`}>
                <h1>{splitToChars(s.line1)}</h1>
                {s.line2 && <h2>{splitToChars(s.line2)}</h2>}
                {s.subtitle && (
                  <p className="section-subtitle">
                    <NeonText
                      text={s.subtitle}
                      active={isActive && !hideTitle}
                      delay={0.5 + i * 0.1}
                      color="#ffffff"
                    />
                  </p>
                )}
              </div>

              {/* Glass detail card — visibility toggled via CSS class */}
              {s.detail && (
                <div className={`glass-card glass-card--${s.align}${detailActive ? ' glass-card--visible' : ''}`}>
                  <div className="glass-card__inner">
                    {s.detail}
                  </div>
                </div>
              )}

              {/* Portfolio horizontal slider */}
              {s.isPortfolio && (
                <div className={`portfolio-overlay${portfolioVisible ? ' portfolio-overlay--visible' : ''}`}>
                  <PortfolioHorizontal
                    onComplete={onPortfolioDone}
                    onGoBack={onPortfolioBack}
                    navRef={portfolioNavRef as MutableRefObject<{ next: () => boolean; prev: () => boolean } | null>}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
