import { useState } from 'react'
import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { ChevronRight, Download, ShieldAlert, type LucideIcon } from 'lucide-react-native'

import { ProfileShell, useSignInHref } from '@/components/ProfileShell'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'
import { ConfirmModal } from '@/components/ui/Overlay'
import { useToast } from '@/components/Toast'
import { callFn, friendlyError } from '@/lib/callables'
import { signOut } from '@/lib/auth'
import { collectMyData, downloadJson } from '@/lib/exportData'
import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'
import { Notifications } from '@/screens/profile/settings/Notifications'

/**
 * What we may send, what we hold, and the way out.
 *
 * Two switches, not five. Every settings screen in this category lists SMS,
 * email, WhatsApp and voice calls; this app sends on none of them, and a
 * switch for a channel nobody sends on is a promise the customer will act on
 * and then wonder why nothing changed.
 *
 * The messages about a booking in progress have no switch at all, and the
 * screen says so rather than leaving the gap to be noticed.
 *
 * Downloading everything we hold is a button, not a request form: it is built
 * on the device out of reads the customer is already allowed to make. Closing
 * the account is under it, in the danger tone, behind a typed confirmation —
 * but it is here and plainly labelled.
 *
 * Signed out it draws itself rather than swapping for a sign-in prompt: the
 * switches, what cannot be turned off, and the three legal documents are what
 * the screen is *about*, and the documents are readable by anyone. So the
 * structure stands, the controls that need an account are inert and say why,
 * and the links that never needed one keep working.
 *
 * There is no theme switch: the app follows the phone's light or dark mode.
 */

const LEGAL: readonly { href: Href; label: string }[] = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/cancellation', label: 'Cancellation and refunds' },
]

export function SettingsScreen() {
  return (
    <ProfileShell title="Settings" signedOut={<Settings uid={null} />}>
      {(user) => <Settings uid={user.uid} />}
    </ProfileShell>
  )
}

function Settings({ uid }: { uid: string | null }) {
  const toast = useToast()
  const signIn = useSignInHref()
  const [closing, setClosing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [exporting, setExporting] = useState(false)

  async function close(): Promise<void> {
    // The dialog says the button does nothing until this is typed, so it does
    // nothing until this is typed.
    if (confirmation !== 'DELETE') return

    setDeleting(true)
    try {
      await callFn('deleteAccount', { confirm: 'DELETE' })
      await signOut()
      toast.show('Your account has been closed.')
      router.replace('/home')
    } catch (error) {
      toast.show(friendlyError(error), { tone: 'error' })
    } finally {
      setDeleting(false)
      setClosing(false)
    }
  }

  async function exportData(): Promise<void> {
    if (exporting || !uid) return
    setExporting(true)
    try {
      const data = await collectMyData(uid)
      const stamp = new Date().toISOString().slice(0, 10)
      downloadJson(data, `${brand.slug}-my-data-${stamp}.json`)
      toast.show('Your data has been downloaded.', { tone: 'success' })
    } catch {
      toast.show('We could not put that file together. Please try again.', { tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Notifications uid={uid} />

      <Band />

      <View>
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          Privacy & data
        </Text>
        <View className="mt-2 border-y border-border">
          <AccountRow
            icon={Download}
            label={exporting ? 'Putting your file together…' : 'Download your data'}
            detail="Everything we hold about you, as one file"
            signIn={uid ? null : signIn}
            disabled={exporting}
            onClick={() => void exportData()}
          />
          <View className="h-px bg-border" />
          <AccountRow
            icon={ShieldAlert}
            label="Close your account"
            detail="Removes your profile, addresses and saved appliances"
            danger
            signIn={uid ? null : signIn}
            onClick={() => setClosing(true)}
          />
        </View>

        <Text className="mt-3 text-xs leading-[20px] text-muted">
          Invoices we have already issued you are kept — the law requires it — with your name taken off them. Any
          booking that is still open has to be cancelled or finished before an account can close.
        </Text>
      </View>

      <Band />

      <View className="pb-6">
        <Text accessibilityRole="header" className="text-lg font-bold text-ink">
          The legal bits
        </Text>
        <View className="mt-2 border-y border-border">
          {LEGAL.map((item, index) => (
            <Tappable
              key={item.label}
              href={item.href}
              className={cn(
                'flex-row items-center gap-4 py-4 active:bg-surface active:opacity-100',
                index > 0 && 'border-t border-border'
              )}
            >
              <Text className="flex-1 text-base font-medium text-ink">{item.label}</Text>
              <Icon as={ChevronRight} className="size-5 shrink-0 text-muted" />
            </Tappable>
          ))}
        </View>
      </View>

      <ConfirmModal
        open={closing}
        onClose={() => {
          setClosing(false)
          setConfirmation('')
        }}
        onConfirm={() => void close()}
        loading={deleting}
        destructive
        title="Close your account?"
        description="This cannot be undone. Any booking that is still open has to be cancelled or finished first."
        confirmLabel="Close my account"
        cancelLabel="Keep my account"
      >
        {/* Typed rather than tapped: a destructive button one thumb-width from
            a dismiss button is a button that gets pressed by accident. */}
        <Input
          label="Type DELETE to confirm"
          value={confirmation}
          onChangeText={(text) => setConfirmation(text.toUpperCase())}
          placeholder="DELETE"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
        />
        {confirmation !== 'DELETE' ? (
          <Text className="mt-2 text-xs text-muted">The button below does nothing until this says DELETE.</Text>
        ) : null}
      </ConfirmModal>
    </>
  )
}

/**
 * A row under Privacy & data.
 *
 * A button when there is an account to act on, a link to the sign-in when
 * there is not — same row, same words either way, so the screen does not
 * change shape under somebody who signs in from it.
 */
function AccountRow({
  icon,
  label,
  detail,
  danger = false,
  disabled = false,
  signIn,
  onClick,
}: {
  icon: LucideIcon
  label: string
  detail: string
  danger?: boolean
  disabled?: boolean
  /** Set when nobody is signed in: where the row goes instead. */
  signIn: Href | null
  onClick: () => void
}) {
  return (
    <Tappable
      {...(signIn ? { href: signIn } : { onPress: onClick, disabled })}
      className={cn(
        'w-full flex-row items-center gap-4 py-4 active:bg-surface active:opacity-100',
        disabled && 'opacity-60'
      )}
    >
      <Icon as={icon} className={cn('size-5 shrink-0', danger ? 'text-error' : 'text-ink')} />
      <View className="min-w-0 flex-1">
        <Text className={cn('text-base font-medium', danger ? 'text-error' : 'text-ink')}>{label}</Text>
        <Text className="mt-0.5 text-xs text-muted">{detail}</Text>
      </View>
      <Icon as={ChevronRight} className="size-5 shrink-0 text-muted" />
    </Tappable>
  )
}

function Band() {
  return <View aria-hidden className="-mx-4 my-6 h-2 bg-surface" />
}
