import { collection, orderBy, query, where } from 'firebase/firestore'
import {
  catalogServiceSchema,
  COL,
  type ApplianceId,
  type CatalogService,
} from '@app/shared'
import { db } from '@/lib/firebase'
import { readAll } from '@/lib/catalog/read'

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export function fetchServicesFor(
  applianceId: ApplianceId
): Promise<CatalogService[]> {
  return readAll(
    query(
      collection(db(), COL.catalogServices),
      where('applianceId', '==', applianceId),
      where('active', '==', true),
      orderBy('order')
    ),
    catalogServiceSchema
  )
}

/**
 * Every active service, for the "from ₹X" line under each appliance tile.
 *
 * Deliberately unordered: `active` alone rides the single-field index Firestore
 * maintains by itself, where adding `orderBy('order')` would need a composite
 * index for a sort that thirty-odd rows do fine in memory.
 */
export function fetchAllServices(): Promise<CatalogService[]> {
  return readAll(
    query(collection(db(), COL.catalogServices), where('active', '==', true)),
    catalogServiceSchema
  )
}

/** The cheapest visit fee per appliance — what "from ₹X" actually means. */
export function cheapestByAppliance(
  services: readonly CatalogService[]
): Map<string, number> {
  const cheapest = new Map<string, number>()
  for (const service of services) {
    const current = cheapest.get(service.applianceId)
    if (current === undefined || service.visitFee < current) {
      cheapest.set(service.applianceId, service.visitFee)
    }
  }
  return cheapest
}

/**
 * What stands for a whole appliance on a tile: a clip, a frame of it, and a
 * score.
 *
 * An appliance has no artwork or score of its own — both belong to the
 * services under it. The clip is the headline service's, because a tile has
 * room for one and "repair" is the one people arrive looking for; where an
 * appliance has no repair the first service in catalog order stands in.
 *
 * The score is every service under it, weighted by how many people scored
 * each — a straight mean of the averages would let a service nobody books
 * count as much as the one everybody does. Services with no score sit the
 * round out rather than being counted as zero, and an appliance where nobody
 * has a score gets none, which is what `ServiceScore` draws nothing for.
 */
export interface ApplianceSummary {
  video?: string
  poster?: string
  rating?: number
  reviewCount?: number
}

export function summaryByAppliance(
  services: readonly CatalogService[]
): Map<string, ApplianceSummary> {
  const headline = new Map<string, CatalogService>()
  const weighted = new Map<string, { score: number; count: number }>()

  for (const service of services) {
    const current = headline.get(service.applianceId)
    const better =
      current === undefined ||
      (service.serviceKey === 'repair' && current.serviceKey !== 'repair') ||
      (current.serviceKey !== 'repair' && service.order < current.order)
    if (better) headline.set(service.applianceId, service)

    if (service.rating === undefined || service.reviewCount === undefined) {
      continue
    }
    const running = weighted.get(service.applianceId) ?? { score: 0, count: 0 }
    running.score += service.rating * service.reviewCount
    running.count += service.reviewCount
    weighted.set(service.applianceId, running)
  }

  const out = new Map<string, ApplianceSummary>()
  for (const [applianceId, service] of headline) {
    const running = weighted.get(applianceId)
    out.set(applianceId, {
      video: service.video,
      poster: service.poster,
      rating: running ? running.score / running.count : undefined,
      reviewCount: running?.count,
    })
  }
  return out
}
