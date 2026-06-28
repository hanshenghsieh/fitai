import { Camera, CameraErrorCode, type MediaResult } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
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

export function isCapacitorCameraUsable(): boolean {
  return isNativeIOS() && Capacitor.isPluginAvailable('Camera')
}

function mapError(error: unknown): NativePhotoFailure {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : ''
  if (
    code === CameraErrorCode.TakePhotoCancelled ||
    code === CameraErrorCode.ChooseMediaCancelled ||
    code === CameraErrorCode.EditPhotoCancelled
  ) {
    return 'cancelled'
  }
  if (
    code === CameraErrorCode.CameraPermissionDenied ||
    code === CameraErrorCode.GalleryPermissionDenied
  ) {
    return 'denied'
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/cancel/i.test(message)) return 'cancelled'
  return 'unavailable'
}

async function mediaResultToFile(result: MediaResult, namePrefix: string): Promise<File | null> {
  const src = result.webPath ?? (result.uri ? Capacitor.convertFileSrc(result.uri) : undefined)
  if (src) {
    try {
      const res = await fetch(src)
      if (res.ok) {
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpeg'
        return new File([blob], `${namePrefix}-${Date.now()}.${ext}`, {
          type: blob.type || 'image/jpeg',
        })
      }
    } catch {
      /* try thumbnail below */
    }
  }

  if (result.thumbnail) {
    return dataUrlToFile(`data:image/jpeg;base64,${result.thumbnail}`, `${namePrefix}-${Date.now()}.jpeg`)
  }

  return null
}

export async function captureFoodPhotoFromCamera(): Promise<NativePhotoResult> {
  if (!isCapacitorCameraUsable()) return { ok: false, reason: 'unavailable' }
  try {
    const result = await Camera.takePhoto({
      quality: 90,
      correctOrientation: true,
      presentationStyle: 'fullscreen',
      editable: 'no',
    })
    const file = await mediaResultToFile(result, 'food')
    if (!file) return { ok: false, reason: 'unavailable' }
    return { ok: true, file }
  } catch (error) {
    return { ok: false, reason: mapError(error) }
  }
}

export async function pickFoodPhotoFromGallery(): Promise<NativePhotoResult> {
  if (!isCapacitorCameraUsable()) return { ok: false, reason: 'unavailable' }
  try {
    const { results } = await Camera.chooseFromGallery({
      quality: 90,
      allowMultipleSelection: false,
      presentationStyle: 'fullscreen',
      editable: 'no',
    })
    const first = results[0]
    if (!first) return { ok: false, reason: 'cancelled' }
    const file = await mediaResultToFile(first, 'food')
    if (!file) return { ok: false, reason: 'unavailable' }
    return { ok: true, file }
  } catch (error) {
    return { ok: false, reason: mapError(error) }
  }
}
