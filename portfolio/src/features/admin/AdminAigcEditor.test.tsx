import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AigcWork } from '../../domain/content'
import { fixtureAigcWorks } from '../../fixtures/content'
import { AdminAigcEditor } from './AdminAigcEditor'

function repositoryMock() {
  return { saveAigcWork: vi.fn().mockImplementation(async (work: AigcWork) => work) }
}

function storageMock() {
  return {
    upload: vi.fn().mockResolvedValue({
      id: 'cloud-id',
      path: 'media/aigc-images/cloud-id.webp',
      fullPath: 'cloud://env/media/aigc-images/cloud-id.webp',
      url: 'https://assets.example.com/uploaded.webp',
    }),
  }
}

describe('AdminAigcEditor', () => {
  it('keeps the AIGC form limited to final media and portfolio metadata', () => {
    render(<AdminAigcEditor repository={repositoryMock()} storage={storageMock()} initialValue={fixtureAigcWorks[0]!} />)

    for (const label of ['作品 ID', 'URL 标识', '标题', '媒体类型', '最终媒体 URL', '一句简介', '年份', '首页推荐', '排序', '发布状态', '更新时间']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/提示词|prompt|模型|model|流程|process/i)).not.toBeInTheDocument()
  })

  it('uploads image final media and video cover to the image folder while keeping resolved URLs read-only', async () => {
    const user = userEvent.setup()
    const storage = storageMock()
    storage.upload
      .mockResolvedValueOnce({ id: 'image-id', path: 'image', fullPath: 'cloud://image', url: 'https://assets.example.com/final.webp' })
      .mockResolvedValueOnce({ id: 'cover-id', path: 'cover', fullPath: 'cloud://cover', url: 'https://assets.example.com/cover.webp' })
    render(<AdminAigcEditor repository={repositoryMock()} storage={storage} initialValue={{ ...fixtureAigcWorks[1]!, mediaUrl: '', coverUrl: '' }} />)

    expect(screen.getByLabelText('最终媒体 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('视频封面 URL')).toHaveAttribute('readonly')
    const videoUpload = screen.getByLabelText('上传最终 MP4')
    expect(videoUpload).toHaveAttribute('accept', 'video/mp4')
    await user.upload(videoUpload, new File(['video'], 'final.mp4', { type: 'video/mp4' }))
    await user.upload(screen.getByLabelText('上传视频封面'), new File(['cover'], 'cover.webp', { type: 'image/webp' }))

    expect(storage.upload).toHaveBeenNthCalledWith(1, expect.any(File), 'aigc-videos')
    expect(storage.upload).toHaveBeenNthCalledWith(2, expect.any(File), 'aigc-images')
    expect(screen.getByLabelText('最终媒体 URL')).toHaveValue('https://assets.example.com/final.webp')
    expect(screen.getByLabelText('视频封面 URL')).toHaveValue('https://assets.example.com/cover.webp')
  })

  it('uploads image final media to the image folder with an image-only input', async () => {
    const user = userEvent.setup()
    const storage = storageMock()
    render(<AdminAigcEditor repository={repositoryMock()} storage={storage} initialValue={{ ...fixtureAigcWorks[0]!, mediaUrl: '' }} />)

    const upload = screen.getByLabelText('上传最终图片')
    expect(upload).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    await user.upload(upload, new File(['image'], 'final.png', { type: 'image/png' }))
    expect(storage.upload).toHaveBeenCalledWith(expect.any(File), 'aigc-images')
  })

  it('publishes an image without a separate cover', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminAigcEditor repository={repository} storage={storageMock()} initialValue={fixtureAigcWorks[0]!} />)

    await user.click(screen.getByRole('button', { name: '发布 AIGC 作品' }))
    expect(repository.saveAigcWork).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'image', coverUrl: '', status: 'published' }))
  })

  it('blocks publishing a video without a cover', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminAigcEditor repository={repository} storage={storageMock()} initialValue={{ ...fixtureAigcWorks[1]!, coverUrl: '' }} />)

    await user.click(screen.getByRole('button', { name: '发布 AIGC 作品' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请上传视频封面')
    expect(repository.saveAigcWork).not.toHaveBeenCalled()
  })

  it('saves an incomplete draft without final media', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const draft = { ...fixtureAigcWorks[0]!, status: 'draft' as const, title: '', mediaUrl: '', coverUrl: '', summary: '' }
    render(<AdminAigcEditor repository={repository} storage={storageMock()} initialValue={draft} />)

    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    expect(repository.saveAigcWork).toHaveBeenCalledWith(draft)
  })

  it('keeps incompatible resolved media until the destructive type switch is explicitly confirmed', async () => {
    const user = userEvent.setup()
    render(<AdminAigcEditor repository={repositoryMock()} storage={storageMock()} initialValue={{ ...fixtureAigcWorks[0]!, coverUrl: 'https://assets.example.com/existing-cover.webp' }} />)

    await user.selectOptions(screen.getByLabelText('媒体类型'), 'video')
    expect(screen.getByLabelText('媒体类型')).toHaveValue('image')
    expect(screen.getByLabelText('最终媒体 URL')).toHaveValue(fixtureAigcWorks[0]!.mediaUrl)
    const dialog = screen.getByRole('dialog', { name: '确认切换媒体类型' })
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(dialog).not.toBeInTheDocument()
    expect(screen.getByLabelText('媒体类型')).toHaveValue('image')

    await user.selectOptions(screen.getByLabelText('媒体类型'), 'video')
    await user.click(screen.getByRole('button', { name: '确认切换' }))
    expect(screen.getByLabelText('媒体类型')).toHaveValue('video')
    expect(screen.getByLabelText('最终媒体 URL')).toHaveValue('')
    expect(screen.getByLabelText('视频封面 URL')).toHaveValue('')
  })

  it('serializes upload and save, and reports storage errors without backend details', async () => {
    const user = userEvent.setup()
    let finishUpload!: (result: { id: string; path: string; fullPath: string; url: string }) => void
    const uploaded = { id: 'image-id', path: 'image', fullPath: 'cloud://image', url: 'https://assets.example.com/final.webp' }
    const storage = { upload: vi.fn(() => new Promise<typeof uploaded>((resolve) => { finishUpload = resolve })) }
    const repository = repositoryMock()
    render(<AdminAigcEditor repository={repository} storage={storage} initialValue={{ ...fixtureAigcWorks[0]!, mediaUrl: '' }} />)

    await user.upload(screen.getByLabelText('上传最终图片'), new File(['image'], 'final.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    expect(repository.saveAigcWork).not.toHaveBeenCalled()
    await act(async () => finishUpload(uploaded))
    expect(screen.getByLabelText('最终媒体 URL')).toHaveValue(uploaded.url)

    const rejectingStorage = { upload: vi.fn().mockRejectedValue(new Error('cloud permission denied')) }
    render(<AdminAigcEditor repository={repositoryMock()} storage={rejectingStorage} initialValue={{ ...fixtureAigcWorks[0]!, mediaUrl: '' }} />)
    await user.upload(screen.getAllByLabelText('上传最终图片')[1]!, new File(['image'], 'bad.png', { type: 'image/png' }))
    expect(screen.getByRole('alert')).toHaveTextContent('文件上传失败，请稍后重试。')
    expect(screen.queryByText('cloud permission denied')).not.toBeInTheDocument()
  })

  it('reports repository save failures without exposing backend details', async () => {
    const user = userEvent.setup()
    const repository = { saveAigcWork: vi.fn().mockRejectedValue(new Error('aigc_works permission denied')) }
    render(<AdminAigcEditor repository={repository} storage={storageMock()} initialValue={fixtureAigcWorks[0]!} />)

    await user.click(screen.getByRole('button', { name: '保存 AIGC 作品' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请稍后重试。')
    expect(screen.queryByText('aigc_works permission denied')).not.toBeInTheDocument()
  })
})
