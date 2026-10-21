'use client'

/**
 * The catalog: categories, their services, the questions a booking asks,
 * the rate card and service areas. Every action resolves when the (mock)
 * backend has the change and throws a CatalogError when the form needs
 * fixing, or a NetworkError when it could not be saved.
 */
import { mockRequest } from '../mock/api'
import { read, write, type MockDb } from '../mock/db'
import { audit } from './audit'
import { useResource, type Query } from './query'
import type { Category, Question, RateCardItem, Service, ServiceArea } from './types'

/** A form problem worth showing beside the form, in plain words. */
export class CatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CatalogError'
  }
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/* ---------------------------------------------------------------- Reads */

export function useCategories(): Query<Category[]> {
  return useResource((db) => [...db.categories].sort(byOrder))
}

/** All services, or one category's, in their order. */
export function useServices(categoryId?: string): Query<Service[]> {
  return useResource((db) =>
    db.services
      .filter((s) => !categoryId || s.categoryId === categoryId)
      .sort((a, b) => (a.categoryId === b.categoryId ? a.order - b.order : catOrder(db, a.categoryId) - catOrder(db, b.categoryId)))
  )
}

export function useQuestions(serviceId: string | undefined): Query<Question[]> {
  return useResource((db) => db.questions.filter((q) => q.serviceId === serviceId).sort(byOrder))
}

export function useRateCard(categoryId?: string): Query<RateCardItem[]> {
  return useResource((db) =>
    db.rateCard
      .filter((r) => !categoryId || r.categoryId === categoryId)
      .sort((a, b) => (a.categoryId === b.categoryId ? a.order - b.order : catOrder(db, a.categoryId) - catOrder(db, b.categoryId)))
  )
}

export function useAreas(): Query<ServiceArea[]> {
  return useResource((db) => [...db.areas].sort((a, b) => a.area.localeCompare(b.area)))
}

const catOrder = (db: MockDb, id: string) => db.categories.find((c) => c.id === id)?.order ?? 999

/* ------------------------------------------------------------- Helpers */

type Ordered = 'categories' | 'services' | 'questions' | 'rateCard'
type Row = { id: string; order: number }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'item'

/** An id from the name that no row in the collection has yet. */
function newId(rows: { id: string }[], base: string) {
  let id = slug(base)
  for (let n = 2; rows.some((r) => r.id === id); n++) id = `${slug(base)}-${n}`
  return id
}

/** The rows that are ordered together: a category's services, a service's questions. */
function siblings(db: MockDb, key: Ordered, row: Row & Partial<{ categoryId: string; serviceId: string }>): Row[] {
  const all = db[key] as (Row & Partial<{ categoryId: string; serviceId: string }>)[]
  if (key === 'questions') return all.filter((r) => r.serviceId === row.serviceId)
  if (key === 'services' || key === 'rateCard') return all.filter((r) => r.categoryId === row.categoryId)
  return all
}

/** Move a row one place up or down among its siblings. */
function move(key: Ordered, id: string, dir: -1 | 1) {
  return mockRequest(() =>
    write((db) => {
      const rows = db[key] as Row[]
      const row = rows.find((r) => r.id === id)
      if (!row) return db
      const list = siblings(db, key, row).sort(byOrder)
      const i = list.findIndex((r) => r.id === id)
      const other = list[i + dir]
      if (!other) return db
      const swapped = rows.map((r) => (r.id === id ? { ...r, order: other.order } : r.id === other.id ? { ...r, order: row.order } : r))
      return { ...db, [key]: swapped }
    })
  )
}

const KIND = { categories: 'category', services: 'service', rateCard: 'rate card item' } as const

function setActive(key: 'categories' | 'services' | 'rateCard', id: string, active: boolean) {
  return mockRequest(() => {
    const row = (read()[key] as (Row & { name: string })[]).find((r) => r.id === id)
    write((db) => ({ ...db, [key]: (db[key] as (Row & { active: boolean })[]).map((r) => (r.id === id ? { ...r, active } : r)) }))
    audit('catalog', `${active ? 'Showed' : 'Hid'} ${KIND[key]}`, { target: row?.name ?? id })
  })
}

const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean)

/* ------------------------------------------------------------ Categories */

export type CategoryInput = Pick<Category, 'name' | 'description' | 'image'> & { id?: string }

export function saveCategory(input: CategoryInput) {
  return mockRequest(() => {
    const name = input.name.trim()
    if (name.length < 2) throw new CatalogError('Give the category a name.')
    const db = read()
    if (db.categories.some((c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase())) throw new CatalogError('A category with this name already exists.')
    const existing = db.categories.find((c) => c.id === input.id)
    const category: Category = existing
      ? { ...existing, name, description: input.description.trim(), image: input.image }
      : { id: newId(db.categories, name), name, description: input.description.trim(), image: input.image, order: db.categories.length, active: true }
    write((d) => ({ ...d, categories: existing ? d.categories.map((c) => (c.id === category.id ? category : c)) : [...d.categories, category] }))
    return category
  })
}

export const setCategoryActive = (id: string, active: boolean) => setActive('categories', id, active)
export const moveCategory = (id: string, dir: -1 | 1) => move('categories', id, dir)

/* -------------------------------------------------------------- Services */

export type ServiceInput = Omit<Service, 'id' | 'order' | 'active'> & { id?: string }

export function saveService(input: ServiceInput) {
  return mockRequest(() => {
    const name = input.name.trim()
    if (name.length < 2) throw new CatalogError('Give the service a name.')
    const db = read()
    if (!db.categories.some((c) => c.id === input.categoryId)) throw new CatalogError('Pick a category.')
    if (!Number.isFinite(input.price) || input.price <= 0) throw new CatalogError('Enter a price above ₹0.')
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5) throw new CatalogError('Enter how long it takes, at least 5 minutes.')
    const faqs = input.faqs.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q || f.a)
    if (faqs.some((f) => !f.q || !f.a)) throw new CatalogError('Every FAQ needs both a question and an answer.')
    const existing = db.services.find((s) => s.id === input.id)
    const fields = { ...input, name, description: input.description.trim(), included: clean(input.included), excluded: clean(input.excluded), images: clean(input.images), faqs }
    const order = existing && existing.categoryId === input.categoryId ? existing.order : db.services.filter((s) => s.categoryId === input.categoryId).length
    const service: Service = { ...fields, id: existing?.id ?? newId(db.services, `${input.categoryId}-${name}`), order, active: existing?.active ?? true }
    write((d) => ({ ...d, services: existing ? d.services.map((s) => (s.id === service.id ? service : s)) : [...d.services, service] }))
    if (!existing) audit('catalog', 'Added service', { target: name, new: `₹${service.price / 100}` })
    else if (existing.price !== service.price) audit('catalog', 'Changed service price', { target: name, old: `₹${existing.price / 100}`, new: `₹${service.price / 100}` })
    return service
  })
}

