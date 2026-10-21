import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import { CircleCheck, Clock, ShieldAlert, TriangleAlert } from 'lucide-react-native'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { Button, Icon, Text } from '@/components/ui'
import { signOut, startWorking, useKyc, useSession } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/**
 * Step 3 of 3: where the application stands. Follows the review live — the
 * screen changes on its own when the decision comes in.
 */
export default function KycStatusScreen() {
  const t = useT()
  const session = useSession()
  const { rejectReason } = useKyc()
  const [busy, setBusy] = useState(false)

  const view =
    session.status === 'approved' || session.status === 'active'
      ? { icon: CircleCheck, tone: 'success', title: t('You’re approved!'), body: t('Your documents are verified. Go online to start getting jobs near you.') }
      : session.status === 'kyc_rejected'
        ? { icon: TriangleAlert, tone: 'danger', title: t('Documents need a fix'), body: rejectReason ?? t('One of your documents could not be verified.') }
        : session.status === 'suspended'
          ? { icon: ShieldAlert, tone: 'danger', title: t('Account on hold'), body: t('Call the partner desk to know more.') }
          : { icon: Clock, tone: 'warning', title: t('Under review'), body: t('We are checking your documents. This usually takes a few hours — we’ll notify you.') }

  async function start() {
    setBusy(true)
    try {
      if (session.status === 'approved') await startWorking()
      router.replace('/home')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title={t('Application status')}
      step={{ at: 3, of: 3 }}
      footer={
        view.tone === 'success' ? (
          <Button size="lg" variant="success" disabled={busy} onPress={start} className="w-full">
            {busy ? <ActivityIndicator color={COLORS.white} /> : null}
            {t('Start taking jobs')}
          </Button>
        ) : session.status === 'kyc_rejected' ? (
          <Button size="lg" href="/kyc" replace className="w-full">
            {t('Re-upload documents')}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onPress={() => void signOut()} className="w-full">
            {t('Sign out')}
          </Button>
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
