import { type LucideIcon, FileText, FileSpreadsheet, Presentation, Image, Download, Star, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Material, MaterialFormato } from '@/lib/types'

const formatoConfig: Record<MaterialFormato, { icon: LucideIcon; color: string; bg: string }> = {
  PDF:  { icon: FileText,        color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  DOCX: { icon: FileText,        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  PPTX: { icon: Presentation,    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  XLSX: { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  IMG:  { icon: Image,           color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
}

interface MaterialCardProps {
  material: Material
  dropboxFolder?: string
}

export function MaterialCard({ material, dropboxFolder }: MaterialCardProps) {
  const fmt = formatoConfig[material.formato]
  const Icon = fmt.icon

  return (
    <Card className={cn(
      'border-border/50 bg-card hover:border-border transition-all duration-200 hover:shadow-md group',
      material.destacado && 'border-primary/20'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', fmt.bg)}>
            <Icon className={cn('h-5 w-5', fmt.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0">
                {material.titulo}
              </p>
              <div className="flex gap-1 shrink-0">
                {material.destacado && (
                  <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-primary/15 text-[9px] font-bold text-primary">
                    <Star className="h-2.5 w-2.5" />TOP
                  </span>
                )}
                {material.nuevo && (
                  <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-emerald-500/15 text-[9px] font-bold text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" />NEW
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {material.descripcion}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className={cn('font-mono font-semibold px-1.5 py-0.5 rounded border text-[10px]', fmt.bg, fmt.color)}>
                  {material.formato}
                </span>
                <span>{material.tamaño}</span>
                <span>·</span>
                <span>{material.descargas.toLocaleString('es-ES')} descargas</span>
              </div>
              {dropboxFolder ? (
                <a
                  href={dropboxFolder}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all group-hover:border-primary/20"
                >
                  <Download className="h-3 w-3" />
                  Descargar
                </a>
              ) : (
                <button
                  className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all group-hover:border-primary/20"
                  disabled
                >
                  <Download className="h-3 w-3" />
                  Descargar
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
