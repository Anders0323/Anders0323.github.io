import type { AigcWork, LiveWork, PhotoSeries, SiteProfile, VideoCategory, VideoWork } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import {
  adminPhotoSeriesSchema,
  adminAigcWorkSchema,
  adminSiteProfileSchema,
  adminVideoWorkSchema,
  adminLiveWorkSchema,
  liveWorkSchema,
  aigcWorkSchema,
  photoSeriesSchema,
  siteProfileSchema,
  videoWorkSchema,
} from '../../domain/schemas'
import { cloudbaseApp } from './client'

type Filter = Record<string, unknown>
const CONTENT_REPOSITORY_ERROR = '内容服务返回了无效数据。'

export interface CloudBaseQueryPort {
  where(filter: Filter): CloudBaseQueryPort
  orderBy(field: string, direction: 'asc' | 'desc'): CloudBaseQueryPort
  get(): Promise<unknown>
}

export interface CloudBaseDocumentPort {
  set(data: object): Promise<unknown>
  remove(): Promise<unknown>
}

export interface CloudBaseCollectionPort extends CloudBaseQueryPort {
  doc(id: string): CloudBaseDocumentPort
}

export interface CloudBaseDatabasePort {
  collection(name: string): CloudBaseCollectionPort
}

export interface CloudBaseDatabaseAppPort {
  database(): CloudBaseDatabasePort
}

function responseRows(response: unknown): unknown[] {
  if (typeof response !== 'object' || response === null || !('data' in response) || !Array.isArray(response.data)) {
    throw new Error(CONTENT_REPOSITORY_ERROR)
  }
  return response.data
}

function ensureWriteSucceeded(response: unknown): void {
  if (typeof response !== 'object' || response === null || !('code' in response)) return
  const { code } = response as { code: unknown }
  if (code !== 0 && code !== '0') throw new Error(CONTENT_REPOSITORY_ERROR)
}

export class CloudBaseContentRepository implements AdminContentRepository {
  private readonly app: CloudBaseDatabaseAppPort

  constructor(app: CloudBaseDatabaseAppPort = cloudbaseApp() as unknown as CloudBaseDatabaseAppPort) {
    this.app = app
  }

  private collection(name: string) {
    return this.app.database().collection(name)
  }

  async listPublishedVideos(category?: VideoCategory): Promise<VideoWork[]> {
    const filter: Filter = category ? { status: 'published', category } : { status: 'published' }
    const response = await this.collection('videos').where(filter).orderBy('sortOrder', 'asc').get()
    return videoWorkSchema.array().parse(responseRows(response))
  }

  async getPublishedVideo(slug: string): Promise<VideoWork | null> {
    const response = await this.collection('videos').where({ status: 'published', slug }).get()
    const row = responseRows(response)[0]
    return row === undefined ? null : videoWorkSchema.parse(row)
  }

  async listPublishedPhotoSeries(): Promise<PhotoSeries[]> {
    const response = await this.collection('photo_series').where({ status: 'published' }).orderBy('sortOrder', 'asc').get()
    return photoSeriesSchema.array().parse(responseRows(response))
  }

  async getPublishedPhotoSeries(slug: string): Promise<PhotoSeries | null> {
    const response = await this.collection('photo_series').where({ status: 'published', slug }).get()
    const row = responseRows(response)[0]
    return row === undefined ? null : photoSeriesSchema.parse(row)
  }

  async listPublishedLiveWorks(): Promise<LiveWork[]> {
    const response = await this.collection('live_works').where({ status: 'published' }).orderBy('sortOrder', 'asc').get()
    return liveWorkSchema.array().parse(responseRows(response))
  }

  async getPublishedLiveWork(slug: string): Promise<LiveWork | null> {
    const response = await this.collection('live_works').where({ status: 'published', slug }).get()
    const row = responseRows(response)[0]
    return row === undefined ? null : liveWorkSchema.parse(row)
  }

