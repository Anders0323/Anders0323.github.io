import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fixturePhotoSeries } from '../../fixtures/content'
import { AdminPhotoEditor } from './AdminPhotoEditor'

const secondPhoto = {
  id: 'asset-2',
  url: 'https://assets.example.com/second.jpg',
  alt: '第二张现场照片',
  width: 1200,
  height: 1800,
}

function repositoryMock() {
  return { savePhotoSeries: vi.fn().mockImplementation(async (series) => series) }
}

function storageMock() {
  return {
    upload: vi.fn().mockResolvedValue({
      id: 'cloud-asset',
      path: 'media/photos/cloud-asset.jpg',
      fullPath: 'cloud://env/media/photos/cloud-asset.jpg',
      url: 'https://assets.example.com/cloud-asset.jpg',
    }),
  }
}

describe('AdminPhotoEditor', () => {
  it('exposes every series and photo field', () => {
    render(<AdminPhotoEditor repository={repositoryMock() as never} storage={storageMock() as never} initialValue={fixturePhotoSeries[0]} />)

    for (const label of ['系列 ID', 'URL 标识', '标题', '分类', '封面 URL', '拍摄时间', '系列介绍', '首页推荐', '排序', '发布状态', '更新时间']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    const photo = screen.getByRole('group', { name: '图片 1' })
    for (const label of ['图片 1 URL', '图片 1 替代文字', '图片 1 宽度', '图片 1 高度']) {
      expect(within(photo).getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('reorders photos with buttons and persists the designated cover', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const initialValue = { ...fixturePhotoSeries[0], photos: [...fixturePhotoSeries[0].photos, secondPhoto] }
    render(<AdminPhotoEditor repository={repository as never} storage={storageMock() as never} initialValue={initialValue} />)

    await user.click(screen.getByRole('button', { name: '下移：开发演示人车摄影' }))
    expect(screen.getByLabelText('图片 1 URL')).toHaveValue(secondPhoto.url)
    await user.click(screen.getByRole('button', { name: '上移：开发演示人车摄影' }))
    expect(screen.getByLabelText('图片 1 URL')).toHaveValue(fixturePhotoSeries[0].photos[0].url)
    await user.click(screen.getByRole('button', { name: '下移：开发演示人车摄影' }))
    await user.click(screen.getByRole('button', { name: '设为封面：开发演示人车摄影' }))
    await user.click(screen.getByRole('button', { name: '保存摄影系列' }))

    expect(repository.savePhotoSeries).toHaveBeenCalledWith(expect.objectContaining({
      coverUrl: fixturePhotoSeries[0].photos[0].url,
      photos: [secondPhoto, fixturePhotoSeries[0].photos[0]],
    }))
  })

  it('uploads an image as a new asset and stores only its public URL', async () => {
    const user = userEvent.setup()
    const storage = storageMock()
    const repository = repositoryMock()
    render(<AdminPhotoEditor repository={repository as never} storage={storage as never} initialValue={fixturePhotoSeries[0]} readImageDimensions={async () => ({ width: 2400, height: 1600 })} />)

    await user.upload(screen.getByLabelText('上传摄影图片'), new File(['photo'], 'new.jpg', { type: 'image/jpeg' }))

    expect(storage.upload).toHaveBeenCalledWith(expect.any(File), 'photos')
    expect(screen.getByLabelText('图片 2 URL')).toHaveValue('https://assets.example.com/cloud-asset.jpg')
    expect(screen.getByLabelText('图片 2 宽度')).toHaveValue(2400)
    expect(screen.getByLabelText('图片 2 高度')).toHaveValue(1600)
    expect(screen.getByLabelText('图片 2 替代文字')).toHaveValue('')
    expect(screen.getByText('上传完成')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '发布摄影系列' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请为每张图片填写有效的替代文字')
    expect(repository.savePhotoSeries).not.toHaveBeenCalled()
  })

  it('blocks publishing with invalid alt text and confirms image removal explicitly', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const initialValue = { ...fixturePhotoSeries[0], photos: [...fixturePhotoSeries[0].photos, secondPhoto] }
    render(<AdminPhotoEditor repository={repository as never} storage={storageMock() as never} initialValue={initialValue} />)

    await user.clear(screen.getByLabelText('图片 1 替代文字'))
    await user.type(screen.getByLabelText('图片 1 替代文字'), '短')
    await user.click(screen.getByRole('button', { name: '发布摄影系列' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请为每张图片填写有效的替代文字')
    expect(repository.savePhotoSeries).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '移除：第二张现场照片' }))
    const dialog = screen.getByRole('dialog', { name: '确认移除图片' })
    expect(dialog).toHaveTextContent('第二张现场照片')
    expect(screen.getAllByRole('group', { name: /图片 \d/ })).toHaveLength(2)
    await user.click(within(dialog).getByRole('button', { name: '确认移除' }))
    expect(screen.getAllByRole('group', { name: /图片 \d/ })).toHaveLength(1)
  })

  it('caps a photography series at 30 assets before storage work', async () => {
    const storage = storageMock()
    const photos = Array.from({ length: 30 }, (_, index) => ({
      id: `asset-${index}`,
      url: `https://assets.example.com/${index}.jpg`,
      alt: `摄影作品 ${index + 1}`,
      width: 1200,
      height: 1800,
    }))
    render(<AdminPhotoEditor repository={repositoryMock() as never} storage={storage as never} initialValue={{ ...fixturePhotoSeries[0], coverUrl: photos[0]!.url, photos }} />)

    expect(screen.getByLabelText('上传摄影图片')).toBeDisabled()
    expect(screen.getByText('图片（30 / 30）')).toBeVisible()
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('saves an empty draft while keeping published series strict', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const draft = { ...fixturePhotoSeries[0], status: 'draft' as const, title: '', coverUrl: '', intro: '', photos: [] }
    render(<AdminPhotoEditor repository={repository as never} storage={storageMock() as never} initialValue={draft} />)

    await user.click(screen.getByRole('button', { name: '保存摄影系列' }))
    expect(repository.savePhotoSeries).toHaveBeenCalledWith(draft)
    await user.click(screen.getByRole('button', { name: '发布摄影系列' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请选择有效的系列封面')
    expect(repository.savePhotoSeries).toHaveBeenCalledTimes(1)
  })

  it('keeps cover and asset URLs read-only and rejects filename-only media', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const invalid = { ...fixturePhotoSeries[0], status: 'draft' as const, coverUrl: 'cover.jpg', photos: [{ ...fixturePhotoSeries[0]!.photos[0]!, url: 'cover.jpg' }] }
    render(<AdminPhotoEditor repository={repository as never} storage={storageMock() as never} initialValue={invalid} />)

    expect(screen.getByLabelText('封面 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('图片 1 URL')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: '保存摄影系列' }))
    expect(repository.savePhotoSeries).not.toHaveBeenCalled()
  })
})
