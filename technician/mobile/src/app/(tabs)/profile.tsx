import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import {
  Award,
  BadgeCheck,
  Camera,
  ChevronRight,
  Headset,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  Star,
  type LucideIcon,
} from 'lucide-react-native'
import { AvailabilitySummary } from '@/components/Availability'
import { ApplianceGlyph } from '@/components/glyphs'
import { PerformanceSection, ReviewsSection } from '@/components/Performance'
import { Avatar, Card, Icon, Page, ScreenHeader, SectionTitle, Tappable, Text } from '@/components/ui'
import { APPLIANCES, APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

/** Cropped to the centre square and shrunk to 240 px, as the web's canvas did. */
async function pickPhoto(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  const asset = r.canceled ? null : r.assets[0]
  if (!asset) return null
  const s = Math.min(asset.width, asset.height)
  const base = ImageManipulator.manipulate(asset.uri)
  const ctx =
    s > 0
      ? base.crop({ originX: (asset.width - s) / 2, originY: (asset.height - s) / 2, width: s, height: s }).resize({ width: 240, height: 240 })
      : base.resize({ width: 240, height: 240 })
  const img = await ctx.renderAsync()
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true })
  return `data:image/jpeg;base64,${saved.base64}`
}

export default function ProfileScreen() {
  const { tech, setOnline, updateTech, jobs, signOut } = useStore()
  const closedHere = jobs.filter((j) => j.status === 'closed').length

  return (
    <>
      <ScreenHeader
        back="/home"
        title="Profile"
        right={
          <Tappable href="/settings" accessibilityLabel="Settings" className="size-11 items-center justify-center rounded-full active:bg-canvas">
            <Icon as={Settings} className="size-5" />
          </Tappable>
        }
      />
      <Page className="gap-5">
        <Card className="overflow-hidden">
          <View className="h-20 bg-brand-ink" />
          <View className="-mt-12 px-4 pb-4">
            <View className="flex-row items-end justify-between">
              <View>
                <View className="rounded-full border-4 border-card">
                  <Avatar name={tech.name} photo={tech.photo} size={88} />
                </View>
                <Tappable
                  onPress={() =>
                    void pickPhoto()
                      .then((photo) => photo && updateTech({ photo }))
                      .catch(() => undefined)
                  }
                  accessibilityLabel="Change profile photo"
                  className="absolute bottom-1 right-1 size-8 items-center justify-center rounded-full border-2 border-card bg-brand"
                >
                  <Icon as={Camera} className="size-4 text-white" />
                </Tappable>
              </View>
              <View className="mb-1 flex-row items-center gap-1 rounded-pill bg-success-soft px-2.5 py-1">
                <Icon as={BadgeCheck} className="size-4 text-success" />
                <Text className="text-xs font-extrabold text-success">Verified partner</Text>
              </View>
            </View>
            <Text accessibilityRole="header" className="mt-3 text-xl font-extrabold tracking-tight">
              {tech.name}
            </Text>
            <Text className="num text-sm font-bold text-muted">{tech.id}</Text>
            <Text className="mt-1 text-sm font-medium text-muted">Appliance service technician · since {tech.joined}</Text>
          </View>
          <View className="flex-row border-t border-line">
            <View className="flex-1 p-3">
              <View className="flex-row items-center justify-center gap-1">
                <Text className="num text-lg font-extrabold">{tech.rating.toFixed(2)}</Text>
                <Icon as={Star} className="size-4 text-warning" fill={COLORS.warning} />
              </View>
              <Text className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">Rating</Text>
            </View>
            <View className="flex-1 border-l border-line p-3">
              <Text className="num text-center text-lg font-extrabold">{(tech.completedJobs + closedHere).toLocaleString('en-IN')}</Text>
              <Text className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">Jobs done</Text>
            </View>
            <View className="flex-1 border-l border-line p-3">
              <Text className="num text-center text-lg font-extrabold">{tech.experienceYears} yrs</Text>
              <Text className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">Experience</Text>
            </View>
          </View>
        </Card>

        <View>
          <SectionTitle>Availability & schedule</SectionTitle>
          <AvailabilitySummary />
        </View>

        <View>
          <SectionTitle>Contact & area</SectionTitle>
          <Card>
            <Row icon={Phone} label="Mobile" value={tech.phone} first />
            <Row icon={Mail} label="Email" value={tech.email} />
            <Row icon={MapPin} label="Service area" value={tech.area} />
            <Row icon={ShieldCheck} label="Base" value={tech.base} />
          </Card>
        </View>

        <View>
          <SectionTitle>Supported services</SectionTitle>
          <Card className="p-4">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">Brands</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {tech.brands.map((b) => (
                <View key={b} className="rounded-lg border border-line-strong px-3 py-1.5">
                  <Text className="text-sm font-extrabold">{BRAND_LABEL[b]}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-4 text-[11px] font-bold uppercase tracking-wider text-faint">Appliances</Text>
            <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
              {APPLIANCES.filter((a) => tech.appliances.includes(APPLIANCE_LABEL[a])).map((a) => (
                <View key={a} className="w-[48.5%] flex-row items-center gap-2 rounded-lg bg-canvas px-3 py-2">
                  <ApplianceGlyph appliance={a} className="size-4 text-brand" />
                  <Text className="shrink text-sm font-bold">{APPLIANCE_LABEL[a]}</Text>
                </View>
              ))}
            </View>
            <View className="mt-4 flex-row items-center gap-2 rounded-lg bg-brand-soft px-3 py-2">
              <Icon as={Award} className="size-4 text-brand" />
              <Text className="shrink text-xs font-bold text-brand">Inverter AC & front-load washer certified · valid till Mar 2027</Text>
            </View>
          </Card>
        </View>

        <PerformanceSection />
        <ReviewsSection />

        <Card>
          {(
            [
              ['/settings', 'Settings', Settings],
              ['/support', 'Help & Support', Headset],
            ] as [Href, string, LucideIcon][]
          ).map(([href, label, glyph], i) => (
            <Tappable
              key={label}
              href={href}
              className={cn('flex-row items-center gap-3 p-4 active:bg-canvas active:opacity-100', i > 0 && 'border-t border-line')}
            >
              <Icon as={glyph} className="size-5 text-ink-2" />
              <Text className="flex-1 text-sm font-extrabold">{label}</Text>
              <Icon as={ChevronRight} className="size-4 text-faint" />
            </Tappable>
          ))}
        </Card>
        <Tappable
          onPress={() => {
            setOnline(false)
            signOut()
            router.replace('/login')
          }}
          className="h-14 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-danger/30 bg-card active:bg-danger-soft active:opacity-100"
        >
          <Icon as={LogOut} className="size-5 text-danger" />
          <Text className="text-base font-extrabold text-danger">Logout</Text>
        </Tappable>
      </Page>
    </>
  )
}

function Row({ icon, label, value, first }: { icon: LucideIcon; label: string; value: string; first?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 p-4', !first && 'border-t border-line')}>
      <View className="size-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
        <Icon as={icon} className="size-4 text-ink-2" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</Text>
        <Text numberOfLines={1} className="num text-sm font-bold">
          {value}
        </Text>
      </View>
    </View>
  )
}
