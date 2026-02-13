/**
 * Footer — Premium dark footer with glassmorphic elements.
 *
 * Added as the final section after "LET'S TALK".
 * Includes: brand, quick links, social icons, legal, and an animated separator.
 */

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const socialLinks = [
    { label: 'GitHub', href: '#', icon: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.5-1.6.1-3.2 0 0 1-.3 3.4 1.2a12 12 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.3 2.8.2 3.2.7.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.2.9 2.4v3.5c0 .3.2.7.8.6A12 12 0 0 0 12 .3' },
    { label: 'Twitter', href: '#', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { label: 'LinkedIn', href: '#', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    { label: 'Dribbble', href: '#', icon: 'M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702A10.523 10.523 0 0 0 12 1.48c-.82 0-1.62.098-2.4.285v.288zm10.335 3.483c-.218.29-1.91 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z' },
]

const quickLinks = [
    { label: 'Services', href: '#web' },
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Process', href: '#process' },
    { label: 'Team', href: '#team' },
    { label: 'Contact', href: '#contact' },
]

const techStack = [
    'React', 'Next.js', 'Three.js', 'Flutter',
    'Spring Boot', 'GCP', 'LangChain', 'PostgreSQL',
]

export default function Footer() {
    const footerRef = useRef<HTMLElement>(null)
    const lineRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Animated line separator
            gsap.fromTo(lineRef.current,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    duration: 1.5,
                    ease: 'power3.inOut',
                    scrollTrigger: {
                        trigger: footerRef.current,
                        start: 'top 90%',
                        toggleActions: 'play none none reverse',
                    },
                }
            )

            // Stagger fade-in for content blocks
            const blocks = footerRef.current?.querySelectorAll('.footer__block')
            if (blocks) {
                gsap.fromTo(blocks,
                    { y: 40, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1,
                        stagger: 0.15,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: footerRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                )
            }
        }, footerRef)

        return () => ctx.revert()
    }, [])

    return (
        <footer ref={footerRef} className="footer" id="footer">
            {/* Animated line separator */}
            <div ref={lineRef} className="footer__separator" />

            <div className="footer__grid">
                {/* Brand column */}
                <div className="footer__block footer__brand">
                    <h4 className="footer__logo">ALPHINTRA</h4>
                    <p className="footer__tagline">
                        Engineering digital intelligence.<br />
                        From concept to deployment.
                    </p>
                    <div className="footer__social">
                        {socialLinks.map(link => (
                            <a key={link.label} href={link.href} className="footer__social-link" aria-label={link.label}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d={link.icon} />
                                </svg>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="footer__block">
                    <h5 className="footer__heading">Navigate</h5>
                    <ul className="footer__list">
                        {quickLinks.map(link => (
                            <li key={link.label}>
                                <a href={link.href} className="footer__link">{link.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Tech Stack */}
                <div className="footer__block">
                    <h5 className="footer__heading">Tech Stack</h5>
                    <div className="footer__tags">
                        {techStack.map(tech => (
                            <span key={tech} className="footer__tag">{tech}</span>
                        ))}
                    </div>
                </div>

                {/* Contact */}
                <div className="footer__block">
                    <h5 className="footer__heading">Get in Touch</h5>
                    <div className="footer__contact-items">
                        <a href="mailto:hello@alphintra.com" className="footer__contact-item">
                            hello@alphintra.com
                        </a>
                        <span className="footer__contact-item footer__contact-item--dim">
                            Sri Lanka · Remote Worldwide
                        </span>
                    </div>
                    <a href="mailto:hello@alphintra.com" className="footer__cta">
                        Start a Project →
                    </a>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="footer__bottom">
                <span className="footer__copyright">
                    © {new Date().getFullYear()} ALPHINTRA. All rights reserved.
                </span>
                <div className="footer__bottom-links">
                    <a href="#" className="footer__bottom-link">Privacy</a>
                    <a href="#" className="footer__bottom-link">Terms</a>
                </div>
            </div>
        </footer>
    )
}
