import { describe, expect, it } from 'vitest'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../fixtures/content'
import {
  adminAigcWorkSchema,
  adminLiveWorkSchema,
  adminPhotoSeriesSchema,
  adminSiteProfileSchema,
  adminVideoWorkSchema,
  aigcWorkSchema,
  liveWorkSchema,
  photoSeriesSchema,
  siteProfileSchema,
  videoWorkSchema,
} from './schemas'

describe('content schemas', () => {
  const validAigc = {
    id: 'aigc-light-study',
    slug: 'aigc-light-study',
    title: '光影习作',
    mediaType: 'image' as const,
    mediaUrl: '/media/aigc-light-study.webp',
    coverUrl: '/media/aigc-light-study-cover.webp',
    summary: '一组以光影变化为主题的 AIGC 视觉作品。',
    year: 2026,
    featured: true,
    sortOrder: 10,
    status: 'published' as const,
    updatedAt: '2026-08-12T00:00:00.000Z',
  }

  it('accepts a published AIGC image without a cover', () => {
    expect(aigcWorkSchema.parse({ ...validAigc, coverUrl: '' })).toMatchObject({
      mediaType: 'image',
      mediaUrl: '/media/aigc-light-study.webp',
      coverUrl: '',
    })
  })

  it.each(['draft', 'hidden'] as const)('rejects %s AIGC works from the public schema', (status) => {
    expect(() => aigcWorkSchema.parse({ ...validAigc, status })).toThrow()
  })

  it('rejects a published AIGC video without a cover', () => {
    expect(() => aigcWorkSchema.parse({
      ...validAigc,
      mediaType: 'video',
      mediaUrl: '/media/aigc-light-study.mp4',
      coverUrl: '',
    })).toThrow()
  })

  it.each([
    ['final media', { mediaUrl: 'cloud://environment/aigc-final.webp' }],
    ['cover media', { coverUrl: 'blob:https://portfolio.test/aigc-cover' }],
  ])('rejects unsafe AIGC %s URLs', (_label, change) => {
    expect(() => aigcWorkSchema.parse({ ...validAigc, ...change })).toThrow()
  })

  it('allows an empty draft AIGC work while preserving its media type', () => {
    const parsed = adminAigcWorkSchema.parse({
      ...validAigc,
      title: '',
      mediaType: 'video',
      mediaUrl: '',
      coverUrl: '',
      summary: '',
      status: 'draft',
    })

    expect(parsed).toMatchObject({ mediaType: 'video', mediaUrl: '', coverUrl: '' })
  })

  it('strips AIGC creative-process fields from parsed public work', () => {
    const parsed = aigcWorkSchema.parse({
      ...validAigc,
      prompt: 'cinematic visual',
      model: 'example-model',
      workflow: 'private workflow',
    })

    expect(parsed).not.toHaveProperty('prompt')
    expect(parsed).not.toHaveProperty('model')
    expect(parsed).not.toHaveProperty('workflow')
  })

  it('provides image and video AIGC fixtures marked as fixture data', () => {
    expect(fixtureAigcWorks).toHaveLength(2)
    expect(fixtureAigcWorks.every((work) => work.id.startsWith('data-origin: fixture:'))).toBe(true)
    expect(fixtureAigcWorks.map((work) => work.mediaType).sort()).toEqual(['image', 'video'])
  })

  const validLive = {
    id: 'live-zhengzhou-launch',
    slug: 'zhengzhou-launch',
    title: '郑州发布现场',
    summary: '一场聚焦现场节奏的直播项目。',
    description: '以实时互动和多机位切换记录发布现场，突出嘉宾、观众与产品演示之间的连贯叙事。',
    roles: ['直播导演', '现场执行'],
    heldAt: '2026-08-01',
    coverUrl: '/media/live-launch-wide.jpg',
    screenshots: [
      { id: 'live-shot-wide', url: '/media/live-launch-wide.jpg', alt: '发布现场的横向全景', width: 1600, height: 900 },
      { id: 'live-shot-tall', url: '/media/live-launch-tall.jpg', alt: '嘉宾介绍产品的竖向画面', width: 900, height: 1600 },
    ],
    featured: true,
    sortOrder: 10,
    status: 'published' as const,
    updatedAt: '2026-08-11T00:00:00.000Z',
  }

  it('accepts a published live work with 1–12 safe screenshots and a screenshot cover', () => {
    expect(liveWorkSchema.parse(validLive).screenshots).toHaveLength(2)
  })

  it.each([
    ['title', { title: '' }],
    ['summary', { summary: '' }],
    ['description', { description: '' }],
    ['roles', { roles: [] }],
    ['held date', { heldAt: '' }],
    ['screenshots', { screenshots: [] }],
    ['cover outside screenshots', { coverUrl: '/media/not-a-live-shot.jpg' }],
  ])('rejects a published live work without required %s', (_label, change) => {
    expect(() => liveWorkSchema.parse({ ...validLive, ...change })).toThrow()
  })

  it('strips a replay URL rather than adding replay media to the live schema', () => {
    const parsed = liveWorkSchema.parse({ ...validLive, replayUrl: '/media/replay.mp4' })
    expect(parsed).not.toHaveProperty('replayUrl')
  })

  it.each([
    'blob:https://portfolio.test/live-shot',
    'cloud://environment/live-shot.jpg',
    'file:///Users/private/live-shot.jpg',
    'live-shot.jpg',
  ])('rejects an unsafe live screenshot URL: %s', (url) => {
    expect(() => liveWorkSchema.parse({
      ...validLive,
      coverUrl: url,
      screenshots: [{ ...validLive.screenshots[0], url }],
    })).toThrow()
  })

  it('allows an empty draft live work only through the admin schema', () => {
    const draft = {
      ...validLive,
      title: '',
      summary: '',
      description: '',
      roles: [],
      heldAt: '',
      coverUrl: '',
      screenshots: [],
      status: 'draft' as const,
    }

    expect(adminLiveWorkSchema.parse(draft)).toEqual(draft)
    expect(() => liveWorkSchema.parse(draft)).toThrow()
  })

  it('rejects more than twelve live screenshots for both published and draft records', () => {
    const screenshots = Array.from({ length: 13 }, (_, index) => ({
      id: `live-shot-${index}`,
      url: `/media/live-shot-${index}.jpg`,
      alt: `第 ${index + 1} 张直播截图`,
      width: 1600,
      height: 900,
    }))

    expect(() => liveWorkSchema.parse({ ...validLive, coverUrl: screenshots[0]?.url, screenshots })).toThrow()
    expect(() => adminLiveWorkSchema.parse({
      ...validLive,
      title: '',
      summary: '',
      description: '',
      roles: [],
      heldAt: '',
      coverUrl: '',
      screenshots,
      status: 'draft',
    })).toThrow()
  })

  it('provides two fixture live works with landscape and portrait screenshots', () => {
    expect(fixtureLiveWorks).toHaveLength(2)
    expect(fixtureLiveWorks.every((liveWork) => liveWork.id.startsWith('data-origin: fixture:'))).toBe(true)
    expect(fixtureLiveWorks.every((liveWork) => liveWork.screenshots.some((shot) => shot.width > shot.height))).toBe(true)
    expect(fixtureLiveWorks.every((liveWork) => liveWork.screenshots.some((shot) => shot.height > shot.width))).toBe(true)
  })

  it('accepts a valid published video', () => {
    const parsed = videoWorkSchema.parse({
      id: 'video-people-01',
      slug: 'returning-home',
      title: '归途的对话',
      category: 'people',
      horizontalCoverUrl: '/media/returning-home-wide.webp',
      verticalCoverUrl: '/media/returning-home-vertical.webp',
      videoUrl: '/media/returning-home.mp4',
      roles: ['策划', '拍摄', '剪辑'],
      year: 2024,
      platform: '视频号',
      summary: '记录人与车共同构成的归途。',
      description: '以一次真实返程为线索，呈现人与家庭的连接。',
      featured: true,
      sortOrder: 1,
      status: 'published',
      updatedAt: '2026-08-10T00:00:00.000Z',
    })

    expect(parsed.category).toBe('people')
  })

  it('defaults legacy video cover orientation to portrait', () => {
    const { coverOrientation: _omitted, ...legacy } = fixtureVideos[0]
    expect(videoWorkSchema.parse(legacy).coverOrientation).toBe('portrait')
  })

  it('defaults legacy published admin videos without cover orientation to portrait', () => {
    const { coverOrientation: _omitted, ...legacy } = fixtureVideos[0]
    expect(adminVideoWorkSchema.parse(legacy).coverOrientation).toBe('portrait')
  })

  it('defaults legacy private admin videos without cover orientation to portrait', () => {
    const { coverOrientation: _omitted, ...legacy } = {
      ...fixtureVideos[0],
      status: 'draft' as const,
      title: '',
      horizontalCoverUrl: '',
      verticalCoverUrl: '',
      videoUrl: '',
      roles: [],
      summary: '',
      description: '',
    }
    expect(adminVideoWorkSchema.parse(legacy).coverOrientation).toBe('portrait')
  })

  it('accepts only portrait or landscape cover orientation', () => {
    expect(videoWorkSchema.parse({ ...fixtureVideos[0], coverOrientation: 'landscape' }).coverOrientation).toBe('landscape')
    expect(() => videoWorkSchema.parse({ ...fixtureVideos[0], coverOrientation: 'square' })).toThrow()
  })

  it.each([
    {
      orientation: 'portrait' as const,
      horizontalCoverUrl: '',
      verticalCoverUrl: '/media/selected-portrait.webp',
    },
    {
      orientation: 'landscape' as const,
      horizontalCoverUrl: '/media/selected-landscape.webp',
      verticalCoverUrl: '',
    },
  ])('accepts published $orientation video with an empty unselected cover', ({
    orientation,
    horizontalCoverUrl,
    verticalCoverUrl,
  }) => {
    expect(videoWorkSchema.parse({
      ...fixtureVideos[0],
      coverOrientation: orientation,
      horizontalCoverUrl,
      verticalCoverUrl,
    })).toMatchObject({
      coverOrientation: orientation,
      horizontalCoverUrl,
      verticalCoverUrl,
    })
  })

  it.each([
    {
      orientation: 'portrait' as const,
      horizontalCoverUrl: '/media/unselected-landscape.webp',
      verticalCoverUrl: '',
    },
    {
      orientation: 'landscape' as const,
      horizontalCoverUrl: '',
      verticalCoverUrl: '/media/unselected-portrait.webp',
    },
  ])('rejects published $orientation video when its selected cover is empty', ({
    orientation,
    horizontalCoverUrl,
    verticalCoverUrl,
  }) => {
    expect(() => videoWorkSchema.parse({
      ...fixtureVideos[0],
      coverOrientation: orientation,
      horizontalCoverUrl,
      verticalCoverUrl,
    })).toThrow()
  })

  it.each([
    ['portrait', 'blob:https://portfolio.test/local'],
    ['portrait', 'cloud://env/private.jpg'],
    ['portrait', 'file:///Users/private/cover.jpg'],
    ['portrait', 'cover.jpg'],
    ['landscape', 'blob:https://portfolio.test/local'],
    ['landscape', 'cloud://env/private.jpg'],
    ['landscape', 'file:///Users/private/cover.jpg'],
    ['landscape', 'cover.jpg'],
  ] as const)('rejects %s video with unsafe unselected cover %s', (orientation, unsafeUrl) => {
    const covers = orientation === 'portrait'
      ? { horizontalCoverUrl: unsafeUrl, verticalCoverUrl: '/media/selected-portrait.webp' }
      : { horizontalCoverUrl: '/media/selected-landscape.webp', verticalCoverUrl: unsafeUrl }

    expect(() => videoWorkSchema.parse({
      ...fixtureVideos[0],
      coverOrientation: orientation,
      ...covers,
    })).toThrow()
  })

  it('rejects a photography series with no images', () => {
    expect(() =>
      photoSeriesSchema.parse({
        id: 'series-space',
        slug: 'space-and-architecture',
        title: '空间与建筑',
        category: 'space',
        coverUrl: '/media/space-cover.webp',
        shotAt: '2025',
        intro: '寻找空间中的秩序与情绪。',
        photos: [],
        featured: true,
        sortOrder: 1,
        status: 'published',
        updatedAt: '2026-08-10T00:00:00.000Z',
      }),
    ).toThrow()
  })

  it('allows incomplete draft and hidden records only through admin schemas', () => {
    const incompleteVideo = {
      ...fixtureVideos[0], status: 'draft' as const, title: '', horizontalCoverUrl: '', verticalCoverUrl: '',
      videoUrl: '', roles: [], summary: '', description: '',
    }
    const incompletePhotos = {
      ...fixturePhotoSeries[0], status: 'hidden' as const, title: '', coverUrl: '', intro: '', photos: [],
    }
    const incompleteProfile = {
      ...fixtureProfile, status: 'draft' as const, name: '', role: '', statement: '', intro: '', portraitUrl: '',
      experience: [], capabilities: [], resumeUrl: '', email: '', wechatQrUrl: '', socialLinks: [],
    }

    expect(adminVideoWorkSchema.parse(incompleteVideo)).toEqual(incompleteVideo)
    expect(adminPhotoSeriesSchema.parse(incompletePhotos)).toEqual(incompletePhotos)
    expect(adminSiteProfileSchema.parse(incompleteProfile)).toEqual(incompleteProfile)
    expect(() => videoWorkSchema.parse(incompleteVideo)).toThrow()
    expect(() => photoSeriesSchema.parse(incompletePhotos)).toThrow()
    expect(() => siteProfileSchema.parse(incompleteProfile)).toThrow()
  })

  it.each([
    ['video blob URL', () => videoWorkSchema.parse({ ...fixtureVideos[0], videoUrl: 'blob:https://portfolio.test/local' })],
    ['CloudBase internal URL', () => videoWorkSchema.parse({ ...fixtureVideos[0], verticalCoverUrl: 'cloud://env/private.jpg' })],
    ['photo filename', () => photoSeriesSchema.parse({ ...fixturePhotoSeries[0], photos: [{ ...fixturePhotoSeries[0]!.photos[0]!, url: 'cover.jpg' }] })],
    ['profile file URL', () => siteProfileSchema.parse({ ...fixtureProfile, resumeUrl: 'file:///Users/private/resume.pdf' })],
  ])('rejects untrusted persisted media: %s', (_label, parse) => {
    expect(parse).toThrow()
  })

  it('accepts only HTTPS public media and existing /media/ fixture paths', () => {
    expect(videoWorkSchema.parse(fixtureVideos[0]).videoUrl).toMatch(/^\/media\//)
    expect(videoWorkSchema.parse({
      ...fixtureVideos[0],
      horizontalCoverUrl: 'https://assets.example.com/horizontal.jpg',
      verticalCoverUrl: 'https://assets.example.com/vertical.jpg',
      videoUrl: 'https://assets.example.com/video.mp4',
    }).videoUrl).toBe('https://assets.example.com/video.mp4')
  })
})
