import { App } from '@capacitor/app'
import { isNativeIOS } from '@/lib/capacitor-native'

export interface NativeAppInfo {
  version: string
  build: string
}

/**
 * Single wrapper around Capacitor's App.getInfo() — the real installed
 * native version/build, as opposed to package.json's version field (which
 * is a separate, build-time-only number that had drifted to "0.1.0" while
 * the real shipped app was 1.0.1 build 39; see AboutBetterBitView.tsx and
 * use-app-update-check.ts, the two consumers of this helper).
 *
 * Returns null on web (no native runtime to ask) or if the native call
 * fails for any reason — callers are expected to fall back to their own
 * existing version source in that case, never to throw or block on this.
 */
export async function getNativeAppInfo(): Promise<NativeAppInfo | null> {
  if (!isNativeIOS()) return null
  try {
    const info = await App.getInfo()
    return { version: info.version, build: info.build }
  } catch {
    return null
  }
}
