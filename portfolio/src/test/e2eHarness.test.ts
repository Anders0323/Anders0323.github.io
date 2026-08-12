import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRouter, type AdminRouteServices } from '../app/router'
import { RepositoryContext } from '../app/repositoryContext'
import { fixtureAigcWorks, fixtureLiveWorks } from '../fixtures/content'
import { createE2EHarness } from './e2eHarness'

const E2EAppRouter = AppRouter as (props: { adminServices?: AdminRouteServices }) => ReturnType<typeof AppRouter>

describe('E2E harness', () => {
  it('provides every public content type from one repository to injected admin services', async () => {
    const harness = createE2EHarness()

    await expect(harness.repository.listAllVideos()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'data-origin: fixture:video-people' }),
    ]))
    await expect(harness.repository.listAllPhotoSeries()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'data-origin: fixture:photo-people-car' }),
    ]))
    await expect(harness.repository.listAllLiveWorks()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'data-origin: fixture:live-community-forum' }),
    ]))
    await expect(harness.repository.listAllAigcWorks()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'data-origin: fixture:aigc-motion-study' }),
    ]))
    await expect(harness.adminServices.readImageDimensions?.(new File(['image'], 'cover.jpg', { type: 'image/jpeg' }))).resolves.toEqual({ width: 1600, height: 900 })
  })

  it('shares one authenticated memory repository without exposing CloudBase operations', async () => {
    const harness = createE2EHarness()

    await expect(harness.adminServices.auth.requireAdminSession()).resolves.toMatchObject({
      user: { uid: 'local-e2e-admin' },
    })
    const initial = await harness.repository.listAllVideos()
    await harness.repository.saveVideo({ ...initial[0], status: 'hidden' })

    await expect(harness.repository.getPublishedVideo(initial[0].slug)).resolves.toBeNull()
    expect(createE2EHarness()).not.toBe(harness)
  })

  it('returns deterministic public upload URLs without a network request', async () => {
    const harness = createE2EHarness()
    const file = new File(['image'], 'cover.jpg', { type: 'image/jpeg' })

    await expect(harness.adminServices.storage.upload(file, 'covers')).resolves.toEqual({
      id: 'e2e-upload-1',
      path: 'media/covers/e2e-upload-1.jpg',
      fullPath: 'e2e-only://media/covers/e2e-upload-1.jpg',
      url: '/media/fixture-photo-product.jpg',
    })
  })

  it('includes the live-work fixtures in the local admin repository', async () => {
    const harness = createE2EHarness()

    await expect(harness.repository.listAllLiveWorks()).resolves.toEqual(fixtureLiveWorks)
  })

  it('includes the AIGC fixtures in the local admin repository', async () => {
    const harness = createE2EHarness()

    await expect(harness.repository.listAllAigcWorks()).resolves.toEqual(fixtureAigcWorks)
  })

  it('publishes a newly created live work through the admin route and refreshes it in the public list using the same memory repository', async () => {
    const harness = createE2EHarness()
    const user = userEvent.setup()
    const adminServices = harness.adminServices
    const adminView = render(
      createElement(
        RepositoryContext.Provider,
        { value: harness.repository },
        createElement(MemoryRouter, { initialEntries: ['/admin/live/new'] }, createElement(E2EAppRouter, { adminServices })),
      ),
    )

    await screen.findByRole('heading', { name: '直播作品' })
    await user.clear(screen.getByLabelText('URL 标识'))
    await user.type(screen.getByLabelText('URL 标识'), 'e2e-live-public-refresh')
    await user.type(screen.getByLabelText('标题'), '同仓库直播闭环')
    await user.type(screen.getByLabelText('直播日期'), '2026-08-12')
    await user.type(screen.getByLabelText('一句简介'), '通过后台发布后刷新公开列表。')
    await user.type(screen.getByLabelText('详细说明'), '这个自动化闭环验证同一内存仓库中的后台直播编辑会即时进入公开作品列表。')
    await user.type(screen.getByLabelText('创作角色'), '直播统筹\n现场导演')
    await user.upload(screen.getByLabelText('上传直播截图'), new File(['one'], 'first.jpg', { type: 'image/jpeg' }))
    await user.upload(screen.getByLabelText('上传直播截图'), new File(['two'], 'second.jpg', { type: 'image/jpeg' }))

    await screen.findByLabelText('截图 2 URL')
    await user.type(screen.getByLabelText('截图 1 替代文字'), '直播后台首张截图')
    await user.type(screen.getByLabelText('截图 2 替代文字'), '直播后台第二张截图')
    const firstUrl = (screen.getByLabelText('截图 1 URL') as HTMLInputElement).value
    const secondUrl = (screen.getByLabelText('截图 2 URL') as HTMLInputElement).value
    expect(firstUrl).not.toBe(secondUrl)
    await user.click(screen.getByRole('button', { name: '上移：直播后台第二张截图' }))
    expect(screen.getByLabelText('截图 1 URL')).toHaveValue(secondUrl)
    expect(screen.getByLabelText('截图 2 URL')).toHaveValue(firstUrl)
    await user.click(screen.getByRole('button', { name: '设为封面：直播后台第二张截图' }))
    await user.click(screen.getByRole('button', { name: '发布直播作品' }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')

    adminView.unmount()
    render(
      createElement(
        RepositoryContext.Provider,
        { value: harness.repository },
        createElement(MemoryRouter, { initialEntries: ['/live'] }, createElement(E2EAppRouter, { adminServices })),
      ),
    )

    expect(await screen.findByRole('heading', { name: '同仓库直播闭环' })).toBeInTheDocument()
  })

  it('publishes image and video AIGC drafts through the admin route and refreshes both public cards from the same memory repository', async () => {
    const harness = createE2EHarness()
    const user = userEvent.setup()
    const adminServices = harness.adminServices
    const imageAdminView = render(
      createElement(
        RepositoryContext.Provider,
        { value: harness.repository },
        createElement(MemoryRouter, { initialEntries: ['/admin/aigc/new'] }, createElement(E2EAppRouter, { adminServices })),
      ),
    )

    await screen.findByRole('heading', { name: 'AIGC 作品' })
    await user.clear(screen.getByLabelText('URL 标识'))
    await user.type(screen.getByLabelText('URL 标识'), 'e2e-aigc-image-public-refresh')
    await user.type(screen.getByLabelText('标题'), '同仓库 AIGC 图片闭环')
    await user.type(screen.getByLabelText('一句简介'), '图片草稿发布后出现在公开目录。')
    await user.upload(screen.getByLabelText('上传最终图片'), new File(['image'], 'final.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
    await user.click(screen.getByRole('button', { name: '发布 AIGC 作品' }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
    imageAdminView.unmount()

    const videoAdminView = render(
      createElement(
        RepositoryContext.Provider,
        { value: harness.repository },
        createElement(MemoryRouter, { initialEntries: ['/admin/aigc/new'] }, createElement(E2EAppRouter, { adminServices })),
      ),
    )

    await screen.findByRole('heading', { name: 'AIGC 作品' })
    await user.selectOptions(screen.getByLabelText('媒体类型'), 'video')
    await user.clear(screen.getByLabelText('URL 标识'))
    await user.type(screen.getByLabelText('URL 标识'), 'e2e-aigc-video-public-refresh')
    await user.type(screen.getByLabelText('标题'), '同仓库 AIGC 视频闭环')
    await user.type(screen.getByLabelText('一句简介'), '视频草稿发布后出现在公开目录。')
    await user.upload(screen.getByLabelText('上传最终 MP4'), new File(['video'], 'final.mp4', { type: 'video/mp4' }))
    await user.upload(screen.getByLabelText('上传视频封面'), new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
    await user.click(screen.getByRole('button', { name: '发布 AIGC 作品' }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
    videoAdminView.unmount()

    render(
      createElement(
        RepositoryContext.Provider,
        { value: harness.repository },
        createElement(MemoryRouter, { initialEntries: ['/aigc'] }, createElement(E2EAppRouter, { adminServices })),
      ),
    )

    expect(await screen.findByRole('heading', { name: '同仓库 AIGC 图片闭环' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '同仓库 AIGC 视频闭环' })).toBeInTheDocument()
  })
})
