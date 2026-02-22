'use client'

import { useRef, useEffect, useCallback, useState, forwardRef } from 'react'

/* ─── Types ─── */

interface Bienvenida3DProps {
  userName: string
}

interface Star {
  x: number
  y: number
  r: number
  base: number // base opacity
  speed: number // twinkle speed
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/* ─── Constants ─── */

const CYAN = 'rgba(0,229,204,'
const LAYER_COUNTS: Record<Breakpoint, number> = { mobile: 3, tablet: 5, desktop: 8 }
const STAR_COUNT = 80
const TICK_SPACING = 40

/* ─── Main Component ─── */

export function Bienvenida3D({ userName }: Bienvenida3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const labelXRef = useRef<HTMLSpanElement>(null)
  const labelYRef = useRef<HTMLSpanElement>(null)
  const labelDRef = useRef<HTMLSpanElement>(null)
  const labelAngleRef = useRef<HTMLSpanElement>(null)
  const labelContainerRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  const rotX = useRef(0)
  const rotY = useRef(0)
  const targetRotX = useRef(0)
  const targetRotY = useRef(0)
  const rafId = useRef(0)

  const mousePos = useRef({ x: 0, y: 0, normX: 0, normY: 0, active: false })
  const hudValues = useRef({ x: '0.00', y: '0.00', d: '0.00', angle: '0.0' })
  const starsRef = useRef<Star[]>([])

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  const nameUpper = userName.toUpperCase()
  const nameFontClass =
    nameUpper.length > 12
      ? 'text-[2rem] sm:text-[3.5rem] md:text-[5rem]'
      : 'text-[3rem] sm:text-[5rem] md:text-[8rem]'

  const isMobile = breakpoint === 'mobile'
  const layerCount = LAYER_COUNTS[breakpoint]

  /* ─── Generate stars once ─── */
  useEffect(() => {
    if (starsRef.current.length > 0) return
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() < 0.12 ? 1.0 + Math.random() * 0.8 : 0.2 + Math.random() * 0.6,
        base: 0.2 + Math.random() * 0.5,
        speed: 0.3 + Math.random() * 2,
      })
    }
    starsRef.current = stars
  }, [])

  /* ─── Breakpoint detection ─── */
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w <= 480) setBreakpoint('mobile')
      else if (w <= 768) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ─── Canvas sizing ─── */
  useEffect(() => {
    if (isMobile) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    return () => ro.disconnect()
  }, [isMobile])

  /* ─── Canvas drawing ─── */
  const drawCanvas = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const mp = mousePos.current
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.clearRect(0, 0, w, h)

    const c = (a: number) => `${CYAN}${a})`

    // Stars — always visible, twinkle
    for (const s of starsRef.current) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * s.speed + s.x * 100)
      ctx.fillStyle = c(s.base * twinkle)
      ctx.beginPath()
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    if (!mp.active) return

    // Dashed crosshair lines
    ctx.save()
    ctx.setLineDash([4, 6])
    ctx.strokeStyle = c(0.08)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, mp.y)
    ctx.lineTo(w, mp.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mp.x, 0)
    ctx.lineTo(mp.x, h)
    ctx.stroke()
    ctx.restore()

    // Connection lines to labels
    const lps = [
      { x: 24, y: 24 },
      { x: w - 24, y: 24 },
      { x: 24, y: h - 24 },
      { x: w - 24, y: h - 24 },
    ]
    const lc = breakpoint === 'tablet' ? 3 : 4
    ctx.save()
    ctx.strokeStyle = c(0.15)
    ctx.lineWidth = 0.5
    for (let i = 0; i < lc; i++) {
      ctx.beginPath()
      ctx.moveTo(mp.x, mp.y)
      ctx.lineTo(lps[i].x, lps[i].y)
      ctx.stroke()
    }
    ctx.restore()

    // Tick marks
    ctx.save()
    ctx.strokeStyle = c(0.12)
    ctx.lineWidth = 0.5
    for (let x = TICK_SPACING; x < w; x += TICK_SPACING) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 6); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, h - 6); ctx.stroke()
    }
    for (let y = TICK_SPACING; y < h; y += TICK_SPACING) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(6, y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(w, y); ctx.lineTo(w - 6, y); ctx.stroke()
    }
    ctx.restore()
  }, [breakpoint])

  /* ─── RAF loop ─── */
  useEffect(() => {
    if (isMobile) return
    const animate = (time: number) => {
      rotX.current += (targetRotX.current - rotX.current) * 0.08
      rotY.current += (targetRotY.current - rotY.current) * 0.08

      const textEl = containerRef.current?.querySelector<HTMLElement>('[data-parallax]')
      if (textEl) {
        textEl.style.transform = `perspective(800px) rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)`
      }

      labelContainerRefs.current.forEach((label, i) => {
        if (!label) return
        const f = (i + 1) * 0.15
        label.style.transform = `translate(${rotY.current * f}px, ${rotX.current * f}px)`
      })

      if (mousePos.current.active) {
        const hv = hudValues.current
        if (labelXRef.current) labelXRef.current.textContent = `x: ${hv.x}`
        if (labelYRef.current) labelYRef.current.textContent = `y: ${hv.y}`
        if (labelDRef.current) labelDRef.current.textContent = `d: ${hv.d}`
        if (labelAngleRef.current) labelAngleRef.current.textContent = `∠: ${hv.angle}°`
      }

      drawCanvas(time)
      rafId.current = requestAnimationFrame(animate)
    }
    rafId.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId.current)
  }, [isMobile, drawCanvas])

  /* ─── Pointer handlers ─── */
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

      const localX = clientX - rect.left
      const localY = clientY - rect.top
      const normX = localX / rect.width
      const normY = localY / rect.height
      const cx = normX - 0.5
      const cy = normY - 0.5

      targetRotX.current = -cy * 16
      targetRotY.current = cx * 16

      mousePos.current = { x: localX, y: localY, normX, normY, active: true }

      const distance = Math.sqrt(cx * cx + cy * cy) * 2
      const angleDeg = (Math.atan2(cy, cx) * 180) / Math.PI
      hudValues.current = {
        x: normX.toFixed(2),
        y: normY.toFixed(2),
        d: distance.toFixed(2),
        angle: angleDeg.toFixed(1),
      }

      if (crossRef.current) {
        crossRef.current.style.left = `${localX}px`
        crossRef.current.style.top = `${localY}px`
        crossRef.current.style.opacity = '1'
      }
    },
    [isMobile]
  )

  const handlePointerLeave = useCallback(() => {
    targetRotX.current = 0
    targetRotY.current = 0
    mousePos.current.active = false
    if (crossRef.current) crossRef.current.style.opacity = '0'
  }, [])

  /* ─── Render ─── */
  return (
    <div
      ref={containerRef}
      className="relative h-[200px] sm:h-[280px] md:h-[380px] select-none"
      style={{
        background: '#0a0a0f',
        backgroundImage: [
          'linear-gradient(rgba(0,229,204,0.07) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0,229,204,0.07) 1px, transparent 1px)',
          'linear-gradient(rgba(0,229,204,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0,229,204,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '60px 60px, 60px 60px, 15px 15px, 15px 15px',
      }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      <div className="absolute inset-0 overflow-hidden">
        {!isMobile && (
          <>
            <Bracket position="top-left" />
            <Bracket position="top-right" />
            <Bracket position="bottom-left" />
            <Bracket position="bottom-right" />
          </>
        )}

        {!isMobile && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
          />
        )}

        {!isMobile && (
          <div
            ref={crossRef}
            className="pointer-events-none absolute z-20 opacity-0 transition-opacity duration-150"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="absolute left-1/2 top-1/2" style={{ width: 1, height: 20, background: 'rgba(0,229,204,0.6)', transform: 'translate(-50%, -50%)' }} />
            <div className="absolute left-1/2 top-1/2" style={{ width: 20, height: 1, background: 'rgba(0,229,204,0.6)', transform: 'translate(-50%, -50%)' }} />
            <div className="absolute left-1/2 top-1/2 rounded-full" style={{ width: 4, height: 4, background: '#00e5cc', transform: 'translate(-50%, -50%)' }} />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <div
            data-parallax
            className="will-change-transform text-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <p
              className="text-[0.85rem] sm:text-[1.2rem] md:text-[1.5rem] font-light tracking-wide"
              style={{ color: '#ccc' }}
            >
              Hola,
            </p>

            <WireframeName
              text={nameUpper}
              fontClass={nameFontClass}
              layerCount={layerCount}
            />

            <p
              className="text-[0.65rem] sm:text-[0.85rem] md:text-[1rem] font-light tracking-widest mt-1 sm:mt-2"
              style={{ color: '#888' }}
            >
              Bienvenido de nuevo a Mega
            </p>
          </div>
        </div>

        {!isMobile && (
          <>
            <HudLabel ref={(el) => { labelContainerRefs.current[0] = el }} spanRef={labelXRef} defaultText="x: 0.00" className="top-6 left-6 sm:top-8 sm:left-8" />
            <HudLabel ref={(el) => { labelContainerRefs.current[1] = el }} spanRef={labelYRef} defaultText="y: 0.00" className="top-6 right-6 sm:top-8 sm:right-8" />
            <HudLabel ref={(el) => { labelContainerRefs.current[2] = el }} spanRef={labelDRef} defaultText="d: 0.00" className="bottom-6 left-6 sm:bottom-8 sm:left-8 hidden sm:block" />
            {breakpoint === 'desktop' && (
              <HudLabel ref={(el) => { labelContainerRefs.current[3] = el }} spanRef={labelAngleRef} defaultText="∠: 0.0°" className="bottom-6 right-6 sm:bottom-8 sm:right-8" />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── SVG Wireframe Name — guaranteed no fill ─── */

function WireframeName({
  text,
  fontClass,
  layerCount,
}: {
  text: string
  fontClass: string
  layerCount: number
}) {
  const layers = []
  for (let i = layerCount - 1; i >= 0; i--) {
    const isFront = i === 0
    // Front: visible stroke. Back layers: ghost echoes, very faint
    const opacity = isFront ? 0.85 : Math.max(0.04, 0.15 * (1 - i / layerCount))
    const strokeW = isFront ? 1.2 : 0.4

    layers.push(
      <span
        key={i}
        aria-hidden={!isFront}
        className={`${fontClass} leading-none block font-[family-name:var(--font-nasalization)]`}
        style={{
          position: isFront ? 'relative' : 'absolute',
          inset: isFront ? undefined : 0,
          fontWeight: 400,
          letterSpacing: '0.15em',
          color: 'transparent',
          caretColor: 'transparent',
          WebkitTextFillColor: 'transparent',
          WebkitTextStrokeWidth: `${strokeW}px`,
          WebkitTextStrokeColor: `rgba(0,229,204,${opacity})`,
          paintOrder: 'stroke fill markers',
          transform: `translateZ(${-i * 8}px)`,
          textShadow: 'none',
          filter: isFront ? undefined : 'none',
        }}
      >
        {text}
      </span>
    )
  }

  return (
    <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
      {layers}
    </div>
  )
}

/* ─── HUD Label ─── */

const HudLabel = forwardRef<
  HTMLDivElement,
  {
    spanRef: React.RefObject<HTMLSpanElement | null>
    defaultText: string
    className?: string
  }
>(function HudLabel({ spanRef, defaultText, className }, ref) {
  return (
    <div
      ref={ref}
      data-label
      className={`pointer-events-none absolute will-change-transform z-20 ${className ?? ''}`}
    >
      <span
        ref={spanRef}
        className="inline-block font-mono text-[10px] px-1.5 py-0.5"
        style={{
          color: '#00e5cc',
          background: 'rgba(0,229,204,0.06)',
          border: '1px solid rgba(0,229,204,0.2)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {defaultText}
      </span>
    </div>
  )
})

/* ─── Bracket ─── */

function Bracket({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const bc = 'rgba(0,229,204,0.3)'
  const posMap: Record<string, React.CSSProperties> = {
    'top-left':     { top: 12, left: 12, borderTop: `1px solid ${bc}`, borderLeft: `1px solid ${bc}` },
    'top-right':    { top: 12, right: 12, borderTop: `1px solid ${bc}`, borderRight: `1px solid ${bc}` },
    'bottom-left':  { bottom: 12, left: 12, borderBottom: `1px solid ${bc}`, borderLeft: `1px solid ${bc}` },
    'bottom-right': { bottom: 12, right: 12, borderBottom: `1px solid ${bc}`, borderRight: `1px solid ${bc}` },
  }

  return <div className="pointer-events-none absolute" style={{ width: 24, height: 24, ...posMap[position] }} />
}
