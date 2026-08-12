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

function clone<T>(value: T): T {
  return structuredClone(value)
}

function bySortOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder)
}

export class MemoryContentRepository implements AdminContentRepository {
  private videos: VideoWork[]
  private photoSeries: PhotoSeries[]
  private profile: SiteProfile
  private liveWorks: LiveWork[]
  private aigcWorks: AigcWork[]

  constructor(videos: VideoWork[], photoSeries: PhotoSeries[], profile: SiteProfile, liveWorks: LiveWork[] = [], aigcWorks: AigcWork[] = []) {
    this.videos = clone(videos)
    this.photoSeries = clone(photoSeries)
    this.profile = clone(profile)
    this.liveWorks = clone(liveWorks)
    this.aigcWorks = clone(aigcWorks)
  }

  async listPublishedVideos(category?: VideoCategory): Promise<VideoWork[]> {
    return videoWorkSchema.array().parse(
      bySortOrder(this.videos.filter((item) => item.status === 'published' && (!category || item.category === category))).map(clone),
    )
  }

  async getPublishedVideo(slug: string): Promise<VideoWork | null> {
    const video = this.videos.find((item) => item.slug === slug && item.status === 'published')
    return video ? videoWorkSchema.parse(clone(video)) : null
  }

  async listPublishedPhotoSeries(): Promise<PhotoSeries[]> {
    return photoSeriesSchema.array().parse(bySortOrder(this.photoSeries.filter((item) => item.status === 'published')).map(clone))
  }

  async getPublishedPhotoSeries(slug: string): Promise<PhotoSeries | null> {
    const series = this.photoSeries.find((item) => item.slug === slug && item.status === 'published')
    return series ? photoSeriesSchema.parse(clone(series)) : null
  }

  async listPublishedLiveWorks(): Promise<LiveWork[]> {
    return liveWorkSchema.array().parse(bySortOrder(this.liveWorks.filter((item) => item.status === 'published')).map(clone))
  }

  async getPublishedLiveWork(slug: string): Promise<LiveWork | null> {
    const liveWork = this.liveWorks.find((item) => item.slug === slug && item.status === 'published')
    return liveWork ? liveWorkSchema.parse(clone(liveWork)) : null
  }

  async listPublishedAigcWorks(): Promise<AigcWork[]> {
    return aigcWorkSchema.array().parse(bySortOrder(this.aigcWorks.filter((item) => item.status === 'published')).map(clone))
  }

  async getPublishedAigcWork(slug: string): Promise<AigcWork | null> {
    const aigcWork = this.aigcWorks.find((item) => item.slug === slug && item.status === 'published')
    return aigcWork ? aigcWorkSchema.parse(clone(aigcWork)) : null
  }

  async getPublishedProfile(): Promise<SiteProfile> {
    if (this.profile.status !== 'published') {
      throw new Error('Published profile not found')
    }

    return siteProfileSchema.parse(clone(this.profile))
  }

  async listAllVideos(): Promise<VideoWork[]> {
    return adminVideoWorkSchema.array().parse(bySortOrder(this.videos).map(clone))
  }

  async saveVideo(input: VideoWork): Promise<VideoWork> {
    const video = clone(adminVideoWorkSchema.parse(input))
    const index = this.videos.findIndex((item) => item.id === video.id)
    if (index === -1) {
      this.videos.push(video)
    } else {
      this.videos[index] = video
    }

    return clone(video)
  }

  async deleteVideo(id: string): Promise<void> {
    this.videos = this.videos.filter((item) => item.id !== id)
  }

  async listAllPhotoSeries(): Promise<PhotoSeries[]> {
    return adminPhotoSeriesSchema.array().parse(bySortOrder(this.photoSeries).map(clone))
  }

  async savePhotoSeries(input: PhotoSeries): Promise<PhotoSeries> {
    const series = clone(adminPhotoSeriesSchema.parse(input))
    const index = this.photoSeries.findIndex((item) => item.id === series.id)
    if (index === -1) {
      this.photoSeries.push(series)
    } else {
      this.photoSeries[index] = series
    }

    return clone(series)
  }

  async deletePhotoSeries(id: string): Promise<void> {
    this.photoSeries = this.photoSeries.filter((item) => item.id !== id)
  }

  async listAllLiveWorks(): Promise<LiveWork[]> {
    return adminLiveWorkSchema.array().parse(bySortOrder(this.liveWorks).map(clone))
  }

  async saveLiveWork(input: LiveWork): Promise<LiveWork> {
    const liveWork = clone(adminLiveWorkSchema.parse(input))
    const index = this.liveWorks.findIndex((item) => item.id === liveWork.id)
    if (index === -1) {
      this.liveWorks.push(liveWork)
    } else {
      this.liveWorks[index] = liveWork
    }

    return clone(liveWork)
  }

  async deleteLiveWork(id: string): Promise<void> {
    this.liveWorks = this.liveWorks.filter((item) => item.id !== id)
  }

  async listAllAigcWorks(): Promise<AigcWork[]> {
    return adminAigcWorkSchema.array().parse(bySortOrder(this.aigcWorks).map(clone))
  }

  async saveAigcWork(input: AigcWork): Promise<AigcWork> {
    const aigcWork = clone(adminAigcWorkSchema.parse(input))
    const index = this.aigcWorks.findIndex((item) => item.id === aigcWork.id)
    if (index === -1) {
      this.aigcWorks.push(aigcWork)
    } else {
      this.aigcWorks[index] = aigcWork
    }

    return clone(aigcWork)
  }

  async deleteAigcWork(id: string): Promise<void> {
    this.aigcWorks = this.aigcWorks.filter((item) => item.id !== id)
  }

  async getProfile(): Promise<SiteProfile> {
    return adminSiteProfileSchema.parse(clone(this.profile))
  }

  async saveProfile(input: SiteProfile): Promise<SiteProfile> {
    this.profile = clone(adminSiteProfileSchema.parse(input))
    return clone(this.profile)
  }
}
