'use client'

import { useState, useTransition } from 'react'
import { Users2, Plus, Pencil, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { upsertCommissionTier } from '@/app/(app)/comisionado/actions'
import type { CommissionTier } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const labelClass = 'text-sm font-medium text-foreground'

interface Props {
  tiers: CommissionTier[]
}

export function CommissionTiersPanel({ tiers }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await upsertCommissionTier(formData)
      setMessage({ ok: result.ok, text: result.ok ? 'Guardado.' : (result.error ?? 'Error') })
      if (result.ok) {
        setEditingId(null)
        setShowCreate(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Users2 className="h-4 w-4 text-primary" />
          Tipos de comisionado
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Existing tiers */}
          <div className="space-y-3">
            {tiers.map(tier => (
              <div key={tier.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                {editingId === tier.id ? (
                  <form action={handleSubmit} className="flex items-center gap-3 w-full">
                    <input type="hidden" name="id" value={tier.id} />
                    <div className="flex-1">
                      <input name="name" defaultValue={tier.name} className={inputClass} placeholder="Nombre" />
                    </div>
                    <div className="w-32">
                      <input
                        name="rate_pct"
                        type="number"
                        step="0.0001"
                        defaultValue={tier.rate_pct ?? ''}
                        className={inputClass}
                        placeholder="NULL = VIP"
                      />
                    </div>
                    <div className="w-20">
                      <input name="sort_order" type="number" defaultValue={tier.sort_order} className={inputClass} />
                    </div>
                    <Button type="submit" size="sm" disabled={isPending}>Guardar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-foreground">{tier.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {tier.rate_pct !== null
                          ? `${(tier.rate_pct * 100).toFixed(2)}% del payout`
                          : 'Importe fijo (VIP)'}
                      </span>
                      <span className="text-xs text-muted-foreground">orden: {tier.sort_order}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(tier.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Create new tier */}
          {showCreate && (
            <form action={handleSubmit} className="mt-4 rounded-lg border border-dashed border-primary/30 p-3 space-y-3">
              <p className="text-sm font-medium">Nuevo comisionado</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input name="name" required className={inputClass} placeholder="NOMBRE" />
                </div>
                <div>
                  <label className={labelClass}>% sobre payout</label>
                  <input name="rate_pct" type="number" step="0.0001" className={inputClass} placeholder="Vacío = VIP" />
                </div>
                <div>
                  <label className={labelClass}>Orden</label>
                  <input name="sort_order" type="number" defaultValue={tiers.length + 1} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>Crear</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {/* Feedback */}
          {message && (
            <div className={`flex items-center gap-2 mt-3 rounded-md p-2 text-sm ${
              message.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation */}
      <p className="text-xs text-muted-foreground">
        Cada usuario tiene un comisionado asignado. El comisionado define el % del payout_partner_base que cobra.
        Los superiores en la jerarquía cobran el diferencial entre su rate y el de su subordinado directo.
        VIP (rate NULL) usa importe fijo definido por override.
      </p>
    </div>
  )
}
