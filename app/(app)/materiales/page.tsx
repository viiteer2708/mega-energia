import { Package } from 'lucide-react'
import { MaterialesGrid } from '@/components/materiales/MaterialesGrid'
import { mockMateriales } from '@/lib/mock-data'

export default function MaterialesPage() {
  const total = mockMateriales.length
  const totalDescargas = mockMateriales.reduce((s, m) => s + m.descargas, 0)

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Materiales</h1>
            <p className="text-sm text-muted-foreground">
              Biblioteca de recursos comerciales — documentos, contratos y plantillas
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">documentos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalDescargas.toLocaleString('es-ES')}</p>
            <p className="text-xs text-muted-foreground">descargas totales</p>
          </div>
        </div>
      </div>

      <MaterialesGrid materiales={mockMateriales} />
    </div>
  )
}
