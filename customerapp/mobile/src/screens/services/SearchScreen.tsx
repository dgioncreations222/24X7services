import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { ArrowLeft, SearchX } from 'lucide-react-native'
import type { CatalogAppliance, CatalogIssue, CatalogService, SearchHit } from '@app/shared'

import { AppShell } from '@/components/AppShell'
import { SearchBar } from '@/components/SearchBar'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { EmptyState , ErrorState } from '@/components/ui/States'

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchAllIssues, fetchAllServices, fetchAppliances } from '@/lib/catalog'
import { ServiceSheet } from '@/components/ServiceSheet'
import { callFn, friendlyError } from '@/lib/callables'
import { forgetSearches, rememberSearch, useRecentSearches } from '@/lib/recentSearches'
import { CartBar } from '@/components/CartBar'
import { useAsync } from '@/lib/useAsync'
import { Results } from '@/screens/services/search/SearchResults'
import { Suggestions } from '@/screens/services/search/Suggestions'

/**
 * Search across appliances, services and the problems people describe.
 *
 * The query goes to `searchCatalog` rather than being matched here, so the app
 * never holds a copy of the catalog to search against and a reseed changes the
 * results without a release. Every keystroke does not go to the server: typing
 * settles for a moment first, and a reply that arrives after a newer one is
 * dropped rather than allowed to overwrite it.
 *
 * Both the results and the failure are stamped with the query they belong to.
 * That is what lets the screen work out what it is doing — a result for an
 * older query means this one is still in flight — without a status flag that
 * has to be set from inside an effect and kept in step by hand.
 *
 * A hit is a label and a route; the picture, the score and the price are not
 * in the index and are not going into it — an index that carried them would
 * be a second copy of the catalog going stale on its own schedule. They are
 * joined here instead, against the catalog this screen already loads for its
 * suggestions. A hit whose service has since been withdrawn simply joins to
 * nothing and stays the row it always was.
 *
 * A service hit gets the whole row, picture, score and Add: a customer who
 * searched "drum not spinning" has already described the job, so the answer
 * should be the thing itself rather than a line of text about it. Appliances
 * are tiles; a problem has no picture and no price, and gets neither.
 */

/** Long enough for a prefix to mean something, short enough to feel instant. */
const MIN_QUERY = 2
const DEBOUNCE_MS = 250

export function SearchScreen() {
  const insets = useSafeAreaInsets()

  // `?q=` arrives from a suggestion tapped elsewhere (the chips on Services),
  // and starts the search as if it had been typed.
  const { q } = useLocalSearchParams<{ q?: string }>()
  const [term, setTerm] = useState(() => (typeof q === 'string' ? q : ''))
  const [result, setResult] = useState<{ query: string; hits: SearchHit[] } | null>(null)
  const [failure, setFailure] = useState<{ query: string; message: string } | null>(null)
  // Bumped by "Try again", which has to re-run a search for a term that has not
  // changed — without it the effect below would have nothing to react to.
  const [retry, setRetry] = useState(0)

  const recent = useRecentSearches()

  const loadCatalog = useCallback(async (): Promise<{
    appliances: CatalogAppliance[]
    services: CatalogService[]
    issues: CatalogIssue[]
  }> => {
    const [appliances, services, issues] = await Promise.all([fetchAppliances(), fetchAllServices(), fetchAllIssues()])
    return { appliances, services, issues }
  }, [])
  const catalog = useAsync(loadCatalog)

  // The repair whose options sheet is open.
  const [sheetId, setSheetId] = useState<string | null>(null)

  // Every request gets a number, and only the newest one is allowed to write.
  const requestId = useRef(0)

  const query = term.trim()
  const searching = query.length >= MIN_QUERY

  useEffect(() => {
    if (!searching) return

    const id = (requestId.current += 1)
    const timer = setTimeout(() => {
      callFn('searchCatalog', { q: query })
        .then((response) => {
          if (id !== requestId.current) return
          setResult({ query, hits: response.hits })
          setFailure(null)
        })
        .catch((caught: unknown) => {
          if (id !== requestId.current) return
          setFailure({ query, message: friendlyError(caught) })
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, searching, retry])

  const hits = result?.query === query ? result.hits : null
  const error = failure?.query === query ? failure.message : null

  // What a hit joins to. Keyed the way a hit names itself, so the lookup is
  // the hit's own fields rather than a string the two sides have to agree on.
  const services = catalog.data?.services ?? []
  const issues = catalog.data?.issues ?? []
  const sheetService = services.find((service) => service.id === sheetId) ?? null
  const serviceFor = new Map(services.map((service) => [`${service.applianceId}/${service.serviceKey}`, service]))
  const applianceFor = new Map(catalog.data?.appliances.map((appliance) => [appliance.id, appliance]) ?? [])

  /** A result the customer actually opened is worth remembering. */
  function open(href: string): void {
    rememberSearch(query)
    // The index carries the web's routes, trailing slash included
    // (`/services/appliance/?a=ac`); the app's routes have none.
    router.push(href.replace(/(.)\/(?=\?|$)/, '$1') as Href)
  }

  function goBack(): void {
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  return (
    <AppShell
      mobileHeader={
        <View className="flex-row items-center gap-1 border-b border-border bg-bg px-2 pb-3" style={{ paddingTop: insets.top + 8 }}>
          <Tappable
            onPress={goBack}
            accessibilityLabel="Go back"
            className="size-11 shrink-0 items-center justify-center rounded-full active:bg-surface active:opacity-100"
          >
            <Icon as={ArrowLeft} className="size-5 text-ink" />
          </Tappable>
          <SearchBar className="w-auto min-w-0 flex-1" value={term} onChange={setTerm} autoFocus />
        </View>
      }
      footer={<CartBar services={services} />}
    >
      {!searching ? (
        <Suggestions recent={recent} onPick={setTerm} onClearRecent={forgetSearches} />
      ) : error !== null ? (
        <ErrorState className="py-16" description={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : hits === null ? (
        <SkeletonGroup label="Searching" className="mt-4 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </SkeletonGroup>
      ) : hits.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={SearchX}
          title={`Nothing matched “${query}”`}
          description="Try the appliance name, or say what is wrong — “fridge not cooling” finds the same thing."
          action={{ label: 'See all services', href: '/services' }}
        />
      ) : (
        <Results
          hits={hits}
          applianceFor={applianceFor}
          serviceFor={serviceFor}
          issues={issues}
          onOpen={open}
          onOptions={setSheetId}
        />
      )}

      <ServiceSheet
        service={sheetService}
        appliance={sheetService ? applianceFor.get(sheetService.applianceId) : undefined}
        services={services}
        issues={issues}
        onClose={() => setSheetId(null)}
      />
    </AppShell>
  )
}
