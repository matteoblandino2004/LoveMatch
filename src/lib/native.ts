import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'

export const isNative = (): boolean => Capacitor.isNativePlatform()

/** Set up the native chrome. Safe to call on the web, where it does nothing. */
export async function initNative(onResume?: () => void): Promise<void> {
  if (!isNative()) return
  try {
    // Light glyphs, because the app is dark everywhere.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#100810' })
  } catch {
    // Older iOS versions or a simulator without the bridge — not worth failing over.
  }
  if (onResume) {
    App.addListener('resume', onResume).catch(() => {})
  }
}

type Feel = 'swipe' | 'button' | 'match'

/** A small physical response to a swipe. Silent on the web. */
export function haptic(feel: Feel): void {
  if (!isNative()) return
  const run = async () => {
    if (feel === 'match') {
      await Haptics.notification({ type: NotificationType.Success })
    } else {
      await Haptics.impact({ style: feel === 'swipe' ? ImpactStyle.Medium : ImpactStyle.Light })
    }
  }
  run().catch(() => {})
}
