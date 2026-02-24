import { Mail } from 'lucide-react'
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
          <h1 className="text-xl font-bold text-foreground">Emails</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de emails recibidos (se muestran los últimos 25 correos)
          </p>
        </div>
      </div>

      {/* List */}
      <EmailList campaigns={campaigns} />
    </div>
  )
}
