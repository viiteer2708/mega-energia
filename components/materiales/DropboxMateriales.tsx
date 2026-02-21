'use client'

import { useState, useMemo } from 'react'
import {
  type LucideIcon,
  FileText, FileSpreadsheet, Presentation, Film, File,
  Download, Loader2, FolderOpen, Search, ChevronDown, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DBFile, DBSection } from '@/lib/dropbox'

const DROPBOX_ZIP = 'https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=1'
const DROPBOX_FOLDER = 'https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=0'

function getExt(name: string) {
  return name.split('.').pop()?.toUpperCase() ?? ''
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const extConfig: Record<string, { color: string; bg: string; Icon: LucideIcon }> = {
  PDF:  { color: 'text-red-400',    bg: 'border-red-500/20 bg-red-500/10',     Icon: FileText },
  XLSX: { color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/10', Icon: FileSpreadsheet },
  DOCX: { color: 'text-blue-400',   bg: 'border-blue-500/20 bg-blue-500/10',   Icon: FileText },
  PPTX: { color: 'text-orange-400', bg: 'border-orange-500/20 bg-orange-500/10', Icon: Presentation },
  MP4:  { color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/10', Icon: Film },
}

function getExtConfig(name: string): { color: string; bg: string; Icon: LucideIcon } {
  const ext = getExt(name)
  return extConfig[ext] ?? { color: 'text-muted-foreground', bg: 'border-border bg-muted/30', Icon: File }
}

function FileRow({ file }: { file: DBFile }) {
  const [loading, setLoading] = useState(false)
  const cfg = getExtConfig(file.name)
  const Icon = cfg.Icon

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/dropbox-link?id=${encodeURIComponent(file.id)}`)
      const data = await res.json()
      if (data.link) {
        const a = document.createElement('a')
        a.href = data.link
        a.download = file.name
        a.click()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 hover:border-border/80 hover:bg-card transition-colors group">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', cfg.bg)}>
        <Icon className={cn('h-4 w-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border', cfg.bg, cfg.color)}>
            {getExt(file.name)}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {loading ? 'Generando...' : 'Descargar'}
      </button>
    </div>
  )
}

function Section({ section, defaultOpen = false }: { section: DBSection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 bg-card/80 px-4 py-3 text-left hover:bg-card transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-semibold text-foreground">{section.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {section.files.length} archivo{section.files.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-3 space-y-2 bg-background/30">
          {section.files.map(f => <FileRow key={f.id} file={f} />)}

          {section.subfolders.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 px-1">Subcarpetas</p>
              <div className="flex flex-wrap gap-2">
                {section.subfolders.map(sf => (
                  <a
                    key={sf.id}
                    href={DROPBOX_FOLDER}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                  >
                    <FolderOpen className="h-3 w-3" />
                    {sf.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface DropboxMaterialesProps {
  rootFiles: DBFile[]
  sections: DBSection[]
}

export function DropboxMateriales({ rootFiles, sections }: DropboxMaterialesProps) {
  const [search, setSearch] = useState('')

  const allFiles = useMemo(() => [
    ...rootFiles,
    ...sections.flatMap(s => s.files),
  ], [rootFiles, sections])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return allFiles.filter(f => f.name.toLowerCase().includes(q))
  }, [allFiles, search])

  const totalFiles = allFiles.length
  const totalSize = allFiles.reduce((s, f) => s + f.size, 0)

  return (
    <div className="space-y-4">
      {/* Stats + CTAs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-bold text-foreground">{totalFiles}</span>
            <span className="text-muted-foreground ml-1">archivos</span>
          </div>
          <div>
            <span className="font-bold text-foreground">{formatSize(totalSize)}</span>
            <span className="text-muted-foreground ml-1">en total</span>
          </div>
        </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar archivo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No se encontraron archivos</p>
          ) : (
            searchResults.map(f => <FileRow key={f.id} file={f} />)
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Root files */}
          {rootFiles.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 bg-card/80 px-4 py-3">
                <FolderOpen className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-semibold text-foreground">GENERAL</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {rootFiles.length} archivos
                </span>
              </div>
              <div className="border-t border-border p-3 space-y-2 bg-background/30">
                {rootFiles.map(f => <FileRow key={f.id} file={f} />)}
              </div>
            </div>
          )}

          {/* Sections */}
          {sections.map((section, i) => (
            <Section key={section.id} section={section} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
