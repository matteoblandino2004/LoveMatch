import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNative } from './native'
import { MAX_PHOTOS } from './photos'

/**
 * On the phone, go straight to the real iOS photo sheet — Photos library or
 * camera — instead of the browser's file input. Returns files the normal
 * pipeline can process, or null when this isn't the native app.
 */
export async function pickNativePhotos(remaining: number): Promise<File[] | null> {
  if (!isNative()) return null
  const limit = Math.max(1, Math.min(remaining, MAX_PHOTOS))
  try {
    const result = await Camera.pickImages({ quality: 90, limit })
    const files: File[] = []
    for (const photo of result.photos) {
      const src = photo.webPath ?? photo.path
      if (!src) continue
      const response = await fetch(src)
      const blob = await response.blob()
      files.push(new File([blob], `photo.${photo.format || 'jpg'}`, { type: blob.type || 'image/jpeg' }))
    }
    return files
  } catch {
    // The person cancelled, or the picker isn't available on this device.
    return []
  }
}

/** Take a new photo with the camera. Native only. */
export async function takeNativePhoto(): Promise<File | null> {
  if (!isNative()) return null
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      allowEditing: false,
    })
    const src = photo.webPath ?? photo.path
    if (!src) return null
    const blob = await (await fetch(src)).blob()
    return new File([blob], `photo.${photo.format || 'jpg'}`, { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}
