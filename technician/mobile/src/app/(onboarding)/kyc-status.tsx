import { useState } from 'react'
import { ActivityIndicator, Linking, View } from 'react-native'
import { router } from 'expo-router'
import { CircleCheck, Clock, Phone, ShieldAlert, TriangleAlert, UserX } from 'lucide-react-native'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { Button, Icon, Text } from '@/components/ui'
import { signOut, startWorking, useKyc, useSession } from '@/lib/data'
import { BRAND } from '@/lib/brand'
import { telHref } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * Where the account stands until it is active. The partner desk adds each
 * technician and uploads their documents, so anything to fix is done there:
 * this screen says what is happening and puts the desk's number one tap away.
 * It follows the review live — it changes on its own when a decision comes in.
 */
export default function KycStatusScreen() {
  const t = useT()
  const session = useSession()
  const { rejectReason } = useKyc()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const view =
    session.status === 'approved' || session.status === 'active'
      ? { icon: CircleCheck, tone: 'success', title: t('You’re approved!'), body: t('Your documents are verified. Go online to start getting jobs near you.') }
      : session.status === 'kyc_rejected'
        ? { icon: TriangleAlert, tone: 'danger', title: t('Documents need a fix'), body: `${rejectReason ?? t('One of your documents could not be verified.')} ${t('Bring the right document to the partner desk — they will upload it.')}` }
        : session.status === 'suspended'
          ? { icon: ShieldAlert, tone: 'danger', title: t('Account on hold'), body: t('Call the partner desk to know more.') }
          : session.status === 'inactive'
            ? { icon: UserX, tone: 'danger', title: t('Account inactive'), body: t('Your account is not active right now. The partner desk can reactivate it.') }
            : { icon: Clock, tone: 'warning', title: t('Under review'), body: t('We are checking your documents. This usually takes a few hours — we’ll notify you.') }

  async function start() {
    setBusy(true)
    setError(null)
    try {
      if (session.status === 'approved') await startWorking()
      router.replace('/home')
    } catch {
      setError(t('Couldn’t reach the server. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title={t('Application status')}
      footer={
        view.tone === 'success' ? (
          <Button size="lg" variant="success" disabled={busy} onPress={start} className="w-full">
            {busy ? <ActivityIndicator color={COLORS.white} /> : null}
            {t('Start taking jobs')}
          </Button>
        ) : (
          <View className="flex-row gap-2.5">
            <Button size="lg" variant="secondary" onPress={() => void signOut()} className="flex-1">
              {t('Sign out')}
            </Button>
            <Button size="lg" onPress={() => void Linking.openURL(telHref(BRAND.partnerDesk))} className="flex-[1.4]">
              <Icon as={Phone} className="size-5" />
              {t('Call partner desk')}
            </Button>
          </View>
        )
      }
    >
      <View accessibilityLiveRegion="polite" className="items-center gap-3 py-8">
        <View className={cn('size-20 items-center justify-center rounded-full', view.tone === 'success' ? 'bg-success-soft' : view.tone === 'danger' ? 'bg-danger-soft' : 'bg-warning-soft')}>
          <Icon as={view.icon} className={cn('size-10', view.tone === 'success' ? 'text-success' : view.tone === 'danger' ? 'text-danger' : 'text-warning')} />
        </View>
        <Text accessibilityRole="header" className="text-center text-2xl font-extrabold tracking-tight">
          {view.title}
        </Text>
        <Text className="max-w-xs text-center text-base text-muted">{view.body}</Text>
        {error ? (
          <Text accessibilityRole="alert" className="text-center text-sm font-semibold text-danger">
            {error}
          </Text>
        ) : null}
        {session.status === 'kyc_pending' ? <ActivityIndicator className="mt-2" color={COLORS.warning} /> : null}
      </View>
      <View className="gap-2 rounded-card bg-canvas p-4">
        <Row done label={t('Details')} />
        <Row done label={t('Documents')} />
        <Row done={view.tone === 'success'} label={t('Verification')} />
      </View>
    </AuthFrame>
  )
}

function Row({ done, label }: { done: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon as={done ? CircleCheck : Clock} className={cn('size-5', done ? 'text-success' : 'text-faint')} />
      <Text className={cn('text-sm font-bold', done ? 'text-ink' : 'text-muted')}>{label}</Text>
    </View>
  )
}
