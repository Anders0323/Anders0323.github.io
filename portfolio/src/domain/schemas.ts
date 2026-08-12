import { z } from 'zod'

export const VIDEO_CATEGORIES = ['people', 'brand', 'event', 'social'] as const
export const PHOTO_CATEGORIES = ['people-car', 'space', 'event', 'motion', 'product'] as const
export const publishStatusSchema = z.enum(['draft', 'published', 'hidden'])
const privateStatusSchema = z.enum(['draft', 'hidden'])
const PUBLIC_MEDIA_URL_MESSAGE = '媒体地址必须是 HTTPS 公共地址或 /media/ 站内路径。'

export const publicMediaUrlSchema = z.string().refine((value) => {
  if (/^\/media\/[^\s]+$/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}, PUBLIC_MEDIA_URL_MESSAGE)

const draftMediaUrlSchema = z.union([z.literal(''), publicMediaUrlSchema])
const identityFields = {
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  featured: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
}

export const photoAssetSchema = z.object({
  id: z.string().min(1),
  url: publicMediaUrlSchema,
  alt: z.string().min(2),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const adminDraftPhotoAssetSchema = z.object({
  id: z.string().min(1),
  url: draftMediaUrlSchema,
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const videoWorkSchema = z.object({
  ...identityFields,
  title: z.string().min(1).max(80),
  category: z.enum(VIDEO_CATEGORIES),
  horizontalCoverUrl: draftMediaUrlSchema,
  verticalCoverUrl: draftMediaUrlSchema,
  coverOrientation: z.enum(['portrait', 'landscape']).default('portrait'),
  videoUrl: publicMediaUrlSchema,
  roles: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(2000).max(2100),
  platform: z.string().max(40).optional(),
  summary: z.string().min(2).max(80),
  description: z.string().min(20).max(300),
  metrics: z.string().max(80).optional(),
  status: publishStatusSchema,
}).superRefine((video, context) => {
  const selectedCoverKey = video.coverOrientation === 'landscape' ? 'horizontalCoverUrl' : 'verticalCoverUrl'
  if (!publicMediaUrlSchema.safeParse(video[selectedCoverKey]).success) {
    context.addIssue({
      code: 'custom',
      path: [selectedCoverKey],
      message: PUBLIC_MEDIA_URL_MESSAGE,
    })
  }
})

const privateVideoWorkSchema = z.object({
  ...identityFields,
  title: z.string().max(80),
  category: z.enum(VIDEO_CATEGORIES),
  horizontalCoverUrl: draftMediaUrlSchema,
  verticalCoverUrl: draftMediaUrlSchema,
  coverOrientation: z.enum(['portrait', 'landscape']).default('portrait'),
  videoUrl: draftMediaUrlSchema,
  roles: z.array(z.string()),
  year: z.number().int().min(2000).max(2100),
  platform: z.string().max(40).optional(),
  summary: z.string().max(80),
  description: z.string().max(300),
  metrics: z.string().max(80).optional(),
  status: privateStatusSchema,
})

export const adminVideoWorkSchema = z.union([videoWorkSchema, privateVideoWorkSchema])

export const photoSeriesSchema = z.object({
  ...identityFields,
  title: z.string().min(1).max(80),
  category: z.enum(PHOTO_CATEGORIES),
  coverUrl: publicMediaUrlSchema,
  shotAt: z.string().min(4).max(20),
  intro: z.string().min(2).max(100),
  photos: z.array(photoAssetSchema).min(1).max(30),
  status: publishStatusSchema,
})

const privatePhotoSeriesSchema = z.object({
  ...identityFields,
  title: z.string().max(80),
  category: z.enum(PHOTO_CATEGORIES),
  coverUrl: draftMediaUrlSchema,
  shotAt: z.string().max(20),
  intro: z.string().max(100),
  photos: z.array(adminDraftPhotoAssetSchema).max(30),
  status: privateStatusSchema,
})

export const adminPhotoSeriesSchema = z.union([photoSeriesSchema, privatePhotoSeriesSchema])

export const liveWorkSchema = z.object({
  ...identityFields,
  title: z.string().min(1).max(80),
  summary: z.string().min(2).max(80),
  description: z.string().min(20).max(300),
  roles: z.array(z.string().min(1)).min(1),
  heldAt: z.string().min(1).max(20),
  coverUrl: publicMediaUrlSchema,
  screenshots: z.array(photoAssetSchema).min(1).max(12),
  status: publishStatusSchema,
}).superRefine((liveWork, context) => {
  if (!liveWork.screenshots.some((shot) => shot.url === liveWork.coverUrl)) {
    context.addIssue({
      code: 'custom',
      path: ['coverUrl'],
      message: '直播封面必须是截图之一。',
    })
  }
})

const privateLiveWorkSchema = z.object({
  ...identityFields,
  title: z.string().max(80),
  summary: z.string().max(80),
  description: z.string().max(300),
  roles: z.array(z.string()),
  heldAt: z.string().max(20),
  coverUrl: draftMediaUrlSchema,
  screenshots: z.array(adminDraftPhotoAssetSchema).max(12),
  status: privateStatusSchema,
})

export const adminLiveWorkSchema = z.union([liveWorkSchema, privateLiveWorkSchema])

export const aigcWorkSchema = z.object({
  ...identityFields,
  title: z.string().min(1).max(80),
  mediaType: z.enum(['image', 'video']),
  mediaUrl: publicMediaUrlSchema,
  coverUrl: z.union([z.literal(''), publicMediaUrlSchema]),
  summary: z.string().min(2).max(80),
  year: z.number().int().min(2000).max(2100),
  status: z.literal('published'),
}).superRefine((aigcWork, context) => {
  if (aigcWork.status === 'published' && aigcWork.mediaType === 'video' && aigcWork.coverUrl === '') {
    context.addIssue({
      code: 'custom',
      path: ['coverUrl'],
      message: '已发布的 AIGC 视频必须提供封面。',
    })
  }
})

const privateAigcWorkSchema = z.object({
  ...identityFields,
  title: z.string().max(80),
  mediaType: z.enum(['image', 'video']),
  mediaUrl: draftMediaUrlSchema,
  coverUrl: z.union([z.literal(''), publicMediaUrlSchema]),
  summary: z.string().max(80),
  year: z.number().int().min(2000).max(2100),
  status: privateStatusSchema,
})

export const adminAigcWorkSchema = z.union([aigcWorkSchema, privateAigcWorkSchema])

export const IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024

const socialLinkSchema = z.object({ label: z.string().min(1), url: z.string().url() })

export const siteProfileSchema = z.object({
  id: z.literal('main'),
  name: z.string().min(1).max(40),
  role: z.string().min(2).max(60),
  statement: z.string().min(2).max(80),
  intro: z.string().min(20).max(300),
  portraitUrl: publicMediaUrlSchema,
  experience: z.array(z.string().min(2)).min(1).max(10),
  capabilities: z.array(z.string().min(2)).min(1).max(10),
  resumeUrl: publicMediaUrlSchema,
  email: z.string().email(),
  wechatQrUrl: publicMediaUrlSchema,
  socialLinks: z.array(socialLinkSchema).max(10),
  status: publishStatusSchema,
  updatedAt: z.string().datetime(),
})

const privateSiteProfileSchema = z.object({
  id: z.literal('main'),
  name: z.string().max(40),
  role: z.string().max(60),
  statement: z.string().max(80),
  intro: z.string().max(300),
  portraitUrl: draftMediaUrlSchema,
  experience: z.array(z.string()).max(10),
  capabilities: z.array(z.string()).max(10),
  resumeUrl: draftMediaUrlSchema,
  email: z.union([z.literal(''), z.string().email()]),
  wechatQrUrl: draftMediaUrlSchema,
  socialLinks: z.array(z.object({
    label: z.string(),
    url: z.union([z.literal(''), z.string().url()]),
  })).max(10),
  status: privateStatusSchema,
  updatedAt: z.string().datetime(),
})

export const adminSiteProfileSchema = z.union([siteProfileSchema, privateSiteProfileSchema])
