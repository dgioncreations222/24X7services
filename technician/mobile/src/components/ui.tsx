/**
 * The technician app's kit — the native counterpart of technician/components/
 * ui.tsx, with the same names and props so screens port line for line.
 * Differences from the web: `onClick` is `onPress`, a box's text classes reach
 * the Text and Icons inside it through <Inherit>, and the page frame
 * (ScreenHeader, Page, ActionDock) owns the safe areas.
 */
// The kit lives in ./ui/, one family per file; this file re-exports it so
// every `@/components/ui` import keeps working.

export { Icon, useColor } from './base/Icon'
export { Tappable } from './base/Tappable'
export { Inherit, Text } from './base/Text'
export { Avatar } from './ui/Avatar'
export { Blink } from './ui/Blink'
export { Button, Labelled, type ButtonProps } from './ui/Button'
export { Card, Label, SectionTitle } from './ui/Card'
export { Chip, FilterChip, PriorityBadge, StatusChip, toneRail, toneText } from './ui/Chip'
export { Empty } from './ui/Empty'
export { EmptyState } from './ui/EmptyState'
export { ErrorState } from './ui/ErrorState'
export { Skeleton, SkeletonCard, SkeletonList } from './ui/Skeleton'
export { Field, Segmented, Toggle, inputClass } from './ui/Field'
export { ActionDock, InTabs, Page, ScreenHeader } from './ui/Screen'
export { Sheet } from './ui/Sheet'
export { ChoiceChips } from './ui/ChoiceChips'
export { TextField } from './ui/TextField'
