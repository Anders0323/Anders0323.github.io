import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ContentRepository } from '../domain/repository'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../fixtures/content'
import { MemoryContentRepository } from '../infrastructure/memory/contentRepository'
import { AppRouter } from './router'
import { RepositoryContext } from './repositoryContext'

const rejectingProfileRepository: ContentRepository = {
  listPublishedVideos: async () => [],
  getPublishedVideo: async () => null,
  listPublishedPhotoSeries: async () => [],
  getPublishedPhotoSeries: async () => null,
  listPublishedLiveWorks: async () => [],
  getPublishedLiveWork: async () => null,
  listPublishedAigcWorks: async () => [],
  getPublishedAigcWork: async () => null,
  getPublishedProfile: async () => {
    throw new Error('profile unavailable')
  },
}

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks, fixtureAigcWorks)
const adminServices = {
  auth: {
    signInAdmin: async () => ({ user: { is_anonymous: false }, session: { access_token: 'token' } }),
    requireAdminSession: async () => ({ user: { is_anonymous: false }, session: { access_token: 'token' } }),
    signOut: async () => undefined,
  },
  storage: { upload: async () => ({ id: 'id', path: 'path', fullPath: 'cloud://path', url: 'https://assets.example.com/file' }) },
}

const expectedPublicNavigation = [
  ['首页', '/'],
  ['短视频', '/videos'],
  ['摄影', '/photography'],
  ['直播', '/live'],
  ['AIGC', '/aigc'],
  ['关于', '/about'],
  ['联系', '/contact'],
]

function linkPairs(navigation: HTMLElement) {
  return Array.from(navigation.querySelectorAll('a')).map((link) => [link.textContent, link.getAttribute('href')])
}

