import type { AdminContentRepository } from '../domain/repository'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../fixtures/content'
import { MemoryContentRepository } from './memory/contentRepository'

export async function createContentRepository(): Promise<AdminContentRepository> {
  if (import.meta.env.VITE_CONTENT_BACKEND === 'cloudbase') {
    const { CloudBaseContentRepository } = await import('./cloudbase/contentRepository')
    return new CloudBaseContentRepository()
  }
  return new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks, fixtureAigcWorks)
}
