import { Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { cn } from '@/lib/cn'
import { COLORS } from '@/lib/theme'
import { Text } from '../base/Text'

export function Avatar({ name, photo, size = 44, className }: { name: string; photo?: string; size?: number; className?: string }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return photo ? (
    <Image
      source={{ uri: photo }}
      accessibilityIgnoresInvertColors
      className={cn('shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <LinearGradient
      colors={[COLORS.brandBright, COLORS.brandNight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={cn('shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text importantForAccessibility="no" className="font-extrabold text-white" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {letters}
      </Text>
    </LinearGradient>
  )
}
