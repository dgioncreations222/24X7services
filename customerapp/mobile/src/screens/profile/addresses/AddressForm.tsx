import { useState } from 'react'
import { View } from 'react-native'
import { addressInputSchema, type Address, type AddressInput, type AddressLabel } from '@app/shared'

import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Text } from '@/components/ui/Text'

const LABELS: readonly { value: AddressLabel; text: string }[] = [
  { value: 'home', text: 'Home' },
  { value: 'office', text: 'Office' },
  { value: 'other', text: 'Other' },
]

export function AddressForm({
  initial,
  servicedPincodes,
  saving,
  onSave,
}: {
  initial?: Address
  servicedPincodes: ReadonlySet<string>
  saving: boolean
  onSave: (input: AddressInput) => void
}) {
  const [label, setLabel] = useState<AddressLabel>(initial?.label ?? 'home')
  const [customLabel, setCustomLabel] = useState(initial?.customLabel ?? '')
  const [flat, setFlat] = useState(initial?.flat ?? '')
  const [area, setArea] = useState(initial?.area ?? '')
  const [landmark, setLandmark] = useState(initial?.landmark ?? '')
  const [city, setCity] = useState(initial?.city ?? 'Hyderabad')
  const [pincode, setPincode] = useState(initial?.pincode ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(): void {
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

    setErrors({})
    onSave(parsed.data)
  }

  const notServiced = pincode.length === 6 && !servicedPincodes.has(pincode)

  return (
    <View className="gap-5 pb-2">
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
          onChangeText={(text) => setCustomLabel(text.slice(0, 30))}
          placeholder="Mum's place"
        />
      ) : null}

      <Input
        label="Flat / house number and building"
        required
        value={flat}
        onChangeText={setFlat}
        {...(errors.flat ? { error: errors.flat } : {})}
        autoComplete="address-line1"
      />
      <Input
        label="Area / locality"
        required
        value={area}
        onChangeText={setArea}
        {...(errors.area ? { error: errors.area } : {})}
        autoComplete="address-line2"
      />
      <Input label="Landmark (optional)" value={landmark} onChangeText={setLandmark} />
      <Input
        label="City"
        required
        value={city}
        onChangeText={setCity}
        {...(errors.city ? { error: errors.city } : {})}
      />
      <Input
        label="Pincode"
        required
        value={pincode}
        onChangeText={(text) => setPincode(text.replace(/\D/g, '').slice(0, 6))}
        {...(errors.pincode ? { error: errors.pincode } : {})}
        keyboardType="number-pad"
        autoComplete="postal-code"
        // Saved anyway, and flagged. Someone keeping a second home here should
        // not be stopped from writing it down.
        {...(notServiced ? { hint: 'We do not service this pincode yet — you can still save it.' } : {})}
      />

      <Button fullWidth loading={saving} onPress={submit}>
        Save address
      </Button>
    </View>
  )
}
