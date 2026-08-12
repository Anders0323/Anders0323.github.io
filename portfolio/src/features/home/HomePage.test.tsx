import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { HomePage } from './HomePage'

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)

describe('HomePage', () => {
  it('shows the four video categories and five photography series', async () => {
    render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    for (const label of ['人物叙事', '品牌表达', '现场纪实', '社交创意']) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }

    for (const label of ['人车之间', '空间与建筑', '活动现场', '运动瞬间', '产品与静物']) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it('renders the published profile as a hero with a works action', async () => {
    render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '新媒体运营 / 内容创作者' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看作品' })).toHaveAttribute('href', '#selected-work')
  })

  it('begins the light works surface with selected video work', async () => {
    render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    const heroSection = (await screen.findByRole('heading', { name: '新媒体运营 / 内容创作者' })).closest(
      'section',
    )
    const selectedVideoSection = screen.getByRole('heading', { name: '短视频作品' }).closest('section')

    expect(screen.queryByRole('heading', { name: '个人定位' })).not.toBeInTheDocument()
    expect(heroSection?.nextElementSibling?.firstElementChild).toBe(selectedVideoSection)
  })

  it('links four published covers to video detail routes without rendering video players', async () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    const expectedLinks = [
      ['归途的对话', '/videos/returning-conversation'],
      ['工作室的清晨', '/videos/studio-morning'],
      ['夜市现场', '/videos/night-market-live'],
      ['一分钟的手作', '/videos/one-minute-craft'],
    ]

    for (const [title, href] of expectedLinks) {
      expect(await screen.findByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', href)
    }

    expect(container.querySelector('video')).not.toBeInTheDocument()
  })

  it('renders mixed featured cover orientations with their selected assets and intrinsic ratios', async () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    const portraitCover = await screen.findByRole('img', { name: '归途的对话短视频封面' })
    const landscapeCover = screen.getByRole('img', { name: '工作室的清晨短视频封面' })

    expect(portraitCover.closest('article')).toHaveClass('video-card', 'video-layout-portrait')
    expect(portraitCover).toHaveClass('video-cover', 'cover-portrait')
    expect(portraitCover).toHaveAttribute('src', fixtureVideos[0].verticalCoverUrl)
    expect(portraitCover).toHaveAttribute('width', '3')
    expect(portraitCover).toHaveAttribute('height', '4')
    expect(landscapeCover.closest('article')).toHaveClass('video-card', 'video-layout-landscape')
    expect(landscapeCover).toHaveClass('video-cover', 'cover-landscape')
    expect(landscapeCover).toHaveAttribute('src', fixtureVideos[1].horizontalCoverUrl)
    expect(landscapeCover).toHaveAttribute('width', '4')
    expect(landscapeCover).toHaveAttribute('height', '3')
    expect(
      Array.from(container.querySelectorAll('.video-card strong'), (title) => title.textContent),
    ).toEqual(['归途的对话', '工作室的清晨', '夜市现场', '一分钟的手作'])
  })

  it('offers capability, resume, and contact paths from published profile data', async () => {
    render(
      <MemoryRouter>
        <HomePage repository={repository} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '能力与经历' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '下载 PDF 简历' })).toHaveAttribute('href', '/media/fixture-resume.pdf')
    expect(screen.getByRole('link', { name: 'creator@example.com' })).toHaveAttribute(
      'href',
      'mailto:creator@example.com',
    )
  })

  it('selects a featured work when a lower-sorted published work is not featured', async () => {
    const nonFeaturedVideo = {
      ...fixtureVideos[0],
      id: 'data-origin: fixture:video-people-non-featured',
      slug: 'non-featured-people-video',
      title: '非首页人物作品',
      featured: false,
      sortOrder: 0,
    }
    const repositoryWithNonFeatured = new MemoryContentRepository(
      [nonFeaturedVideo, ...fixtureVideos],
      fixturePhotoSeries,
      fixtureProfile,
    )

    render(
      <MemoryRouter>
        <HomePage repository={repositoryWithNonFeatured} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /归途的对话/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /非首页人物作品/ })).not.toBeInTheDocument()
  })
})
