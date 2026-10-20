import { useState } from 'react'
import { Linking, View } from 'react-native'
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Send,
} from 'lucide-react-native'
import { BottomSheet } from '@/components/ui/Overlay'
import { useToast } from '@/components/Toast'
import { copyText, shareText } from '@/lib/share'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Img } from '@/components/ui/Img'
import { Tappable } from '@/components/ui/Tappable'
import { Text } from '@/components/ui/Text'

/**
 * Sharing a page, in the app's own panel rather than the system's.
 *
 * The system share dialog looks different on every phone and none of it is
 * ours to style. This is the same everywhere: the link as a card at the top
 * with a copy button, then the places people actually send a link to, each a
 * link that opens that app with the message filled in, and "More" for the
 * system dialog.
 *
 * Nothing is sent from here; every target opens somewhere the customer then
 * presses send themselves.
 */
export function ShareSheet({
  open,
  onClose,
  title,
  text,
  url,
  image,
}: {
  open: boolean
  onClose: () => void
  /** What is being shared: "Washing Machine". */
  title: string
  /** The line that goes with the link. */
  text: string
  url: string
  /** A picture for the preview card. */
  image?: string
}) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const message = `${text} ${url}`

  async function copy(): Promise<void> {
    const outcome = await copyText(url)
    if (outcome === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.show('We could not copy that.', { tone: 'error' })
    }
  }

  async function more(): Promise<void> {
    const outcome = await shareText(text, title, url)
    // Closed without sharing, or refused; the panel stays open.
    if (outcome === 'shared') onClose()
  }

  function go(href: string): void {
    onClose()
    Linking.openURL(href).catch(() => {
      toast.show('We could not open that app.', { tone: 'error' })
    })
  }

  const targets: readonly {
    key: string
    label: string
    href: string
    tint: string
    icon: React.ReactNode
  }[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
      tint: 'bg-whatsapp',
      icon: <Icon as={MessageCircle} className="size-6 text-white" />,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      tint: 'bg-facebook',
      icon: <Text className="text-2xl leading-[28px] font-bold text-white">f</Text>,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      // Ringed, so the black disc still reads on the dark theme's ground.
      tint: 'bg-night border border-white/20',
      icon: <Text className="text-xl leading-[24px] font-bold text-white">𝕏</Text>,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      tint: 'bg-telegram',
      icon: <Icon as={Send} className="size-5 text-white" />,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`,
      tint: 'bg-gmail',
      icon: <Icon as={Mail} className="size-5 text-white" />,
    },
    {
      key: 'sms',
      label: 'Messages',
      href: `sms:?&body=${encodeURIComponent(message)}`,
      tint: 'bg-success',
      icon: <Icon as={MessageSquare} className="size-5 text-white" />,
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Share">
      {/* The link, as the person receiving it will see it. */}
      <View className="flex-row items-center gap-3 rounded-card border border-border p-3">
        {image ? (
          <View className="size-14 shrink-0 overflow-hidden rounded-md bg-plate">
            <Img src={image} alt="" className="absolute inset-0" />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-semibold text-ink">
            {title}
          </Text>
          <Text numberOfLines={1} className="text-sm text-muted">
            {url.replace(/^https?:\/\//, '')}
          </Text>
        </View>
        <Tappable
          onPress={() => void copy()}
          className={cn(
            'h-10 shrink-0 flex-row items-center gap-1.5 rounded-pill border px-4',
            copied ? 'border-success bg-success-soft' : 'border-border active:border-brand'
          )}
        >
          <Icon
            as={copied ? Check : Copy}
            className={cn('size-4', copied ? 'text-success' : 'text-brand')}
          />
          <Text className={cn('text-sm font-semibold', copied ? 'text-success' : 'text-brand')}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Tappable>
      </View>

      <Text className="mt-6 text-sm font-semibold text-muted">Share via</Text>
      <View className="mt-4 flex-row flex-wrap gap-y-5">
        {targets.map((target) => (
          <Tappable
            key={target.key}
            accessibilityRole="link"
            accessibilityLabel={target.label}
            onPress={() => go(target.href)}
            className="w-1/4 items-center gap-2 active:opacity-100"
          >
            {({ pressed }) => (
              <>
                <View
                  className={cn(
                    'size-14 items-center justify-center rounded-full',
                    target.tint,
                    pressed && 'scale-95'
                  )}
                >
                  {target.icon}
                </View>
                <Text className="text-center text-xs text-ink">{target.label}</Text>
              </>
            )}
          </Tappable>
        ))}
        <Tappable
          onPress={() => void more()}
          className="w-1/4 items-center gap-2 active:opacity-100"
        >
          {({ pressed }) => (
            <>
              <View
                className={cn(
                  'size-14 items-center justify-center rounded-full bg-surface',
                  pressed && 'scale-95'
                )}
              >
                <Icon as={MoreHorizontal} className="size-6 text-ink" />
              </View>
              <Text className="text-center text-xs text-ink">More</Text>
            </>
          )}
        </Tappable>
      </View>
    </BottomSheet>
  )
}
