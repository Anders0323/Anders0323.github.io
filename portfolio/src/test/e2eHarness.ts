import type { AdminRouteServices } from '../app/router'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../fixtures/content'
import { MemoryContentRepository } from '../infrastructure/memory/contentRepository'

const session = {
  user: { uid: 'local-e2e-admin', role: 'admin' },
  session: { id: 'local-e2e-session' },
}

export function createE2EHarness(): {
  repository: MemoryContentRepository
  adminServices: AdminRouteServices
} {
  const twoPhotoSeries = fixturePhotoSeries.map((series, index) => {
    if (index !== 0) return series
    return {
      ...series,
      photos: [
        ...series.photos,
        {
          id: 'data-origin: fixture:asset-people-car-second',
          url: '/media/fixture-photo-motion.jpg',
          alt: '开发演示人车摄影第二张',
          width: 1600,
          height: 1067,
        },
      ],
    }
  })
  const repository = new MemoryContentRepository(fixtureVideos, twoPhotoSeries, fixtureProfile, fixtureLiveWorks, fixtureAigcWorks)
  let uploadNumber = 0
  const fixtureImageUrls = ['/media/fixture-photo-product.jpg', '/media/fixture-photo-motion.jpg']

  return {
    repository,
    adminServices: {
      auth: {
        signInAdmin: async () => session,
        requireAdminSession: async () => session,
        signOut: async () => undefined,
      },
      storage: {
        upload: async (file, folder) => {
          uploadNumber += 1
          const extension = file.type === 'video/mp4' ? 'mp4' : file.type === 'application/pdf' ? 'pdf' : 'jpg'
          const id = `e2e-upload-${uploadNumber}`
          const path = `media/${folder}/${id}.${extension}`
          return {
            id,
            path,
            fullPath: `e2e-only://${path}`,
            url: file.type === 'video/mp4' ? '/media/fixture-video-people.mp4' : fixtureImageUrls[(uploadNumber - 1) % fixtureImageUrls.length]!,
          }
        },
      },
      readImageDimensions: async () => ({ width: 1600, height: 900 }),
    },
  }
}
