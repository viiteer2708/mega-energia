import { Bienvenida3D } from './Bienvenida3D'

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute left-1/4 bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      </div>

      <div className="relative">
        <Bienvenida3D userName={userName} />

        {/* Date summary — overlaid bottom-right */}
        <div className="absolute bottom-4 right-4 hidden md:flex flex-col items-end gap-1 text-right">
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
