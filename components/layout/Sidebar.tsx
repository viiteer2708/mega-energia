'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GitCompare,
  Zap,
  Package,
  BookOpen,
  Mail,
  Users,
  UserPlus,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { signOut } from '@/app/login/actions'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { UserProfile } from '@/lib/types'
import { ROLES_CAN_MANAGE_USERS } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/comparador', label: 'Comparador', icon: GitCompare },
  { href: '/cups', label: 'CUPS', icon: Zap },
  { href: '/materiales', label: 'Materiales', icon: Package },
  { href: '/tutoriales', label: 'Tutoriales', icon: BookOpen },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/contratos', label: 'Contratos', icon: FileText },
]

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  BACKOFFICE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DIRECTOR: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KAM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANAL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  COMERCIAL: 'bg-primary/20 text-primary border-primary/30',
}

interface SidebarProps {
  user?: UserProfile | null
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ user, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME'

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full sidebar-gradient border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          'flex items-center px-4 py-5',
          collapsed && 'justify-center px-2'
        )}
      >
        {collapsed ? (
          <Image
            src="/logo.png"
            alt="GRUPO NEW ENERGY"
            width={36}
            height={36}
            className="object-contain shrink-0"
          />
        ) : (
          <Image
            src="/logo.png"
            alt="GRUPO NEW ENERGY"
            width={140}
            height={40}
            className="object-contain"
          />
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20 gne-card-glow'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive && 'text-primary'
                    )}
                  />
                  {!collapsed && <span>{label}</span>}
                  {isActive && !collapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Usuarios — solo visible para roles con gestión */}
        {user && ROLES_CAN_MANAGE_USERS.includes(user.role) && (
          <>
            <Separator className="my-3 opacity-50" />
            <ul>
              <li>
                {(() => {
                  const isActive = pathname === '/usuarios' || pathname.startsWith('/usuarios/')
                  return (
                    <Link
                      href="/usuarios"
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/20 gne-card-glow'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                      title={collapsed ? 'Usuarios' : undefined}
                    >
                      <UserPlus className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                      {!collapsed && <span>Usuarios</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  )
                })()}
              </li>
            </ul>
          </>
        )}
      </nav>

      <Separator className="opacity-50" />

      {/* User profile */}
      <div
        className={cn(
          'flex items-center gap-3 p-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <Link
          href="/perfil"
          className={cn(
            'flex items-center gap-3 rounded-lg transition-colors hover:bg-accent min-w-0',
            collapsed ? 'p-0' : 'flex-1 px-1 py-1'
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
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
          )}
        </Link>
        {!collapsed && (
          <form action={signOut}>
            <button
              type="submit"
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
