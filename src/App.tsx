import { useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Scene3D from './components/Scene3D'
import ScrollSections from './components/ScrollSections'
import Loader from './components/Loader'
import Footer from './components/Footer'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

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
      <Scene3D scrollProgress={scrollProgress} />
      <ScrollSections onScrollProgress={setScrollProgress} />
      <Footer />
    </>
  )
}
