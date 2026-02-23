import { Mail, Send } from 'lucide-react'
import { getCampaigns } from '@/lib/brevo'
import { EmailList } from '@/components/emails/EmailList'

export const dynamic = 'force-dynamic'

export default async function EmailsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Campañas</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de campañas de email enviadas desde Brevo
          </p>
        </div>
      </div>

      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Send className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
              <p className="text-xs text-muted-foreground">Campañas enviadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <EmailList campaigns={campaigns} />
    </div>
  )
}
