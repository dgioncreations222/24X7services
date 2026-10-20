import { useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { router, type Href } from 'expo-router'
import { ArrowRight, ChevronRight } from 'lucide-react-native'
import { formatPaise, type ApplianceId, type CatalogAppliance, type CatalogService } from '@app/shared'

import { BottomSheet } from '@/components/ui/Overlay'
import { durationNote } from '@/components/ServiceRail'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/cn'

/**
 * The grid of everything we service, as the first thing under the banners.
 *
 * Small tiles — a centred photograph on a plain fill, the label outside the
 * tile where it can run to two lines without being cropped — because this is
 * the one screen whose job is to show the whole range at a glance.
 *
 * Tapping one opens a sheet rather than leaving the screen. The question a tap
 * on "Washing machine" is asking is "what do you do for it", and that has a
 * three-line answer — a whole page navigation to deliver three lines costs the
 * customer their place on Home and makes going back the price of looking.
 *
 * Tapping a service in that sheet does leave, for the appliance page, opened
 * at that service: the sheet answers "what do you do for it"; the page
 * answers "what does this one involve", and that question has to be
 * answerable before a draft exists.
 *
 * No prices on the tiles. The grid is an index: it says what we touch, and the
 * sheet says what each thing costs.
 *
 * The last cell is the way out to the full list. At three columns it also
 * completes the row: five appliances and one door out is two clean rows.
 */

export interface CategoryGridProps {
  appliances: readonly CatalogAppliance[]
  /** Every active service, of every appliance. The sheet filters its own. */
  services: readonly CatalogService[]
  className?: string
}

/**
 * A light colour per appliance for its tile, so the grid reads in colour
 * rather than as five grey machines on five grey squares. Fixed light values
 * in both themes (the tint-* tokens), like `plate`, because the photographs
 * are shot on white.
 */
const TILE_TINTS: Partial<Record<ApplianceId, string>> = {
  'washing-machine': 'bg-tint-blue',
  'air-conditioner': 'bg-tint-sky',
  refrigerator: 'bg-tint-mint',
  geyser: 'bg-tint-peach',
  microwave: 'bg-tint-lilac',
}

/** Three columns with a 12px gutter, sized off the grid's own width. */
const COLUMNS = 3
const GUTTER = 12

function useColumnWidth(): [number | undefined, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState<number>()
  return [
    width === undefined ? undefined : Math.floor((width - GUTTER * (COLUMNS - 1)) / COLUMNS),
    (event) => setWidth(event.nativeEvent.layout.width),
  ]
}

export function CategoryGrid({ appliances, services, className }: CategoryGridProps) {
  const [openId, setOpenId] = useState<ApplianceId | null>(null)
  const [cell, onLayout] = useColumnWidth()
  const [sheetCell, onSheetLayout] = useColumnWidth()

  const open = appliances.find((appliance) => appliance.id === openId)
  const openServices = services
    .filter((service) => service.applianceId === openId)
    .sort((a, b) => a.order - b.order)

  const cellStyle = cell === undefined ? { width: '31%' as const } : { width: cell }

  return (
    <>
      <View
        onLayout={onLayout}
        className={cn('flex-row flex-wrap', className)}
        style={{ columnGap: GUTTER, rowGap: 20 }}
      >
        {appliances.map((appliance, index) => {
          const has = services.some((service) => service.applianceId === appliance.id)
          const tint = TILE_TINTS[appliance.id]
          return (
            <View key={appliance.id} style={cellStyle}>
              {/* An appliance whose services are all inactive has nothing to
                  put in a sheet, so it goes to its page rather than opening
                  an empty one. */}
              <Tappable
                {...(has
                  ? { onPress: () => setOpenId(appliance.id) }
                  : { href: `/services/appliance?a=${appliance.id}` as Href })}
                accessibilityLabel={appliance.name}
                className="w-full min-w-0 items-center gap-2 active:opacity-80"
              >
                <View className={cn('aspect-square w-full overflow-hidden rounded-card', tint ?? 'bg-plate')}>
                  {/* Multiplied, so the photograph's white ground takes the
                      tile's colour instead of sitting on it as a white box. */}
                  <View className="absolute inset-0 p-4" style={{ mixBlendMode: 'multiply' }}>
                    <Img
                      src={appliance.image}
                      alt=""
                      contentFit="contain"
                      priority={index < 3 ? 'high' : 'normal'}
                      className="size-full"
                    />
                  </View>
                </View>
                <Text className="text-center text-xs font-semibold leading-[15px] text-ink">{appliance.name}</Text>
              </Tappable>
            </View>
          )
        })}

        <View style={cellStyle}>
          <Tappable
            href="/services"
            accessibilityLabel="See everything we service"
            className="w-full min-w-0 items-center gap-2 active:opacity-100"
          >
            <View className="aspect-square w-full items-center justify-center rounded-card border border-dashed border-border">
              <Icon as={ArrowRight} className="size-5 text-muted" />
            </View>
            <Text className="text-center text-xs font-semibold leading-[15px] text-ink">All services</Text>
          </Tappable>
        </View>
      </View>

      <BottomSheet
        open={open !== undefined}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ''}
        description="What we do for it, and what the visit costs."
        footer={
          open ? (
            <Tappable
              onPress={() => {
                setOpenId(null)
                router.push(`/services/appliance?a=${open.id}` as Href)
              }}
              accessibilityRole="link"
              className="min-h-11 flex-row items-center justify-center gap-1"
            >
              <Text className="text-sm font-semibold text-brand">See everything for {open.name.toLowerCase()}</Text>
              <Icon as={ChevronRight} className="size-4 text-brand" />
            </Tappable>
          ) : null
        }
      >
        {/* A grid of tiles. A service shows its own photograph, then a frame
            of its own clip, and falls back to the appliance's picture where it
            has neither. The label is stripped to the part that differs: the
            sheet's own title already says which appliance this is. */}
        <View onLayout={onSheetLayout} className="flex-row flex-wrap" style={{ columnGap: GUTTER, rowGap: 16 }}>
          {openServices.map((service) => {
            const duration = durationNote(service.durationMinutes)
            const picture = service.photo ?? service.poster
            return (
              <View key={service.id} style={sheetCell === undefined ? { width: '31%' } : { width: sheetCell }}>
                <Tappable
                  onPress={() => {
                    setOpenId(null)
                    router.push(`/services/appliance?a=${service.applianceId}&s=${service.serviceKey}` as Href)
                  }}
                  accessibilityRole="link"
                  className="w-full min-w-0 items-center gap-2 active:opacity-80"
                >
                  <View className="aspect-square w-full overflow-hidden rounded-card bg-plate">
                    {open ? (
                      picture ? (
                        <Img src={picture} alt="" className="absolute inset-0" />
                      ) : (
                        <View className="absolute inset-0 p-3">
                          <Img src={open.image} alt="" contentFit="contain" className="size-full" />
                        </View>
                      )
                    ) : null}

                    {/* How long it takes, on the picture rather than under it.
                        Below the label it would push every tile in the row
                        down by a line, including the ones with no duration
                        seeded. */}
                    {duration ? (
                      <View className="absolute inset-x-1 bottom-1 rounded-sm bg-bg/95 px-1 py-0.5">
                        <Text numberOfLines={1} className="text-center text-[10px] font-semibold leading-[14px] text-success">
                          {duration.replace('About ', '')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="min-w-0 items-center">
                    <Text className="text-center text-xs font-semibold leading-[15px] text-ink">
                      {shortServiceName(service.name, open?.name)}
                    </Text>
                    <Text className="mt-0.5 text-center text-[11px] leading-[14px] text-muted">
                      {formatPaise(service.visitFee)}
                    </Text>
                  </View>
                </Tappable>
              </View>
            )
          })}
        </View>
      </BottomSheet>
    </>
  )
}

/**
 * "Washing Machine Repair", inside a sheet already titled "Washing Machine",
 * is the word Repair wearing a hat.
 *
 * The catalog names a service in full because it is read on its own
 * elsewhere — a rail card, a booking, an invoice. Here the appliance is the
 * heading two lines above, so the prefix is dropped. A name that does not
 * start with the appliance is left exactly as seeded.
 */
function shortServiceName(name: string, appliance: string | undefined): string {
  if (!appliance) return name
  const prefix = `${appliance.toLowerCase()} `
  if (!name.toLowerCase().startsWith(prefix)) return name

  const rest = name.slice(appliance.length).trim()
  if (rest.length === 0) return name
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}
