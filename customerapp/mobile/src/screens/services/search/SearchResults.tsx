import { Fragment } from 'react'
import { View } from 'react-native'
import type { CatalogAppliance, CatalogIssue, CatalogService, SearchHit } from '@app/shared'

import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { serviceOptions } from '@/components/ServiceSheet'
import { cn } from '@/lib/cn'
import { Band, Heading, HitRows } from '@/screens/services/search/SearchParts'
import { ServiceRow } from '@/screens/services/search/ServiceRow'

/**
 * What a search found, in the order a customer reads it: the appliances it
 * touches as a row of tiles, then the services themselves as rows they can
 * compare, then any problem that matched in their own words.
 *
 * The tiles are every appliance the hits belong to, not only the appliance
 * hits. "AC service" matches no appliance by name, but it is plainly about
 * the air conditioner, and a tile for it is the quickest way to everything
 * else we do for one.
 */
export function Results({
  hits,
  applianceFor,
  serviceFor,
  issues,
  onOpen,
  onOptions,
}: {
  hits: readonly SearchHit[]
  applianceFor: ReadonlyMap<string, CatalogAppliance>
  serviceFor: ReadonlyMap<string, CatalogService>
  issues: readonly CatalogIssue[]
  onOpen: (href: string) => void
  onOptions: (serviceId: string) => void
}) {
  const appliances = [...new Set(hits.map((hit) => hit.applianceId))]
    .map((id) => applianceFor.get(id))
    .filter((appliance) => appliance !== undefined)

  const serviceHits = hits.filter((hit) => hit.kind === 'service')
  const services = serviceHits
    .map((hit) => (hit.serviceKey === undefined ? undefined : serviceFor.get(`${hit.applianceId}/${hit.serviceKey}`)))
    .filter((service) => service !== undefined)

  // A withdrawn service still in the index joins to nothing, and a problem
  // has no picture or price: both stay plain rows.
  const rows = [
    ...serviceHits.filter(
      (hit) => hit.serviceKey === undefined || !serviceFor.has(`${hit.applianceId}/${hit.serviceKey}`)
    ),
    ...hits.filter((hit) => hit.kind === 'issue'),
  ]

  const blocks = [
    appliances.length > 0 ? (
      <View key="categories">
        <Heading className="mb-4">Categories</Heading>
        <View className="-mx-1.5 flex-row flex-wrap gap-y-5">
          {appliances.map((appliance) => (
            <View key={appliance.id} className="w-1/4 px-1.5">
              <Tappable
                onPress={() => onOpen(`/services/appliance?a=${appliance.id}`)}
                accessibilityLabel={appliance.name}
                className="w-full min-w-0 items-center gap-2 active:opacity-100"
              >
                {({ pressed }) => (
                  <>
                    <View className={cn('aspect-square w-full overflow-hidden rounded-card p-3', pressed ? 'bg-plate-deep' : 'bg-plate')}>
                      <Img src={appliance.image} alt="" contentFit="contain" className="size-full" />
                    </View>
                    <Text className="text-center text-sm leading-tight text-ink">{appliance.name}</Text>
                  </>
                )}
              </Tappable>
            </View>
          ))}
        </View>
      </View>
    ) : null,
    services.length > 0 ? (
      <View key="services">
        <Heading className="mb-2">Services</Heading>
        <View>
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              image={applianceFor.get(service.applianceId)?.image}
              options={serviceOptions(service, issues).length}
              onOpen={onOpen}
              onOptions={() => onOptions(service.id)}
            />
          ))}
        </View>
      </View>
    ) : null,
    rows.length > 0 ? (
      <View key="problems">
        <Heading className="mb-3">{rows.some((hit) => hit.kind === 'issue') ? 'Problems' : 'More'}</Heading>
        <HitRows hits={rows} onOpen={onOpen} />
      </View>
    ) : null,
  ].filter((block) => block !== null)

  return (
    <View className="mt-6">
      {blocks.map((block, index) => (
        <Fragment key={block.key}>
          {index > 0 ? <Band /> : null}
          {block}
        </Fragment>
      ))}
    </View>
  )
}
