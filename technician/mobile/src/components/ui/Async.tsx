import type { Query } from '@/lib/data'
import { ErrorState } from './ErrorState'
import { SkeletonList } from './Skeleton'

/**
 * Renders a lib/data query in its three states so no screen forgets one:
 * a skeleton while loading, ErrorState (with Try again) when it failed, the
 * `empty` view when there is nothing, and `children(data)` otherwise.
 *
 *   <Async query={useJobs('ongoing')} empty={<EmptyState … />}>
 *     {(jobs) => jobs.map(…)}
 *   </Async>
 */
export function Async<T>({
  query,
  children,
  loading = <SkeletonList />,
  empty = null,
  isEmpty = (d) => Array.isArray(d) && d.length === 0,
  errorTitle,
}: {
  query: Query<T>
  children: (data: T) => React.ReactNode
  loading?: React.ReactNode
  empty?: React.ReactNode
  isEmpty?: (data: T) => boolean
  errorTitle?: string
}) {
  if (query.error) return <ErrorState title={errorTitle} onRetry={query.refetch} />
  if (query.loading || query.data === undefined) return <>{loading}</>
  if (isEmpty(query.data)) return <>{empty}</>
  return <>{children(query.data)}</>
}
