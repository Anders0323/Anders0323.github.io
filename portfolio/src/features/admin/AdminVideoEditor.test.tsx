import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fixtureVideos } from '../../fixtures/content'
import { AdminVideoEditor } from './AdminVideoEditor'

function repositoryMock() {
  return { saveVideo: vi.fn().mockImplementation(async (video) => video) }
}

function storageMock() {
  return {
    upload: vi.fn().mockResolvedValue({
      id: 'cloud-id',
      path: 'media/covers/id.jpg',
      fullPath: 'cloud://env/media/covers/id.jpg',
      url: 'https://assets.example.com/uploaded.jpg',
    }),
  }
}

describe('AdminVideoEditor', () => {
  it('saves the selected cover orientation when publishing', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()

    render(
      <AdminVideoEditor
        repository={repository as never}
        storage={storageMock() as never}
        initialValue={fixtureVideos[0]}
      />,
    )

    await user.selectOptions(screen.getByLabelText('封面版式'), 'landscape')
    await user.click(screen.getByRole('button', { name: '发布作品' }))

    expect(repository.saveVideo).toHaveBeenCalledWith(expect.objectContaining({ coverOrientation: 'landscape' }))
  })

  it('blocks publishing when the selected landscape cover is missing', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()

    render(
      <AdminVideoEditor
        repository={repository as never}
        storage={storageMock() as never}
        initialValue={{ ...fixtureVideos[0], coverOrientation: 'landscape', horizontalCoverUrl: '' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '发布作品' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请上传横版封面')
    expect(repository.saveVideo).not.toHaveBeenCalled()
  })

  it('blocks publishing when the selected portrait cover is missing', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()

    render(
      <AdminVideoEditor
        repository={repository as never}
        storage={storageMock() as never}
        initialValue={{ ...fixtureVideos[0], coverOrientation: 'portrait', verticalCoverUrl: '' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '发布作品' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请上传竖版封面')
    expect(repository.saveVideo).not.toHaveBeenCalled()
  })

  it.each([
    {
      orientation: 'portrait' as const,
      horizontalCoverUrl: '',
      verticalCoverUrl: '/media/selected-portrait.webp',
    },
    {
      orientation: 'landscape' as const,
      horizontalCoverUrl: '/media/selected-landscape.webp',
      verticalCoverUrl: '',
    },
  ])('publishes $orientation work when only its selected cover is present', async ({
    orientation,
    horizontalCoverUrl,
    verticalCoverUrl,
  }) => {
    const user = userEvent.setup()
    const repository = repositoryMock()

    render(
      <AdminVideoEditor
        repository={repository as never}
        storage={storageMock() as never}
        initialValue={{
          ...fixtureVideos[0],
          coverOrientation: orientation,
          horizontalCoverUrl,
          verticalCoverUrl,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '发布作品' }))

    expect(repository.saveVideo).toHaveBeenCalledWith(expect.objectContaining({
      coverOrientation: orientation,
      horizontalCoverUrl,
      verticalCoverUrl,
      status: 'published',
    }))
  })

  it('exposes every video field and persists a schema-valid edited payload', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const initialValue = fixtureVideos[0]

    render(<AdminVideoEditor repository={repository as never} storage={storageMock() as never} initialValue={initialValue} />)

    for (const label of [
      '作品 ID', 'URL 标识', '标题', '分类', '横版封面 URL', '竖版封面 URL', '视频 URL', '创作角色',
      '年份', '发布平台', '一句简介', '详细说明', '数据表现', '首页推荐', '排序', '发布状态', '封面版式', '更新时间',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }

    await user.clear(screen.getByLabelText('标题'))
    await user.type(screen.getByLabelText('标题'), '新的作品标题')
    await user.selectOptions(screen.getByLabelText('发布状态'), 'hidden')
    await user.click(screen.getByRole('button', { name: '保存作品' }))

    expect(repository.saveVideo).toHaveBeenCalledWith(expect.objectContaining({
      id: initialValue.id,
      title: '新的作品标题',
      status: 'hidden',
      roles: ['采访', '剪辑'],
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
  })

  it('uploads horizontal cover, vertical cover, and MP4 independently and keeps only public URLs', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const storage = storageMock()
    storage.upload
      .mockResolvedValueOnce({ id: '1', path: 'cover-horizontal', fullPath: 'cloud://one', url: 'https://assets.example.com/horizontal.jpg' })
      .mockResolvedValueOnce({ id: '2', path: 'cover-vertical', fullPath: 'cloud://two', url: 'https://assets.example.com/vertical.jpg' })
      .mockResolvedValueOnce({ id: '3', path: 'video', fullPath: 'cloud://three', url: 'https://assets.example.com/video.mp4' })

    render(<AdminVideoEditor repository={repository as never} storage={storage as never} initialValue={fixtureVideos[0]} />)

    await user.upload(screen.getByLabelText('上传横版封面'), new File(['h'], 'horizontal.jpg', { type: 'image/jpeg' }))
    await user.upload(screen.getByLabelText('上传竖版封面'), new File(['v'], 'vertical.jpg', { type: 'image/jpeg' }))
    await user.upload(screen.getByLabelText('上传 MP4'), new File(['m'], 'video.mp4', { type: 'video/mp4' }))

    expect(storage.upload).toHaveBeenNthCalledWith(1, expect.any(File), 'covers')
    expect(storage.upload).toHaveBeenNthCalledWith(2, expect.any(File), 'covers')
    expect(storage.upload).toHaveBeenNthCalledWith(3, expect.any(File), 'videos')
    expect(screen.getByLabelText('横版封面 URL')).toHaveValue('https://assets.example.com/horizontal.jpg')
    expect(screen.getByLabelText('竖版封面 URL')).toHaveValue('https://assets.example.com/vertical.jpg')
    expect(screen.getByLabelText('视频 URL')).toHaveValue('https://assets.example.com/video.mp4')
    expect(screen.getAllByText('上传完成')).toHaveLength(3)
  })

  it('saves an incomplete draft through the admin boundary but keeps publishing strict', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const draft = {
      ...fixtureVideos[0], status: 'draft' as const, title: '', horizontalCoverUrl: '', verticalCoverUrl: '',
      videoUrl: '', roles: [], summary: '', description: '',
    }
    render(<AdminVideoEditor repository={repository as never} storage={storageMock() as never} initialValue={draft} />)

    await user.click(screen.getByRole('button', { name: '保存作品' }))
    expect(repository.saveVideo).toHaveBeenCalledWith(draft)
    await user.click(screen.getByRole('button', { name: '发布作品' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请上传竖版封面')
    expect(repository.saveVideo).toHaveBeenCalledTimes(1)
  })

  it('makes persisted media fields read-only and rejects non-public values at save', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminVideoEditor repository={repository as never} storage={storageMock() as never} initialValue={{ ...fixtureVideos[0], status: 'draft', videoUrl: 'blob:https://portfolio.test/local' }} />)

    expect(screen.getByLabelText('横版封面 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('竖版封面 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('视频 URL')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: '保存作品' }))
    expect(repository.saveVideo).not.toHaveBeenCalled()
  })
})
