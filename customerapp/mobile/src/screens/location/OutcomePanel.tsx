import { useState } from 'react'
import { View } from 'react-native'
import { Check, MapPinOff } from 'lucide-react-native'

import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Text } from '@/components/ui/Text'
import { callFn, friendlyError } from '@/lib/callables'

export type Outcome =
  | { kind: 'serviceable'; pincode: string; city: string; area: string }
  | { kind: 'unserviceable'; pincode: string; area?: string | undefined; city?: string | undefined }

export function OutcomePanel({
  outcome,
  onContinue,
}: {
  outcome: Outcome
  onContinue: (chosen: { pincode: string; city: string; area: string }) => void
}) {
  if (outcome.kind === 'serviceable') {
    return (
      <Card raised className="mt-5 p-4">
        <View className="flex-row items-start gap-3">
          <View className="size-10 items-center justify-center rounded-full bg-success-soft">
            <Icon as={Check} className="size-5 text-success" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-ink">Yes, we service {outcome.area}</Text>
            <Text className="mt-0.5 text-sm text-muted">
              {outcome.city} · {outcome.pincode}
            </Text>
          </View>
        </View>
        <Button
          fullWidth
          className="mt-4"
          onPress={() => onContinue({ pincode: outcome.pincode, city: outcome.city, area: outcome.area })}
        >
          Continue
        </Button>
      </Card>
    )
  }

  return <WaitlistPanel outcome={outcome} />
}

/**
 * Not here yet. The honest version of that is a waitlist rather than a dead
 * end, and the number is optional — someone who only wanted to know whether we
 * cover their area already has their answer.
 */
function WaitlistPanel({ outcome }: { outcome: Extract<Outcome, { kind: 'unserviceable' }> }) {
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [joined, setJoined] = useState(false)

  const place = outcome.area ? `${outcome.area}${outcome.city ? `, ${outcome.city}` : ''}` : outcome.pincode

  async function join(): Promise<void> {
    const digits = phone.replace(/\D/g, '')
    if (digits.length > 0 && !/^[6-9][0-9]{9}$/.test(digits)) {
      setError('Enter a valid 10-digit Indian mobile number')
      return
    }

    setError(undefined)
    setSaving(true)
    try {
      await callFn('joinWaitlist', {
        pincode: outcome.pincode,
        ...(digits.length === 10 ? { phone: `+91${digits}` } : {}),
      })
      setJoined(true)
      toast.show('We will let you know when we reach you.', { tone: 'success' })
    } catch (caught) {
      toast.show(friendlyError(caught), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card raised className="mt-5 p-4">
      <View className="flex-row items-start gap-3">
        <View className="size-10 items-center justify-center rounded-full bg-warning-soft">
          <Icon as={MapPinOff} className="size-5 text-warning" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-ink">We are not in {place} yet</Text>
          <Text className="mt-0.5 text-sm text-muted">
            We are adding areas around Hyderabad. If you have another address there, pick it from the list below.
          </Text>
        </View>
      </View>

      {joined ? (
        <View className="mt-4 flex-row items-center gap-2 rounded-card bg-surface px-4 py-3">
          <Icon as={Check} className="size-4 text-success" />
          <Text className="flex-1 text-sm text-ink">Noted. We will tell you when we reach {outcome.pincode}.</Text>
        </View>
      ) : (
        <View className="mt-4 gap-3">
          <Input
            label="Mobile number (optional)"
            hint="Used only to tell you when we start servicing this pincode."
            value={phone}
            onChangeText={(value) => {
              setPhone(value.replace(/\D/g, '').slice(0, 10))
              setError(undefined)
            }}
            error={error}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="98765 43210"
          />
          <Button variant="secondary" fullWidth loading={saving} onPress={() => void join()}>
            Tell me when you reach here
          </Button>
        </View>
      )}
    </Card>
  )
}
