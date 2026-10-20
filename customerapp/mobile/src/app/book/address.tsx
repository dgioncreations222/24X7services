import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import {
  addressInputSchema,
  type Address,
  type AddressInput,
  type AddressLabel,
} from '@app/shared'

import { BookingStep } from '@/components/BookingStep'
import { AddressCard } from '@/components/AddressCard'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { fetchServiceAreas } from '@/lib/catalog'
import { fetchAddresses } from '@/lib/api/addresses'
import { addAddress } from '@/lib/api/bookingAddresses'
import { useAuth } from '@/lib/auth'
import { patchDraft, useBookingDraft } from '@/lib/bookingDraft'
import { useAsync } from '@/lib/useAsync'

/**
 * Where the expert is going.
 *
 * Saved addresses in areas we do not cover are shown and cannot be picked,
 * with the reason on the card. Hiding them would leave a customer wondering
 * where their office address went.
 *
 * A new address is written to the address book rather than carried loose in the
 * draft. The rules allow a customer to write their own addresses, so this is a
 * plain client write, and the next booking has one fewer form to fill in.
 * `createBooking` copies whichever address is chosen onto the booking, so
 * editing it later cannot rewrite where a past job happened.
 */

const LABELS: readonly { value: AddressLabel; text: string }[] = [
  { value: 'home', text: 'Home' },
  { value: 'office', text: 'Office' },
  { value: 'other', text: 'Other' },
]

export default function AddressScreen() {
  const { draft } = useBookingDraft()
  const { user } = useAuth()
  const uid = user?.uid
  const toast = useToast()

  const [adding, setAdding] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async (): Promise<{
    addresses: Address[]
    servicedPincodes: Set<string>
  }> => {
    const areas = await fetchServiceAreas()
    const servicedPincodes = new Set(areas.map((area) => area.pincode))
    if (!uid) return { addresses: [], servicedPincodes }

    const addresses = await fetchAddresses(uid)
    return { addresses, servicedPincodes }
    // reloadKey re-runs this after a new address is saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, reloadKey])

  const data = useAsync(load)

  function choose(address: Address): void {
    patchDraft({
      addressId: address.id,
      // Only one of the two ever travels on the draft.
      address: undefined,
    })
    router.push('/book/slot')
  }

  async function save(input: AddressInput): Promise<void> {
    if (!uid) return
    const addressId = await addAddress(uid, input)
    setAdding(false)
    setReloadKey((key) => key + 1)
    toast.show('Address saved.', { tone: 'success' })
    patchDraft({ addressId, address: undefined })
    router.push('/book/slot')
  }

  const serviced = data.data?.servicedPincodes ?? new Set<string>()

  return (
    <BookingStep stepKey="address" title="Where is the appliance?">
      {data.status === 'loading' ? (
        <SkeletonGroup label="Loading addresses" className="mt-6 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </SkeletonGroup>
      ) : data.status === 'error' ? (
        <ErrorState className="py-16" onRetry={data.reload} retrying={data.refreshing} />
      ) : adding || (data.data?.addresses.length ?? 0) === 0 ? (
        <AddressForm
          servicedPincodes={serviced}
          onCancel={(data.data?.addresses.length ?? 0) > 0 ? () => setAdding(false) : undefined}
          onSave={save}
        />
      ) : (
        <>
          <Text className="mt-5 text-sm text-muted">Pick the address the expert should come to.</Text>

          <View className="mt-4 gap-3">
            {data.data?.addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onSelect={choose}
                selected={draft.addressId === address.id}
                serviceable={serviced.has(address.pincode)}
              />
            ))}
          </View>

          <Button
            className="mt-4"
            variant="secondary"
            fullWidth
            onPress={() => setAdding(true)}
            iconLeft={<Icon as={Plus} className="size-4 text-brand" />}
          >
            Add a new address
          </Button>
        </>
      )}
    </BookingStep>
  )
}

// ---------------------------------------------------------------------------

function AddressForm({
  servicedPincodes,
  onSave,
  onCancel,
}: {
  servicedPincodes: ReadonlySet<string>
  onSave: (input: AddressInput) => Promise<void>
  onCancel?: (() => void) | undefined
}) {
  const [label, setLabel] = useState<AddressLabel>('home')
  const [customLabel, setCustomLabel] = useState('')
  const [flat, setFlat] = useState('')
  const [area, setArea] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('Hyderabad')
  const [pincode, setPincode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function submit(): Promise<void> {
    const parsed = addressInputSchema.safeParse({
      label,
      customLabel: customLabel.trim() || undefined,
      flat,
      area,
      landmark: landmark.trim() || undefined,
      city,
      pincode,
    })

    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }

    // Checked here rather than at the end of the flow, because "we do not come
    // to your area" is not something to find out on a payment screen.
    if (!servicedPincodes.has(parsed.data.pincode)) {
      setErrors({ pincode: 'We do not service this pincode yet.' })
      return
    }

    setErrors({})
    setSaving(true)
    try {
      await onSave(parsed.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="mt-5 gap-5">
      <View accessibilityRole="radiogroup" accessibilityLabel="Save as">
        <Text className="text-sm font-medium text-ink">Save as</Text>
        <View className="mt-2 flex-row gap-2">
          {LABELS.map((option) => (
            <Chip key={option.value} selected={label === option.value} onPress={() => setLabel(option.value)}>
              {option.text}
            </Chip>
          ))}
        </View>
      </View>

      {label === 'other' ? (
        <Input
          label="Name this address"
          value={customLabel}
          onChangeText={(value) => setCustomLabel(value.slice(0, 30))}
          placeholder="Mum's place"
        />
      ) : null}

      <Input
        label="Flat / house number and building"
        required
        value={flat}
        onChangeText={setFlat}
        error={errors.flat}
        autoComplete="address-line1"
        placeholder="Flat 402, Lake View Apartments"
      />

      <Input
        label="Area / locality"
        required
        value={area}
        onChangeText={setArea}
        error={errors.area}
        autoComplete="address-line2"
        placeholder="Kondapur"
      />

      <Input
        label="Landmark (optional)"
        value={landmark}
        onChangeText={setLandmark}
        hint="What to look for from the road."
        placeholder="Opposite the Botanical Garden"
      />

      <Input label="City" required value={city} onChangeText={setCity} error={errors.city} />

      <Input
        label="Pincode"
        required
        value={pincode}
        onChangeText={(value) => {
          setPincode(value.replace(/\D/g, '').slice(0, 6))
          setErrors((current) => ({ ...current, pincode: '' }))
        }}
        error={errors.pincode || undefined}
        keyboardType="number-pad"
        autoComplete="postal-code"
        placeholder="500084"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <View className="flex-row gap-3">
        {onCancel ? (
          <Button variant="secondary" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button className="flex-1" loading={saving} onPress={() => void submit()}>
          Save and continue
        </Button>
      </View>
    </View>
  )
}
