import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativeIOS } from '@/lib/capacitor-native'

export type NativePhotoFailure = 'denied' | 'cancelled' | 'unavailable'

export type NativePhotoResult =
  | { ok: true; file: File }
  | { ok: false; reason: NativePhotoFailure }

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

function isUserCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /cancel/i.test(message) || /User cancelled photos app/i.test(message)
}

async function ensurePermission(kind: 'camera' | 'photos'): Promise<NativePhotoFailure | null> {
  const current = await Camera.checkPermissions()
  if (kind === 'camera') {
    if (current.camera === 'granted') return null
    const next = await Camera.requestPermissions({ permissions: ['camera'] })
    return next.camera === 'granted' ? null : 'denied'
  }
  if (current.photos === 'granted' || current.photos === 'limited') return null
  const next = await Camera.requestPermissions({ permissions: ['photos'] })
  return next.photos === 'granted' || next.photos === 'limited' ? null : 'denied'
}

async function photoToFile(source: CameraSource): Promise<NativePhotoResult> {
  const permissionKind = source === CameraSource.Camera ? 'camera' : 'photos'
  try {
    const denied = await ensurePermission(permissionKind)
    if (denied) return { ok: false, reason: denied }

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
    })
    if (!photo.dataUrl) return { ok: false, reason: 'unavailable' }
    const ext = photo.format === 'png' ? 'png' : 'jpeg'
    return { ok: true, file: dataUrlToFile(photo.dataUrl, `food-${Date.now()}.${ext}`) }
  } catch (error) {
    if (isUserCancelled(error)) return { ok: false, reason: 'cancelled' }
    return { ok: false, reason: 'unavailable' }
  }
}

export async function captureFoodPhotoFromCamera(): Promise<NativePhotoResult> {
  if (!isNativeIOS()) return { ok: false, reason: 'unavailable' }
  return photoToFile(CameraSource.Camera)
}

export async function pickFoodPhotoFromGallery(): Promise<NativePhotoResult> {
  if (!isNativeIOS()) return { ok: false, reason: 'unavailable' }
  return photoToFile(CameraSource.Photos)
}
