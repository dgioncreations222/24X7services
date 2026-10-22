import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import { Platform, Vibration } from 'react-native'
import { NOTES } from './chimeNotes'

/**
 * The same two-note alert as the web app, with a buzz alongside it. The notes
 * are synthesised into a small WAV the first time they are needed and kept in
 * the cache, so the app ships no audio file. Any failure is silent: the
 * visual alert still shows.
 */
export function chime(urgent = false) {
  // On Android every expo-audio player opens a media session, and the system
  // keeps an "Unknown song" player card in the shade even after it is
  // released. So Android gets a longer buzz instead; the real offer sound
  // will come from the push notification's channel.
  if (Platform.OS === 'android') {
    Vibration.vibrate(urgent ? [0, 400, 150, 400, 150, 400] : [0, 250, 120, 250])
    return
  }
  void Haptics.notificationAsync(
    urgent ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
  ).catch(() => undefined)
  try {
    const player = createAudioPlayer({ uri: fileFor(urgent) })
    player.play()
    // A player that stays alive keeps an Android media session, which shows
    // as a music player in the notification shade. Drop it once it is done.
    setTimeout(() => release(player), RELEASE_MS)
  } catch {
    /* no audio on this device */
  }
}

/** Both chimes end well inside this. */
const RELEASE_MS = 1500

function release(player: AudioPlayer) {
  try {
    player.clearLockScreenControls()
    player.remove()
  } catch {
    /* already gone */
  }
}

function fileFor(urgent: boolean): string {
  const key = urgent ? 'urgent' : 'normal'
  const file = new File(Paths.cache, `chime-${key}.wav`)
  if (!file.exists) {
    file.create({ overwrite: true })
    file.write(wav(NOTES[key]))
  }
  return file.uri
}

/** 16-bit mono PCM: each note 170 ms on a 180 ms step, with the web's envelope. */
function wav(notes: number[]): Uint8Array {
  const rate = 22050
  const step = Math.round(rate * 0.18)
  const samples = step * notes.length + Math.round(rate * 0.05)
  const out = new Uint8Array(44 + samples * 2)
  const view = new DataView(out.buffer)
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, samples * 2, true)
  notes.forEach((f, n) => {
    for (let i = 0; i < Math.round(rate * 0.17); i++) {
      const t = i / rate
      // Up to 0.25 in 20 ms, then down again by 160 ms — exponential, as on the web.
      const env = t < 0.02 ? 0.0001 * Math.pow(2500, t / 0.02) : 0.25 * Math.pow(0.0004, (t - 0.02) / 0.14)
      const v = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * f * t) * Math.min(env, 0.25)))
      view.setInt16(44 + (n * step + i) * 2, v * 32767, true)
    }
  })
  return out
}
