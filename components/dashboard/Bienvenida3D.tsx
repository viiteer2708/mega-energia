'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

/* ─── Types ─── */

interface Bienvenida3DProps {
  userName: string
}

interface DecorDot {
  x: number // normalized 0-1
  y: number // normalized 0-1
  r: number // radius in px
  opacity: number
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/* ─── Constants ─── */

const CYAN = { r: 0, g: 229, b: 204 }
const LAYER_COUNTS: Record<Breakpoint, number> = { mobile: 3, tablet: 5, desktop: 8 }
const DOT_COUNT = 25
const TICK_SPACING = 40

/* ─── Main Component ─── */

export function Bienvenida3D({ userName }: Bienvenida3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Label DOM refs for direct manipulation (no React re-renders)
  const labelXRef = useRef<HTMLSpanElement>(null)
  const labelYRef = useRef<HTMLSpanElement>(null)
  const labelDRef = useRef<HTMLSpanElement>(null)
  const labelAngleRef = useRef<HTMLSpanElement>(null)

  // Label container refs for positioning via parallax
  const labelContainerRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Animation state
  const rotX = useRef(0)
  const rotY = useRef(0)
  const targetRotX = useRef(0)
  const targetRotY = useRef(0)
  const rafId = useRef(0)

  // Mouse state (updated in pointermove, read in RAF)
  const mousePos = useRef({ x: 0, y: 0, normX: 0, normY: 0, active: false })
  const hudValues = useRef({ x: '0.00', y: '0.00', d: '0.00', angle: '0.0' })

  // Decorative dots (generated once)
  const dotsRef = useRef<DecorDot[]>([])

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  const nameUpper = userName.toUpperCase()
  const nameFontClass =
    nameUpper.length > 12
      ? 'text-[2rem] sm:text-[3.5rem] md:text-[5rem]'
      : 'text-[3rem] sm:text-[5rem] md:text-[8rem]'

  const isMobile = breakpoint === 'mobile'
  const layerCount = LAYER_COUNTS[breakpoint]

  /* ─── Generate decorative dots once ─── */
  useEffect(() => {
    if (dotsRef.current.length === 0) {
      const dots: DecorDot[] = []
      for (let i = 0; i < DOT_COUNT; i++) {
        dots.push({
          x: Math.random(),
          y: Math.random(),
          r: 0.5 + Math.random() * 1.5,
          opacity: 0.05 + Math.random() * 0.15,
        })
      }
      dotsRef.current = dots
    }
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

  /* ─── Canvas sizing with ResizeObserver ─── */
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
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const mp = mousePos.current

    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.clearRect(0, 0, w, h)

    if (!mp.active) return

    const cyanStr = (a: number) => `rgba(${CYAN.r},${CYAN.g},${CYAN.b},${a})`

    // ─ Crosshair extended lines (dashed)
    ctx.save()
    ctx.setLineDash([4, 6])
    ctx.strokeStyle = cyanStr(0.08)
    ctx.lineWidth = 0.5
    // Horizontal
    ctx.beginPath()
    ctx.moveTo(0, mp.y)
    ctx.lineTo(w, mp.y)
    ctx.stroke()
    // Vertical
    ctx.beginPath()
    ctx.moveTo(mp.x, 0)
    ctx.lineTo(mp.x, h)
    ctx.stroke()
    ctx.restore()

    // ─ Connection lines from crosshair to each label
    const labelPositions = [
      { x: 24, y: 24 },                       // top-left
      { x: w - 24, y: 24 },                   // top-right
      { x: 24, y: h - 24 },                   // bottom-left
      { x: w - 24, y: h - 24 },               // bottom-right
    ]
    const labelCount = breakpoint === 'tablet' ? 3 : 4
    ctx.save()
    ctx.strokeStyle = cyanStr(0.15)
    ctx.lineWidth = 0.5
    ctx.setLineDash([])
    for (let i = 0; i < labelCount; i++) {
      const lp = labelPositions[i]
      ctx.beginPath()
      ctx.moveTo(mp.x, mp.y)
      ctx.lineTo(lp.x, lp.y)
      ctx.stroke()
    }
    ctx.restore()

    // ─ Tick marks on all 4 edges
    ctx.save()
    ctx.strokeStyle = cyanStr(0.12)
    ctx.lineWidth = 0.5
    const tickLen = 6
    // Top & Bottom
    for (let x = TICK_SPACING; x < w; x += TICK_SPACING) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, tickLen)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.lineTo(x, h - tickLen)
      ctx.stroke()
    }
    // Left & Right
    for (let y = TICK_SPACING; y < h; y += TICK_SPACING) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(tickLen, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w, y)
      ctx.lineTo(w - tickLen, y)
      ctx.stroke()
    }
    ctx.restore()

