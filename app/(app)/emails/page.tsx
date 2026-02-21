import { Mail } from 'lucide-react'
import { EmailStatCards } from '@/components/emails/EmailStatCards'
import { EmailList } from '@/components/emails/EmailList'
import { mockComunicados, mockEmailStats } from '@/lib/mock-data'

export default function EmailsPage() {
  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de emails enviados a clientes
          </p>
        </div>
      </div>

      {/* Stats */}
      <EmailStatCards stats={mockEmailStats} />

      {/* List */}
      <EmailList comunicados={mockComunicados} />
    </div>
  )
}
