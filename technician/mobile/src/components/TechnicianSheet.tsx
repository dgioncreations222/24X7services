import { View } from 'react-native'
import { router } from 'expo-router'
import { BadgeCheck, BriefcaseBusiness, CalendarDays, Mail, MapPin, Phone, ShieldCheck, Star } from 'lucide-react-native'
import { APPLIANCES, APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { ApplianceGlyph } from './glyphs'
import { Avatar, Icon, Sheet, Tappable, Text } from './ui'
import { COLORS } from '@/lib/theme'

/** The technician at a glance, opened from the menu header. */
export function TechnicianSheet({ open, onClose, onProfile }: { open: boolean; onClose: () => void; onProfile?: () => void }) {
  const { tech, online, jobs } = useStore()
  const done = tech.completedJobs + jobs.filter((j) => j.status === 'closed').length

  return (
    <Sheet open={open} onClose={onClose} title="Technician details">
      <View className="flex-row items-center gap-4">
        <View className="relative">
          <Avatar name={tech.name} photo={tech.photo} size={64} />
          <View className={cn('absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-card', online ? 'bg-success' : 'bg-faint')} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-lg font-extrabold tracking-tight">
            {tech.name}
          </Text>
          <Text className="num text-sm font-bold text-muted">{tech.id}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <Icon as={BadgeCheck} className="size-3.5 text-success" />
              <Text className="text-xs font-bold text-success">Verified</Text>
            </View>
            <Text className={cn('text-xs font-bold', online ? 'text-success' : 'text-muted')}>{online ? '● Online' : '● Offline'}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row rounded-xl border border-line bg-canvas">
        <View className="flex-1 items-center py-2.5">
          <View className="flex-row items-center justify-center gap-1">
            <Text className="num text-base font-extrabold">{tech.rating.toFixed(2)}</Text>
            <Icon as={Star} className="size-3.5 text-warning" fill={COLORS.warning} />
          </View>
          <Text className="text-[11px] font-semibold text-muted">{tech.ratingCount.toLocaleString('en-IN')} ratings</Text>
        </View>
        <View className="flex-1 items-center border-l border-line py-2.5">
          <Text className="num text-base font-extrabold">{done.toLocaleString('en-IN')}</Text>
          <Text className="text-[11px] font-semibold text-muted">Jobs done</Text>
        </View>
        <View className="flex-1 items-center border-l border-line py-2.5">
          <Text className="num text-base font-extrabold">{tech.experienceYears} yrs</Text>
          <Text className="text-[11px] font-semibold text-muted">Experience</Text>
        </View>
      </View>

      <View className="mt-4">
        {(
          [
            [Phone, 'Mobile', tech.phone],
            [Mail, 'Email', tech.email],
            [MapPin, 'Service area', tech.area],
            [ShieldCheck, 'Base', tech.base],
            [CalendarDays, 'Partner since', tech.joined],
          ] as const
        ).map(([glyph, label, value], i) => (
          <View key={label} className={cn('flex-row items-center gap-3 py-2.5', i > 0 && 'border-t border-line')}>
            <Icon as={glyph} className="size-4 shrink-0 text-muted" />
            <Text className="w-24 shrink-0 text-xs font-bold uppercase tracking-wider text-faint">{label}</Text>
            <Text numberOfLines={1} className="num min-w-0 flex-1 text-sm font-semibold">
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-3 text-[11px] font-bold uppercase tracking-wider text-faint">Brands</Text>
      <View className="mt-1.5 flex-row flex-wrap gap-1.5">
        {tech.brands.map((b) => (
          <View key={b} className="rounded-md border border-line-strong px-2 py-1">
            <Text className="text-xs font-extrabold">{BRAND_LABEL[b]}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-[11px] font-bold uppercase tracking-wider text-faint">Appliances</Text>
      <View className="mt-1.5 flex-row flex-wrap gap-1.5">
        {APPLIANCES.map((a) => (
          <View key={a} className="flex-row items-center gap-1.5 rounded-md bg-canvas px-2 py-1">
            <ApplianceGlyph appliance={a} className="size-3.5 text-brand" />
            <Text className="text-xs font-bold">{APPLIANCE_LABEL[a]}</Text>
          </View>
        ))}
      </View>

      <Tappable
        accessibilityRole="link"
        onPress={() => {
          onClose()
          onProfile?.()
          router.navigate('/profile')
        }}
        className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:bg-brand-deep active:opacity-100"
      >
        <Icon as={BriefcaseBusiness} className="size-4 text-white" />
        <Text className="text-sm font-extrabold text-white">View full profile</Text>
      </Tappable>
    </Sheet>
  )
}