    // ─ Decorative dots
    ctx.save()
    for (const dot of dotsRef.current) {
      ctx.fillStyle = cyanStr(dot.opacity)
      ctx.beginPath()
      ctx.arc(dot.x * w, dot.y * h, dot.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }, [breakpoint])

  /* ─── RAF loop ─── */
  useEffect(() => {
    if (isMobile) return

    const animate = () => {
      // 1. Lerp rotation
      rotX.current += (targetRotX.current - rotX.current) * 0.08
      rotY.current += (targetRotY.current - rotY.current) * 0.08

      // 2. Apply parallax transform with preserve-3d
      const textEl = containerRef.current?.querySelector<HTMLElement>('[data-parallax]')
      if (textEl) {
        textEl.style.transform = `perspective(800px) rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)`
      }

      // 3. Move label containers with subtle parallax
      labelContainerRefs.current.forEach((label, i) => {
        if (!label) return
        const factor = (i + 1) * 0.15
        label.style.transform = `translate(${rotY.current * factor}px, ${rotX.current * factor}px)`
      })

      // 4. Update label text via DOM refs
      if (mousePos.current.active) {
        const hv = hudValues.current
        if (labelXRef.current) labelXRef.current.textContent = `x: ${hv.x}`
        if (labelYRef.current) labelYRef.current.textContent = `y: ${hv.y}`
        if (labelDRef.current) labelDRef.current.textContent = `d: ${hv.d}`
        if (labelAngleRef.current) labelAngleRef.current.textContent = `∠: ${hv.angle}°`
      }

      // 5. Draw canvas HUD
      drawCanvas()

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
      const normX = localX / rect.width  // 0 to 1
      const normY = localY / rect.height // 0 to 1
      const cx = normX - 0.5 // -0.5 to 0.5
      const cy = normY - 0.5

      targetRotX.current = -cy * 16  // ±8 degrees
      targetRotY.current = cx * 16

      // Update mouse ref
      mousePos.current.x = localX
      mousePos.current.y = localY
      mousePos.current.normX = normX
      mousePos.current.normY = normY
      mousePos.current.active = true

      // Update HUD values
      const distance = Math.sqrt(cx * cx + cy * cy) * 2
      const angleDeg = (Math.atan2(cy, cx) * 180) / Math.PI
      hudValues.current.x = normX.toFixed(2)
      hudValues.current.y = normY.toFixed(2)
      hudValues.current.d = distance.toFixed(2)
      hudValues.current.angle = angleDeg.toFixed(1)

      // Move crosshair
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

    if (crossRef.current) {
      crossRef.current.style.opacity = '0'
    }

    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    }
  }, [])

