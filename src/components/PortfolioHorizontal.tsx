import { useEffect, useRef, useCallback, type MutableRefObject } from 'react'
import gsap from 'gsap'

interface Project {
  title: string
  subtitle: string
  description: string
  color: string
  image: string
  tags: string[]
}

const projects: Project[] = [
  {
    title: 'CiperLux',
    subtitle: 'Fintech Platform',
    description: 'AI-powered stock trading platform with real-time analytics and automated strategies.',
    color: '#4f7cff',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
    tags: ['Next.js', 'Python', 'AI/ML'],
  },
  {
    title: 'NexusAI',
    subtitle: 'AI Chat Platform',
    description: 'Multi-model AI chatbot platform with voice synthesis, RAG knowledge retrieval, and real-time streaming.',
    color: '#34d399',
    image: 'https://images.unsplash.com/photo-1677442135136-760c813028c4?w=600&h=400&fit=crop',
    tags: ['Next.js', 'LangChain', 'OpenAI'],
  },
  {
    title: 'CloudVault',
    subtitle: 'Infrastructure Monitor',
    description: 'Cloud infrastructure monitoring dashboard with live metrics, alerting pipelines, and cost optimization.',
    color: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop',
    tags: ['React', 'Go', 'Kubernetes'],
  },
  {
    title: 'Strategy Hub',
    subtitle: 'Enterprise Suite',
    description: 'Enterprise project management and strategic planning suite with real-time collaboration.',
    color: '#a78bfa',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    tags: ['Vue.js', 'Node.js', 'MongoDB'],
  },
]

interface PortfolioHorizontalProps {
  onComplete: () => void
  onGoBack: () => void
  navRef?: MutableRefObject<{
    next: () => boolean
    prev: () => boolean
  } | null>
}

export default function PortfolioHorizontal({ onComplete, onGoBack, navRef }: PortfolioHorizontalProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const currentCard = useRef(0)
  const isMoving = useRef(false)

  // GSAP tilt animation per card
  const setupTilt = useCallback((cardEl: HTMLDivElement | null) => {
    if (!cardEl) return

    const inner = cardEl.querySelector('.ph-card__inner') as HTMLElement
    const img = cardEl.querySelector('.ph-card__img') as HTMLElement
    if (!inner) return

    let lerpRx = 0
    let lerpRy = 0
    let targetRx = 0
    let targetRy = 0
    let rafId = 0

    const lerp = (a: number, b: number, n: number) => a + (b - a) * n

    const loop = () => {
      lerpRx = lerp(lerpRx, targetRx, 0.06)
      lerpRy = lerp(lerpRy, targetRy, 0.06)
      inner.style.transform = `rotateX(${lerpRx}deg) rotateY(${lerpRy}deg)`
      if (img) {
        img.style.transform = `translateX(${lerpRy * -0.8}px) translateY(${lerpRx * 0.8}px)`
      }
      rafId = requestAnimationFrame(loop)
    }

    const onMove = (e: MouseEvent) => {
      const rect = cardEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      targetRx = y * -14
      targetRy = x * 14
    }

    const onLeave = () => {
      targetRx = 0
      targetRy = 0
    }

    cardEl.addEventListener('mousemove', onMove)
    cardEl.addEventListener('mouseleave', onLeave)
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      cardEl.removeEventListener('mousemove', onMove)
      cardEl.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // Set up tilt on all cards
  useEffect(() => {
    const cleanups: (() => void)[] = []
    cardsRef.current.forEach((card) => {
      const cleanup = setupTilt(card)
      if (cleanup) cleanups.push(cleanup)
    })
    return () => cleanups.forEach((fn) => fn())
  }, [setupTilt])

  // Slide to a card index (returns true if handled internally)
  const slideTo = useCallback(
    (index: number): boolean => {
      if (isMoving.current) return true // still moving, handled
      if (index < 0 || index >= projects.length) {
        return false // out of range — let parent handle
      }
      isMoving.current = true
      currentCard.current = index

      const track = trackRef.current
      if (!track) return false

      gsap.to(track, {
        x: -index * window.innerWidth,
        duration: 0.9,
        ease: 'power3.inOut',
        onComplete: () => {
          isMoving.current = false
        },
      })
      return true
    },
    []
  )

  // Expose nav functions to parent via ref
  useEffect(() => {
    if (navRef) {
      navRef.current = {
        next: () => slideTo(currentCard.current + 1),
        prev: () => slideTo(currentCard.current - 1),
      }
    }
    return () => {
      if (navRef) navRef.current = null
    }
  }, [navRef, slideTo])

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isMoving.current) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const handled = slideTo(currentCard.current + 1)
        if (!handled) onComplete()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const handled = slideTo(currentCard.current - 1)
        if (!handled) onGoBack()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [slideTo, onComplete, onGoBack])

  return (
    <div className="ph-wrapper">
      {/* Progress indicator */}
      <div className="ph-progress">
        {projects.map((_, i) => (
          <button
            key={i}
            className={`ph-progress__dot${i === currentCard.current ? ' ph-progress__dot--active' : ''}`}
            onClick={() => slideTo(i)}
          />
        ))}
      </div>

      {/* Horizontal track */}
      <div className="ph-viewport">
        <div ref={trackRef} className="ph-track">
          {projects.map((p, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el }}
              className="ph-card"
              style={{ '--accent': p.color } as React.CSSProperties}
            >
              <div className="ph-card__inner">
                <div className="ph-card__img-wrap">
                  <img className="ph-card__img" src={p.image} alt={p.title} />
                  <div className="ph-card__glow" />
                </div>
                <div className="ph-card__content">
                  <span className="ph-card__number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="ph-card__title">{p.title}</h3>
                  <p className="ph-card__subtitle">{p.subtitle}</p>
                  <p className="ph-card__desc">{p.description}</p>
                  <div className="ph-card__tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav hint */}
      <div className="ph-nav-hint">
        <span>←</span>
        <span>SCROLL TO BROWSE</span>
        <span>→</span>
      </div>
    </div>
  )
}
