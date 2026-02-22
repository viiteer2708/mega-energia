import { Package } from 'lucide-react'
import { getMateriales } from '@/lib/dropbox'
import { DropboxMateriales } from '@/components/materiales/DropboxMateriales'

export const revalidate = 300 // refresca datos de Dropbox cada 5 minutos

export default async function MaterialesPage() {
  const { rootFiles, sections } = await getMateriales()

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

      <DropboxMateriales rootFiles={rootFiles} sections={sections} />
    </div>
  )
}
