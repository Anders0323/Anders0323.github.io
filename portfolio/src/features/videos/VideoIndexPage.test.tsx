import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { VideoCategory } from '../../domain/content'
import { fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { VideoDetailPage } from './VideoDetailPage'
import { VideoIndexPage } from './VideoIndexPage'
import globalStyles from '../../styles/global.css?raw'

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)

class FailsOnceVideoRepository extends MemoryContentRepository {
  private failed = false

  override async listPublishedVideos(category?: VideoCategory) {
    if (!this.failed) {
      this.failed = true
      throw new Error('temporary network failure')
    }

    return super.listPublishedVideos(category)
  }
}

function CurrentSearch() {
  return <output aria-label="当前查询参数">{useLocation().search}</output>
}

describe('VideoIndexPage', () => {
  it('uses the shared compact catalog title and two-column work grid', async () => {
    const { container } = render(
      <MemoryRouter>
        <VideoIndexPage repository={repository} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '短视频作品' })).toHaveClass('catalog-page-title')
    expect(await screen.findAllByTestId('video-work')).toHaveLength(4)
    expect(container.querySelector('.video-catalog-grid')).toHaveClass('catalog-work-grid')
  })

  it('filters by 人物叙事 without hiding the category navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <VideoIndexPage repository={repository} />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '人物叙事' }))

    expect(await screen.findAllByTestId('video-work')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '归途的对话' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '品牌表达' })).toBeVisible()
  })

  it('initializes from a valid category query and updates a shareable query after filtering', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/videos?category=event']}>
        <VideoIndexPage repository={repository} />
        <CurrentSearch />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '夜市现场' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '归途的对话' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '现场纪实' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '社交创意' }))

    expect(await screen.findByRole('heading', { name: '一分钟的手作' })).toBeInTheDocument()
    expect(screen.getByLabelText('当前查询参数')).toHaveTextContent('?category=social')
  })

  it('treats an invalid category query as the all-work default without breaking navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/videos?category=unknown']}>
        <VideoIndexPage repository={repository} />
      </MemoryRouter>,
    )

    expect(await screen.findAllByTestId('video-work')).toHaveLength(4)
    expect(screen.getByRole('navigation', { name: '短视频分类' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(4)
  })

  it('renders mixed cover orientations with their selected assets and intrinsic ratios', async () => {
    const { container } = render(
      <MemoryRouter>
        <VideoIndexPage repository={repository} />
      </MemoryRouter>,
    )

    const portraitCover = await screen.findByRole('img', { name: '归途的对话短视频封面' })
    const landscapeCover = screen.getByRole('img', { name: '工作室的清晨短视频封面' })

    expect(portraitCover.closest('article')).toHaveClass('video-catalog-card', 'video-layout-portrait')
    expect(portraitCover).toHaveClass('video-catalog-cover', 'cover-portrait')
    expect(portraitCover).toHaveAttribute('src', fixtureVideos[0].verticalCoverUrl)
    expect(portraitCover).toHaveAttribute('width', '3')
    expect(portraitCover).toHaveAttribute('height', '4')
    expect(landscapeCover.closest('article')).toHaveClass(
      'video-catalog-card',
      'video-layout-landscape',
    )
    expect(landscapeCover).toHaveClass('video-catalog-cover', 'cover-landscape')
    expect(landscapeCover).toHaveAttribute('src', fixtureVideos[1].horizontalCoverUrl)
    expect(landscapeCover).toHaveAttribute('width', '4')
    expect(landscapeCover).toHaveAttribute('height', '3')
    expect(
      Array.from(container.querySelectorAll('.video-catalog-card h3'), (title) => title.textContent),
    ).toEqual(['归途的对话', '工作室的清晨', '夜市现场', '一分钟的手作'])
  })

  it('announces an empty published category without removing its filters', async () => {
    const emptyRepository = new MemoryContentRepository([], fixturePhotoSeries, fixtureProfile)
    render(
      <MemoryRouter initialEntries={['/videos?category=people']}>
        <VideoIndexPage repository={emptyRepository} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('这个分类暂时没有已发布作品。')).toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: '人物叙事' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('recovers from a list request error when the visitor retries', async () => {
    const user = userEvent.setup()
    const retryingRepository = new FailsOnceVideoRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)
    render(
      <MemoryRouter>
        <VideoIndexPage repository={retryingRepository} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('短视频作品暂时无法加载')

    await user.click(screen.getByRole('button', { name: '重新加载' }))

    expect(await screen.findAllByTestId('video-work')).toHaveLength(4)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('VideoDetailPage', () => {
  it('keeps long mobile detail titles subordinate to the video', () => {
    expect(globalStyles).toMatch(
      /\.video-detail-heading h1\s*\{[^}]*font-size:\s*clamp\(2\.5rem,\s*11vw,\s*3rem\);[^}]*line-height:\s*\.96;/s,
    )
  })

  it('shows a clear not-found state for an unpublished or missing work', async () => {
    render(
      <MemoryRouter initialEntries={['/videos/draft-film']}>
        <Routes>
          <Route path="/videos/:slug" element={<VideoDetailPage repository={repository} />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '没有找到这支作品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回短视频作品' })).toHaveAttribute('href', '/videos')
  })

  it('renders published metadata but no video element before the visitor clicks play', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/videos/returning-conversation']}>
        <Routes>
          <Route path="/videos/:slug" element={<VideoDetailPage repository={repository} />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '归途的对话' })).toBeInTheDocument()
    expect(screen.getByText('采访 / 剪辑 · 2025')).toBeInTheDocument()
    expect(screen.getByText('一次关于返乡与选择的短访谈。')).toBeInTheDocument()
    expect(container.querySelector('video')).not.toBeInTheDocument()
  })

  it('uses the selected cover orientation for the detail player poster and initial ratio', async () => {
    const landscapeVideo = { ...fixtureVideos[1], status: 'published' as const }
    const landscapeRepository = new MemoryContentRepository(
      [landscapeVideo],
      fixturePhotoSeries,
      fixtureProfile,
    )
    const { container } = render(
      <MemoryRouter initialEntries={[`/videos/${landscapeVideo.slug}`]}>
        <Routes>
          <Route path="/videos/:slug" element={<VideoDetailPage repository={landscapeRepository} />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('img', { name: `${landscapeVideo.title}视频封面` })).toHaveAttribute(
      'src',
      landscapeVideo.horizontalCoverUrl,
    )
    expect(container.querySelector('.video-player')).toHaveStyle({ aspectRatio: `${16 / 9}` })
  })
})
