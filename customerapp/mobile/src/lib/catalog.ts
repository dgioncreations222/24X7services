
import {
  collection,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import {
  bannerSchema,
  businessConfigSchema,
  catalogApplianceSchema,
  catalogBrandSchema,
  catalogIssueSchema,
  COL,
  diagnosisRuleSchema,
  DOC,
  popularServiceSchema,
  serviceAreaSchema,
  serviceReviewSchema,
  type ApplianceId,
  type Banner,
  type BusinessConfig,
  type CatalogAppliance,
  type CatalogBrand,
  type CatalogIssue,
  type DiagnosisRule,
  type PopularService,
  type ServiceArea,
  type ServiceKey,
  type ServiceReview,
} from '@app/shared'
import { db } from './firebase'
import { readAll } from '@/lib/catalog/read'

export {
  cheapestByAppliance,
  fetchAllServices,
  fetchServicesFor,
  summaryByAppliance,
  type ApplianceSummary,
} from '@/lib/catalog/services'

/**
 * Every read of the catalog, in one place.
 *
 * The catalog is public and read-only, so these are direct Firestore reads
 * rather than callables. Each row is parsed on the way in: a seed that has
 * drifted from the schema drops the bad row and renders the rest, instead of
 * putting `undefined` through a price formatter halfway down a list.
 *
 * Nothing here caches. Firestore's own SDK cache covers a back-and-forth
 * between two screens, and a catalog that changed while the app was open should
 * not need a restart to show it.
 */

// ---------------------------------------------------------------------------
// Appliances
// ---------------------------------------------------------------------------

export function fetchAppliances(): Promise<CatalogAppliance[]> {
  return readAll(
    query(
      collection(db(), COL.catalogAppliances),
      where('active', '==', true),
      orderBy('order')
    ),
    catalogApplianceSchema
  )
}

export async function fetchAppliance(
  applianceId: string
): Promise<CatalogAppliance | null> {
  const snap = await getDoc(doc(db(), COL.catalogAppliances, applianceId))
  if (!snap.exists()) return null
  const parsed = catalogApplianceSchema.safeParse({
    id: snap.id,
    ...snap.data(),
  })
  return parsed.success && parsed.data.active ? parsed.data : null
}

// ---------------------------------------------------------------------------
// Brands and issues
// ---------------------------------------------------------------------------

export function fetchBrands(): Promise<CatalogBrand[]> {
  return readAll(
    query(
      collection(db(), COL.catalogBrands),
      where('active', '==', true),
      orderBy('order')
    ),
    catalogBrandSchema
  )
}

/**
 * The reviews on one service, newest first.
 *
 * The public half only — `serviceReviews`, which carries a score, the words
 * and a first name. The review itself stays private to whoever wrote it.
 * Capped at the same fifty the rules allow, because a service page is not the
 * place to ask for every review anybody has ever left.
 */
export function fetchServiceReviews(
  applianceId: ApplianceId,
  serviceKey: ServiceKey
): Promise<ServiceReview[]> {
  return readAll(
    query(
      collection(db(), COL.serviceReviews),
      where('applianceId', '==', applianceId),
      where('serviceKey', '==', serviceKey),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    serviceReviewSchema
  )
}

export function fetchIssuesFor(
  applianceId: ApplianceId
): Promise<CatalogIssue[]> {
  return readAll(
    query(
      collection(db(), COL.catalogIssues),
      where('applianceId', '==', applianceId),
      orderBy('order')
    ),
    catalogIssueSchema
  )
}

/**
 * Every appliance's problems in one read, for screens that list services from
 * several appliances and show each repair's options.
 */
export function fetchAllIssues(): Promise<CatalogIssue[]> {
  return readAll(
    query(collection(db(), COL.catalogIssues), orderBy('order')),
    catalogIssueSchema
  )
}

/**
 * What usually causes one problem, and what to try first. The rule is keyed by
 * the issue it explains, so a single read answers it.
 */
export async function fetchDiagnosisRule(
  issueId: string
): Promise<DiagnosisRule | null> {
  const snap = await getDoc(doc(db(), COL.diagnosisRules, issueId))
  if (!snap.exists()) return null
  const parsed = diagnosisRuleSchema.safeParse({ id: snap.id, ...snap.data() })
  return parsed.success ? parsed.data : null
}

// ---------------------------------------------------------------------------
// Home content
// ---------------------------------------------------------------------------

export function fetchBanners(): Promise<Banner[]> {
  return readAll(
    query(
      collection(db(), COL.banners),
      where('active', '==', true),
      orderBy('order')
    ),
    bannerSchema
  )
}

export function fetchPopularServices(): Promise<PopularService[]> {
  return readAll(
    query(
      collection(db(), COL.popularServices),
      where('active', '==', true),
      orderBy('order')
    ),
    popularServiceSchema
  )
}

// ---------------------------------------------------------------------------
// Serviceability and configuration
// ---------------------------------------------------------------------------

/**
 * The areas we cover, for the list a customer picks from. Serviceability for a
 * pincode they typed goes through `checkServiceability` instead — the answer
 * gates the booking flow, and a client deciding it for itself is a client that
 * can forget to check `active`.
 */
export async function fetchServiceAreas(): Promise<ServiceArea[]> {
  const rows = await readAll(
    query(collection(db(), COL.serviceAreas), where('active', '==', true)),
    serviceAreaSchema
  )
  return rows.sort((a, b) => a.area.localeCompare(b.area))
}

export async function fetchBusinessConfig(): Promise<BusinessConfig | null> {
  const snap = await getDoc(doc(db(), COL.config, DOC.businessConfig))
  if (!snap.exists()) return null
  const parsed = businessConfigSchema.safeParse(snap.data())
  return parsed.success ? parsed.data : null
}
