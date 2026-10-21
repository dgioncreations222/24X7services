'use client'

import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

/**
 * Search, one filter, sort and pagination for a catalog table, so every
 * table does them the same way. `search` lists the text a row is found by;
 * `sorts` maps a column to the value it sorts on.
 */
export function useTable<T, F extends string, S extends string>({
  rows,
  search,
  filters,
  sorts,
  initialSort,
  pageSize = 10,
}: {
  rows: T[]
  search: (row: T) => (string | number | undefined)[]
  filters: Record<F, (row: T) => boolean>
  sorts: Record<S, (row: T) => string | number>
  initialSort: NoInfer<S>
  pageSize?: number
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<F>(Object.keys(filters)[0] as F)
  const [sort, setSort] = useState<{ by: S; dir: SortDir }>({ by: initialSort, dir: 'asc' })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const key = sorts[sort.by]
    return rows
      .filter(filters[filter])
      .filter((r) => {
        const hay = search(r).join(' ').toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) => {
        const x = key(a)
        const y = key(b)
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
        return sort.dir === 'asc' ? c : -c
      })
  }, [rows, q, filter, sort, filters, sorts, search])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages - 1)

  return {
    q,
    setQ: (v: string) => {
      setQ(v)
      setPage(0)
    },
    filter,
    setFilter: (f: F) => {
      setFilter(f)
      setPage(0)
    },
    sort,
    /** Click a column: sort by it, or flip the direction if it already is. */
    sortBy: (by: S) => setSort((s) => ({ by, dir: s.by === by && s.dir === 'asc' ? 'desc' : 'asc' })),
    page: current,
    pages,
    setPage,
    total: filtered.length,
    visible: filtered.slice(current * pageSize, current * pageSize + pageSize),
    /** Reordering only makes sense when the table shows the saved order. */
    inSavedOrder: (orderKey: S) => sort.by === orderKey && sort.dir === 'asc' && !q.trim(),
  }
}
