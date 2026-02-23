import type { ComercialRanking, Role } from '@/lib/types'

function getDescendantIds(ranking: ComercialRanking[], parentId: string): Set<string> {
  const ids = new Set<string>()
  const queue = [parentId]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const entry of ranking) {
      if (entry.parent_id === current && !ids.has(entry.id)) {
        ids.add(entry.id)
        queue.push(entry.id)
      }
    }
  }
  return ids
}

export function filterRankingByRole(
  ranking: ComercialRanking[],
  userId: string,
  userRole: Role
): ComercialRanking[] {
  let filtered: ComercialRanking[]

  switch (userRole) {
    case 'ADMIN':
    case 'BACKOFFICE':
      filtered = [...ranking]
      break

    case 'DIRECTOR':
    case 'KAM':
    case 'CANAL': {
      const descendantIds = getDescendantIds(ranking, userId)
      filtered = ranking.filter(
        (entry) => entry.id === userId || descendantIds.has(entry.id)
      )
      break
    }

    case 'COMERCIAL':
      filtered = ranking.filter((entry) => entry.id === userId)
      break

    default:
      filtered = []
  }

  filtered.sort((a, b) => b.facturacion - a.facturacion)
  return filtered.map((entry, index) => ({
    ...entry,
    posicion: index + 1,
  }))
}
