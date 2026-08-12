import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SiteProfile } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)

function profileRepository(getPublishedProfile: ContentRepository['getPublishedProfile']): ContentRepository {
  return {
    listPublishedVideos: async () => [],
    getPublishedVideo: async () => null,
    listPublishedPhotoSeries: async () => [],
    getPublishedPhotoSeries: async () => null,
    listPublishedLiveWorks: async () => [],
    getPublishedLiveWork: async () => null,
    listPublishedAigcWorks: async () => [],
    getPublishedAigcWork: async () => null,
    getPublishedProfile,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill
  })
  return { promise, resolve }
}

describe('profile pages', () => {
  it('keeps the development WeChat QR fixture backed by a real public asset', () => {
    const publicAssets = import.meta.glob('/public/**/*', { eager: true, query: '?url', import: 'default' })
    const publicAssetPath = `/public${fixtureProfile.wechatQrUrl}`

    expect(publicAssets).toHaveProperty(publicAssetPath)
  })

  it('exposes a downloadable PDF résumé and a visible email link', async () => {
    render(
      <MemoryRouter>
        <AboutPage repository={repository} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: '下载 PDF 简历' })).toHaveAttribute('download')

    render(
      <MemoryRouter>
        <ContactPage repository={repository} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: /发送邮件/ })).toHaveAttribute(
      'href',
      'mailto:creator@example.com',
    )
  })

  it('renders the exact published identity, introduction, experience, and capabilities', async () => {
    render(
      <MemoryRouter>
        <AboutPage repository={repository} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: '林一川' })).toBeInTheDocument()
    expect(screen.getByText('新媒体运营 / 内容创作者')).toBeInTheDocument()
    expect(screen.getByText('用影像与文字记录有温度的现场。')).toBeInTheDocument()
    expect(screen.getByText(fixtureProfile.intro)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '工作经历' })).toHaveTextContent('开发演示：内容策划')
    expect(screen.getByRole('list', { name: '工作经历' })).toHaveTextContent('开发演示：短视频制作')
    expect(screen.getByRole('list', { name: '专业能力' })).toHaveTextContent('选题策划')
    expect(screen.getByRole('list', { name: '专业能力' })).toHaveTextContent('现场拍摄')
    expect(screen.getByRole('list', { name: '专业能力' })).toHaveTextContent('剪辑包装')
    expect(screen.getByRole('link', { name: '下载 PDF 简历' })).toHaveAttribute(
      'href',
      '/media/fixture-resume.pdf',
    )
  })

  it('renders contact details, a clearly described QR image, and safe external social links', async () => {
    render(
      <MemoryRouter>
        <ContactPage repository={repository} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /发送邮件/ })).toHaveTextContent('creator@example.com')
    expect(screen.getByRole('img', { name: /微信联系二维码/ })).toHaveAttribute(
      'src',
      '/media/fixture-wechat-qr.png',
    )
    const socialRegion = screen.getByRole('region', { name: '社交主页' })
    expect(within(socialRegion).getByRole('link', { name: '开发演示主页' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    expect(within(socialRegion).getByRole('link', { name: '开发演示主页' })).toHaveAttribute('target', '_blank')
    expect(within(socialRegion).getByRole('link', { name: '开发演示主页' })).toHaveAttribute(
      'rel',
      'noreferrer',
    )
  })

  it('omits social and phone details that are not part of the published model', async () => {
    const profileWithUnsupportedPhone = {
      ...fixtureProfile,
      phone: '13800138000',
      socialLinks: [],
    } as SiteProfile & { phone: string }
    render(
      <MemoryRouter>
        <ContactPage repository={profileRepository(async () => profileWithUnsupportedPhone)} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /发送邮件/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '社交主页' })).not.toBeInTheDocument()
    expect(screen.queryByText('13800138000')).not.toBeInTheDocument()
  })

  it('shows loading, empty, request-error, and successful retry states', async () => {
    const user = userEvent.setup()
    const pending = deferred<SiteProfile>()
    const loadingView = render(
      <MemoryRouter>
        <AboutPage repository={profileRepository(() => pending.promise)} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('正在加载个人资料')
    loadingView.unmount()

    const emptyRepository = profileRepository(async () => null as unknown as SiteProfile)
    const emptyView = render(
      <MemoryRouter>
        <AboutPage repository={emptyRepository} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('status')).toHaveTextContent('暂时没有已发布的个人资料')
    emptyView.unmount()

    let attempts = 0
    const retryRepository = profileRepository(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('private repository detail')
      return fixtureProfile
    })
    render(
      <MemoryRouter>
        <ContactPage repository={retryRepository} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('联系方式暂时无法加载')
    expect(screen.queryByText('private repository detail')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(await screen.findByRole('link', { name: /发送邮件/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores a stale profile response after the repository changes', async () => {
    const first = deferred<SiteProfile>()
    const secondProfile = { ...fixtureProfile, name: '新的创作者资料' }
    const { rerender } = render(
      <MemoryRouter>
        <AboutPage repository={profileRepository(() => first.promise)} />
      </MemoryRouter>,
    )

    rerender(
      <MemoryRouter>
        <AboutPage repository={profileRepository(async () => secondProfile)} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: '新的创作者资料' })).toBeInTheDocument()

    await act(async () => {
      first.resolve(fixtureProfile)
      await first.promise
    })
    expect(screen.getByRole('heading', { name: '新的创作者资料' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '林一川' })).not.toBeInTheDocument()
  })
})
