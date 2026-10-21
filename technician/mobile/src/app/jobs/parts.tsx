import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { PackageSearch } from 'lucide-react-native'
import { JobScreen } from '@/components/job/JobScreen'
import { RateCardPicker } from '@/components/job/RateCardPicker'
import { useAction } from '@/components/job/useAction'
import { Async } from '@/components/ui/Async'
import { Button, Card, Chip, EmptyState, Icon, Page, SectionTitle, SkeletonCard, Text, TextField } from '@/components/ui'
import { addExtra, useRateCard, type PartnerJob, type RateCardItem } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { rupees } from '@/lib/money'
import { COLORS } from '@/lib/theme'

/**
 * Extra parts and charges, UC style: pick from the admin's rate card at its
 * fixed price, or add an "Other" line with a name and amount. Every extra
 * goes to the customer's app for approval before it joins the bill.
 */
export default function PartsScreen() {
  const t = useT()
  return (
    <JobScreen title={() => t('Extra parts & charges')} back={(id) => `/jobs/detail?id=${id}`}>
      {(job) => <Parts job={job} />}
    </JobScreen>
  )
}

function Parts({ job }: { job: PartnerJob }) {
  const t = useT()
  const card = useRateCard(job.service.categoryId)
  const { run, busy, error } = useAction()
  const [picking, setPicking] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const open = job.status === 'in_progress' || job.status === 'awaiting_approval'

  function pick(item: RateCardItem) {
    setPicking(item.id)
    void run(() => addExtra(job.id, { source: 'rate_card', rateCardItemId: item.id, name: item.name, amount: item.price })).finally(() => setPicking(null))
  }

  function addOther() {
    void run(
      () => addExtra(job.id, { source: 'other', name: name.trim(), amount: Math.round(Number(amount) * 100) }),
      () => {
        setName('')
        setAmount('')
      }
    )
  }

  return (
    <Page className="gap-5">
      {job.extras.length ? (
        <View>
          <SectionTitle count={job.extras.length}>{t('Added to this job')}</SectionTitle>
          <Card>
            {job.extras.map((e, i) => (
              <View key={e.id} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold">{e.name}</Text>
                  <Text className="text-xs text-muted">{e.source === 'rate_card' ? t('Rate card') : t('Other')}</Text>
                </View>
                <Chip tone={e.status === 'approved' ? 'success' : e.status === 'rejected' ? 'danger' : 'warning'} live={e.status === 'pending'}>
                  {t(e.status === 'pending' ? 'Waiting for customer' : e.status === 'approved' ? 'Approved' : 'Declined')}
                </Chip>
                <Text className="num text-base font-extrabold">{rupees(e.amount)}</Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {!open ? (
        <Text className="text-center text-sm font-semibold text-muted">{t('Extras can be added once the job has started.')}</Text>
      ) : (
        <>
          <View>
            <SectionTitle>{t('Rate card')}</SectionTitle>
            <Async
              query={card}
              loading={<SkeletonCard />}
              empty={<EmptyState icon={<Icon as={PackageSearch} className="size-6" />} title={t('No rate card for this service')} body={t('Use “Other” below.')} />}
            >
              {(items) => <RateCardPicker items={items} onPick={pick} busyId={picking} />}
            </Async>
          </View>

          <Card className="gap-4 p-4">
            <Text className="text-base font-extrabold">{t('Other')}</Text>
            <TextField label={t('What is it?')} value={name} onChangeText={setName} placeholder={t('e.g. Wiring repair')} />
            <TextField label={t('Amount')} prefix="₹" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d]/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="0" />
            <Button size="lg" variant="secondary" disabled={busy || name.trim().length < 2 || !Number(amount)} onPress={addOther}>
              {busy && !picking ? <ActivityIndicator color={COLORS.ink} /> : t('Send to customer for approval')}
            </Button>
          </Card>
        </>
      )}

      {error ? <Text className="text-center text-sm font-semibold text-danger">{error}</Text> : null}
      <Text className="text-center text-xs text-muted">{t('The customer approves each extra in their app. It joins the bill once approved.')}</Text>
    </Page>
  )
}
