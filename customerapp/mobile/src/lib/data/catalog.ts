import { useCallback } from 'react'
import type { Category, Question, Service } from '@app/shared/catalog-v2'

import { CATEGORIES, QUESTIONS, SERVICES } from '@/lib/mock/catalog'
import { mockRequest } from '@/lib/mock/request'
import { useAsync, type AsyncState } from '@/lib/useAsync'

/**
 * The catalog, as screens ask for it. Each read is a plain async function
 * (what the backend swap replaces) and a hook over it (what a screen calls).
 * Today the functions answer from lib/mock; tomorrow they read Firestore, and
 * no screen changes.
 *
 * Every hook returns the useAsync shape — status, data, error, reload — so a
 * screen draws its skeleton, its content, its empty state and its error state
 * from the same four fields. An empty list is `ready` with `[]`; a missing
 * item is `ready` with `null`. Neither is an error.
 */

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/** Top-level categories, or the children of `parentId`. */
export function fetchCategories(parentId: string | null = null): Promise<Category[]> {
  const list = CATEGORIES.filter((c) => (c.parentId ?? null) === parentId).sort(byOrder)
  return mockRequest(list)
}

export function fetchCategory(id: string): Promise<Category | null> {
  return mockRequest(CATEGORIES.find((c) => c.id === id) ?? null)
}

/** The category and every category under it, at any depth. */
function withDescendants(id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of CATEGORIES) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  return ids
}

/** Services in a category, including those in its sub-categories. */
export function fetchServices(categoryId: string): Promise<Service[]> {
  const ids = withDescendants(categoryId)
  return mockRequest(SERVICES.filter((s) => ids.has(s.categoryId)))
}

export function fetchService(id: string): Promise<Service | null> {
  return mockRequest(SERVICES.find((s) => s.id === id) ?? null)
}

/**
 * What Home shows under "Most booked". Not `fetchPopularServices`: lib/catalog
 * has that name for the appliance catalog's PopularService rows.
 */
export function fetchMostBookedServices(): Promise<Service[]> {
  return mockRequest(SERVICES.filter((s) => s.popular))
}

/** A word's letters and digits only: "a/c" → "ac", "1.5-ton" → "15ton". */
const squash = (word: string) => word.replace(/[^a-z0-9]/g, '')

/**
 * Services whose name, category or highlights have a word starting with each
 * word typed. Prefixes, not substrings: "ac" finds the AC, not "machine".
 *
 * Punctuation is ignored on both sides, without dropping any piece of a word:
 * a typed word, squashed to its letters and digits, has to start a run of
 * consecutive words of the text, read the same way. So "a/c" finds "AC",
 * "men's" finds "Men's", "full-home" finds "Full home", "1.5-ton" finds
 * "1.5 ton", "3-door" finds "3 door" and "a/c-repair" finds "AC repair".
 *
 * A run may not start on a one-letter word that stands alone in the text
 * ("a clean finish"): it is an article, and "a/c" would otherwise find it.
 * A letter joined to the next by punctuation ("A/C") can start one. A
 * one-letter query still finds every word that starts with that letter.
 */
export function searchServices(term: string): Promise<Service[]> {
  const words = term.toLowerCase().split(/\s+/).map(squash).filter(Boolean)
  if (words.length === 0) return mockRequest([])
  const names = new Map(CATEGORIES.map((c) => [c.id, c.name]))
  const hits = SERVICES.filter((s) => {
    const text = tokenize([s.name, names.get(s.categoryId) ?? '', ...s.highlights].join(' ').toLowerCase())
    return words.every((word) => text.tokens.some((_, i) => startsRun(word, text, i)))
  })
  return mockRequest(hits)
}

type Tokens = { tokens: string[]; loneLetters: Set<number> }

/** "a/c repair, a clean" → tokens a, c, repair, a, clean; lone letters: the second a. */
function tokenize(text: string): Tokens {
  const tokens: string[] = []
  const loneLetters = new Set<number>()
  for (const word of text.split(/\s+/)) {
    const pieces = word.split(/[^a-z0-9]+/).filter(Boolean)
    if (pieces.length === 1 && /^[a-z]$/.test(pieces[0])) loneLetters.add(tokens.length)
    tokens.push(...pieces)
  }
  return { tokens, loneLetters }
}

/** Whether `word` is a prefix of tokens[at] + tokens[at + 1] + … */
function startsRun(word: string, { tokens, loneLetters }: Tokens, at: number): boolean {
  let rest = word
  for (let i = at; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.startsWith(rest)) return true
    // Crossing into the next word needs this one used up whole.
    if (!rest.startsWith(token) || (i === at && loneLetters.has(at))) return false
    rest = rest.slice(token.length)
  }
  return false
}

/**
 * The questions a booking for `serviceId` asks: its own, then those of its
 * category and every category above it, in `order`.
 */
export function fetchQuestions(serviceId: string): Promise<Question[]> {
  const service = SERVICES.find((s) => s.id === serviceId)
  if (!service) return mockRequest([])
  const chain = new Set<string>()
  let at: Category | undefined = CATEGORIES.find((c) => c.id === service.categoryId)
  while (at) {
    chain.add(at.id)
    const parent: string | undefined = at.parentId
    at = parent ? CATEGORIES.find((c) => c.id === parent) : undefined
  }
  const list = QUESTIONS.filter(
    (q) => q.serviceId === serviceId || (q.categoryId !== undefined && chain.has(q.categoryId))
  ).sort(byOrder)
  return mockRequest(list)
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCategories(parentId: string | null = null): AsyncState<Category[]> {
  return useAsync(useCallback(() => fetchCategories(parentId), [parentId]))
}

export function useCategory(id: string): AsyncState<Category | null> {
  return useAsync(useCallback(() => fetchCategory(id), [id]))
}

export function useServices(categoryId: string): AsyncState<Service[]> {
  return useAsync(useCallback(() => fetchServices(categoryId), [categoryId]))
}

export function useService(id: string): AsyncState<Service | null> {
  return useAsync(useCallback(() => fetchService(id), [id]))
}

export function useMostBookedServices(): AsyncState<Service[]> {
  return useAsync(fetchMostBookedServices)
}

export function useQuestions(serviceId: string): AsyncState<Question[]> {
  return useAsync(useCallback(() => fetchQuestions(serviceId), [serviceId]))
}
