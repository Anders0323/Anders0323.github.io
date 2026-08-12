import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PhotoAsset } from '../../domain/content'

interface PhotoViewerProps {
  photos: PhotoAsset[]
  initialIndex: number
  onClose: () => void
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0))
}

export function PhotoViewer({ photos, initialIndex, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex, photos.length))
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow

    if (dialog && !dialog.open) {
      try {
        dialog.showModal()
      } catch {
        dialog.setAttribute('open', '')
      }
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      if (dialog?.open) {
        if (typeof dialog.close === 'function') {
          dialog.close()
        } else {
          dialog.removeAttribute('open')
        }
      }
      queueMicrotask(() => {
        if (opener?.isConnected) {
          opener.focus()
        }
      })
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setCurrentIndex((index) => clampIndex(index - 1, photos.length))
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setCurrentIndex((index) => clampIndex(index + 1, photos.length))
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, photos.length])

  const photo = photos[currentIndex]

  return (
    <dialog
      aria-label="摄影作品全屏浏览"
      aria-modal="true"
      className="photo-viewer"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      ref={dialogRef}
    >
      <div className="photo-viewer-toolbar">
        <p aria-live="polite">
          {currentIndex + 1} / {photos.length}
        </p>
        <button aria-label="关闭" className="photo-viewer-close" onClick={onClose} ref={closeButtonRef} type="button">
          关闭 / CLOSE
        </button>
      </div>

      {photo ? (
        <figure className="photo-viewer-figure">
          <img alt={photo.alt} height={photo.height} src={photo.url} width={photo.width} />
          <figcaption>{photo.alt}</figcaption>
        </figure>
      ) : (
        <p>这个系列暂时没有可浏览的图片。</p>
      )}

      <div className="photo-viewer-navigation">
        <button
          aria-label="上一张"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => clampIndex(index - 1, photos.length))}
          type="button"
        >
          ← 上一张
        </button>
        <button
          aria-label="下一张"
          disabled={currentIndex >= photos.length - 1}
          onClick={() => setCurrentIndex((index) => clampIndex(index + 1, photos.length))}
          type="button"
        >
          下一张 →
        </button>
      </div>
    </dialog>
  )
}
