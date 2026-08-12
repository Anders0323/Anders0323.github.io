import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ContentRepository } from '../../domain/repository'
import { fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { LiveDetailPage } from './LiveDetailPage'
import { LiveIndexPage } from './LiveIndexPage'
import globalStyles from '../../styles/global.css?raw'

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks)

function withLiveMethods(overrides: Pick<ContentRepository, 'listPublishedLiveWorks' | 'getPublishedLiveWork'>): ContentRepository {
  return {
    listPublishedVideos: async () => [],
    getPublishedVideo: async () => null,
    listPublishedPhotoSeries: async () => [],
    getPublishedPhotoSeries: async () => null,
    listPublishedAigcWorks: async () => [],
    getPublishedAigcWork: async () => null,
    getPublishedProfile: async () => fixtureProfile,
    ...overrides,
  }
}

describe('LiveIndexPage', () => {
  it('uses the shared compact catalog title and two-column work grid', async () => {
    const { container } = render(<MemoryRouter><LiveIndexPage repository={repository} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: '直播项目' })).toHaveClass('catalog-page-title')
    expect(await screen.findAllByTestId('live-work')).toHaveLength(2)
    expect(container.querySelector('.live-catalog-grid')).toHaveClass('catalog-work-grid')
  })

  it('uses dimensions from the screenshot whose URL matches the selected cover', async () => {
    const workWithSecondScreenshotCover = {
      ...fixtureLiveWorks[0]!,
      coverUrl: fixtureLiveWorks[0]!.screenshots[1]!.url,
    }
    const coverRepository = new MemoryContentRepository(
      fixtureVideos,
      fixturePhotoSeries,
      fixtureProfile,
      [workWithSecondScreenshotCover],
    )

    render(<MemoryRouter><LiveIndexPage repository={coverRepository} /></MemoryRouter>)

    const cover = await screen.findByRole('img', { name: '社区共创论坛直播现场封面' })
    expect(cover).toHaveAttribute('src', '/media/fixture-video-event-vertical.jpg')
    expect(cover).toHaveAttribute('width', '900')
    expect(cover).toHaveAttribute('height', '1600')
    expect(cover).toHaveStyle({ aspectRatio: '900 / 1600' })
  })

  it('releases the intrinsic HTML height so the live cover renders at its natural ratio', () => {
    expect(globalStyles).toMatch(
      /\.live-catalog-cover\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*object-fit:\s*cover;/s,
    )
  })

  it('lists published live work in repository order with its summary and never renders playback media', async () => {
    render(<MemoryRouter><LiveIndexPage repository={repository} /></MemoryRouter>)

    const cards = await screen.findAllByTestId('live-work')
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual(['社区共创论坛直播', '城市试驾日直播'])
    expect(within(cards[0]!).getByText('围绕用户故事与产品体验展开的线下直播。')).toBeInTheDocument()
    expect(within(cards[1]!).getByRole('link', { name: '查看《城市试驾日直播》直播项目' })).toHaveAttribute('href', '/live/drive-day-live')
    expect(document.querySelector('video')).toBeNull()
  })

  it('renders loading, empty, and rejected repository states without exposing stale work', async () => {
    let resolveList: ((value: typeof fixtureLiveWorks) => void) | undefined
    const loadingRepository = withLiveMethods({
      listPublishedLiveWorks: () => new Promise((resolve) => { resolveList = resolve }),
      getPublishedLiveWork: async () => null,
    })
    const loadingView = render(<MemoryRouter><LiveIndexPage repository={loadingRepository} /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('正在加载直播项目')
    resolveList?.(fixtureLiveWorks)
    expect(await screen.findAllByTestId('live-work')).toHaveLength(2)
    loadingView.unmount()

    const emptyRepository = withLiveMethods({ listPublishedLiveWorks: async () => [], getPublishedLiveWork: async () => null })
    render(<MemoryRouter><LiveIndexPage repository={emptyRepository} /></MemoryRouter>)
    expect(await screen.findByText('暂时没有已发布的直播项目。')).toBeInTheDocument()
  })

  it('keeps the error state safe when the live repository rejects', async () => {
    const rejectingRepository = withLiveMethods({
      listPublishedLiveWorks: async () => { throw new Error('unavailable') },
      getPublishedLiveWork: async () => { throw new Error('unavailable') },
    })
    render(<MemoryRouter><LiveIndexPage repository={rejectingRepository} /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('直播项目暂时无法加载')
    expect(document.querySelector('video')).toBeNull()
  })
})

describe('LiveDetailPage', () => {
  it('shows description and roles, preserves screenshot order, and returns focus to the exact opened screenshot', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/live/community-forum-live']}>
        <Routes><Route path="/live/:slug" element={<LiveDetailPage repository={repository} />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '社区共创论坛直播' })).toBeInTheDocument()
    expect(screen.getByText('直播统筹 / 现场导播 · 2025-06-21')).toBeInTheDocument()
    expect(screen.getByText('开发环境中的直播项目演示，通过横竖两种现场截图验证直播作品的卡片、详情叙事和图片浏览流程。')).toBeInTheDocument()
    const screenshots = screen.getAllByRole('button', { name: /全屏查看/ })
    expect(screenshots.map((button) => within(button).getByRole('img').getAttribute('alt'))).toEqual([
      '社区论坛舞台与观众的横向全景',
      '论坛嘉宾发言的竖向现场画面',
    ])
    expect(document.querySelector('video')).toBeNull()

    await user.click(screenshots[1]!)
    expect(screen.getByRole('dialog', { name: '摄影作品全屏浏览' })).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(screenshots[1]).toHaveFocus()
  })

  it('does not reveal an unpublished live slug', async () => {
    const unpublishedRepository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, [
      { ...fixtureLiveWorks[0]!, status: 'draft' },
    ])
    render(
      <MemoryRouter initialEntries={['/live/community-forum-live']}>
        <Routes><Route path="/live/:slug" element={<LiveDetailPage repository={unpublishedRepository} />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: '没有找到这个直播项目' })).toBeInTheDocument()
  })

  it('renders a safe error state when the detail repository rejects', async () => {
    const rejectingRepository = withLiveMethods({
      listPublishedLiveWorks: async () => [],
      getPublishedLiveWork: async () => { throw new Error('unavailable') },
    })
    render(
      <MemoryRouter initialEntries={['/live/community-forum-live']}>
        <Routes><Route path="/live/:slug" element={<LiveDetailPage repository={rejectingRepository} />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('请检查网络后重试。')
  })
})
