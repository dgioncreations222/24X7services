import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useLocalSearchParams, type Href } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { ArrowUp, Camera, X } from 'lucide-react-native'
import { AiMark } from '@/components/ai/AiMark'
import { AnswerView } from '@/components/ai/AnswerView'
import { ApplianceGlyph, BrandTag } from '@/components/glyphs'
import { Icon, Page, ScreenHeader, Tappable, Text, inputClass } from '@/components/ui'
import { INTENT_LABEL, INTENT_TOPIC, answer, detectIntent, detectScope, greeting, inspectImage, type AiContext } from '@/lib/ai/engine'
import type { AiAnswer, AiMessage, AiThread, Intent } from '@/lib/ai/types'
import { APPLIANCES, APPLIANCE_LABEL, BRANDS, BRAND_LABEL, type Appliance } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { time } from '@/lib/format'
import { stepHref } from '@/lib/routes'
import { useJob, useStore } from '@/lib/store'
import { COLORS } from '@/lib/theme'

const QUICK: Intent[] = ['diagnose', 'error', 'troubleshoot', 'repair', 'parts', 'notes', 'explain']

/** Follow-up chips the answers offer, mapped back to quick actions. */
const PICK_INTENT: Record<string, Intent> = {
  'Troubleshooting steps': 'troubleshoot',
  'Repair steps': 'repair',
  'Required parts': 'parts',
  'Generate service notes': 'notes',
  'Explain to customer': 'explain',
}

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1)
/** The web's `animate-slide-up`, for each new message. */
const SLIDE_UP = FadeInDown.duration(280).easing(EASE.factory()).reduceMotion(ReduceMotion.System)

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Photos are kept on the device, so shrink them before they go in storage:
 * longest side 1280 px, JPEG at 0.82, as a data URL — the same thing the web
 * app's canvas produced.
 */
async function shrink(asset: ImagePicker.ImagePickerAsset, max = 1280): Promise<string> {
  let { width, height } = asset
  if (!width || !height) {
    const probe = await ImageManipulator.manipulate(asset.uri).renderAsync()
    width = probe.width
    height = probe.height
  }
  const k = Math.min(1, max / Math.max(width, height))
  const ctx = ImageManipulator.manipulate(asset.uri)
  if (k < 1) ctx.resize({ width: Math.round(width * k), height: Math.round(height * k) })
  const image = await ctx.renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true })
  if (!saved.base64) throw new Error('no image data')
  return `data:image/jpeg;base64,${saved.base64}`
}

/**
 * The web's `capture="environment"` input: straight to the back camera, or
 * the photo library where there is no camera (or no permission for one).
 */
async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 }
  let result: ImagePicker.ImagePickerResult
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    result = perm.granted ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
  } catch {
    result = await ImagePicker.launchImageLibraryAsync(options)
  }
  return result.canceled ? null : (result.assets[0] ?? null)
}

