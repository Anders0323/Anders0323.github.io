import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from '../../domain/schemas'
import { cloudbaseApp } from './client'

export const MEDIA_UPLOAD_ERROR = '文件上传失败，请稍后重试。'

export type MediaFolder = 'videos' | 'covers' | 'photos' | 'profile' | 'live' | 'resume' | 'aigc-images' | 'aigc-videos'

export interface UploadedMedia {
  id: string
  path: string
  fullPath: string
  url: string
}

export type MediaUploadDiagnostic = {
  stage: 'upload' | 'public-url'
  code: string
  message: 'CloudBase 媒体上传失败' | 'CloudBase 公开地址解析失败'
}

export function formatMediaUploadDiagnostic(event: MediaUploadDiagnostic): string {
  return JSON.stringify(event)
}

interface MediaUploadDiagnostics {
  enabled: boolean
  report: (event: MediaUploadDiagnostic) => void
}

interface StorageFilePort {
  upload(path: string, file: File, options: { contentType: string; upsert: false }): Promise<unknown>
  getPublicUrl(path: string): Promise<unknown>
}

interface StorageAppPort {
  storage: { from(): StorageFilePort }
}

const imageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const folders = new Set<MediaFolder>(['videos', 'covers', 'photos', 'profile', 'live', 'resume', 'aigc-images', 'aigc-videos'])

function uploadPolicy(folder: MediaFolder, mime: string): { extension: string; maxBytes: number } | null {
  if (folder === 'videos' || folder === 'aigc-videos') return mime === 'video/mp4' ? { extension: 'mp4', maxBytes: VIDEO_MAX_BYTES } : null
  if (folder === 'resume') return mime === 'application/pdf' ? { extension: 'pdf', maxBytes: IMAGE_MAX_BYTES } : null
  const extension = imageTypes[mime]
  return extension ? { extension, maxBytes: IMAGE_MAX_BYTES } : null
}

function uploadedMedia(response: unknown): UploadedMedia | null {
  if (typeof response !== 'object' || response === null || !('error' in response) || response.error) return null
  if (!('data' in response) || typeof response.data !== 'object' || response.data === null) return null
  const data = response.data as Record<string, unknown>
  return typeof data.id === 'string' && data.id && typeof data.path === 'string' && data.path && typeof data.fullPath === 'string' && data.fullPath
    ? { id: data.id, path: data.path, fullPath: data.fullPath, url: '' }
    : null
}

function publicUrl(response: unknown): string | null {
  if (typeof response !== 'object' || response === null || !('data' in response)) return null
  if ('error' in response && response.error) return null
  if (typeof response.data !== 'object' || response.data === null || !('publicUrl' in response.data)) return null
  return typeof response.data.publicUrl === 'string' && response.data.publicUrl ? response.data.publicUrl : null
}

function diagnosticCode(source: unknown): string {
  if (typeof source !== 'object' || source === null) return 'UNKNOWN'
  if ('code' in source) {
    const code = source.code
    if (typeof code === 'string' && /^[A-Z0-9_.:-]{1,80}$/i.test(code)) return code
  }
  if (!('message' in source) || typeof source.message !== 'string') return 'UNKNOWN'
  if (source.message === 'bucketId is not set') return 'BUCKET_ID_NOT_SET'
  const bracketedCode = source.message.match(/\[([A-Z0-9_.:-]{1,80})\]/i)?.[1]
  return bracketedCode ?? 'UNKNOWN'
}

function responseError(response: unknown): unknown {
  return typeof response === 'object' && response !== null && 'error' in response ? response.error : null
}

const defaultDiagnostics: MediaUploadDiagnostics = {
  enabled: import.meta.env.DEV && import.meta.env.MODE !== 'test',
  report: (event) => console.info(`[CloudBase media diagnostic] ${formatMediaUploadDiagnostic(event)}`),
}

export class CloudBaseMediaStorage {
  private readonly app: StorageAppPort
  private readonly uuid: () => string
  private readonly diagnostics: MediaUploadDiagnostics

  constructor(
    app: StorageAppPort = cloudbaseApp() as unknown as StorageAppPort,
    uuid: () => string = () => crypto.randomUUID(),
    diagnostics: MediaUploadDiagnostics = defaultDiagnostics,
  ) {
    this.app = app
    this.uuid = uuid
    this.diagnostics = diagnostics
  }

  private report(stage: MediaUploadDiagnostic['stage'], source: unknown): void {
    if (!this.diagnostics.enabled) return
    this.diagnostics.report({
      stage,
      code: diagnosticCode(source),
      message: stage === 'upload' ? 'CloudBase 媒体上传失败' : 'CloudBase 公开地址解析失败',
    })
  }

  async upload(file: File, requestedFolder: string): Promise<UploadedMedia> {
    if (!folders.has(requestedFolder as MediaFolder)) throw new Error('不支持的文件目录。')
    const folder = requestedFolder as MediaFolder
    const policy = uploadPolicy(folder, file.type)
    if (!policy) throw new Error('不支持的文件格式。')
    if (file.size <= 0) throw new Error('不能上传空文件。')
    if (file.size > policy.maxBytes) throw new Error('文件大小超出限制。')

    const path = `media/${folder}/${this.uuid()}.${policy.extension}`
    const storage = this.app.storage.from()
    let response: unknown
    try {
      response = await storage.upload(path, file, { contentType: file.type, upsert: false })
    } catch (error) {
      this.report('upload', error)
      throw new Error(MEDIA_UPLOAD_ERROR)
    }
    const uploaded = uploadedMedia(response)
    if (!uploaded) {
      this.report('upload', responseError(response))
      throw new Error(MEDIA_UPLOAD_ERROR)
    }

    let publicUrlResponse: unknown
    try {
      publicUrlResponse = await storage.getPublicUrl(uploaded.id)
    } catch (error) {
      this.report('public-url', error)
      throw new Error(MEDIA_UPLOAD_ERROR)
    }
    const resolvedUrl = publicUrl(publicUrlResponse)
    if (!resolvedUrl) {
      this.report('public-url', responseError(publicUrlResponse))
      throw new Error(MEDIA_UPLOAD_ERROR)
    }
    return { ...uploaded, url: resolvedUrl }
  }
}