export const setServiceActive = (id: string, active: boolean) => setActive('services', id, active)
export const moveService = (id: string, dir: -1 | 1) => move('services', id, dir)

/* ------------------------------------------------------------- Questions */

export type QuestionInput = Omit<Question, 'id' | 'order'> & { id?: string }

export function saveQuestion(input: QuestionInput) {
  return mockRequest(() => {
    const label = input.label.trim()
    if (label.length < 3) throw new CatalogError('Write the question the customer will see.')
    const options = input.kind === 'options' ? clean(input.options) : []
    if (input.kind === 'options' && options.length < 2) throw new CatalogError('Add at least two options.')
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw new CatalogError('Two options say the same thing.')
    const db = read()
    const existing = db.questions.find((q) => q.id === input.id)
    const question: Question = {
      ...input,
      label,
      options,
      multiple: input.kind === 'options' && input.multiple,
      unit: input.kind === 'number' ? input.unit?.trim() || undefined : undefined,
      help: input.help?.trim() || undefined,
      id: existing?.id ?? `${input.serviceId}-q${Date.now().toString(36)}`,
      order: existing?.order ?? db.questions.filter((q) => q.serviceId === input.serviceId).length,
    }
    write((d) => ({ ...d, questions: existing ? d.questions.map((q) => (q.id === question.id ? question : q)) : [...d.questions, question] }))
    return question
  })
}

export function deleteQuestion(id: string) {
  return mockRequest(() => write((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) })))
}

export const moveQuestion = (id: string, dir: -1 | 1) => move('questions', id, dir)

/* ------------------------------------------------------------- Rate card */

export type RateCardInput = Pick<RateCardItem, 'categoryId' | 'name' | 'price'> & { id?: string }

export function saveRateCardItem(input: RateCardInput) {
  return mockRequest(() => {
    const name = input.name.trim()
    if (name.length < 2) throw new CatalogError('Name the part or charge.')
    if (!Number.isFinite(input.price) || input.price <= 0) throw new CatalogError('Enter a price above ₹0.')
    const db = read()
    if (!db.categories.some((c) => c.id === input.categoryId)) throw new CatalogError('Pick a category.')
    if (db.rateCard.some((r) => r.id !== input.id && r.categoryId === input.categoryId && r.name.toLowerCase() === name.toLowerCase()))
      throw new CatalogError('This category already has an item with this name.')
    const existing = db.rateCard.find((r) => r.id === input.id)
    const order = existing && existing.categoryId === input.categoryId ? existing.order : db.rateCard.filter((r) => r.categoryId === input.categoryId).length
    const item: RateCardItem = {
      id: existing?.id ?? newId(db.rateCard, `rc-${input.categoryId}-${name}`),
      categoryId: input.categoryId,
      name,
      price: Math.round(input.price),
      active: existing?.active ?? true,
      order,
      updatedAt: Date.now(),
    }
    write((d) => ({ ...d, rateCard: existing ? d.rateCard.map((r) => (r.id === item.id ? item : r)) : [...d.rateCard, item] }))
    if (!existing) audit('catalog', 'Added rate card item', { target: name, new: `₹${item.price / 100}` })
    else if (existing.price !== item.price) audit('catalog', 'Changed rate card price', { target: name, old: `₹${existing.price / 100}`, new: `₹${item.price / 100}` })
    return item
  })
}

export const setRateCardItemActive = (id: string, active: boolean) => setActive('rateCard', id, active)
export const moveRateCardItem = (id: string, dir: -1 | 1) => move('rateCard', id, dir)

/* ----------------------------------------------------------------- Areas */

export function addArea(input: Omit<ServiceArea, 'active'>) {
  return mockRequest(() => {
    const pincode = input.pincode.trim()
    if (!/^[1-9][0-9]{5}$/.test(pincode)) throw new CatalogError('Enter a valid 6-digit pincode.')
    if (input.area.trim().length < 2) throw new CatalogError('Name the area.')
    if (input.city.trim().length < 2) throw new CatalogError('Name the city.')
    if (read().areas.some((a) => a.pincode === pincode)) throw new CatalogError('This pincode is already on the list.')
    const area: ServiceArea = { pincode, area: input.area.trim(), city: input.city.trim(), active: true }
    write((d) => ({ ...d, areas: [...d.areas, area] }))
    return area
  })
}

export function setAreaActive(pincode: string, active: boolean) {
  return mockRequest(() => write((d) => ({ ...d, areas: d.areas.map((a) => (a.pincode === pincode ? { ...a, active } : a)) })))
}
