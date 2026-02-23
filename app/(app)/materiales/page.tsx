import { Package, AlertCircle } from 'lucide-react'
import { getMateriales } from '@/lib/dropbox'
import { DropboxMateriales } from '@/components/materiales/DropboxMateriales'

export const dynamic = 'force-dynamic'

export default async function MaterialesPage() {
  let rootFiles
  let sections

  try {
    const data = await getMateriales()
    rootFiles = data.rootFiles
    sections = data.sections
  } catch (err) {
    console.error('[Materiales] Error al cargar:', err)
    rootFiles = null
    sections = null
  }

  const hasData = rootFiles && sections && (rootFiles.length > 0 || sections.length > 0)

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Materiales</h1>
          <p className="text-sm text-muted-foreground">
            Biblioteca de recursos comerciales — sincronizado con Dropbox
          </p>
        </div>
      </div>

      {hasData ? (
        <DropboxMateriales rootFiles={rootFiles!} sections={sections!} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No es posible acceder en este momento
          </p>
          <p className="text-xs text-muted-foreground">
            El servicio de materiales no está disponible. Inténtalo de nuevo en unos minutos.
          </p>
        </div>
      )}
    </div>
  )
}
