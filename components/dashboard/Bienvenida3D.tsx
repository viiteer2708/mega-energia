'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

interface Bienvenida3DProps {
  userName: string
}

export function Bienvenida3D({ userName }: Bienvenida3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const rotX = useRef(0)
  const rotY = useRef(0)
  const targetRotX = useRef(0)
  const targetRotY = useRef(0)
  const rafId = useRef(0)
  const [isMobile, setIsMobile] = useState(false)

  const nameUpper = userName.toUpperCase()

  // Scale font size if name > 12 chars
  const nameFontClass =
    nameUpper.length > 12
      ? 'text-[2rem] sm:text-[3.5rem] md:text-[5rem]'
      : 'text-[3rem] sm:text-[5rem] md:text-[8rem]'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 480)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Animation loop for smooth lerp
  useEffect(() => {
    if (isMobile) return

    const animate = () => {
      rotX.current += (targetRotX.current - rotX.current) * 0.08
      rotY.current += (targetRotY.current - rotY.current) * 0.08

      const textEl = containerRef.current?.querySelector<HTMLElement>('[data-parallax]')
      if (textEl) {
        textEl.style.transform = `perspective(800px) rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)`
      }

      // Move labels slightly
      const labels = containerRef.current?.querySelectorAll<HTMLElement>('[data-label]')
      labels?.forEach((label, i) => {
        const factor = (i + 1) * 0.15
        label.style.transform = `translate(${rotY.current * factor}px, ${rotX.current * factor}px)`
      })

      rafId.current = requestAnimationFrame(animate)
    }

    rafId.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId.current)
  }, [isMobile])

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isMobile) return
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      let clientX: number, clientY: number

      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const x = (clientX - rect.left) / rect.width - 0.5 // -0.5 to 0.5
      const y = (clientY - rect.top) / rect.height - 0.5

      targetRotX.current = -y * 8 // max ±4 degrees
      targetRotY.current = x * 8

      // Move crosshair
      if (crossRef.current) {
        crossRef.current.style.left = `${clientX - rect.left}px`
        crossRef.current.style.top = `${clientY - rect.top}px`
        crossRef.current.style.opacity = '1'
      }
    },
    [isMobile]
  )

  const handlePointerLeave = useCallback(() => {
    targetRotX.current = 0
    targetRotY.current = 0
    if (crossRef.current) {
      crossRef.current.style.opacity = '0'
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-[200px] sm:h-[280px] md:h-[380px] select-none"
      style={{ background: '#0a0a0f' }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      {/* Corner brackets */}
      {!isMobile && (
        <>
          <Bracket position="top-left" />
          <Bracket position="top-right" />
          <Bracket position="bottom-left" />
          <Bracket position="bottom-right" />
        </>
      )}

      {/* Crosshair that follows mouse (desktop only) */}
      {!isMobile && (
        <div
          ref={crossRef}
          className="pointer-events-none absolute z-20 opacity-0 transition-opacity duration-150"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <span
            className="block font-mono text-[#00e5cc] text-xs leading-none"
            style={{ fontSize: '16px' }}
          >
            +
          </span>
        </div>
      )}

      {/* Main text group */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
        <div data-parallax className="will-change-transform text-center">
          {/* Greeting line */}
          <p
            className="text-[0.85rem] sm:text-[1.2rem] md:text-[1.5rem] font-light tracking-wide"
            style={{ color: '#ccc' }}
          >
            Hola,
          </p>

          {/* Wireframe name */}
          <h1
            className={`${nameFontClass} font-extrabold leading-none tracking-tight`}
            style={{
              color: '#00e5cc',
              textShadow: [
                '0 0 1px rgba(0,229,204,0.9)',
                '0 0 4px rgba(0,212,187,0.6)',
                '0 0 12px rgba(0,195,170,0.3)',
                '0 0 24px rgba(0,229,204,0.15)',
              ].join(', '),
              WebkitTextStroke: '1px rgba(0,229,204,0.8)',
            }}
          >
            {nameUpper}
          </h1>

          {/* Subtitle */}
          <p
            className="text-[0.65rem] sm:text-[0.85rem] md:text-[1rem] font-light tracking-widest mt-1 sm:mt-2"
            style={{ color: '#888' }}
          >
            Bienvenido de nuevo a Mega
          </p>
        </div>
      </div>

      {/* Floating HUD labels (desktop + tablet only) */}
      {!isMobile && (
        <>
          <HudLabel data-label text="x: 0.92" className="top-6 left-6 sm:top-8 sm:left-8" />
          <HudLabel data-label text="y: 0.07" className="top-6 right-6 sm:top-8 sm:right-8" />
          <HudLabel
            data-label
            text="d: 0.10"
            className="bottom-6 left-6 sm:bottom-8 sm:left-8 hidden sm:block"
          />
        </>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */

function Bracket({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const size = 24
  const borderColor = 'rgba(0,229,204,0.3)'
  const borderWidth = '1px'

  const posMap: Record<string, React.CSSProperties> = {
    'top-left': {
      top: 12,
      left: 12,
      borderTop: `${borderWidth} solid ${borderColor}`,
      borderLeft: `${borderWidth} solid ${borderColor}`,
    },
    'top-right': {
      top: 12,
      right: 12,
      borderTop: `${borderWidth} solid ${borderColor}`,
      borderRight: `${borderWidth} solid ${borderColor}`,
    },
    'bottom-left': {
      bottom: 12,
      left: 12,
      borderBottom: `${borderWidth} solid ${borderColor}`,
      borderLeft: `${borderWidth} solid ${borderColor}`,
    },
    'bottom-right': {
      bottom: 12,
      right: 12,
      borderBottom: `${borderWidth} solid ${borderColor}`,
      borderRight: `${borderWidth} solid ${borderColor}`,
    },
  }

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        width: size,
        height: size,
        ...posMap[position],
      }}
    />
  )
}

function HudLabel({ text, className }: { text: string; className?: string; 'data-label'?: boolean }) {
  return (
    <div
      data-label
      className={`pointer-events-none absolute will-change-transform ${className ?? ''}`}
    >
      <span
        className="inline-block font-mono text-[10px] px-1.5 py-0.5"
        style={{
          color: '#00e5cc',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(0,229,204,0.3)',
        }}
      >
        {text}
      </span>
    </div>
  )
}