export default function AiChatScreen() {
  const params = useLocalSearchParams<{ id?: string; t?: string; q?: string }>()
  const job = useJob(params.id ?? null)
  const store = useStore()
  const threadParam = params.t ?? null
  const startIntent = (params.q ?? null) as Intent | null
  const insets = useSafeAreaInsets()

  const existing = useMemo(() => (threadParam ? store.aiThreads.find((t) => t.id === threadParam) : undefined), [threadParam, store.aiThreads])
  const [pick, setPick] = useState<{ brand?: AiContext['brand']; appliance?: Appliance }>({})
  const ctx: AiContext = job
    ? { brand: job.brand, appliance: job.appliance, issue: job.issue, model: job.model, diagnosis: job.diagnosis }
    : { brand: pick.brand, appliance: pick.appliance }

  const [thread, setThread] = useState<AiThread>(() => {
    if (existing) return existing
    const at = new Date().toISOString()
    const messages: AiMessage[] = [{ id: uid(), role: 'ai', at, answer: greeting(ctx) }]
    // Opened from a job's "Find parts" or "Service notes" shortcut: answer
    // that straight away.
    const start = startIntent && QUICK.includes(startIntent) ? startIntent : null
    if (start) {
      messages.push(
        { id: uid(), role: 'tech', at, text: INTENT_LABEL[start], intent: start },
        { id: uid(), role: 'ai', at, intent: start, answer: answer(ctx, { intent: start }) }
      )
    }
    return { id: uid(), jobId: job?.id, title: start ? INTENT_TOPIC[start] : 'New conversation', startedAt: at, updatedAt: at, messages }
  })
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [savedNotes, setSavedNotes] = useState<Set<string>>(new Set())
  const scrollRef = useRef<ScrollView>(null)

  const push = (msgs: AiMessage[], title?: string) =>
    setThread((t) => ({ ...t, messages: [...t.messages, ...msgs], updatedAt: new Date().toISOString(), title: t.title === 'New conversation' && title ? title : t.title }))

  // Save under the job as it grows. Only conversations that went past the
  // greeting are worth keeping.
  // The store hands out new functions on every change, so reach the latest
  // one through a ref — depending on it directly would save in a loop.
  const saveRef = useRef(store.saveThread)
  useEffect(() => {
    saveRef.current = store.saveThread
  })
  useEffect(() => {
    if (thread.messages.some((m) => m.role === 'tech')) saveRef.current(thread)
  }, [thread])

  const reply = (produce: () => AiAnswer | Promise<AiAnswer>, intent?: Intent) => {
    setThinking(true)
    // A beat of "thinking" reads better than an instant wall of text.
    setTimeout(async () => {
      let a: AiAnswer
      try {
        a = await produce()
      } catch {
        a = { lead: 'Something went wrong reading that. Please try again.', sections: [] }
      }
      setThinking(false)
      push([{ id: uid(), role: 'ai', at: new Date().toISOString(), intent, answer: a }])
    }, 650)
  }

  const run = (intent: Intent, label = INTENT_LABEL[intent]) => {
    push([{ id: uid(), role: 'tech', at: new Date().toISOString(), text: label, intent }], INTENT_TOPIC[intent])
    reply(() => answer(ctx, { intent }), intent)
  }

  const send = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    setText('')
    // In a general chat the first message may name the appliance itself.
    let c = ctx
    if (!job) {
      const found = detectScope(t)
      if (found.appliance || found.brand) {
        const next = { brand: found.brand ?? pick.brand, appliance: found.appliance ?? pick.appliance }
        setPick(next)
        c = { ...ctx, ...next }
      }
    }
    const intent = detectIntent(t)
    push([{ id: uid(), role: 'tech', at: new Date().toISOString(), text: t }], intent ? INTENT_TOPIC[intent] : t.slice(0, 40))
    reply(() => answer(c, { text: t, intent: intent === 'error' ? 'error' : undefined }), intent)
  }

  const onPick = (s: string) => {
    const appliance = APPLIANCES.find((a) => APPLIANCE_LABEL[a] === s)
    if (!job && appliance) {
      setPick((p) => ({ ...p, appliance }))
      push([{ id: uid(), role: 'tech', at: new Date().toISOString(), text: s }], `${APPLIANCE_LABEL[appliance]} help`)
      reply(() => ({ lead: `Got it — ${APPLIANCE_LABEL[appliance]}. Which brand, and what’s the problem? You can also use the quick actions below.`, sections: [], suggestions: BRANDS.map((b) => BRAND_LABEL[b]) }))
      return
    }
    const brand = BRANDS.find((b) => BRAND_LABEL[b] === s)
    if (!job && brand) {
      setPick((p) => ({ ...p, brand }))
      push([{ id: uid(), role: 'tech', at: new Date().toISOString(), text: s }])
      reply(() => ({ lead: `${BRAND_LABEL[brand]} ${pick.appliance ? APPLIANCE_LABEL[pick.appliance] : ''} — describe the symptom or pick a quick action.`, sections: [] }))
      return
    }
    const intent = PICK_INTENT[s]
    if (intent) return run(intent, s)
    // Error codes from the "which code?" list.
    const last = [...thread.messages].reverse().find((m) => m.role === 'ai')
    if (last?.intent === 'error') {
      push([{ id: uid(), role: 'tech', at: new Date().toISOString(), text: s, intent: 'error' }])
      return reply(() => answer(ctx, { text: s, intent: 'error' }), 'error')
    }
    send(s)
  }

  const onPhoto = async () => {
    let asset: ImagePicker.ImagePickerAsset | null
    try {
      asset = await takePhoto()
    } catch {
      asset = null
    }
    if (!asset) return
    try {
      const url = await shrink(asset)
      push([{ id: uid(), role: 'tech', at: new Date().toISOString(), image: { url, name: asset.fileName ?? 'photo.jpg' } }], 'Photo check')
      reply(() => inspectImage(url))
    } catch {
      push([{ id: uid(), role: 'ai', at: new Date().toISOString(), answer: { lead: 'That file could not be opened as a photo.', sections: [] } }])
    }
  }

  // Keep the newest message in view: on a new message, the thinking dots,
  // and when the keyboard shrinks the list.
  const toEnd = () => scrollRef.current?.scrollToEnd({ animated: true })
  useEffect(() => {
    const t = setTimeout(toEnd, 60)
    return () => clearTimeout(t)
  }, [thread.messages.length, thinking])

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas">
      <ScreenHeader back={job ? stepHref('detail', job.id) : ('/ai' as Href)} title="AI Technician Assistant" subtitle="Technical support, round the clock" />

      {/* Job context, so the technician never has to retype it. */}
      <View className="z-20 flex-row items-center gap-3 border-b border-line bg-canvas px-4 py-2.5">
        {ctx.appliance ? (
          <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
            <ApplianceGlyph appliance={ctx.appliance} className="size-6 text-brand" />
          </View>
        ) : (
          <AiMark size={40} />
        )}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {ctx.brand ? <BrandTag brand={ctx.brand} /> : null}
            <Text numberOfLines={1} className="min-w-0 shrink text-[13.5px] font-extrabold">
              {ctx.appliance ? APPLIANCE_LABEL[ctx.appliance] : 'General assistance'}
            </Text>
          </View>
          <Text numberOfLines={1} className="text-xs font-semibold text-muted">
            {job ? `${job.issue} · ${job.id}` : ctx.appliance ? 'No job linked — describe the symptom' : 'No job linked — pick an appliance'}
          </Text>
        </View>
      </View>

      <Page scrollRef={scrollRef} className="gap-4" contentContainerStyle={{ paddingBottom: 16 }} onContentSizeChange={toEnd}>
        {thread.messages.map((m) =>
          m.role === 'ai' ? (
            <Animated.View key={m.id} entering={SLIDE_UP} className="flex-row gap-2.5">
              <AiMark size={28} className="mt-0.5" />
              <View className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-card p-3.5 shadow-card">
                {m.answer ? (
                  <AnswerView
                    answer={m.answer}
                    onPick={onPick}
                    notesSaved={savedNotes.has(m.id)}
                    onSaveNotes={
                      job
                        ? (n) => {
                            store.saveServiceNotes(job.id, n)
                            setSavedNotes((s) => new Set(s).add(m.id))
                          }
                        : undefined
                    }
                  />
                ) : null}
                <Text className="num mt-2 text-[10.5px] font-semibold text-faint">{time(m.at)}</Text>
              </View>
            </Animated.View>
          ) : (
            <Animated.View key={m.id} entering={SLIDE_UP} className="flex-row justify-end">
              <View className="max-w-[82%]">
                {m.image ? (
                  <Photo url={m.image.url} />
                ) : (
                  <View className={cn('rounded-2xl rounded-br-md px-3.5 py-2.5', m.intent ? 'bg-brand-ink' : 'bg-brand')}>
                    <Text className="text-[14px] font-semibold text-white">{m.text}</Text>
                  </View>
                )}
                <Text className="num mt-1 text-right text-[10.5px] font-semibold text-faint">{time(m.at)}</Text>
              </View>
            </Animated.View>
          )
        )}
        {thinking && (
          <View className="flex-row gap-2.5">
            <AiMark size={28} />
            <View
              accessible
              accessibilityLabel="Assistant is thinking"
              accessibilityLiveRegion="polite"
              className="flex-row items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3.5"
            >
              {[0, 1, 2].map((i) => (
                <TypingDot key={i} delay={i * 150} />
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* Quick actions + composer, pinned to the foot of the screen. */}
      <View className="border-t border-line bg-card" style={{ paddingBottom: insets.bottom }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-2 px-4 pb-1 pt-2.5">
          {QUICK.map((q) => (
            <Tappable
              key={q}
              disabled={thinking}
              onPress={() => run(q)}
              className={cn('h-9 shrink-0 justify-center rounded-pill border border-line-strong bg-card px-3.5 active:border-brand active:opacity-100', thinking && 'opacity-50')}
            >
              {({ pressed }) => <Text className={cn('text-[12.5px] font-bold', pressed ? 'text-brand' : 'text-ink-2')}>{INTENT_LABEL[q]}</Text>}
            </Tappable>
          ))}
        </ScrollView>
        <View className="flex-row items-end gap-2 px-4 pb-3 pt-1.5">
          <Tappable
            onPress={() => void onPhoto()}
            accessibilityLabel="Attach a photo"
            className="size-11 shrink-0 items-center justify-center rounded-xl border border-line-strong active:border-brand active:opacity-100"
          >
            {({ pressed }) => <Icon as={Camera} className={cn('size-5', pressed ? 'text-brand' : 'text-ink-2')} />}
          </Tappable>
          <View className="relative min-w-0 flex-1">
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              // Return sends, as Enter did on the web; there is no Shift on a
              // phone keyboard, and questions here are one line.
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!thinking) send(text)
              }}
              onFocus={() => setTimeout(toEnd, 250)}
              placeholder={ctx.appliance ? 'Ask a question…' : 'Appliance and problem…'}
              placeholderTextColor={COLORS.faint}
              textAlignVertical="center"
              className={cn(inputClass, 'max-h-32 min-h-11 py-2.5 pr-9 text-[15px]')}
            />
            {text ? (
              <Tappable onPress={() => setText('')} accessibilityLabel="Clear" hitSlop={6} className="absolute right-2 top-2.5 size-6 items-center justify-center rounded-full">
                <Icon as={X} className="size-4 text-faint" />
              </Tappable>
            ) : null}
          </View>
          <Tappable
            onPress={() => {
              if (!thinking) send(text)
            }}
            disabled={!text.trim() || thinking}
            accessibilityLabel="Send"
            className={cn('size-11 shrink-0 items-center justify-center rounded-xl', !text.trim() || thinking ? 'bg-line-strong' : 'bg-brand')}
          >
            <Icon as={ArrowUp} className="size-5 text-white" />
          </Tappable>
        </View>
        <Text className="px-4 pb-2 text-center text-[10.5px] font-medium text-faint">AI guidance — confirm with your own checks.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

/** An attached photo, at its own shape, no taller than the web's 240 px. */
function Photo({ url }: { url: string }) {
  const [ratio, setRatio] = useState(4 / 3)
  const h = Math.min(240, 240 / ratio)
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel="Uploaded appliance photo"
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source
        if (width && height) setRatio(width / height)
      }}
      className="self-end rounded-2xl rounded-br-md border border-line"
      style={{ width: h * ratio, height: h }}
    />
  )
}

/** One of the web's `animate-typing` dots: brighten and lift, then rest. */
function TypingDot({ delay }: { delay: number }) {
  const p = useSharedValue(0)
  useEffect(() => {
    const ease = { easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }
    p.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 440, ...ease }), withTiming(0, { duration: 440, ...ease }), withTiming(0, { duration: 220 })), -1),
      ReduceMotion.System
    )
    return () => cancelAnimation(p)
  }, [p, delay])
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * p.value, transform: [{ translateY: -2 * p.value }] }))
  return <Animated.View className="size-1.5 rounded-full bg-muted" style={style} />
}
