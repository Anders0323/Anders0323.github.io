import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { PhotoSeries } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { PHOTO_CATEGORY_LABELS } from './PhotographyIndexPage'
import { PhotoViewer } from './PhotoViewer'
import { getPhotoLayout } from './photoLayout'

interface PhotoSeriesPageProps {
  repository: ContentRepository
}

type PhotoSeriesState =
  | { status: 'loading'; series: null }
  | { status: 'ready'; series: PhotoSeries }
  | { status: 'not-found'; series: null }
  | { status: 'error'; series: null }

export function PhotoSeriesPage({ repository }: PhotoSeriesPageProps) {
  const { slug } = useParams()
  const [retryCount, setRetryCount] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [detailState, setDetailState] = useState<PhotoSeriesState>({ status: 'loading', series: null })

  useEffect(() => {
    let active = true

    if (!slug) {
      setDetailState({ status: 'not-found', series: null })
      return () => {
        active = false
      }
    }

    setDetailState({ status: 'loading', series: null })
    setViewerIndex(null)
    void repository
      .getPublishedPhotoSeries(slug)
      .then((series) => {
        if (active) {
          setDetailState(series ? { status: 'ready', series } : { status: 'not-found', series: null })
        }
      })
      .catch(() => {
        if (active) {
          setDetailState({ status: 'error', series: null })
        }
      })

    return () => {
      active = false
    }
  }, [repository, retryCount, slug])

  if (detailState.status === 'loading') {
    return (
      <main className="photo-series-state" id="main-content" aria-live="polite">
        正在加载摄影系列…
      </main>
    )
  }

  if (detailState.status === 'error') {
    return (
      <main className="photo-series-state" id="main-content">
        <p className="section-index">PHOTOGRAPHY / ERROR</p>
        <h1>摄影系列暂时无法加载</h1>
        <p role="alert">请检查网络后重试。</p>
        <button className="outline-action outline-action-dark" onClick={() => setRetryCount((count) => count + 1)} type="button">
          重新加载
        </button>
        <Link className="text-link" to="/photography">
          返回摄影作品
        </Link>
      </main>
    )
  }

  if (detailState.status === 'not-found') {
    return (
      <main className="photo-series-state" id="main-content">
        <p className="section-index">PHOTOGRAPHY / NOT FOUND</p>
        <h1>没有找到这个摄影系列</h1>
        <p>系列可能尚未发布，或链接已经变更。</p>
        <Link className="text-link" to="/photography">
          返回摄影作品
        </Link>
      </main>
    )
  }

  const { series } = detailState

  return (
    <main className="photo-series-page" id="main-content">
      <article>
        <header className="photo-series-heading">
          <div className="section-frame photo-series-heading-inner">
            <Link className="photo-series-back" to="/photography">
              ← 全部摄影系列
            </Link>
            <p className="section-index">PHOTOGRAPHY / {PHOTO_CATEGORY_LABELS[series.category]}</p>
            <h1>{series.title}</h1>
            <p>{series.intro}</p>
            <small>{series.shotAt}</small>
          </div>
        </header>

        <section className="photo-series-gallery section-frame" aria-label={`${series.title}系列图片`}>
          {series.photos.map((photo, index) => {
            const layout = getPhotoLayout(photo, index)

            return (
              <figure className="photo-series-item" data-align={layout.align} data-layout={layout.orientation} key={photo.id}>
                <button
                  aria-label={`全屏查看：${photo.alt}`}
                  className="photo-thumbnail-button"
                  onClick={() => setViewerIndex(index)}
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  type="button"
                >
                  <ResponsiveImage
                    alt={photo.alt}
                    className="photo-series-image"
                    height={photo.height}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    sizes="(min-width: 896px) 72vw, 100vw"
                    src={photo.url}
                    width={photo.width}
                  />
                  <span className="photo-thumbnail-action" aria-hidden="true">
                    VIEW / {String(index + 1).padStart(2, '0')}
                  </span>
                </button>
                <figcaption>
                  <span>{String(index + 1).padStart(2, '0')} /</span>
                  {photo.alt}
                </figcaption>
              </figure>
            )
          })}
        </section>
      </article>

      {viewerIndex !== null ? (
        <PhotoViewer initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} photos={series.photos} />
      ) : null}
    </main>
  )
}
