import { describe, expect, it } from 'vitest'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from './contentRepository'

function createRepository() {
  return new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)
}

describe('MemoryContentRepository', () => {
  it('returns only published videos in sort order', async () => {
    const repository = createRepository()

    const result = await repository.listPublishedVideos()

    expect(result.every((item) => item.status === 'published')).toBe(true)
    expect(result.map((item) => item.sortOrder)).toEqual(
      [...result.map((item) => item.sortOrder)].sort((a, b) => a - b),
    )
  })

  it('does not expose drafts by slug', async () => {
    const repository = createRepository()

    await expect(repository.getPublishedVideo('draft-film')).resolves.toBeNull()
  })

  it('filters published videos by the fixed category keys', async () => {
    const repository = createRepository()

    const result = await repository.listPublishedVideos('event')

    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('event')
  })

  it('keeps draft photography and profiles out of public reads', async () => {
    const draftSeries = { ...fixturePhotoSeries[0], slug: 'draft-series', status: 'draft' as const }
    const draftProfile = { ...fixtureProfile, status: 'draft' as const }
    const privateRepository = new MemoryContentRepository(
      fixtureVideos,
      [...fixturePhotoSeries, draftSeries],
      draftProfile,
    )

    const publishedSeries = await privateRepository.listPublishedPhotoSeries()

    expect(publishedSeries.every((item) => item.status === 'published')).toBe(true)
    await expect(privateRepository.getPublishedPhotoSeries('draft-series')).resolves.toBeNull()
    await expect(privateRepository.getPublishedProfile()).rejects.toThrow('Published profile not found')
  })

  it('returns defensive copies from construction data and reads', async () => {
    const inputVideos = structuredClone(fixtureVideos)
    const repository = new MemoryContentRepository(inputVideos, fixturePhotoSeries, fixtureProfile)
    inputVideos[0]!.title = 'Changed outside the repository'

    const firstRead = await repository.listPublishedVideos()
    firstRead[0]!.roles[0] = 'Changed from a returned copy'
    const secondRead = await repository.listPublishedVideos()

    expect(firstRead[0]?.title).not.toBe('Changed outside the repository')
    expect(secondRead[0]?.roles[0]).not.toBe('Changed from a returned copy')
  })

  it('validates and saves videos without retaining caller references', async () => {
    const repository = createRepository()
    const input = { ...fixtureVideos[0], id: 'data-origin: fixture:video-new', slug: 'new-video', title: 'New video' }

    const saved = await repository.saveVideo(input)
    input.title = 'Mutated caller value'

    expect(saved.title).toBe('New video')
    await expect(repository.saveVideo({ ...input, slug: 'not valid!' })).rejects.toThrow()
    expect((await repository.getPublishedVideo('new-video'))?.title).toBe('New video')
  })

  it('updates and deletes videos by id', async () => {
    const repository = createRepository()
    const saved = await repository.saveVideo({ ...fixtureVideos[0], title: 'Updated title' })

    expect((await repository.listAllVideos()).find((item) => item.id === saved.id)?.title).toBe('Updated title')
    await repository.deleteVideo(saved.id)

    expect((await repository.listAllVideos()).some((item) => item.id === saved.id)).toBe(false)
  })

  it('saves and deletes photo series by id', async () => {
    const repository = createRepository()
    const input = { ...fixturePhotoSeries[0], id: 'data-origin: fixture:photo-new', slug: 'new-series' }

    const saved = await repository.savePhotoSeries(input)
    await repository.deletePhotoSeries(saved.id)

    expect((await repository.listAllPhotoSeries()).some((item) => item.id === saved.id)).toBe(false)
    await expect(repository.savePhotoSeries({ ...input, photos: [] })).rejects.toThrow()
  })

  it('validates and saves profiles without retaining caller references', async () => {
    const repository = createRepository()
    const input = { ...fixtureProfile, statement: 'A revised statement for this fixture profile.' }

    const saved = await repository.saveProfile(input)
    input.statement = 'Mutated caller value'

    expect(saved.statement).toBe('A revised statement for this fixture profile.')
    expect((await repository.getPublishedProfile()).statement).toBe('A revised statement for this fixture profile.')
    await expect(repository.saveProfile({ ...input, email: 'not-an-email' })).rejects.toThrow()
  })

  it('keeps hidden profile data available only through the admin read', async () => {
    const hiddenProfile = { ...fixtureProfile, status: 'hidden' as const }
    const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, hiddenProfile)

    await expect(repository.getPublishedProfile()).rejects.toThrow()
    await expect(repository.getProfile()).resolves.toEqual(hiddenProfile)
  })

  it('stores incomplete private drafts without exposing them through public reads', async () => {
    const repository = createRepository()
    const draftVideo = {
      ...fixtureVideos[0], id: 'draft-new', slug: 'draft-new', status: 'draft' as const, title: '', horizontalCoverUrl: '',
      verticalCoverUrl: '', videoUrl: '', roles: [], summary: '', description: '',
    }
    const draftPhotos = {
      ...fixturePhotoSeries[0], id: 'photo-draft-new', slug: 'photo-draft-new', status: 'hidden' as const,
      title: '', coverUrl: '', intro: '', photos: [],
    }
    const draftProfile = {
      ...fixtureProfile, status: 'draft' as const, name: '', role: '', statement: '', intro: '', portraitUrl: '',
      experience: [], capabilities: [], resumeUrl: '', email: '', wechatQrUrl: '', socialLinks: [],
    }

    await expect(repository.saveVideo(draftVideo)).resolves.toEqual(draftVideo)
    await expect(repository.savePhotoSeries(draftPhotos)).resolves.toEqual(draftPhotos)
    await expect(repository.saveProfile(draftProfile)).resolves.toEqual(draftProfile)
    expect((await repository.listAllVideos()).some((item) => item.id === draftVideo.id)).toBe(true)
    expect((await repository.listAllPhotoSeries()).some((item) => item.id === draftPhotos.id)).toBe(true)
    expect((await repository.listPublishedVideos()).some((item) => item.id === draftVideo.id)).toBe(false)
    expect((await repository.listPublishedPhotoSeries()).some((item) => item.id === draftPhotos.id)).toBe(false)
    await expect(repository.getPublishedProfile()).rejects.toThrow()
  })

  it('keeps malformed published records behind the strict public schema', async () => {
    const invalidPublished = { ...fixtureVideos[0], videoUrl: 'blob:https://portfolio.test/local' }
    const repository = new MemoryContentRepository([invalidPublished], fixturePhotoSeries, fixtureProfile)
    await expect(repository.listPublishedVideos()).rejects.toThrow()
  })

  it('returns only sorted published live works and hides private live works from public reads', async () => {
    const draft = { ...fixtureLiveWorks[0]!, id: 'live-draft', slug: 'live-draft', status: 'draft' as const, title: '' }
    const hidden = { ...fixtureLiveWorks[1]!, id: 'live-hidden', slug: 'live-hidden', status: 'hidden' as const, title: '' }
    const repository = new MemoryContentRepository(
      fixtureVideos,
      fixturePhotoSeries,
      fixtureProfile,
      [hidden, fixtureLiveWorks[1]!, draft, fixtureLiveWorks[0]!],
    )

    await expect(repository.listPublishedLiveWorks()).resolves.toEqual([fixtureLiveWorks[0], fixtureLiveWorks[1]])
    await expect(repository.getPublishedLiveWork('live-draft')).resolves.toBeNull()
    await expect(repository.getPublishedLiveWork('live-hidden')).resolves.toBeNull()
  })

  it('keeps all live-work states editable while validating and cloning writes', async () => {
    const input = structuredClone(fixtureLiveWorks[0]!)
    input.id = 'live-new'
    input.slug = 'live-new'
    const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, [
      { ...fixtureLiveWorks[1]!, id: 'live-hidden', slug: 'live-hidden', status: 'hidden', title: '' },
    ])

    const saved = await repository.saveLiveWork(input)
    input.screenshots[0]!.alt = 'Mutated caller screenshot'
    saved.roles[0] = 'Mutated returned roles'

    expect((await repository.listAllLiveWorks()).map((work) => work.status)).toEqual(['published', 'hidden'])
    expect((await repository.getPublishedLiveWork('live-new'))?.screenshots[0]?.alt).not.toBe('Mutated caller screenshot')
    expect((await repository.listAllLiveWorks()).find((work) => work.id === 'live-new')?.roles[0]).not.toBe('Mutated returned roles')
    await expect(repository.saveLiveWork({ ...input, slug: 'not valid!' })).rejects.toThrow()

    await repository.deleteLiveWork('live-new')
    expect((await repository.listAllLiveWorks()).some((work) => work.id === 'live-new')).toBe(false)
  })

  it('lists only sorted published AIGC works and keeps unpublished slugs private', async () => {
    const draft = { ...fixtureAigcWorks[0]!, id: 'aigc-draft', slug: 'aigc-draft', status: 'draft' as const, title: '' }
    const hidden = { ...fixtureAigcWorks[1]!, id: 'aigc-hidden', slug: 'aigc-hidden', status: 'hidden' as const, title: '' }
    const repository = new MemoryContentRepository(
      fixtureVideos,
      fixturePhotoSeries,
      fixtureProfile,
      fixtureLiveWorks,
      [hidden, fixtureAigcWorks[1]!, draft, fixtureAigcWorks[0]!],
    )

    await expect(repository.listPublishedAigcWorks()).resolves.toEqual(fixtureAigcWorks)
    await expect(repository.getPublishedAigcWork('aigc-draft')).resolves.toBeNull()
    await expect(repository.getPublishedAigcWork('aigc-hidden')).resolves.toBeNull()
  })

  it('keeps every AIGC status editable while parsing writes and deleting the exact ID', async () => {
    const input = structuredClone(fixtureAigcWorks[0]!)
    input.id = 'aigc-new'
    input.slug = 'aigc-new'
    const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks, [
      { ...fixtureAigcWorks[1]!, id: 'aigc-hidden', slug: 'aigc-hidden', status: 'hidden', title: '' },
    ])

    const saved = await repository.saveAigcWork(input)
    input.title = 'Mutated caller value'

    await expect(repository.listAllAigcWorks()).resolves.toEqual([saved, expect.objectContaining({ id: 'aigc-hidden', status: 'hidden' })])
    expect((await repository.getPublishedAigcWork('aigc-new'))?.title).not.toBe('Mutated caller value')
    await expect(repository.saveAigcWork({ ...input, slug: 'not valid!' })).rejects.toThrow()

    await repository.deleteAigcWork('aigc-new')
    expect((await repository.listAllAigcWorks()).some((work) => work.id === 'aigc-new')).toBe(false)
  })
})
