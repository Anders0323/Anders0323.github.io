import type { AigcWork, LiveWork, PhotoSeries, SiteProfile, VideoCategory, VideoWork } from './content'

export interface ContentRepository {
  listPublishedVideos(category?: VideoCategory): Promise<VideoWork[]>
  getPublishedVideo(slug: string): Promise<VideoWork | null>
  listPublishedPhotoSeries(): Promise<PhotoSeries[]>
  getPublishedPhotoSeries(slug: string): Promise<PhotoSeries | null>
  listPublishedLiveWorks(): Promise<LiveWork[]>
  getPublishedLiveWork(slug: string): Promise<LiveWork | null>
  listPublishedAigcWorks(): Promise<AigcWork[]>
  getPublishedAigcWork(slug: string): Promise<AigcWork | null>
  getPublishedProfile(): Promise<SiteProfile>
}

export interface AdminContentRepository extends ContentRepository {
  listAllVideos(): Promise<VideoWork[]>
  saveVideo(input: VideoWork): Promise<VideoWork>
  deleteVideo(id: string): Promise<void>
  listAllPhotoSeries(): Promise<PhotoSeries[]>
  savePhotoSeries(input: PhotoSeries): Promise<PhotoSeries>
  deletePhotoSeries(id: string): Promise<void>
  listAllLiveWorks(): Promise<LiveWork[]>
  saveLiveWork(input: LiveWork): Promise<LiveWork>
  deleteLiveWork(id: string): Promise<void>
  listAllAigcWorks(): Promise<AigcWork[]>
  saveAigcWork(input: AigcWork): Promise<AigcWork>
  deleteAigcWork(id: string): Promise<void>
  getProfile(): Promise<SiteProfile | null>
  saveProfile(input: SiteProfile): Promise<SiteProfile>
}
