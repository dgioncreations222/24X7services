import { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { useLocalSearchParams, type Href } from 'expo-router'
import {
  applianceIdSchema,
  serviceKeySchema,
  type CatalogAppliance,
  type CatalogIssue,
  type CatalogService,
} from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { ServiceDetails } from '@/components/ServiceSheet'
import { fetchAppliance, fetchIssuesFor, fetchServicesFor } from '@/lib/catalog'
import { useAsync } from '@/lib/useAsync'

/**
 * One service, in full, on a page of its own — where a shared link lands,
 * and where "Rate card" leads.
 *
 * It is the same thing the sheet shows when a service is tapped on Home or on
 * an appliance page, laid out full width: photographs across the top, the
 * name and what it starts at, the choices it needs, then how it goes, who
 * comes, the brands, the promise, what is not included, the questions and the
 * reviews, with Add pinned at the foot. One design wherever a service is
 * opened; a page that said one thing and a sheet another would leave a
 * customer wondering which was current.
 *
 * Everything on it is read from the catalog, the business config, the brands
 * list and the reviews — see `ServiceDetails`.
 *
 * `ServiceDetails` scrolls itself and pins its own add bar, so the screen
 * does not scroll; the error and loading states get a scroll view of their own.
 */

interface DetailData {
  appliance: CatalogAppliance | null
  service: CatalogService | null
  issues: CatalogIssue[]
}

export function ServiceDetailScreen() {
  const params = useLocalSearchParams<{ a?: string; s?: string }>()
  const appliance = applianceIdSchema.safeParse(params.a)
  const key = serviceKeySchema.safeParse(params.s)

  const applianceId = appliance.success ? appliance.data : null
  const serviceKey = key.success ? key.data : null

  const load = useCallback(async (): Promise<DetailData> => {
    if (!applianceId || !serviceKey) {
      return { appliance: null, service: null, issues: [] }
    }
    const [found, services, issues] = await Promise.all([
      fetchAppliance(applianceId),
      fetchServicesFor(applianceId),
      fetchIssuesFor(applianceId),
    ])
    return {
      appliance: found,
      service: services.find((each) => each.serviceKey === serviceKey) ?? null,
      issues,
    }
  }, [applianceId, serviceKey])

  const data = useAsync(load)
  const service = data.data?.service ?? null

  const missing = !applianceId || !serviceKey || (data.status === 'ready' && !service)

  return (
    <Screen
      scroll={false}
      // ServiceDetails pads its own add bar by the bottom inset; without this
      // the screen would add the inset a second time under it.
      tab={Boolean(service) && !missing && data.status === 'ready'}
      header={
        <Header
          title={service?.name ?? 'Service'}
          showBack
          backFallback={(applianceId ? `/services/appliance?a=${applianceId}` : '/services') as Href}
        />
      }
    >
      {missing ? (
        <ScrollView contentContainerClassName="px-4">
          <ErrorState
            className="py-20"
            kind="notFound"
            title="We could not find that service"
            description="It may have been renamed or withdrawn. Everything we service is one tap away."
          />
        </ScrollView>
      ) : data.status === 'error' ? (
        <ScrollView contentContainerClassName="px-4">
          <ErrorState className="py-20" onRetry={data.reload} retrying={data.refreshing} />
        </ScrollView>
      ) : data.status === 'loading' || !service ? (
        <SkeletonGroup label="Loading" className="mt-5 gap-4 px-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      ) : (
        <ServiceDetails
          variant="page"
          service={service}
          appliance={data.data?.appliance ?? undefined}
          issues={data.data?.issues ?? []}
        />
      )}
    </Screen>
  )
}
