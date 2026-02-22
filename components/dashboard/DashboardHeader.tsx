import { Bienvenida3D } from './Bienvenida3D'

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden -mx-6 -mt-6">
      <div className="relative">
        <Bienvenida3D userName={userName} />

        {/* Date summary — overlaid bottom-right */}
        <div className="absolute bottom-4 right-4 z-20 hidden md:flex flex-col items-end gap-1 text-right">
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
