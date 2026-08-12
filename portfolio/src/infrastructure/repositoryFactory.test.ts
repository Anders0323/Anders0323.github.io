import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureAigcWorks, fixtureLiveWorks } from '../fixtures/content'
import { MemoryContentRepository } from './memory/contentRepository'
import { createContentRepository } from './repositoryFactory'

const fakeApp = vi.hoisted(() => ({ database: vi.fn() }))
vi.mock('./cloudbase/client', () => ({ cloudbaseApp: () => fakeApp }))

describe('createContentRepository', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps memory as the default without CloudBase configuration', async () => {
    vi.stubEnv('VITE_CONTENT_BACKEND', '')
    await expect(createContentRepository()).resolves.toBeInstanceOf(MemoryContentRepository)
  })

  it('seeds the default memory repository with live works', async () => {
    vi.stubEnv('VITE_CONTENT_BACKEND', '')

    await expect((await createContentRepository()).listPublishedLiveWorks()).resolves.toEqual(fixtureLiveWorks)
  })

  it('seeds the default memory repository with published AIGC works for the ordinary preview', async () => {
    vi.stubEnv('VITE_CONTENT_BACKEND', '')

    await expect((await createContentRepository()).listPublishedAigcWorks()).resolves.toEqual(fixtureAigcWorks)
  })

  it('dynamically constructs CloudBase without falling back to fixtures', async () => {
    vi.stubEnv('VITE_CONTENT_BACKEND', 'cloudbase')
    const { CloudBaseContentRepository } = await import('./cloudbase/contentRepository')
    await expect(createContentRepository()).resolves.toBeInstanceOf(CloudBaseContentRepository)
  })
})
