'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'

interface AppShellProps {
  user: UserProfile
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 md:relative md:flex md:shrink-0 transition-transform duration-300',
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0'
        )}
      >
        <Sidebar
          user={user}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMobileMenuToggle={() => setMobileMenuOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
