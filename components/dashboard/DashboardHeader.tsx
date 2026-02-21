'use client'

import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Environment } from '@react-three/drei'
import type { Group } from 'three'
import { Bolt } from 'lucide-react'

interface AnimatedNameProps {
  name: string
}

function AnimatedName({ name }: AnimatedNameProps) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.04
  })

  return (
    <Float
      speed={1.8}
      rotationIntensity={0.05}
      floatIntensity={0.3}
      floatingRange={[-0.04, 0.04]}
    >
      <group ref={groupRef}>
        <Text
          font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff"
          fontSize={0.7}
          color="#3DBFBF"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.05}
        >
          {name}
          <meshStandardMaterial
            color="#3DBFBF"
            emissive="#0a4040"
            emissiveIntensity={0.5}
            metalness={0.4}
            roughness={0.15}
          />
        </Text>
      </group>
    </Float>
  )
}

function Scene({ name }: { name: string }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={2.5} color="#3DBFBF" decay={2} />
      <pointLight position={[3, -2, 1]} intensity={1.2} color="#1a9e9e" decay={2} />
      <Environment preset="night" />
      <AnimatedName name={name} />
    </>
  )
}

interface DashboardHeaderProps {
  userName: string
  subtitle?: string
}

export function DashboardHeader({
  userName,
  subtitle = 'Tu panel de control',
}: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute left-1/4 bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      </div>

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bolt className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Bienvenido
            </p>
          </div>

          {/* 3D Name canvas */}
          <div className="h-24 w-full max-w-md -ml-2 -my-2">
            <Canvas
              camera={{ position: [0, 0, 3.5], fov: 45 }}
              style={{ background: 'transparent' }}
              gl={{ alpha: true, antialias: true }}
            >
              <Suspense fallback={null}>
                <Scene name={userName} />
              </Suspense>
            </Canvas>
          </div>

          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Date summary */}
        <div className="hidden md:flex flex-col items-end gap-1 text-right shrink-0">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Hoy
          </div>
          <div className="text-lg font-bold text-foreground capitalize">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">En línea</span>
          </div>
        </div>
      </div>
    </div>
  )
}
