'use client'

import {
  MapPin, User, Building2, Zap, Flame, Activity,
  Calendar, TrendingDown, ChevronRight, Copy, Check,
} from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CUPSConsumoChart } from './CUPSConsumoChart'
import { cn } from '@/lib/utils'
import type { PuntoSuministro } from '@/lib/types'

interface CUPSResultProps {
  punto: PuntoSuministro
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-xs font-medium text-foreground text-right', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title="Copiar CUPS"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function CUPSResult({ punto }: CUPSResultProps) {
  const isElec = punto.tipo === 'electricidad'
  const TipoIcon = isElec ? Zap : Flame
  const tipoColor = isElec
    ? 'text-primary bg-primary/10 border-primary/20'
    : 'text-blue-400 bg-blue-500/10 border-blue-500/20'

  const estadoColor = {
    activo:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    inactivo: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    baja:     'bg-red-500/15 text-red-400 border-red-500/25',
  }[punto.estado]

  const totalPotencia = punto.potencias.reduce((s, p) => s + p.potencia, 0) / punto.potencias.length

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header card */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', tipoColor)}>
                <TipoIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-foreground tracking-wider">
                    {punto.cups}
                  </span>
                  <CopyButton text={punto.cups} />
                  <Badge variant="outline" className={cn('text-[10px] font-semibold', estadoColor)}>
                    {punto.estado.charAt(0).toUpperCase() + punto.estado.slice(1)}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[10px] font-semibold capitalize', tipoColor)}>
                    {punto.tipo}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{punto.titular}</span>
                  {punto.nif && <span className="text-xs">· {punto.nif}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{punto.direccion}, {punto.municipio} ({punto.cp})</span>
                </div>
              </div>
            </div>

            {/* Ahorro estimado */}
            <div className="flex flex-col items-end rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                Ahorro estimado
              </span>
              <span className="text-2xl font-bold text-emerald-400">
                {punto.ahorro_estimado_anual.toLocaleString('es-ES')} €
              </span>
              <span className="text-[10px] text-emerald-400/70">al año con MEGA ENERGÍA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-col grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Contrato actual */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" />
              Contrato actual
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 divide-y divide-border">
            <InfoRow label="Comercializadora" value={punto.comercializadora} />
            <InfoRow label="Tarifa" value={punto.tarifa} mono />
            <InfoRow label="Tipo de contador" value={punto.contador === 'telegestionado' ? 'Telegestionado' : 'Analógico'} />
            <InfoRow
              label={punto.tipo === 'electricidad' ? 'Potencia media' : 'Caudal máximo'}
              value={`${totalPotencia.toFixed(2)} ${punto.tipo === 'electricidad' ? 'kW' : 'm³/h'}`}
            />
            <InfoRow
              label="Última lectura"
              value={new Date(punto.ultima_lectura).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
          </CardContent>
        </Card>

        {/* Potencias contratadas */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Activity className="h-3.5 w-3.5" />
              Potencias contratadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {punto.potencias.map((p) => (
              <div key={p.periodo} className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{p.periodo}</span>
                <div className="flex-1 mx-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.min(100, (p.potencia / (punto.potencias[0]?.potencia || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-foreground font-mono w-16 text-right">
                  {p.potencia} kW
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tarifa MEGA recomendada */}
        <Card className="border-border/50 bg-card border-primary/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide">
              <TrendingDown className="h-3.5 w-3.5" />
              Oferta MEGA ENERGÍA
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-sm font-semibold text-foreground mb-3">
              {punto.tarifa_mega_recomendada}
            </p>
            <div className="space-y-2">
              {punto.precios_mega.map((p) => (
                <div key={p.periodo} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{p.periodo}</span>
                  <span className="text-xs font-semibold text-primary font-mono">
                    {p.precio.toFixed(3)} €/kWh
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-3 opacity-50" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ahorro anual</span>
              <span className="text-sm font-bold text-emerald-400">
                +{punto.ahorro_estimado_anual.toLocaleString('es-ES')} €
              </span>
            </div>
            <button className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
              Generar propuesta
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Consumo chart */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Consumo mensual — últimos 12 meses
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total anual:{' '}
            <span className="font-semibold text-foreground">
              {punto.consumo_anual_kwh.toLocaleString('es-ES')} kWh
            </span>
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <CUPSConsumoChart data={punto.consumo_mensual} tipo={punto.tipo} />
        </CardContent>
      </Card>
    </div>
  )
}
