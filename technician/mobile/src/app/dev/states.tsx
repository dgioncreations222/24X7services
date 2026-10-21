import { useState } from 'react'
import { View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { BriefcaseBusiness } from 'lucide-react-native'
import { Async } from '@/components/ui/Async'
import { Button, Card, EmptyState, Icon, Page, ScreenHeader, Segmented, Text } from '@/components/ui'
import { useJobs, type JobsView } from '@/lib/data'
import { getMockFailure, setMockFailure, type FailureMode } from '@/lib/mock/api'
import { getMockKycOutcome, resetMockAuth, setMockKycOutcome } from '@/lib/mock/auth'

/**
 * Dev-only: shows a lib/data list in each of its states — loading, empty,
 * error with Try again, and loaded — and flips the mock network to fail.
 * Not linked from the app; open /dev/states directly. `?mode=once|always`
 * and `?list=offers|upcoming|completed|empty` set it up from the URL.
 */
export default function StatesScreen() {
  // Dev builds only: a release build has no business flipping the mock.
  if (!__DEV__) return <Redirect href="/" />
  return <States />
}

function States() {
  const params = useLocalSearchParams<{ mode?: FailureMode; list?: JobsView | 'empty' }>()
  const [view, setView] = useState<JobsView>(params.list && params.list !== 'empty' ? params.list : 'upcoming')
  const [failure, setFailure] = useState<FailureMode>(() => {
    if (params.mode) setMockFailure(params.mode)
    return getMockFailure()
  })
  const [forceEmpty, setForceEmpty] = useState(params.list === 'empty')
  const [kyc, setKyc] = useState(getMockKycOutcome())

  return (
    <>
      <ScreenHeader back="/home" title="Data states" subtitle="Dev · lib/data + lib/mock" />
      <Page className="gap-4">
        <Card className="gap-3 p-4">
          <Text className="text-sm font-bold text-ink-2">Mock network</Text>
          <Segmented
            value={failure}
            onChange={(m) => {
              setMockFailure(m)
              setFailure(m)
            }}
            options={[
              { value: 'off', label: 'Normal' },
              { value: 'once', label: 'Fail once' },
              { value: 'always', label: 'Always fail' },
            ]}
          />
          <Text className="text-sm font-bold text-ink-2">List</Text>
          <Segmented
            value={forceEmpty ? 'empty' : view}
            onChange={(v) => {
              setForceEmpty(v === 'empty')
              if (v !== 'empty') setView(v)
            }}
            options={[
              { value: 'offers', label: 'Offers' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Done' },
              { value: 'empty', label: 'Empty' },
            ]}
          />
          <Text className="text-sm font-bold text-ink-2">KYC review ends in</Text>
          <Segmented
            value={kyc}
            onChange={(o) => {
              setMockKycOutcome(o)
              setKyc(o)
            }}
            options={[
              { value: 'approve', label: 'Approve' },
              { value: 'reject', label: 'Reject' },
            ]}
          />
          <Button variant="secondary" onPress={resetMockAuth}>
            Sign out and forget new accounts
          </Button>
        </Card>
        {/* Remounting on each change starts a fresh load, so the skeleton shows every time. */}
        <JobsList key={`${view}-${forceEmpty}-${failure}`} view={view} forceEmpty={forceEmpty} />
      </Page>
    </>
  )
}

function JobsList({ view, forceEmpty }: { view: JobsView; forceEmpty: boolean }) {
  const query = useJobs(view)
  return (
    <Async
      query={query}
      isEmpty={(jobs) => forceEmpty || jobs.length === 0}
      empty={<EmptyState icon={<Icon as={BriefcaseBusiness} className="size-6" />} title="No jobs here" body="New requests show up on Home." />}
    >
      {(jobs) => (
        <View className="gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="p-4">
              <Text className="text-base font-extrabold">{j.service.name}</Text>
              <Text className="text-sm text-muted">
                {j.displayId} · {j.customer.name} · {j.address.area}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </Async>
  )
}
