import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativeIOS } from '@/lib/capacitor-native'

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

async function photoToFile(source: CameraSource): Promise<File | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
    })
    if (!photo.dataUrl) return null
    const ext = photo.format === 'png' ? 'png' : 'jpeg'
    return dataUrlToFile(photo.dataUrl, `food-${Date.now()}.${ext}`)
  } catch {
    return null
  }
}

export async function captureFoodPhotoFromCamera(): Promise<File | null> {
  if (!isNativeIOS()) return null
  return photoToFile(CameraSource.Camera)
}

export async function pickFoodPhotoFromGallery(): Promise<File | null> {
  if (!isNativeIOS()) return null
  return photoToFile(CameraSource.Photos)
}
