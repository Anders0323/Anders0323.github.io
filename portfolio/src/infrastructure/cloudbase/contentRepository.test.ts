import { describe, expect, it, vi } from 'vitest'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { CloudBaseContentRepository } from './contentRepository'

function databaseMock(data: unknown[] = []) {
  const get = vi.fn().mockResolvedValue({ data })
  const orderBy = vi.fn()
  const where = vi.fn()
  const set = vi.fn().mockResolvedValue({ updated: 1 })
  const remove = vi.fn().mockResolvedValue({ deleted: 1 })
  const doc = vi.fn().mockReturnValue({ set, remove })
  const query = { get, orderBy, where, doc }
  orderBy.mockReturnValue(query)
  where.mockReturnValue(query)
  const collection = vi.fn().mockReturnValue(query)
  return { app: { database: () => ({ collection }) }, collection, where, orderBy, get, doc, set, remove }
}

describe('CloudBaseContentRepository', () => {
  it('includes status=published in public video queries and sorts them', async () => {
    const mock = databaseMock([fixtureVideos[0]])
    const repository = new CloudBaseContentRepository(mock.app)
    await repository.listPublishedVideos('people')
    expect(mock.collection).toHaveBeenCalledWith('videos')
    expect(mock.where).toHaveBeenCalledWith({ status: 'published', category: 'people' })
    expect(mock.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')

    await repository.listPublishedVideos()
    expect(mock.where).toHaveBeenLastCalledWith({ status: 'published' })
  })

  it('keeps exact status and slug predicates on public detail queries', async () => {
    const videoMock = databaseMock([fixtureVideos[0]])
    await new CloudBaseContentRepository(videoMock.app).getPublishedVideo(fixtureVideos[0]!.slug)
    expect(videoMock.where).toHaveBeenCalledWith({ status: 'published', slug: fixtureVideos[0]!.slug })

    const photoMock = databaseMock([fixturePhotoSeries[0]])
    await new CloudBaseContentRepository(photoMock.app).getPublishedPhotoSeries(fixturePhotoSeries[0]!.slug)
    expect(photoMock.where).toHaveBeenCalledWith({ status: 'published', slug: fixturePhotoSeries[0]!.slug })
  })

  it('lists and reads only published photography and the main profile', async () => {
    const photoMock = databaseMock(fixturePhotoSeries)
    await new CloudBaseContentRepository(photoMock.app).listPublishedPhotoSeries()
    expect(photoMock.where).toHaveBeenCalledWith({ status: 'published' })
    expect(photoMock.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')

    const profileMock = databaseMock([fixtureProfile])
    await expect(new CloudBaseContentRepository(profileMock.app).getPublishedProfile()).resolves.toEqual(fixtureProfile)
    expect(profileMock.where).toHaveBeenCalledWith({ id: 'main', status: 'published' })
  })

  it('returns null for absent public detail and rejects an absent profile', async () => {
    const mock = databaseMock([])
    const repository = new CloudBaseContentRepository(mock.app)
    await expect(repository.getPublishedVideo('missing')).resolves.toBeNull()
    await expect(repository.getPublishedPhotoSeries('missing')).resolves.toBeNull()
    await expect(repository.getPublishedProfile()).rejects.toThrow('未找到已发布的个人资料。')
  })

  it('validates all inbound rows and malformed response shapes', async () => {
    const invalid = databaseMock([{ ...fixtureVideos[0], slug: 'not valid' }])
    await expect(new CloudBaseContentRepository(invalid.app).listPublishedVideos()).rejects.toThrow()
    const malformed = databaseMock()
    malformed.get.mockResolvedValueOnce({ items: [] })
    await expect(new CloudBaseContentRepository(malformed.app).listPublishedVideos()).rejects.toThrow('内容服务返回了无效数据。')
  })

  it('admin lists omit status filters and sort ascending', async () => {
    const videos = databaseMock(fixtureVideos)
    await new CloudBaseContentRepository(videos.app).listAllVideos()
    expect(videos.where).not.toHaveBeenCalled()
    expect(videos.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')

    const photos = databaseMock(fixturePhotoSeries)
    await new CloudBaseContentRepository(photos.app).listAllPhotoSeries()
    expect(photos.where).not.toHaveBeenCalled()
    expect(photos.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')
  })

  it('validates saves and targets exact document IDs', async () => {
    const videos = databaseMock()
    const videoRepository = new CloudBaseContentRepository(videos.app)
    await expect(videoRepository.saveVideo({ ...fixtureVideos[0]!, slug: 'not valid' })).rejects.toThrow()
    expect(videos.doc).not.toHaveBeenCalled()
    await expect(videoRepository.saveVideo(fixtureVideos[0]!)).resolves.toEqual(fixtureVideos[0])
    expect(videos.doc).toHaveBeenCalledWith(fixtureVideos[0]!.id)
    expect(videos.set).toHaveBeenCalledWith(fixtureVideos[0])
    await videoRepository.deleteVideo(fixtureVideos[0]!.id)
    expect(videos.doc).toHaveBeenLastCalledWith(fixtureVideos[0]!.id)
    expect(videos.remove).toHaveBeenCalled()

    const photos = databaseMock()
    const photoRepository = new CloudBaseContentRepository(photos.app)
    await photoRepository.savePhotoSeries(fixturePhotoSeries[0]!)
    expect(photos.doc).toHaveBeenCalledWith(fixturePhotoSeries[0]!.id)
    await photoRepository.deletePhotoSeries(fixturePhotoSeries[0]!.id)
    expect(photos.remove).toHaveBeenCalled()
  })

  it('always stores the validated singleton profile at main', async () => {
    const mock = databaseMock()
    const repository = new CloudBaseContentRepository(mock.app)
    await expect(repository.saveProfile({ ...fixtureProfile, id: 'other' } as unknown as typeof fixtureProfile)).rejects.toThrow()
    expect(mock.doc).not.toHaveBeenCalled()
    await expect(repository.saveProfile(fixtureProfile)).resolves.toEqual(fixtureProfile)
    expect(mock.doc).toHaveBeenCalledWith('main')
    expect(mock.set).toHaveBeenCalledWith(fixtureProfile)
  })

  it('reads the admin profile without a public status predicate', async () => {
    const hiddenProfile = { ...fixtureProfile, status: 'hidden' as const }
    const mock = databaseMock([hiddenProfile])
    const repository = new CloudBaseContentRepository(mock.app)

    await expect(repository.getProfile()).resolves.toEqual(hiddenProfile)
    expect(mock.where).toHaveBeenCalledWith({ id: 'main' })
    expect(mock.where).not.toHaveBeenCalledWith({ id: 'main', status: 'published' })
  })

  it('returns null for an absent admin profile and a safe error for malformed data', async () => {
    await expect(new CloudBaseContentRepository(databaseMock([]).app).getProfile()).resolves.toBeNull()
    const malformed = databaseMock([{ ...fixtureProfile, email: 'private malformed value' }])
    await expect(new CloudBaseContentRepository(malformed.app).getProfile()).rejects.toThrow('个人资料数据无效。')
  })

  it('parses and saves incomplete private records through admin-only schemas', async () => {
    const draftVideo = {
      ...fixtureVideos[0], status: 'draft' as const, title: '', horizontalCoverUrl: '', verticalCoverUrl: '',
      videoUrl: '', roles: [], summary: '', description: '',
    }
    const draftPhotos = {
      ...fixturePhotoSeries[0], status: 'hidden' as const, title: '', coverUrl: '', intro: '', photos: [],
    }
    const draftProfile = {
      ...fixtureProfile, status: 'draft' as const, name: '', role: '', statement: '', intro: '', portraitUrl: '',
      experience: [], capabilities: [], resumeUrl: '', email: '', wechatQrUrl: '', socialLinks: [],
    }

    const videos = databaseMock([draftVideo])
    await expect(new CloudBaseContentRepository(videos.app).listAllVideos()).resolves.toEqual([draftVideo])
    await expect(new CloudBaseContentRepository(videos.app).saveVideo(draftVideo)).resolves.toEqual(draftVideo)
    const photos = databaseMock([draftPhotos])
    await expect(new CloudBaseContentRepository(photos.app).listAllPhotoSeries()).resolves.toEqual([draftPhotos])
    await expect(new CloudBaseContentRepository(photos.app).savePhotoSeries(draftPhotos)).resolves.toEqual(draftPhotos)
    const profile = databaseMock([draftProfile])
    await expect(new CloudBaseContentRepository(profile.app).getProfile()).resolves.toEqual(draftProfile)
    await expect(new CloudBaseContentRepository(profile.app).saveProfile(draftProfile)).resolves.toEqual(draftProfile)
  })

  it('rejects untrusted media even on private admin records', async () => {
    const invalidDraft = { ...fixtureVideos[0], status: 'draft' as const, videoUrl: 'cloud://env/private.mp4' }
    const mock = databaseMock([invalidDraft])
    const repository = new CloudBaseContentRepository(mock.app)
    await expect(repository.listAllVideos()).rejects.toThrow()
    await expect(repository.saveVideo(invalidDraft)).rejects.toThrow()
    expect(mock.set).not.toHaveBeenCalled()
  })

  it('queries the live_works collection for sorted published public reads and hides private slugs', async () => {
    const list = databaseMock([fixtureLiveWorks[0]!])
    const repository = new CloudBaseContentRepository(list.app)

    await expect(repository.listPublishedLiveWorks()).resolves.toEqual([fixtureLiveWorks[0]])
    expect(list.collection).toHaveBeenCalledWith('live_works')
    expect(list.where).toHaveBeenCalledWith({ status: 'published' })
    expect(list.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')

    const detail = databaseMock([])
    await expect(new CloudBaseContentRepository(detail.app).getPublishedLiveWork('live-draft')).resolves.toBeNull()
    expect(detail.collection).toHaveBeenCalledWith('live_works')
    expect(detail.where).toHaveBeenCalledWith({ status: 'published', slug: 'live-draft' })
  })

  it('lists, validates, saves, and deletes every live-work state by exact document id', async () => {
    const hidden = { ...fixtureLiveWorks[1]!, id: 'live-hidden', slug: 'live-hidden', status: 'hidden' as const, title: '' }
    const mock = databaseMock([fixtureLiveWorks[0]!, hidden])
    const repository = new CloudBaseContentRepository(mock.app)

    await expect(repository.listAllLiveWorks()).resolves.toEqual([fixtureLiveWorks[0], hidden])
    expect(mock.collection).toHaveBeenCalledWith('live_works')
    expect(mock.where).not.toHaveBeenCalled()
    expect(mock.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')
    await expect(repository.saveLiveWork({ ...fixtureLiveWorks[0]!, slug: 'not valid!' })).rejects.toThrow()
    expect(mock.doc).not.toHaveBeenCalled()
    await expect(repository.saveLiveWork(fixtureLiveWorks[0]!)).resolves.toEqual(fixtureLiveWorks[0])
    expect(mock.doc).toHaveBeenCalledWith(fixtureLiveWorks[0]!.id)
    expect(mock.set).toHaveBeenCalledWith(fixtureLiveWorks[0])
    await repository.deleteLiveWork(fixtureLiveWorks[0]!.id)
    expect(mock.doc).toHaveBeenLastCalledWith(fixtureLiveWorks[0]!.id)
    expect(mock.remove).toHaveBeenCalled()
  })

  it('maps resolved live write failure envelopes to the generic repository error', async () => {
    const failedSave = databaseMock()
    failedSave.set.mockResolvedValueOnce({ code: 'DATABASE_REQUEST_FAILED', message: 'live_works permission denied' })

    await expect(new CloudBaseContentRepository(failedSave.app).saveLiveWork(fixtureLiveWorks[0]!)).rejects.toThrow('内容服务返回了无效数据。')

    const failedDelete = databaseMock()
    failedDelete.remove.mockResolvedValueOnce({ code: 'DATABASE_REQUEST_FAILED', message: 'live_works permission denied' })

    await expect(new CloudBaseContentRepository(failedDelete.app).deleteLiveWork(fixtureLiveWorks[0]!.id)).rejects.toThrow('内容服务返回了无效数据。')
  })

  it('queries aigc_works for sorted published public reads and keeps unpublished slugs private', async () => {
    const list = databaseMock([fixtureAigcWorks[0]!])
    const repository = new CloudBaseContentRepository(list.app)

    await expect(repository.listPublishedAigcWorks()).resolves.toEqual([fixtureAigcWorks[0]])
    expect(list.collection).toHaveBeenCalledWith('aigc_works')
    expect(list.where).toHaveBeenCalledWith({ status: 'published' })
    expect(list.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')

    const detail = databaseMock([])
    await expect(new CloudBaseContentRepository(detail.app).getPublishedAigcWork('aigc-draft')).resolves.toBeNull()
    expect(detail.collection).toHaveBeenCalledWith('aigc_works')
    expect(detail.where).toHaveBeenCalledWith({ status: 'published', slug: 'aigc-draft' })
  })

  it('lists, parses, saves, and deletes every AIGC state by exact document ID', async () => {
    const hidden = { ...fixtureAigcWorks[1]!, id: 'aigc-hidden', slug: 'aigc-hidden', status: 'hidden' as const, title: '' }
    const mock = databaseMock([fixtureAigcWorks[0]!, hidden])
    const repository = new CloudBaseContentRepository(mock.app)

    await expect(repository.listAllAigcWorks()).resolves.toEqual([fixtureAigcWorks[0], hidden])
    expect(mock.collection).toHaveBeenCalledWith('aigc_works')
    expect(mock.where).not.toHaveBeenCalled()
    expect(mock.orderBy).toHaveBeenCalledWith('sortOrder', 'asc')
    await expect(repository.saveAigcWork({ ...fixtureAigcWorks[0]!, slug: 'not valid!' })).rejects.toThrow()
    expect(mock.doc).not.toHaveBeenCalled()
    await expect(repository.saveAigcWork(fixtureAigcWorks[0]!)).resolves.toEqual(fixtureAigcWorks[0])
    expect(mock.doc).toHaveBeenCalledWith(fixtureAigcWorks[0]!.id)
    expect(mock.set).toHaveBeenCalledWith(fixtureAigcWorks[0])
    await repository.deleteAigcWork(fixtureAigcWorks[0]!.id)
    expect(mock.doc).toHaveBeenLastCalledWith(fixtureAigcWorks[0]!.id)
    expect(mock.remove).toHaveBeenCalled()
  })

  it('maps resolved AIGC write failure envelopes to the generic repository error', async () => {
    const failedSave = databaseMock()
    failedSave.set.mockResolvedValueOnce({ code: 'DATABASE_REQUEST_FAILED', message: 'aigc_works permission denied' })

    await expect(new CloudBaseContentRepository(failedSave.app).saveAigcWork(fixtureAigcWorks[0]!)).rejects.toThrow('内容服务返回了无效数据。')

    const failedDelete = databaseMock()
    failedDelete.remove.mockResolvedValueOnce({ code: 'DATABASE_REQUEST_FAILED', message: 'aigc_works permission denied' })

    await expect(new CloudBaseContentRepository(failedDelete.app).deleteAigcWork(fixtureAigcWorks[0]!.id)).rejects.toThrow('内容服务返回了无效数据。')
  })

  it('maps rejected AIGC writes to the generic repository error', async () => {
    const failedSave = databaseMock()
    failedSave.set.mockRejectedValueOnce(new Error('aigc_works permission denied'))

    await expect(new CloudBaseContentRepository(failedSave.app).saveAigcWork(fixtureAigcWorks[0]!)).rejects.toThrow('内容服务返回了无效数据。')

    const failedDelete = databaseMock()
    failedDelete.remove.mockRejectedValueOnce(new Error('aigc_works permission denied'))

    await expect(new CloudBaseContentRepository(failedDelete.app).deleteAigcWork(fixtureAigcWorks[0]!.id)).rejects.toThrow('内容服务返回了无效数据。')
  })
})
