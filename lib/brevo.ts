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
const PAGE_SIZE = 50

export async function getCampaigns(): Promise<BrevoCampaign[]> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return []

  try {
    const all: BrevoApiCampaign[] = []
    let offset = 0
    let total = Infinity

    while (offset < total) {
      const res = await fetch(
        `https://api.brevo.com/v3/emailCampaigns?status=sent&sort=desc&limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: { 'api-key': apiKey, accept: 'application/json' },
          next: { revalidate: 300 },
        }
      )

      if (!res.ok) break

      const data: BrevoApiResponse = await res.json()
      total = data.count ?? 0

      const page = data.campaigns ?? []
      if (page.length === 0) break

      all.push(...page)
      offset += PAGE_SIZE
    }

    return all
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