  /* ─── Render ─── */
  return (
    <div
      ref={containerRef}
      className="relative h-[200px] sm:h-[280px] md:h-[380px] select-none"
      style={{ background: '#0a0a0f' }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      {/* Overflow wrapper — separate from container so translateZ isn't clipped */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Corner brackets */}
        {!isMobile && (
          <>
            <Bracket position="top-left" />
            <Bracket position="top-right" />
            <Bracket position="bottom-left" />
            <Bracket position="bottom-right" />
          </>
        )}

        {/* Canvas 2D overlay */}
        {!isMobile && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
          />
        )}

        {/* Crosshair (redesigned as real cross) */}
        {!isMobile && (
          <div
            ref={crossRef}
            className="pointer-events-none absolute z-20 opacity-0 transition-opacity duration-150"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {/* Vertical line */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: 1,
                height: 20,
                background: 'rgba(0,229,204,0.6)',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: 20,
                height: 1,
                background: 'rgba(0,229,204,0.6)',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Center dot */}
            <div
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: 4,
                height: 4,
                background: '#00e5cc',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        )}

        {/* Main text group */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <div
            data-parallax
            className="will-change-transform text-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Greeting line */}
            <p
              className="text-[0.85rem] sm:text-[1.2rem] md:text-[1.5rem] font-light tracking-wide"
              style={{ color: '#ccc' }}
            >
              Hola,
            </p>

            {/* Wireframe 3D multilayer name */}
            <WireframeLayers
              text={nameUpper}
              fontClass={nameFontClass}
              layerCount={layerCount}
            />

            {/* Subtitle */}
            <p
              className="text-[0.65rem] sm:text-[0.85rem] md:text-[1rem] font-light tracking-widest mt-1 sm:mt-2"
              style={{ color: '#888' }}
            >
              Bienvenido de nuevo a Mega
            </p>
          </div>
        </div>

        {/* Floating HUD labels — dynamic, DOM-ref updated */}
        {!isMobile && (
          <>
            <HudLabel
              ref={(el) => { labelContainerRefs.current[0] = el }}
              spanRef={labelXRef}
              defaultText="x: 0.00"
              className="top-6 left-6 sm:top-8 sm:left-8"
            />
            <HudLabel
              ref={(el) => { labelContainerRefs.current[1] = el }}
              spanRef={labelYRef}
              defaultText="y: 0.00"
              className="top-6 right-6 sm:top-8 sm:right-8"
            />
            <HudLabel
              ref={(el) => { labelContainerRefs.current[2] = el }}
              spanRef={labelDRef}
              defaultText="d: 0.00"
              className="bottom-6 left-6 sm:bottom-8 sm:left-8 hidden sm:block"
            />
            {breakpoint === 'desktop' && (
              <HudLabel
                ref={(el) => { labelContainerRefs.current[3] = el }}
                spanRef={labelAngleRef}
                defaultText="∠: 0.0°"
                className="bottom-6 right-6 sm:bottom-8 sm:right-8"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

function WireframeLayers({
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
    const t = i / (layerCount - 1 || 1) // 0 (front) to 1 (back)
    const opacity = 1.0 - t * 0.88       // 1.0 → ~0.12

    const isFront = i === 0
    const style: React.CSSProperties = {
      position: i === 0 ? 'relative' : 'absolute',
      inset: i === 0 ? undefined : 0,
      color: isFront ? 'rgba(139,105,20,0.35)' : 'transparent',
      WebkitTextStroke: `1.5px rgba(0,229,204,${opacity})`,
      transform: `translateZ(${-i * 4}px)`,
      textShadow: isFront
        ? [
            '0 0 2px rgba(0,229,204,0.9)',
            '0 0 8px rgba(0,229,204,0.5)',
            '0 0 20px rgba(0,229,204,0.25)',
            '0 0 40px rgba(0,229,204,0.1)',
          ].join(', ')
        : 'none',
    }

    layers.push(
      <span
        key={i}
        aria-hidden={i !== 0}
        className={`${fontClass} font-extrabold leading-none tracking-tight block`}
        style={style}
      >
        {text}
      </span>
    )
  }

  return (
    <div
      className="relative"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {layers}
    </div>
  )
}

import { forwardRef } from 'react'

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
