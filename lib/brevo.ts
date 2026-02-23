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

async function fetchPage(apiKey: string, offset: number, limit: number): Promise<BrevoApiCampaign[]> {
  const res = await fetch(
    `https://api.brevo.com/v3/emailCampaigns?status=sent&sort=desc&limit=${limit}&offset=${offset}`,
    {
      headers: { 'api-key': apiKey, accept: 'application/json' },
      next: { revalidate: 3600 },
    }
  )

  // Retry una vez en rate limit (429)
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000))
    const retry = await fetch(
      `https://api.brevo.com/v3/emailCampaigns?status=sent&sort=desc&limit=${limit}&offset=${offset}`,
      {
        headers: { 'api-key': apiKey, accept: 'application/json' },
        next: { revalidate: 3600 },
      }
    )
    if (!retry.ok) return []
    const data: BrevoApiResponse = await retry.json()
    return data.campaigns ?? []
  }

  if (!res.ok) return []
  const data: BrevoApiResponse = await res.json()
  return data.campaigns ?? []
}

function mapCampaign(c: BrevoApiCampaign): BrevoCampaign {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    sentDate: c.sentDate,
    shareLink: c.shareLink ?? '',
    opened: (c.statistics?.campaignStats?.reduce((sum, s) => sum + (s.uniqueViews ?? 0), 0) ?? 0) > 0,
    tag: c.tag,
  }
}

export async function getCampaigns(): Promise<BrevoCampaign[]> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return []

  try {
    const result: BrevoCampaign[] = []
    let offset = 0
    const limit = 100

    // Paginar secuencialmente hasta no encontrar matches
    while (offset < 1000) {
      const page = await fetchPage(apiKey, offset, limit)
      if (page.length === 0) break

      const matches = page.filter((c) =>
        c.recipients?.lists?.includes(TARGET_LIST_ID)
      )

      for (const c of matches) {
        result.push(mapCampaign(c))
      }

      // Si no hay matches en esta página, parar
      if (matches.length === 0) break

      offset += limit
    }

    return result
  } catch {
    return []
  }
}
