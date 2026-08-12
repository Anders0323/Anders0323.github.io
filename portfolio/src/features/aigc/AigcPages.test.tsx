import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ContentRepository } from '../../domain/repository'
import { fixtureAigcWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { AigcDetailPage } from './AigcDetailPage'
import { AigcIndexPage } from './AigcIndexPage'
import globalStyles from '../../styles/global.css?raw'

const repository = new MemoryContentRepository(
  fixtureVideos,
  fixturePhotoSeries,
  fixtureProfile,
  [],
  fixtureAigcWorks,
)

function withAigcMethods(overrides: Pick<ContentRepository, 'listPublishedAigcWorks' | 'getPublishedAigcWork'>): ContentRepository {
  return {
    listPublishedVideos: async () => [],
    getPublishedVideo: async () => null,
    listPublishedPhotoSeries: async () => [],
    getPublishedPhotoSeries: async () => null,
    listPublishedLiveWorks: async () => [],
    getPublishedLiveWork: async () => null,
    getPublishedProfile: async () => fixtureProfile,
    ...overrides,
  }
}

describe('AigcIndexPage', () => {
  it('uses the shared compact catalog title and two-column work grid', async () => {
    const { container } = render(<MemoryRouter><AigcIndexPage repository={repository} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'AIGC 作品' })).toHaveClass('catalog-page-title')
    expect(await screen.findAllByTestId('aigc-work')).toHaveLength(2)
    expect(container.querySelector('.aigc-catalog-grid')).toHaveClass('catalog-work-grid')
  })

  it('backs each fixture catalog image and video poster with a public development raster asset', () => {
    const publicAssets = import.meta.glob('/public/**/*', { eager: true, query: '?url', import: 'default' })

    expect(publicAssets).toHaveProperty(`/public${fixtureAigcWorks[0]!.mediaUrl}`)
    expect(publicAssets).toHaveProperty(`/public${fixtureAigcWorks[1]!.coverUrl}`)
  })

  it('releases the intrinsic image height so every catalog cover keeps its 4:3 slot', () => {
    expect(globalStyles).toMatch(
      /\.aigc-catalog-cover\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*4\s*\/\s*3;[^}]*object-fit:\s*cover;/s,
    )
  })

  it('uses final images and video covers in the mixed public catalog without creative-process copy', async () => {
    render(<MemoryRouter><AigcIndexPage repository={repository} /></MemoryRouter>)

    const cards = await screen.findAllByTestId('aigc-work')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]!).getByRole('img', { name: '光影习作作品封面' })).toHaveAttribute('src', fixtureAigcWorks[0]!.mediaUrl)
    expect(within(cards[1]!).getByRole('img', { name: '流动习作作品封面' })).toHaveAttribute('src', fixtureAigcWorks[1]!.coverUrl)
    expect(within(cards[0]!).getByText('开发环境中的 AIGC 光影视觉作品演示。')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('2026')).toBeInTheDocument()
    expect(screen.queryByText(/提示词|模型|流程/)).not.toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
  })

  it('keeps loading responses from replacing a newer empty catalog', async () => {
    let resolveFirstRequest: ((works: typeof fixtureAigcWorks) => void) | undefined
    const slowRepository = withAigcMethods({
      listPublishedAigcWorks: () => new Promise((resolve) => { resolveFirstRequest = resolve }),
      getPublishedAigcWork: async () => null,
    })
    const emptyRepository = withAigcMethods({
      listPublishedAigcWorks: async () => [],
      getPublishedAigcWork: async () => null,
    })
    const view = render(<MemoryRouter><AigcIndexPage repository={slowRepository} /></MemoryRouter>)

    expect(screen.getByRole('status')).toHaveTextContent('正在加载 AIGC 作品')
    view.rerender(<MemoryRouter><AigcIndexPage repository={emptyRepository} /></MemoryRouter>)
    expect(await screen.findByText('暂时没有已发布的 AIGC 作品。')).toBeInTheDocument()

    resolveFirstRequest?.(fixtureAigcWorks)
    expect(await screen.findByText('暂时没有已发布的 AIGC 作品。')).toBeInTheDocument()
    expect(screen.queryByTestId('aigc-work')).not.toBeInTheDocument()
  })

  it('renders empty and rejected responses as safe states', async () => {
    const emptyRepository = withAigcMethods({
      listPublishedAigcWorks: async () => [],
      getPublishedAigcWork: async () => null,
    })
    const emptyView = render(<MemoryRouter><AigcIndexPage repository={emptyRepository} /></MemoryRouter>)
    expect(await screen.findByText('暂时没有已发布的 AIGC 作品。')).toBeInTheDocument()
    emptyView.unmount()

    const rejectingRepository = withAigcMethods({
      listPublishedAigcWorks: async () => { throw new Error('private backend failure') },
      getPublishedAigcWork: async () => { throw new Error('private backend failure') },
    })
    render(<MemoryRouter><AigcIndexPage repository={rejectingRepository} /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('AIGC 作品暂时无法加载')
    expect(screen.queryByText(/private backend failure/)).not.toBeInTheDocument()
  })
})

describe('AigcDetailPage', () => {
  it('renders an image detail through ResponsiveImage without a forced video player', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/aigc/aigc-light-study']}>
        <Routes><Route path="/aigc/:slug" element={<AigcDetailPage repository={repository} />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '光影习作' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '光影习作作品' })).toHaveAttribute('src', fixtureAigcWorks[0]!.mediaUrl)
    expect(screen.getByText('开发环境中的 AIGC 光影视觉作品演示。')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(container.querySelector('video')).toBeNull()
  })

  it('defers creation of a video element until the visitor consents to play', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter initialEntries={['/aigc/aigc-motion-study']}>
        <Routes><Route path="/aigc/:slug" element={<AigcDetailPage repository={repository} />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '流动习作' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '流动习作视频封面' })).toHaveAttribute('src', fixtureAigcWorks[1]!.coverUrl)
    expect(container.querySelector('video')).toBeNull()

    await user.click(screen.getByRole('button', { name: '播放《流动习作》' }))
    expect(container.querySelector('video[aria-label="流动习作"]')).toBeInTheDocument()
  })

  it('does not reveal an unpublished or missing AIGC work', async () => {
    render(
      <MemoryRouter initialEntries={['/aigc/missing']}>
        <Routes><Route path="/aigc/:slug" element={<AigcDetailPage repository={repository} />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '没有找到这个 AIGC 作品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回 AIGC 作品' })).toHaveAttribute('href', '/aigc')
  })

  it('renders a generic retry state when the detail request rejects', async () => {
    const rejectingRepository = withAigcMethods({
      listPublishedAigcWorks: async () => [],
      getPublishedAigcWork: async () => { throw new Error('private backend failure') },
    })
    render(
      <MemoryRouter initialEntries={['/aigc/aigc-light-study']}>
        <Routes><Route path="/aigc/:slug" element={<AigcDetailPage repository={rejectingRepository} />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('请检查网络后重试。')
    expect(screen.queryByText(/private backend failure/)).not.toBeInTheDocument()
  })
})