  async listPublishedAigcWorks(): Promise<AigcWork[]> {
    const response = await this.collection('aigc_works').where({ status: 'published' }).orderBy('sortOrder', 'asc').get()
    return aigcWorkSchema.array().parse(responseRows(response))
  }

  async getPublishedAigcWork(slug: string): Promise<AigcWork | null> {
    const response = await this.collection('aigc_works').where({ status: 'published', slug }).get()
    const row = responseRows(response)[0]
    return row === undefined ? null : aigcWorkSchema.parse(row)
  }

  async getPublishedProfile(): Promise<SiteProfile> {
    const response = await this.collection('site_profile').where({ id: 'main', status: 'published' }).get()
    const row = responseRows(response)[0]
    if (row === undefined) throw new Error('未找到已发布的个人资料。')
    return siteProfileSchema.parse(row)
  }

  async listAllVideos(): Promise<VideoWork[]> {
    const response = await this.collection('videos').orderBy('sortOrder', 'asc').get()
    return adminVideoWorkSchema.array().parse(responseRows(response))
  }

  async saveVideo(input: VideoWork): Promise<VideoWork> {
    const video = adminVideoWorkSchema.parse(input)
    await this.collection('videos').doc(video.id).set(video)
    return video
  }

  async deleteVideo(id: string): Promise<void> {
    await this.collection('videos').doc(id).remove()
  }

  async listAllPhotoSeries(): Promise<PhotoSeries[]> {
    const response = await this.collection('photo_series').orderBy('sortOrder', 'asc').get()
    return adminPhotoSeriesSchema.array().parse(responseRows(response))
  }

  async savePhotoSeries(input: PhotoSeries): Promise<PhotoSeries> {
    const series = adminPhotoSeriesSchema.parse(input)
    await this.collection('photo_series').doc(series.id).set(series)
    return series
  }

  async deletePhotoSeries(id: string): Promise<void> {
    await this.collection('photo_series').doc(id).remove()
  }

  async listAllLiveWorks(): Promise<LiveWork[]> {
    const response = await this.collection('live_works').orderBy('sortOrder', 'asc').get()
    return adminLiveWorkSchema.array().parse(responseRows(response))
  }

  async saveLiveWork(input: LiveWork): Promise<LiveWork> {
    const liveWork = adminLiveWorkSchema.parse(input)
    ensureWriteSucceeded(await this.collection('live_works').doc(liveWork.id).set(liveWork))
    return liveWork
  }

  async deleteLiveWork(id: string): Promise<void> {
    ensureWriteSucceeded(await this.collection('live_works').doc(id).remove())
  }

  async listAllAigcWorks(): Promise<AigcWork[]> {
    const response = await this.collection('aigc_works').orderBy('sortOrder', 'asc').get()
    return adminAigcWorkSchema.array().parse(responseRows(response))
  }

  async saveAigcWork(input: AigcWork): Promise<AigcWork> {
    const aigcWork = adminAigcWorkSchema.parse(input)
    try {
      ensureWriteSucceeded(await this.collection('aigc_works').doc(aigcWork.id).set(aigcWork))
    } catch {
      throw new Error(CONTENT_REPOSITORY_ERROR)
    }
    return aigcWork
  }

  async deleteAigcWork(id: string): Promise<void> {
    try {
      ensureWriteSucceeded(await this.collection('aigc_works').doc(id).remove())
    } catch {
      throw new Error(CONTENT_REPOSITORY_ERROR)
    }
  }

  async getProfile(): Promise<SiteProfile | null> {
    const response = await this.collection('site_profile').where({ id: 'main' }).get()
    const row = responseRows(response)[0]
    if (row === undefined) return null
    const profile = adminSiteProfileSchema.safeParse(row)
    if (!profile.success) throw new Error('个人资料数据无效。')
    return profile.data
  }

  async saveProfile(input: SiteProfile): Promise<SiteProfile> {
    const profile = adminSiteProfileSchema.parse(input)
    await this.collection('site_profile').doc('main').set(profile)
    return profile
  }
}
