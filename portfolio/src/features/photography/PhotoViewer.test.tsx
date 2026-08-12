import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { PhotoAsset } from '../../domain/content'
import { PhotoViewer } from './PhotoViewer'

const threePhotos: PhotoAsset[] = [
  { id: 'photo-1', url: '/media/photo-1.jpg', alt: '第一张测试摄影', width: 1600, height: 1067 },
  { id: 'photo-2', url: '/media/photo-2.jpg', alt: '第二张测试摄影', width: 1067, height: 1600 },
  { id: 'photo-3', url: '/media/photo-3.jpg', alt: '第三张测试摄影', width: 1600, height: 1067 },
]

function ViewerHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        打开第二张
      </button>
      {open ? <PhotoViewer initialIndex={1} onClose={() => setOpen(false)} photos={threePhotos} /> : null}
    </>
  )
}

describe('PhotoViewer', () => {
  it('moves through a three-photo series with arrow keys and closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PhotoViewer photos={threePhotos} initialIndex={0} onClose={onClose} />)

    await user.keyboard('{ArrowRight}')

    expect(screen.getByText('2 / 3')).toBeVisible()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clamps previous and next navigation at both series boundaries', async () => {
    const user = userEvent.setup()
    render(<PhotoViewer photos={threePhotos} initialIndex={0} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: '上一张' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一张' })).toBeEnabled()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('1 / 3')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '下一张' }))
    await user.click(screen.getByRole('button', { name: '下一张' }))

    expect(screen.getByText('3 / 3')).toBeVisible()
    expect(screen.getByRole('button', { name: '下一张' })).toBeDisabled()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('3 / 3')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '上一张' }))
    expect(screen.getByText('2 / 3')).toBeVisible()
  })

  it('focuses Close on open and restores focus to the exact thumbnail opener on close', async () => {
    const user = userEvent.setup()
    render(<ViewerHarness />)
    const opener = screen.getByRole('button', { name: '打开第二张' })

    await user.click(opener)

    const closeButton = await screen.findByRole('button', { name: '关闭' })
    expect(screen.getByRole('dialog', { name: '摄影作品全屏浏览' })).toBeInTheDocument()
    expect(closeButton).toHaveFocus()

    await user.click(closeButton)

    expect(screen.queryByRole('dialog', { name: '摄影作品全屏浏览' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('removes keyboard handling and restores scroll state when unmounted', async () => {
    const onClose = vi.fn()
    document.body.style.overflow = 'clip'
    document.documentElement.style.overflow = 'scroll'
    const { unmount } = render(<PhotoViewer photos={threePhotos} initialIndex={0} onClose={onClose} />)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')

    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(document.body.style.overflow).toBe('clip')
    expect(document.documentElement.style.overflow).toBe('scroll')
    expect(onClose).not.toHaveBeenCalled()
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  })
})
