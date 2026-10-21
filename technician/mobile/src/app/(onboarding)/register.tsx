import { useState } from 'react'
import { ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { Async } from '@/components/ui/Async'
import { Button, ChoiceChips, SkeletonCard, Text, TextField } from '@/components/ui'
import { register, signOut, useCategories, useCities, useSession } from '@/lib/data'
import { useT } from '@/lib/i18n'
import { COLORS } from '@/lib/theme'

const EXPERIENCE = [
  { value: '0', label: 'Under 1 year' },
  { value: '1', label: '1–3 years' },
  { value: '3', label: '3–5 years' },
  { value: '5', label: '5+ years' },
] as const

/** Step 1 of 3: who you are, where you work and what you repair. */
export default function RegisterScreen() {
  const t = useT()
  const session = useSession()
  const cities = useCities()
  const categories = useCategories()
  const [name, setName] = useState(session.name ?? '')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [experience, setExperience] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = name.trim().length > 1 && phone.replace(/\D/g, '').length === 10 && city.length && skills.length && experience.length

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await register({ name, phone, city: city[0]!, skills, experienceYears: Number(experience[0]) })
      router.replace('/kyc')
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? e.message : t('Couldn’t save. Check your internet and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title={t('Tell us about you')}
      subtitle={session.email}
      step={{ at: 1, of: 3 }}
      footer={
        <Button size="lg" disabled={!ready || busy} onPress={submit} className="w-full">
          {busy ? <ActivityIndicator color={COLORS.white} /> : null}
          {t('Continue to documents')}
        </Button>
      }
    >
      <TextField label={t('Full name')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder={t('As on your Aadhaar')} />
      <TextField
        label={t('Mobile number')}
        prefix="+91"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="98765 43210"
        maxLength={10}
      />
      <Async query={cities} loading={<SkeletonCard />}>
        {(list) => <ChoiceChips label={t('City')} options={list.map((c) => ({ value: c, label: c }))} value={city} onChange={setCity} />}
      </Async>
      <Async query={categories} loading={<SkeletonCard />}>
        {(list) => <ChoiceChips label={t('Services you do')} multiple options={list.map((c) => ({ value: c.id, label: c.name }))} value={skills} onChange={setSkills} />}
      </Async>
      <ChoiceChips label={t('Experience')} options={EXPERIENCE.map((e) => ({ value: e.value, label: t(e.label) }))} value={experience} onChange={setExperience} />
      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm font-semibold text-danger">
          {error}
        </Text>
      ) : null}
      <Button variant="ghost" onPress={() => void signOut()} className="self-center">
        {t('Use a different account')}
      </Button>
    </AuthFrame>
  )
}
