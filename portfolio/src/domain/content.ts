export type PublishStatus = 'draft' | 'published' | 'hidden'
export type VideoCategory = 'people' | 'brand' | 'event' | 'social'
export type CoverOrientation = 'portrait' | 'landscape'
export type PhotoCategory = 'people-car' | 'space' | 'event' | 'motion' | 'product'
export type AigcMediaType = 'image' | 'video'

export interface VideoWork {
  id: string
  slug: string
  title: string
  category: VideoCategory
  horizontalCoverUrl: string
  verticalCoverUrl: string
  coverOrientation: CoverOrientation
  videoUrl: string
  roles: string[]
  year: number
  platform?: string
  summary: string
  description: string
  metrics?: string
  featured: boolean
  sortOrder: number
  status: PublishStatus
  updatedAt: string
}

export interface PhotoAsset {
  id: string
  url: string
  alt: string
  width: number
  height: number
}

export interface PhotoSeries {
  id: string
  slug: string
  title: string
  category: PhotoCategory
  coverUrl: string
  shotAt: string
  intro: string
  photos: PhotoAsset[]
  featured: boolean
  sortOrder: number
  status: PublishStatus
  updatedAt: string
}

export interface LiveWork {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  roles: string[]
  heldAt: string
  coverUrl: string
  screenshots: PhotoAsset[]
  featured: boolean
  sortOrder: number
  status: PublishStatus
  updatedAt: string
}

export interface AigcWork {
  id: string
  slug: string
  title: string
  mediaType: 'image' | 'video'
  mediaUrl: string
  coverUrl: string
  summary: string
  year: number
  featured: boolean
  sortOrder: number
  status: PublishStatus
  updatedAt: string
}

export interface SiteProfile {
  id: 'main'
  name: string
  role: string
  statement: string
  intro: string
  portraitUrl: string
  experience: string[]
  capabilities: string[]
  resumeUrl: string
  email: string
  wechatQrUrl: string
  socialLinks: Array<{ label: string; url: string }>
  status: PublishStatus
  updatedAt: string
}
