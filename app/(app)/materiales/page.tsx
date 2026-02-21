import { Package, Download, FolderOpen } from 'lucide-react'
import { MaterialesGrid } from '@/components/materiales/MaterialesGrid'
import { mockMateriales } from '@/lib/mock-data'

const DROPBOX_FOLDER  = 'https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=0'
const DROPBOX_ZIP     = 'https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=1'

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
        <div className="flex items-center gap-3 flex-wrap">
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
          {/* Dropbox CTAs */}
          <div className="flex gap-2">
            <a
              href={DROPBOX_FOLDER}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Ver en Dropbox
            </a>
            <a
              href={DROPBOX_ZIP}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar todo (ZIP)
            </a>
          </div>
        </div>
      </div>

      {/* Banner descarga masiva */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Descarga todos los materiales de una vez</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accede a la carpeta Dropbox con contratos, tarifas, plantillas y más — siempre actualizados.
          </p>
        </div>
        <a
          href={DROPBOX_ZIP}
          className="shrink-0 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar ZIP
        </a>
      </div>

      <MaterialesGrid materiales={mockMateriales} dropboxFolder={DROPBOX_FOLDER} />
    </div>
  )
}
