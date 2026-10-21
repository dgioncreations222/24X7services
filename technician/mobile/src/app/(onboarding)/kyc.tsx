import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import { TriangleAlert } from 'lucide-react-native'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { DocSlot } from '@/components/kyc/DocSlot'
import { Button, Icon, Segmented, Text, TextField } from '@/components/ui'
import { REQUIRED_DOCS, submitKyc, useKyc, useSession, type PayoutDetails } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/** Step 2 of 3: identity photos and where payouts go. */
export default function KycScreen() {
  const t = useT()
  const session = useSession()
  const kyc = useKyc()
  const saved = kyc.payout
  const [method, setMethod] = useState<'bank' | 'upi'>(saved && 'upiId' in saved ? 'upi' : 'bank')
  const [accountName, setAccountName] = useState(saved && 'accountName' in saved ? saved.accountName : (session.name ?? ''))
  const [accountNumber, setAccountNumber] = useState(saved && 'accountNumber' in saved ? saved.accountNumber : '')
  const [ifsc, setIfsc] = useState(saved && 'ifsc' in saved ? saved.ifsc : '')
  const [upiId, setUpiId] = useState(saved && 'upiId' in saved ? saved.upiId : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const docsDone = REQUIRED_DOCS.every((d) => kyc.documents[d])
  const payoutDone = method === 'upi' ? upiId.trim().length > 3 : accountName.trim() && accountNumber.length >= 9 && ifsc.length === 11
  const payout: PayoutDetails = method === 'upi' ? { upiId: upiId.trim() } : { accountName: accountName.trim(), accountNumber, ifsc: ifsc.toUpperCase() }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await submitKyc(payout)
      router.replace('/kyc-status')
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? e.message : t('Couldn’t submit. Check your internet and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title={t('Verify your identity')}
      subtitle={t('Clear photos get approved faster.')}
      step={{ at: 2, of: 3 }}
      back={session.status === 'kyc_rejected' ? '/kyc-status' : '/register'}
      footer={
        <Button size="lg" disabled={!docsDone || !payoutDone || busy} onPress={submit} className="w-full">
          {busy ? <ActivityIndicator color={COLORS.white} /> : null}
          {t('Submit for review')}
        </Button>
      }
    >
      {session.status === 'kyc_rejected' && kyc.rejectReason ? (
        <View className="flex-row gap-3 rounded-card border border-danger/30 bg-danger-soft p-4">
          <Icon as={TriangleAlert} className="mt-0.5 size-5 text-danger" />
          <Text className="flex-1 text-sm font-semibold text-ink-2">{kyc.rejectReason}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <DocSlot type="aadhaar" title={t('Aadhaar card')} hint={t('Front side, all text readable')} doc={kyc.documents.aadhaar} />
        <DocSlot type="pan" title={t('PAN card')} hint={t('All four corners in the photo')} doc={kyc.documents.pan} />
        <DocSlot type="photo" title={t('Your photo')} hint={t('Face the camera, no cap or glasses')} doc={kyc.documents.photo} selfie />
      </View>

      <View className="gap-4">
        <Text className="text-base font-extrabold">{t('Where should we send your payouts?')}</Text>
        <Segmented
          value={method}
          onChange={setMethod}
          options={[
            { value: 'bank', label: t('Bank account') },
            { value: 'upi', label: 'UPI' },
          ]}
        />
        {method === 'bank' ? (
          <>
            <TextField label={t('Account holder name')} value={accountName} onChangeText={setAccountName} autoComplete="name" />
            <TextField label={t('Account number')} value={accountNumber} onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" />
            <TextField
              label="IFSC"
              value={ifsc}
              onChangeText={(v) => setIfsc(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
              autoCapitalize="characters"
              placeholder="HDFC0001234"
              hint={t('On your passbook or cheque')}
            />
          </>
        ) : (
          <TextField label={t('UPI ID')} value={upiId} onChangeText={setUpiId} autoCapitalize="none" keyboardType="email-address" placeholder="name@okhdfc" />
        )}
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm font-semibold text-danger">
          {error}
        </Text>
      ) : null}
    </AuthFrame>
  )
}
