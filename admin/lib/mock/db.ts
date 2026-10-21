/**
 * The mock backend's data, kept in memory: a reload starts it afresh from the
 * seed. Each admin phase adds its collections here: admin accounts for
 * sign-in (PR 7), the catalog (PR 8), technicians and KYC (PR 9).
 *
 * `read` returns the current snapshot; `write` replaces it and tells every
 * subscriber, which is how every screen reading a record sees it change.
 */
import { controlSeed } from '../control'
import { seed } from '../seed'
import type { AdminAccount, Category, KycDocument, Partner, Question, RateCardItem, Service, ServiceArea } from '../data/types'
import { seedCatalog } from './catalogSeed'
import { seedPartners } from './partnerSeed'

export interface MockDb {
  admins: AdminAccount[]
  categories: Category[]
  services: Service[]
  questions: Question[]
  rateCard: RateCardItem[]
  areas: ServiceArea[]
  partners: Partner[]
  kycDocs: KycDocument[]
}

function fresh(): MockDb {
  const admins = controlSeed(seed()).admins.map(
    (a): AdminAccount => ({ id: a.id, name: a.name, email: a.email, role: a.role, status: a.status })
  )
  return { admins, ...seedCatalog(), ...seedPartners() }
}

let db: MockDb | null = null
const listeners = new Set<() => void>()

/** Built on first read, so a server render never seeds it. */
export function read(): MockDb {
  db ??= fresh()
  return db
}

/** Replace the snapshot (never mutate it) and notify subscribers. */
export function write(next: (current: MockDb) => MockDb) {
  db = next(read())
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Back to the seed — for tests. */
export function resetMockDb() {
  write(() => fresh())
}
