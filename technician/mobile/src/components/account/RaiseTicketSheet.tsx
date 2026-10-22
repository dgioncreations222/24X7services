import { useState } from 'react'
import { View } from 'react-native'
import { CircleCheck } from 'lucide-react-native'
import { raiseTicket, useJobs, type SupportTicket, type TicketTopic } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { Icon } from '../base/Icon'
import { Text } from '../base/Text'
import { Button } from '../ui/Button'
import { ChoiceChips } from '../ui/ChoiceChips'
import { Sheet } from '../ui/Sheet'
import { TextField } from '../ui/TextField'

export const TOPIC_LABEL: Record<TicketTopic, string> = {
  customer_unreachable: 'Customer not reachable',
  wrong_address: 'Wrong address',
  payment: 'Payment or payout',
  part: 'Part or rate card',
  app: 'App problem',
  safety: 'Safety concern',
  other: 'Something else',
}

const TOPICS = Object.keys(TOPIC_LABEL) as TicketTopic[]
const NO_JOB = 'none'

/** The ticket form: what it is about, which job (if any), and what happened. */
export function RaiseTicketSheet({ open, onClose, topic: initial }: { open: boolean; onClose: () => void; topic?: TicketTopic }) {
  const t = useT()
  const upcoming = useJobs('upcoming')
  const ongoing = useJobs('ongoing')
  const done = useJobs('completed')
  // Upcoming too: the FAQ sends a technician here to give back an accepted job.
  const jobs = [...(ongoing.data ?? []), ...(upcoming.data ?? []), ...(done.data ?? [])].slice(0, 6)
  const [topic, setTopic] = useState<TicketTopic>(initial ?? 'customer_unreachable')
  const [jobId, setJobId] = useState<string>(NO_JOB)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<SupportTicket | null>(null)

  function close() {
    onClose()
    setSent(null)
    setDetails('')
    setError(null)
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      setSent(await raiseTicket({ topic, jobId: jobId === NO_JOB ? undefined : jobId, details }))
    } catch (e) {
      setError(e instanceof Error && e.name === 'TicketError' ? t(e.message) : t('Couldn’t reach the server. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title={t('Raise a ticket')}>
      {sent ? (
        <View className="items-center py-4">
          <Icon as={CircleCheck} className="size-12 text-success" />
          <Text className="mt-3 text-center text-lg font-extrabold">{t('Ticket {id} raised', { id: sent.id })}</Text>
          <Text className="mt-1 text-center text-base text-muted">{t('The partner desk will call you back within 15 minutes.')}</Text>
          <Button size="lg" className="mt-5 w-full" onPress={close}>
            {t('Done')}
          </Button>
        </View>
      ) : (
        <View className="gap-5">
          <ChoiceChips label={t('What is it about?')} options={TOPICS.map((v) => ({ value: v, label: t(TOPIC_LABEL[v]) }))} value={[topic]} onChange={([v]) => v && setTopic(v)} />
          {jobs.length ? (
            <ChoiceChips
              label={t('Which job?')}
              options={[...jobs.map((j) => ({ value: j.id, label: `${j.displayId} · ${j.customer.name.split(' ')[0]}` })), { value: NO_JOB, label: t('Not about a job') }]}
              value={[jobId]}
              onChange={([v]) => v && setJobId(v)}
            />
          ) : null}
          <TextField
            label={t('What happened?')}
            value={details}
            onChangeText={setDetails}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 96 }}
            placeholder={t('A few lines are enough')}
            error={error}
          />
          <Button size="lg" className="w-full" disabled={busy || !details.trim()} onPress={() => void submit()}>
            {busy ? t('Sending…') : t('Send ticket')}
          </Button>
        </View>
      )}
    </Sheet>
  )
}
