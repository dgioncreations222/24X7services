import type { CatalogIssue, CatalogService } from '@app/shared'

/** Only a repair is booked for a problem; the rest go into the cart as they are. */
export function serviceOptions(
  service: Pick<CatalogService, 'applianceId' | 'serviceKey'>,
  issues: readonly CatalogIssue[]
): CatalogIssue[] {
  if (service.serviceKey !== 'repair') return []
  return issues.filter((issue) => issue.applianceId === service.applianceId)
}

/** "front-load" → "Front-load", "single-door" → "Single-door". */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
