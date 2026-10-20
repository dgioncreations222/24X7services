import { getDocs, type Query, type QueryDocumentSnapshot } from 'firebase/firestore'
import type { z } from 'zod'

/**
 * Parses each document with its id, keeping the rows that parse and dropping
 * any that drifted from the schema. Shared by one-shot reads (readAll) and
 * live listeners, which already hold the documents.
 */
export function parseRows<S extends z.ZodTypeAny>(docs: readonly QueryDocumentSnapshot[], schema: S): z.infer<S>[] {
  const rows: z.infer<S>[] = []
  for (const document of docs) {
    const parsed = schema.safeParse({ id: document.id, ...document.data() })
    if (parsed.success) rows.push(parsed.data)
  }
  return rows
}

/** Reads a query and keeps the rows that parse, dropping any that drifted. */
export async function readAll<S extends z.ZodTypeAny>(
  q: Query,
  schema: S
): Promise<z.infer<S>[]> {
  const snap = await getDocs(q)
  return parseRows(snap.docs, schema)
}
