import { BookOpen } from 'lucide-react'
import { TutorialesGrid } from '@/components/tutoriales/TutorialesGrid'
import { mockTutoriales } from '@/lib/mock-data'

export default function TutorialesPage() {
  const totalVistas = mockTutoriales.reduce((s, t) => s + t.vistas, 0)
  const nuevos = mockTutoriales.filter(t => t.nuevo).length

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Tutoriales</h1>
            <p className="text-sm text-muted-foreground">
              Formación comercial y técnica para el equipo
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xl font-bold text-foreground">{mockTutoriales.length}</p>
            <p className="text-xs text-muted-foreground">tutoriales</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalVistas.toLocaleString('es-ES')}</p>
            <p className="text-xs text-muted-foreground">vistas totales</p>
          </div>
          {nuevos > 0 && (
            <div>
              <p className="text-xl font-bold text-primary">{nuevos}</p>
              <p className="text-xs text-muted-foreground">nuevos</p>
            </div>
          )}
        </div>
      </div>

      <TutorialesGrid tutoriales={mockTutoriales} />
    </div>
  )
}
