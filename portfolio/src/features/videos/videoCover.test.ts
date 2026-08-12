import { describe, expect, it } from 'vitest'
import { fixtureVideos } from '../../fixtures/content'
import { getVideoCover } from './videoCover'

describe('getVideoCover', () => {
  const syntheticVideo = {
    ...fixtureVideos[0],
    horizontalCoverUrl: '/media/synthetic-horizontal.webp',
    verticalCoverUrl: '/media/synthetic-vertical.webp',
  }

  it('selects the portrait asset and intrinsic 3:4 dimensions for portrait work', () => {
    expect(getVideoCover({ ...syntheticVideo, coverOrientation: 'portrait' })).toEqual({
      src: '/media/synthetic-vertical.webp',
      width: 3,
      height: 4,
      modifier: 'portrait',
    })
  })

  it('selects the landscape asset and intrinsic 4:3 dimensions for landscape work', () => {
    expect(getVideoCover({ ...syntheticVideo, coverOrientation: 'landscape' })).toEqual({
      src: '/media/synthetic-horizontal.webp',
      width: 4,
      height: 3,
      modifier: 'landscape',
    })
  })

  it('keeps every published fixture selected cover backed by a public asset', () => {
    const publicAssets = import.meta.glob('/public/**/*', { eager: true, query: '?url', import: 'default' })
    const missingSelectedCovers = fixtureVideos
      .filter((video) => video.status === 'published')
      .map(getVideoCover)
      .map(({ src }) => src)
      .filter((src) => !Object.hasOwn(publicAssets, `/public${src}`))

    expect(missingSelectedCovers).toEqual([])
  })
})
