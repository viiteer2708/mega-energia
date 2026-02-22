'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { updateProfile } from './actions'

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  COMERCIAL: 'Comercial',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUPERVISOR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMERCIAL: 'bg-primary/20 text-primary border-primary/30',
}

interface ProfileFormProps {
  name: string
  email: string
  role: string
}

export function ProfileForm({ name, email, role }: ProfileFormProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <form action={updateProfile}>
      {/* Header card with avatar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{name}</CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  'w-fit px-2 py-0.5 text-xs font-semibold',
                  roleColors[role]
                )}
              >
                {roleLabels[role] ?? role}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form fields */}
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-foreground"
            >
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={name}
              required
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Rol</label>
            <div className="flex h-9 w-full items-center rounded-md border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
              {roleLabels[role] ?? role}
            </div>
            <p className="text-xs text-muted-foreground">
              El rol no se puede modificar
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Guardar cambios</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
