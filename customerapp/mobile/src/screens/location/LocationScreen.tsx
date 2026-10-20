import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { MapPin } from 'lucide-react-native'
import { pincodeSchema, type ServiceArea } from '@app/shared'

import { Header, Screen } from '@/components/Screen'
import { useLocation } from '@/lib/useLocation'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { fetchServiceAreas } from '@/lib/catalog'
import { callFn, friendlyError } from '@/lib/callables'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/cn'
import { OutcomePanel, type Outcome } from '@/screens/location/OutcomePanel'

/**
 * Where the work will happen, and whether we can do it there.
 *
 * Two ways in, because customers arrive knowing different things. Someone who
 * knows their pincode types it; someone who knows the name of their area picks
 * it off the list of places we actually cover. Both end at the same saved
 * location, and both give an answer before anyone is asked for a phone number.
 *
 * There is no "detect my location" button. Turning a coordinate into a pincode
 * needs a geocoding call, and the only key the app could carry for that is one
 * compiled into the bundle, where it gets lifted and billed to us. DECISION
 * NEEDED: if detection is wanted, it belongs behind a callable that keeps the
 * key server-side, which is an addition to the shared registry rather than a
 * screen-level change.
 */

export function LocationScreen() {
  const { location, setLocation } = useLocation()
  const toast = useToast()

  const [pincode, setPincode] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [checking, setChecking] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const loadAreas = useCallback(() => fetchServiceAreas(), [])
  const areas = useAsync(loadAreas)

  /** Saving is the same step whichever way the pincode was arrived at. */
  const choose = useCallback(
    (chosen: { pincode: string; city: string; area: string }) => {
      setLocation({ ...chosen, serviceable: true, checkedAt: Date.now() })
      router.replace('/home')
    },
    [setLocation]
  )

  async function check(): Promise<void> {
    const parsed = pincodeSchema.safeParse(pincode.trim())
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Enter a valid pincode')
      return
    }

    setFieldError(undefined)
    setOutcome(null)
    setChecking(true)
    try {
      const result = await callFn('checkServiceability', { pincode: parsed.data })
      setOutcome(
        result.serviceable && result.city && result.area
          ? { kind: 'serviceable', pincode: parsed.data, city: result.city, area: result.area }
          : { kind: 'unserviceable', pincode: parsed.data, city: result.city, area: result.area }
      )
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setChecking(false)
    }
  }

  const byCity = useMemo(() => groupByCity(areas.data ?? []), [areas.data])

  return (
    <Screen
      // Back only when there is somewhere to go back to. Arriving from the
      // splash means the app replaced its own entry in the history.
      header={<Header title="Your location" showBack={location !== null} />}
      contentClassName="px-4 pb-16"
    >
      <Text className="mt-4 text-sm text-muted">
        We service parts of Hyderabad. Enter a pincode to check yours, or pick an area from the list.
      </Text>

      <View className="mt-5 flex-row items-end gap-2">
        <View className="flex-1">
          <Input
            label="Pincode"
            value={pincode}
            onChangeText={(value) => {
              // Digits only, and never more than a pincode has.
              setPincode(value.replace(/\D/g, '').slice(0, 6))
              setFieldError(undefined)
              setOutcome(null)
            }}
            error={fieldError}
            keyboardType="number-pad"
            autoComplete="postal-code"
            returnKeyType="search"
            onSubmitEditing={() => void check()}
            placeholder="500084"
          />
        </View>
        <Button
          onPress={() => void check()}
          loading={checking}
          // Stays level with the input rather than with the label above it,
          // and rises with it when an error line appears under the field.
          className={cn('shrink-0', fieldError && 'mb-7')}
        >
          Check
        </Button>
      </View>

      {outcome ? <OutcomePanel outcome={outcome} onContinue={choose} /> : null}

      <View className="mt-8">
        <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-ink">
          Areas we service
        </Text>

        {areas.status === 'loading' ? (
          <SkeletonGroup label="Loading areas" className="gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </SkeletonGroup>
        ) : areas.status === 'error' ? (
          <ErrorState
            onRetry={areas.reload}
            retrying={areas.refreshing}
            description="We could not load the list of areas. You can still check a pincode above."
          />
        ) : byCity.length === 0 ? (
          <Card className="p-4">
            <Text className="text-sm text-muted">No areas are switched on right now. Please check back soon.</Text>
          </Card>
        ) : (
          byCity.map(([city, cityAreas], cityIndex) => (
            <View key={city} className={cityIndex === byCity.length - 1 ? '' : 'mb-6'}>
              <Text accessibilityRole="header" className="mb-2 text-sm font-semibold text-muted">
                {city}
              </Text>
              <Card className="overflow-hidden">
                {cityAreas.map((area, index) => (
                  <Tappable
                    key={area.pincode}
                    onPress={() => choose({ pincode: area.pincode, city: area.city, area: area.area })}
                    className={cn(
                      'w-full flex-row items-center gap-3 px-4 py-3 active:bg-surface active:opacity-100',
                      index < cityAreas.length - 1 && 'border-b border-border'
                    )}
                  >
                    <Icon as={MapPin} className="size-4 text-muted" />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-base font-medium text-ink">
                        {area.area}
                      </Text>
                      <Text className="text-xs text-muted">{area.pincode}</Text>
                    </View>
                  </Tappable>
                ))}
              </Card>
            </View>
          ))
        )}
      </View>
    </Screen>
  )
}

/** Cities in the order they first appear; the areas inside are already sorted. */
function groupByCity(areas: readonly ServiceArea[]): [string, ServiceArea[]][] {
  const groups = new Map<string, ServiceArea[]>()
  for (const area of areas) {
    const existing = groups.get(area.city)
    if (existing) existing.push(area)
    else groups.set(area.city, [area])
  }
  return Array.from(groups.entries())
}
