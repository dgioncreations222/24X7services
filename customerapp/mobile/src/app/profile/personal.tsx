import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { UserRound } from 'lucide-react-native'
import { updateProfileInputSchema } from '@app/shared'

import { ProfileShell, SignInPrompt } from '@/components/ProfileShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Text } from '@/components/ui/Text'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { saveName } from '@/lib/auth'
import { fetchProfile } from '@/lib/api/profile'
import { formatPhone } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Name and email.
 *
 * That is the whole of what a customer may change about themselves here. The
 * phone number is the account and is shown as a fact; the consent record is
 * evidence of what was agreed and when, and neither belongs behind an edit
 * button.
 */
export default function PersonalScreen() {
  return (
    <ProfileShell
      title="Personal details"
      signedOut={
        <SignInPrompt
          icon={UserRound}
          title="Your details"
          description="The name a technician is handed and an invoice is made out to. Log in to set it."
        />
      }
    >
      {(user) => <PersonalForm uid={user.uid} phone={user.phoneNumber} />}
    </ProfileShell>
  )
}

function PersonalForm({ uid, phone }: { uid: string; phone: string | null }) {
  const toast = useToast()
  const [name, setName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => fetchProfile(uid), [uid])

  const profile = useAsync(load)

  // The form starts from what was loaded and switches to what is being typed;
  // seeding state from an effect would fight the load.
  const nameValue = name ?? profile.data?.name ?? ''
  const emailValue = email ?? profile.data?.email ?? ''

  async function submit(): Promise<void> {
    const parsed = updateProfileInputSchema.safeParse({
      name: nameValue,
      email: emailValue.trim().length > 0 ? emailValue.trim() : undefined,
    })
    if (!parsed.success) {
      const next: { name?: string; email?: string } = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'name') next.name = issue.message
        if (field === 'email') next.email = issue.message
      }
      setErrors(next)
      return
    }

    setErrors({})
    setSaving(true)
    try {
      await saveName(uid, parsed.data.name, parsed.data.email)
      toast.show('Saved.', { tone: 'success' })
    } catch {
      toast.show('We could not save that. Please try again.', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (profile.status === 'loading') {
    return (
      <SkeletonGroup label="Loading" className="mt-6 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </SkeletonGroup>
    )
  }

  return (
    <View className="mt-5 gap-5">
      <Input
        label="Full name"
        required
        value={nameValue}
        onChangeText={(text) => {
          setName(text)
          setErrors((current) => ({ ...current, name: undefined }))
        }}
        {...(errors.name ? { error: errors.name } : {})}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Input
        label="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={emailValue}
        onChangeText={(text) => {
          setEmail(text)
          setErrors((current) => ({ ...current, email: undefined }))
        }}
        {...(errors.email ? { error: errors.email } : {})}
        autoComplete="email"
        textContentType="emailAddress"
        hint="Only used if you ask us to email an invoice."
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <Card className="p-4">
        <Text className="text-xs text-muted">Mobile number</Text>
        <Text className="mt-0.5 text-sm font-medium text-ink">{phone ? formatPhone(phone) : 'Not set'}</Text>
        <Text className="mt-2 text-xs leading-[20px] text-muted">
          This is your account and how your expert reaches you. To change it, talk to support — moving an account to
          a new number is something we check by hand.
        </Text>
      </Card>

      <Button fullWidth loading={saving} onPress={() => void submit()}>
        Save changes
      </Button>
    </View>
  )
}
