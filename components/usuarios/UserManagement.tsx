'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { UserProfile, UserListItem } from '@/lib/types'
import { CreateUserForm } from './CreateUserForm'

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  BACKOFFICE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DIRECTOR: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KAM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANAL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  COMERCIAL: 'bg-primary/20 text-primary border-primary/30',
}

interface UserManagementProps {
  currentUser: UserProfile
  users: UserListItem[]
}

export function UserManagement({ currentUser, users }: UserManagementProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los usuarios de tu red
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            showForm
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-foreground hover:bg-accent'
          )}
        >
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <CreateUserForm
          currentRole={currentUser.role}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista de usuarios */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {users.length} usuario{users.length !== 1 ? 's' : ''} en tu red
        </p>
        <div className="space-y-1.5">
          {users.map(u => {
            const initials = u.full_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Avatar className="h-9 w-9 shrink-0 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.full_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 px-2 py-0.5 text-[10px] font-semibold',
                    roleColors[u.role]
                  )}
                >
                  {u.role}
                </Badge>
                {u.created_at && (
                  <span className="shrink-0 text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
