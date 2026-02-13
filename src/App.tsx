import { useState, useEffect, lazy, Suspense } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ScrollSections from './components/ScrollSections'
import Loader from './components/Loader'
import Footer from './components/Footer'

// Code-split the heavy 3D scene (Three.js is ~700KB)
const Scene3D = lazy(() => import('./components/Scene3D'))

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) {
      // Small delay to let the DOM settle after loader fade-out
      const timer = setTimeout(() => {
        ScrollTrigger.refresh()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loaded])

  useEffect(() => {
    return () => ScrollTrigger.killAll()
  }, [])

  if (!loaded) {
    return <Loader onComplete={() => setLoaded(true)} />
  }

  return (
    <>
      <Suspense fallback={null}>
        <Scene3D scrollProgress={scrollProgress} />
      </Suspense>
      <ScrollSections onScrollProgress={setScrollProgress} />
      <Footer />
    </>
  )
}
