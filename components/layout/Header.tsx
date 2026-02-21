'use client'

import { Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUPERVISOR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMERCIAL: 'bg-primary/20 text-primary border-primary/30',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

interface HeaderProps {
  user?: UserProfile | null
  onMobileMenuToggle?: () => void
}

export function Header({ user, onMobileMenuToggle }: HeaderProps) {
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME'

  const firstName = user?.full_name?.split(' ')[0] ?? 'Comercial'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6">
      {/* Mobile menu button + greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-muted-foreground">
            {getGreeting()},
          </span>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {firstName}
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium text-foreground">
            {user?.full_name ?? 'Comercial'}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'mt-0.5 w-fit px-1.5 py-0 text-[10px] font-semibold',
              roleColors[user?.role ?? 'COMERCIAL']
            )}
          >
            {user?.role ?? 'COMERCIAL'}
          </Badge>
        </div>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
