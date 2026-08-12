import type { PhotoAsset } from '../../domain/content'

const aligns = ['start', 'end', 'center'] as const

export function getPhotoLayout(photo: PhotoAsset, index: number) {
  const ratio = photo.width / photo.height
  const orientation = ratio >= 1.2 ? 'landscape' : ratio <= 0.8 ? 'portrait' : 'detail'

  return { orientation, align: aligns[index % aligns.length] }
}
