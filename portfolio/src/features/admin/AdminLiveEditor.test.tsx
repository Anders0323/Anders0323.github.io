import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fixtureLiveWorks } from '../../fixtures/content'
import { AdminLiveEditor } from './AdminLiveEditor'

const secondScreenshot = {
  id: 'live-shot-2',
  url: 'https://assets.example.com/live-second.jpg',
  alt: '第二张直播现场截图',
  width: 1200,
  height: 1600,
}

function repositoryMock() {
  return { saveLiveWork: vi.fn().mockImplementation(async (work) => work) }
}

function storageMock() {
  return {
    upload: vi.fn().mockResolvedValue({
      id: 'live-upload', path: 'media/live/live-upload.jpg', fullPath: 'cloud://env/media/live/live-upload.jpg', url: 'https://assets.example.com/live-upload.jpg',
    }),
  }
}

describe('AdminLiveEditor', () => {
  it('exposes live fields without any replay or video input', () => {
    render(<AdminLiveEditor repository={repositoryMock() as never} storage={storageMock() as never} initialValue={fixtureLiveWorks[0]!} />)

    for (const label of ['直播 ID', 'URL 标识', '标题', '直播日期', '封面 URL', '一句简介', '详细说明', '创作角色', '首页推荐', '排序', '发布状态', '更新时间']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/视频|回放/)).not.toBeInTheDocument()
  })

  it('reads actual image dimensions and uploads screenshots only to live', async () => {
    const user = userEvent.setup()
    const storage = storageMock()
    render(<AdminLiveEditor repository={repositoryMock() as never} storage={storage as never} initialValue={fixtureLiveWorks[0]!} readImageDimensions={async () => ({ width: 2400, height: 1350 })} />)

    await user.upload(screen.getByLabelText('上传直播截图'), new File(['image'], 'scene.jpg', { type: 'image/jpeg' }))

    expect(storage.upload).toHaveBeenCalledWith(expect.any(File), 'live')
    expect(screen.getByLabelText('截图 3 URL')).toHaveValue('https://assets.example.com/live-upload.jpg')
    expect(screen.getByLabelText('截图 3 宽度')).toHaveValue(2400)
    expect(screen.getByLabelText('截图 3 高度')).toHaveValue(1350)
    expect(screen.getByLabelText('截图 3 替代文字')).toHaveValue('')
  })

  it('caps screenshots at twelve before storage is called', () => {
    const storage = storageMock()
    const screenshots = Array.from({ length: 12 }, (_, index) => ({ id: `shot-${index}`, url: `https://assets.example.com/${index}.jpg`, alt: `直播截图 ${index + 1}`, width: 1200, height: 800 }))
    render(<AdminLiveEditor repository={repositoryMock() as never} storage={storage as never} initialValue={{ ...fixtureLiveWorks[0]!, coverUrl: screenshots[0]!.url, screenshots }} />)

    expect(screen.getByLabelText('上传直播截图')).toBeDisabled()
    expect(screen.getByText('截图（12 / 12）')).toBeVisible()
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('reserves the last screenshot slot while a slow upload is in progress', async () => {
    const user = userEvent.setup()
    let finishUpload!: () => void
    const storage = storageMock()
    storage.upload.mockImplementationOnce(() => new Promise((resolve) => { finishUpload = () => resolve({ id: 'last-slot', path: 'live/last-slot.jpg', fullPath: 'cloud://live/last-slot.jpg', url: 'https://assets.example.com/last-slot.jpg' }) }))
    const screenshots = Array.from({ length: 11 }, (_, index) => ({ id: `shot-${index}`, url: `https://assets.example.com/${index}.jpg`, alt: `直播截图 ${index + 1}`, width: 1200, height: 800 }))
    render(<AdminLiveEditor repository={repositoryMock() as never} storage={storage as never} initialValue={{ ...fixtureLiveWorks[0]!, coverUrl: screenshots[0]!.url, screenshots }} readImageDimensions={async () => ({ width: 1200, height: 800 })} />)

    const input = screen.getByLabelText('上传直播截图')
    await user.upload(input, new File(['first'], 'first.jpg', { type: 'image/jpeg' }))
    expect(storage.upload).toHaveBeenCalledTimes(1)
    expect(input).toBeDisabled()
    await user.upload(input, new File(['second'], 'second.jpg', { type: 'image/jpeg' }))
    expect(storage.upload).toHaveBeenCalledTimes(1)
    await act(async () => finishUpload())
    expect(screen.getByText('截图（12 / 12）')).toBeVisible()
  })

  it('blocks save during a pending upload and only reports success after the uploaded screenshot is saved', async () => {
    const user = userEvent.setup()
    let finishUpload!: () => void
    let finishSave!: () => void
    const uploadedScreenshot = { id: 'upload-overlap', path: 'live/upload-overlap.jpg', fullPath: 'cloud://live/upload-overlap.jpg', url: 'https://assets.example.com/upload-overlap.jpg' }
    const storage = storageMock()
    storage.upload.mockImplementationOnce(() => new Promise((resolve) => { finishUpload = () => resolve(uploadedScreenshot) }))
    const repository = { saveLiveWork: vi.fn().mockImplementation(() => new Promise((resolve) => { finishSave = () => resolve({ ...fixtureLiveWorks[0]!, status: 'draft', screenshots: [...fixtureLiveWorks[0]!.screenshots, { id: uploadedScreenshot.id, url: uploadedScreenshot.url, alt: '', width: 1200, height: 800 }] }) })) }
    render(<AdminLiveEditor repository={repository as never} storage={storage as never} initialValue={{ ...fixtureLiveWorks[0]!, status: 'draft' }} readImageDimensions={async () => ({ width: 1200, height: 800 })} />)

    await act(async () => {
      fireEvent.change(screen.getByLabelText('上传直播截图'), { target: { files: [new File(['image'], 'overlap.jpg', { type: 'image/jpeg' })] } })
      fireEvent.click(screen.getByRole('button', { name: '保存直播作品' }))
    })
    expect(storage.upload).toHaveBeenCalledTimes(1)
    expect(repository.saveLiveWork).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '保存直播作品' })).toBeDisabled()

    await act(async () => finishUpload())
    expect(screen.getByLabelText('截图 3 URL')).toHaveValue(uploadedScreenshot.url)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(repository.saveLiveWork).toHaveBeenCalledWith(expect.objectContaining({ screenshots: expect.arrayContaining([expect.objectContaining({ url: uploadedScreenshot.url })]) }))
    await act(async () => finishSave())
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
  })

  it('requires valid alt text and a cover selected from screenshots before publishing', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={fixtureLiveWorks[0]!} />)

    await user.clear(screen.getByLabelText('截图 1 替代文字'))
    await user.type(screen.getByLabelText('截图 1 替代文字'), '短')
    await user.click(screen.getByRole('button', { name: '发布直播作品' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请为每张截图填写有效的替代文字')
    expect(repository.saveLiveWork).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('截图 1 替代文字'))
    await user.type(screen.getByLabelText('截图 1 替代文字'), '直播舞台现场全景')
    await user.click(screen.getByRole('button', { name: '设为封面：论坛嘉宾发言的竖向现场画面' }))
    await user.click(screen.getByRole('button', { name: '发布直播作品' }))
    expect(repository.saveLiveWork).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', coverUrl: fixtureLiveWorks[0]!.screenshots[1]!.url }))
  })

  it('rejects publishing when the cover is not one of the screenshots', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={{ ...fixtureLiveWorks[0]!, coverUrl: 'https://assets.example.com/not-a-screenshot.jpg' }} />)

    await user.click(screen.getByRole('button', { name: '发布直播作品' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请选择有效的直播封面')
    expect(repository.saveLiveWork).not.toHaveBeenCalled()
  })

  it('reorders screenshots and removes only after an explicit confirmation', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={{ ...fixtureLiveWorks[0]!, screenshots: [...fixtureLiveWorks[0]!.screenshots, secondScreenshot] }} />)

    await user.click(screen.getByRole('button', { name: '下移：社区论坛舞台与观众的横向全景' }))
    expect(screen.getByLabelText('截图 1 URL')).toHaveValue(fixtureLiveWorks[0]!.screenshots[1]!.url)
    await user.click(screen.getByRole('button', { name: '上移：社区论坛舞台与观众的横向全景' }))
    expect(screen.getByLabelText('截图 1 URL')).toHaveValue(fixtureLiveWorks[0]!.screenshots[0]!.url)
    await user.click(screen.getByRole('button', { name: '移除：第二张直播现场截图' }))
    const dialog = screen.getByRole('dialog', { name: '确认移除截图' })
    expect(screen.getAllByRole('group', { name: /截图 \d/ })).toHaveLength(3)
    await user.click(within(dialog).getByRole('button', { name: '确认移除' }))
    expect(screen.getAllByRole('group', { name: /截图 \d/ })).toHaveLength(2)
  })

  it('saves a schema-valid empty draft and permits hidden status', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const draft = { ...fixtureLiveWorks[0]!, slug: 'new-live', title: '', summary: '', description: '', roles: [], heldAt: '', coverUrl: '', screenshots: [], status: 'draft' as const }
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={draft} />)

    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(repository.saveLiveWork).toHaveBeenCalledWith(draft)
    await user.selectOptions(screen.getByLabelText('发布状态'), 'hidden')
    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(repository.saveLiveWork).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'hidden' }))
  })

  it('does not show success optimistically and uses safe error copy for upload and save failures', async () => {
    const user = userEvent.setup()
    let finishSave!: (value: typeof fixtureLiveWorks[number]) => void
    const repository = { saveLiveWork: vi.fn().mockReturnValue(new Promise((resolve) => { finishSave = resolve })) }
    const storage = storageMock()
    storage.upload.mockRejectedValueOnce(new Error('cloud://private/live-secret.jpg'))
    render(<AdminLiveEditor repository={repository as never} storage={storage as never} initialValue={fixtureLiveWorks[0]!} />)

    await user.upload(screen.getByLabelText('上传直播截图'), new File(['image'], 'broken.jpg', { type: 'image/jpeg' }))
    expect(screen.getByRole('alert')).toHaveTextContent('文件上传失败，请稍后重试。')
    expect(screen.queryByText(/live-secret/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(screen.queryByRole('status', { name: '保存成功' })).not.toBeInTheDocument()
    await act(async () => finishSave(fixtureLiveWorks[0]!))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
  })

  it('freezes edits during a slow save so its older response cannot replace new input', async () => {
    const user = userEvent.setup()
    let finishSave!: () => void
    const repository = { saveLiveWork: vi.fn().mockImplementation(() => new Promise((resolve) => { finishSave = () => resolve(fixtureLiveWorks[0]) })) }
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={fixtureLiveWorks[0]!} />)

    const title = screen.getByLabelText('标题')
    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(title).toBeDisabled()
    await user.type(title, '不应写入的新标题')
    expect(title).toHaveValue(fixtureLiveWorks[0]!.title)
    await act(async () => finishSave())
    expect(title).toHaveValue(fixtureLiveWorks[0]!.title)
  })

  it('clears save success after a later edit, upload, reorder, or confirmed removal', async () => {
    const user = userEvent.setup()
    const draft = { ...fixtureLiveWorks[0]!, status: 'draft' as const }
    render(<AdminLiveEditor repository={repositoryMock() as never} storage={storageMock() as never} initialValue={draft} readImageDimensions={async () => ({ width: 1200, height: 800 })} />)

    const save = async () => {
      await user.click(screen.getByRole('button', { name: '保存直播作品' }))
      expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
    }
    await save()
    await user.type(screen.getByLabelText('标题'), '更新')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await save()
    await user.upload(screen.getByLabelText('上传直播截图'), new File(['image'], 'new.jpg', { type: 'image/jpeg' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await save()
    await user.click(screen.getByRole('button', { name: '下移：社区论坛舞台与观众的横向全景' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await save()
    await user.click(screen.getByRole('button', { name: '移除：论坛嘉宾发言的竖向现场画面' }))
    await user.click(within(screen.getByRole('dialog', { name: '确认移除截图' })).getByRole('button', { name: '确认移除' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a generic save failure without stale success when the repository rejects', async () => {
    const user = userEvent.setup()
    const repository = { saveLiveWork: vi.fn().mockRejectedValue(new Error('cloud://private/live-work-id')) }
    render(<AdminLiveEditor repository={repository as never} storage={storageMock() as never} initialValue={fixtureLiveWorks[0]!} />)

    await user.click(screen.getByRole('button', { name: '保存直播作品' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请稍后重试。')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/live-work-id/)).not.toBeInTheDocument()
  })
})
