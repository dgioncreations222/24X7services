/** The technician's inbox: job, payment and rating updates. */
import { useSyncExternalStore } from 'react'
import { mockRequest } from '../mock/api'
import { read, subscribe, write } from '../mock/db'
import { useResource, type Query } from './query'
import type { PartnerNotification } from './types'

/** Newest first. */
export function useNotifications(): Query<PartnerNotification[]> {
  return useResource((db) => [...db.notifications].sort((a, b) => b.at - a.at))
}

const unreadOf = () => read().notifications.filter((n) => !n.read).length

/** How many are unread, for a badge — no loading state, it is just a number. */
export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, unreadOf, unreadOf)
}

export function markNotificationRead(id: string) {
  return mockRequest(() =>
    write((db) => ({ ...db, notifications: db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
  )
}

export function markAllNotificationsRead() {
  return mockRequest(() => write((db) => ({ ...db, notifications: db.notifications.map((n) => ({ ...n, read: true })) })))
}