describe('AppRouter', () => {
  it('exposes the exact public navigation order in the shared footer', () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(linkPairs(screen.getByLabelText('页尾链接'))).toEqual(expectedPublicNavigation)
  })

  it('routes every live and AIGC public URL inside the public shell', async () => {
    const routes = [
      { path: '/live', heading: '社区共创论坛直播' },
      { path: '/live/drive-day-live', heading: '城市试驾日直播' },
      { path: '/aigc', heading: '光影习作' },
      { path: '/aigc/aigc-motion-study', heading: '流动习作' },
    ]

    for (const route of routes) {
      const view = render(
        <RepositoryContext.Provider value={repository}>
          <MemoryRouter initialEntries={[route.path]}>
            <AppRouter />
          </MemoryRouter>
        </RepositoryContext.Provider>,
      )

      expect(await screen.findByRole('heading', { name: route.heading })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      view.unmount()
    }
  })

  it('uses the published profile for the browser title and restores the neutral title on cleanup', async () => {
    document.title = '旧的静态姓名标题'
    const view = render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    await screen.findByRole('heading', { name: '新媒体运营 / 内容创作者' })
    expect(document.title).toBe('林一川｜新媒体运营 / 内容创作者')

    view.unmount()
    expect(document.title).toBe('新媒体作品集｜内容创作者')
  })

  it('keeps the neutral browser title when the published profile cannot load', async () => {
    document.title = '旧的静态姓名标题'
    render(
      <RepositoryContext.Provider value={rejectingProfileRepository}>
        <MemoryRouter>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    await screen.findByRole('heading', { name: '内容暂时无法加载' })
    expect(document.title).toBe('新媒体作品集｜内容创作者')
  })

  it('keeps the public shell available when the published profile request rejects', async () => {
    render(
      <RepositoryContext.Provider value={rejectingProfileRepository}>
        <MemoryRouter>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '内容暂时无法加载' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('个人资料暂时无法加载')
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('routes a shared category URL to the real short-video catalog', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/videos?category=brand']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '工作室的清晨' })).toBeInTheDocument()
    expect(screen.queryByText('页面将在下一阶段接入完整内容。')).not.toBeInTheDocument()
  })

  it('routes a published slug to the real short-video detail', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/videos/returning-conversation']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '归途的对话' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放《归途的对话》' })).toBeInTheDocument()
  })

  it('routes the photography index to the five real published series', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/photography']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findAllByTestId('photo-series')).toHaveLength(5)
    expect(screen.getByRole('link', { name: '查看《产品与静物》摄影系列' })).toHaveAttribute(
      'href',
      '/photography/objects-in-light',
    )
    expect(screen.queryByText('页面将在下一阶段接入完整内容。')).not.toBeInTheDocument()
  })

  it('routes a published photography slug to its ordered series detail', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/photography/light-and-space']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '空间与建筑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全屏查看：开发演示空间摄影' })).toBeInTheDocument()
  })

  it('routes the live index and a published live slug to image-only live portfolio pages', async () => {
    const indexView = render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/live']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '社区共创论坛直播' })).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
    indexView.unmount()

    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/live/drive-day-live']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )
    expect(await screen.findByRole('heading', { name: '城市试驾日直播' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全屏查看：试驾车辆与参与者的横向现场画面' })).toBeInTheDocument()
  })

  it('routes the AIGC catalog and its published detail inside the public shell', async () => {
    const indexView = render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/aigc']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '光影习作' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    indexView.unmount()

    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/aigc/aigc-motion-study']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )
    expect(await screen.findByRole('heading', { name: '流动习作' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放《流动习作》' })).toBeInTheDocument()
  })

  it('routes about and contact URLs to repository-backed profile pages inside the public shell', async () => {
    const aboutView = render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/about']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: '林一川' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '下载 PDF 简历' })).toHaveAttribute('download')
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    aboutView.unmount()

    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/contact']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )
    expect(await screen.findByRole('link', { name: /发送邮件/ })).toHaveAttribute(
      'href',
      'mailto:creator@example.com',
    )
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('uses a public-safe RouteError for unknown URLs', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/not-a-real-page?env=private-cloudbase-id']}>
          <AppRouter />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '页面未找到' })).toBeInTheDocument()
    expect(screen.getByText('没有找到这个页面。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/private-cloudbase-id/)).not.toBeInTheDocument()
    expect(screen.queryByText('页面将在下一阶段接入完整内容。')).not.toBeInTheDocument()
  })

  it('resets the viewport to the top after ordinary Link navigation', async () => {
    const user = userEvent.setup()
    const originalScrollTo = window.scrollTo
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 187 })
    window.scrollTo = ((optionsOrX: ScrollToOptions | number, y?: number) => {
      const nextY = typeof optionsOrX === 'number' ? (y ?? 0) : (optionsOrX.top ?? 0)
      Object.defineProperty(window, 'scrollY', { configurable: true, value: nextY })
    }) as typeof window.scrollTo

    try {
      render(
        <RepositoryContext.Provider value={repository}>
          <MemoryRouter initialEntries={['/photography']}>
            <AppRouter />
          </MemoryRouter>
        </RepositoryContext.Provider>,
      )

      await user.click(await screen.findByRole('link', { name: '查看《人车之间》摄影系列' }))

      expect(await screen.findByRole('heading', { name: '人车之间' })).toBeInTheDocument()
      expect(window.scrollY).toBe(0)
    } finally {
      window.scrollTo = originalScrollTo
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY)
      } else {
        Reflect.deleteProperty(window, 'scrollY')
      }
    }
  })

  it('keeps the admin login outside the public portfolio shell', () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/admin/login']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: '作品管理后台' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('routes every protected admin editor through the authenticated admin shell', async () => {
    const routes = [
      { path: '/admin', heading: '作品管理' },
      { path: `/admin/videos/${encodeURIComponent(fixtureVideos[0]!.id)}`, heading: '短视频作品' },
      { path: `/admin/photography/${encodeURIComponent(fixturePhotoSeries[0]!.id)}`, heading: '摄影系列' },
      { path: '/admin/live', heading: '直播作品' },
      { path: `/admin/live/${encodeURIComponent(fixtureLiveWorks[0]!.id)}`, heading: '直播作品' },
      { path: '/admin/aigc', heading: 'AIGC 作品' },
      { path: `/admin/aigc/${encodeURIComponent(fixtureAigcWorks[0]!.id)}`, heading: 'AIGC 作品' },
      { path: '/admin/profile', heading: '个人资料' },
    ]

    for (const route of routes) {
      const view = render(
        <RepositoryContext.Provider value={repository}>
          <MemoryRouter initialEntries={[route.path]}>
            <AppRouter adminServices={adminServices} />
          </MemoryRouter>
        </RepositoryContext.Provider>,
      )
      expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: '后台导航' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('opens a blank draft form when no profile has been created yet', async () => {
    const missingProfile = vi.spyOn(repository, 'getProfile').mockResolvedValueOnce(null as never)

    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/admin/profile']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: '个人资料' })).toBeInTheDocument()
    expect(screen.getByLabelText('资料 ID')).toHaveValue('main')
    expect(screen.getByLabelText('姓名')).toHaveValue('')
    expect(screen.getByLabelText('发布状态')).toHaveValue('draft')
    expect(screen.queryByRole('heading', { name: '个人资料暂时无法读取' })).not.toBeInTheDocument()

    missingProfile.mockRestore()
  })

  it('keeps all authenticated admin destinations discoverable without exposing the public shell', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/admin']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    await screen.findByRole('heading', { level: 1, name: '作品管理' })
    expect(linkPairs(screen.getByRole('navigation', { name: '后台导航' }))).toEqual([
      ['全部作品', '/admin'],
      ['直播', '/admin/live'],
      ['AIGC', '/admin/aigc'],
      ['个人资料', '/admin/profile'],
    ])
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
  })

  it('creates new video drafts with a portrait cover orientation', async () => {
    render(
      <RepositoryContext.Provider value={repository}>
        <MemoryRouter initialEntries={['/admin/videos/new']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByLabelText('封面版式')).toHaveValue('portrait')
  })

  it('routes a schema-valid image-only live draft editor', async () => {
    const user = userEvent.setup()
    const freshRepository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks)
    render(
      <RepositoryContext.Provider value={freshRepository}>
        <MemoryRouter initialEntries={['/admin/live/new']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: '直播作品' })).toBeInTheDocument()
    expect(screen.getByLabelText('标题')).toHaveValue('')
    expect(screen.getByLabelText('直播日期')).toHaveValue('')
    expect(screen.getByText('截图（0 / 12）')).toBeVisible()
    expect(screen.queryByLabelText(/视频|回放/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    const created = (await freshRepository.listAllLiveWorks()).find((work) => work.slug.startsWith('new-live-'))
    expect(created).toEqual(expect.objectContaining({
      title: '', summary: '', description: '', roles: [], heldAt: '', coverUrl: '', screenshots: [], featured: false, sortOrder: 0, status: 'draft',
    }))
    expect(created?.id).toMatch(/^live-\d+$/)
    expect(created?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('creates an incomplete AIGC draft without any creative-process fields', async () => {
    const user = userEvent.setup()
    const freshRepository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile, fixtureLiveWorks, fixtureAigcWorks)
    render(
      <RepositoryContext.Provider value={freshRepository}>
        <MemoryRouter initialEntries={['/admin/aigc/new']}>
          <AppRouter adminServices={adminServices} />
        </MemoryRouter>
      </RepositoryContext.Provider>,
    )

    expect(await screen.findByLabelText('媒体类型')).toHaveValue('image')
    expect(screen.getByLabelText('标题')).toHaveValue('')
    expect(screen.queryByLabelText(/提示词|模型|流程/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    const created = (await freshRepository.listAllAigcWorks()).find((work) => work.slug.startsWith('new-aigc-'))
    expect(created).toEqual(expect.objectContaining({ title: '', mediaType: 'image', mediaUrl: '', coverUrl: '', summary: '', featured: false, sortOrder: 0, status: 'draft' }))
    expect(created?.year).toBe(new Date().getFullYear())
  })
})
