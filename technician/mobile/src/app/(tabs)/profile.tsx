import { View } from 'react-native'
import { BadgeCheck, Bell, FileText, Headset, Mail, Phone, Settings, Star, Wallet } from 'lucide-react-native'
import { LogoutButton } from '@/components/account/LogoutButton'
import { NavRow } from '@/components/account/NavRow'
import { Async } from '@/components/ui/Async'
import { Avatar, Card, Icon, Page, ScreenHeader, SkeletonList, Text } from '@/components/ui'
import { useCategories, useProfile, useUnreadCount, type PartnerProfile } from '@/lib/data'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

/** Who the technician is, their numbers, and the way to everything about their account. */
export default function ProfileScreen() {
  const t = useT()
  const profile = useProfile()
  const unread = useUnreadCount()
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader back="/home" title={t('Profile')} />
      <Page className="gap-5">
        <Async query={profile} loading={<SkeletonList rows={1} />}>
          {(p) => (
            <>
              <Header profile={p} />
              <Card>
                <NavRow
                  first
                  icon={Star}
                  title={t('Ratings & reviews')}
                  sub={t('{rating} from {n} ratings', { rating: p.rating.toFixed(2), n: p.ratingCount.toLocaleString('en-IN') })}
                  href="/reviews"
                />
                <NavRow icon={Wallet} title={t('Payouts')} sub={t('Weekly, to your bank account')} href="/payouts" />
                <NavRow icon={FileText} title={t('My documents')} sub={t('Aadhaar, PAN, photo, bank')} href="/documents" />
                <NavRow icon={Bell} title={t('Notifications')} href="/notifications" badge={unread} />
                <NavRow icon={Settings} title={t('Settings')} sub={t('Language and alerts')} href="/settings" />
                <NavRow icon={Headset} title={t('Help & Support')} sub={t('FAQ and your tickets')} href="/support" />
              </Card>
              <Card>
                <Contact icon={Phone} value={p.phone} first />
                <Contact icon={Mail} value={p.email} />
              </Card>
            </>
          )}
        </Async>
        <LogoutButton />
      </Page>
    </View>
  )
}

function Header({ profile: p }: { profile: PartnerProfile }) {
  const t = useT()
  const categories = useCategories()
  const skills = (categories.data ?? []).filter((c) => p.skills.includes(c.id)).map((c) => c.name)
  const verified = p.status === 'active' || p.status === 'approved'
  return (
    <Card className="overflow-hidden">
      <View className="flex-row items-center gap-4 p-4">
        <Avatar name={p.name} photo={p.photo} size={72} />
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-xl font-extrabold">
            {p.name}
          </Text>
          <Text className="text-sm text-muted">
            {p.city} · {p.zone}
          </Text>
          {verified ? (
            <View className="mt-1.5 flex-row items-center gap-1 self-start rounded-pill bg-success-soft px-2.5 py-1">
              <Icon as={BadgeCheck} className="size-4 text-success" />
              <Text className="text-xs font-extrabold text-success">{t('Verified partner')}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {skills.length ? (
        <Text className="px-4 pb-4 text-sm text-ink-2">{skills.join(' · ')}</Text>
      ) : null}
      <View className="flex-row border-t border-line">
        <Stat label={t('Rating')}>
          <View className="flex-row items-center gap-1">
            <Text className="num text-lg font-extrabold">{p.rating.toFixed(2)}</Text>
            <Icon as={Star} className="size-4 text-warning" fill={COLORS.warning} />
          </View>
        </Stat>
        <Stat label={t('Jobs done')} className="border-l border-line">
          <Text className="num text-lg font-extrabold">{p.completedJobs.toLocaleString('en-IN')}</Text>
        </Stat>
        <Stat label={t('Experience')} className="border-l border-line">
          <Text className="num text-lg font-extrabold">{t('{n} yrs', { n: p.experienceYears })}</Text>
        </Stat>
      </View>
    </Card>
  )
}

function Stat({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <View className={cn('flex-1 items-center p-3', className)}>
      {children}
      <Text className="text-xs font-semibold text-muted">{label}</Text>
    </View>
  )
}

function Contact({ icon, value, first }: { icon: typeof Phone; value: string; first?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 px-4 py-3.5', !first && 'border-t border-line')}>
      <Icon as={icon} className="size-5 text-muted" />
      <Text numberOfLines={1} className="num flex-1 text-base">
        {value}
      </Text>
    </View>
  )
}
