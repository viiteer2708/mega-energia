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
  recipients: { lists?: number[] }
  statistics: { campaignStats: CampaignStat[] }
  tag: string
}

interface BrevoApiResponse {
  campaigns: BrevoApiCampaign[]
  count: number
}

// ID de la lista "AUTOMATICA 14/04" en Brevo
const TARGET_LIST_ID = 466

async function fetchPage(apiKey: string, offset: number): Promise<BrevoApiCampaign[]> {
  const res = await fetch(
    `https://api.brevo.com/v3/emailCampaigns?status=sent&sort=desc&limit=100&offset=${offset}`,
    {
      headers: { 'api-key': apiKey, accept: 'application/json' },
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return []
  const data: BrevoApiResponse = await res.json()
  return data.campaigns ?? []
}

export async function getCampaigns(): Promise<BrevoCampaign[]> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return []

  try {
    // Fetch 5 páginas en paralelo (500 campañas — cubre todo el rango con matches)
    const pages = await Promise.all([
      fetchPage(apiKey, 0),
      fetchPage(apiKey, 100),
      fetchPage(apiKey, 200),
      fetchPage(apiKey, 300),
      fetchPage(apiKey, 400),
    ])

    return pages
      .flat()
      .filter((c) => c.recipients?.lists?.includes(TARGET_LIST_ID))
      .map((c) => ({
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
