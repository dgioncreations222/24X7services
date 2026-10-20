import { collection, getDocs, query, where } from 'firebase/firestore'
import { brandApplianceMatrixEntrySchema, COL } from '@app/shared'

import { db } from '@/lib/firebase'

/**
 * The brands we service for one appliance, read from the brand-appliance
 * matrix. A brand missing from the set is shown greyed out, not hidden; rows
 * that fail the schema count as not enabled.
 */
export async function fetchEnabledBrandIds(applianceId: string): Promise<Set<string>> {
  const matrix = await getDocs(
    query(collection(db(), COL.brandApplianceMatrix), where('applianceId', '==', applianceId))
  )
  const enabled = new Set<string>()
  for (const doc of matrix.docs) {
    const parsed = brandApplianceMatrixEntrySchema.safeParse(doc.data())
    if (parsed.success && parsed.data.enabled) enabled.add(parsed.data.brandId)
  }
  return enabled
}
