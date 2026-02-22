import { Bienvenida3D } from './Bienvenida3D'

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden -mx-6 -mt-6">
      <Bienvenida3D userName={userName} />
    </div>
  )
}
