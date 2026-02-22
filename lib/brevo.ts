export interface BrevoCampaign {
  id: number
  name: string
  subject: string
  sentDate: string
  shareLink: string
  opened: boolean
  tag: string
}

interface CampaignStat {
  sent: number
  uniqueViews: number
}

interface BrevoApiCampaign {
  id: number
  name: string
  subject: string
  sentDate: string
  shareLink: string
  sender: { email?: string }
  statistics: { campaignStats: CampaignStat[] }
  tag: string
}

interface BrevoApiResponse {
  campaigns: BrevoApiCampaign[]
  count: number
}

export async function getCampaigns(): Promise<BrevoCampaign[]> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(
      'https://api.brevo.com/v3/emailCampaigns?status=sent&sort=desc&limit=50&offset=0',
      {
        headers: { 'api-key': apiKey, accept: 'application/json' },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) return []

    const data: BrevoApiResponse = await res.json()

    const SENDER_EMAIL = 'victormarron@megaenergia.es'
    const filtered = data.campaigns.filter(
      (c) => c.sender?.email?.toLowerCase() === SENDER_EMAIL
    )

    return filtered.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      sentDate: c.sentDate,
      shareLink: c.shareLink ?? '',
      opened: (c.statistics?.campaignStats?.reduce((sum, s) => sum + (s.uniqueViews ?? 0), 0) ?? 0) > 0,
      tag: c.tag,
    }))
  } catch {
    return []
  }
}
