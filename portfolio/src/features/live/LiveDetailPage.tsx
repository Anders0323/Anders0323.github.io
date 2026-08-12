import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { LiveWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { PhotoViewer } from '../photography/PhotoViewer'

interface LiveDetailPageProps {
  repository: ContentRepository
}

type LiveDetailState =
  | { status: 'loading'; work: null }
  | { status: 'ready'; work: LiveWork }
  | { status: 'not-found'; work: null }
  | { status: 'error'; work: null }

export function LiveDetailPage({ repository }: LiveDetailPageProps) {
  const { slug } = useParams()
  const [retryCount, setRetryCount] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [detailState, setDetailState] = useState<LiveDetailState>({ status: 'loading', work: null })

  useEffect(() => {
    let active = true
    if (!slug) {
      setDetailState({ status: 'not-found', work: null })
      return () => { active = false }
    }

    setDetailState({ status: 'loading', work: null })
    setViewerIndex(null)
    void repository.getPublishedLiveWork(slug).then(
      (work) => { if (active) setDetailState(work ? { status: 'ready', work } : { status: 'not-found', work: null }) },
      () => { if (active) setDetailState({ status: 'error', work: null }) },
    )

    return () => { active = false }
  }, [repository, retryCount, slug])

  if (detailState.status === 'loading') {
    return <main className="live-detail-state" id="main-content" aria-live="polite">正在加载直播项目…</main>
  }

  if (detailState.status === 'error') {
    return (
      <main className="live-detail-state" id="main-content">
        <p className="section-index">LIVE / ERROR</p><h1>直播项目暂时无法加载</h1><p role="alert">请检查网络后重试。</p>
        <button className="outline-action outline-action-dark" onClick={() => setRetryCount((count) => count + 1)} type="button">重新加载</button>
        <Link className="text-link" to="/live">返回直播项目</Link>
      </main>
    )
  }

  if (detailState.status === 'not-found') {
    return (
      <main className="live-detail-state" id="main-content">
        <p className="section-index">LIVE / NOT FOUND</p><h1>没有找到这个直播项目</h1><p>项目可能尚未发布，或链接已经变更。</p>
        <Link className="text-link" to="/live">返回直播项目</Link>
      </main>
    )
  }

  const { work } = detailState
  return (
    <main className="live-detail-page" id="main-content">
      <article>
        <header className="live-detail-heading">
          <div className="section-frame live-detail-heading-inner">
            <Link className="live-detail-back" to="/live">← 全部直播项目</Link>
            <p className="section-index">LIVE / {work.heldAt}</p>
            <h1>{work.title}</h1>
            <p>{work.summary}</p>
          </div>
        </header>
        <div className="live-detail-content section-frame">
          <div className="live-detail-copy">
            <p className="live-detail-byline">{work.roles.join(' / ')} · {work.heldAt}</p>
            <p>{work.description}</p>
            <Link className="text-link" to="/live">查看全部直播项目</Link>
          </div>
          <section className="live-screenshot-gallery" aria-label={`${work.title}现场截图`}>
            {work.screenshots.map((shot, index) => (
              <figure className="live-screenshot-item" key={shot.id}>
                <button aria-label={`全屏查看：${shot.alt}`} className="live-screenshot-button" onClick={() => setViewerIndex(index)} style={{ aspectRatio: `${shot.width} / ${shot.height}` }} type="button">
                  <ResponsiveImage alt={shot.alt} className="live-screenshot-image" height={shot.height} loading={index === 0 ? 'eager' : 'lazy'} sizes="(min-width: 896px) 68vw, 100vw" src={shot.url} width={shot.width} />
                  <span className="live-screenshot-action" aria-hidden="true">VIEW / {String(index + 1).padStart(2, '0')}</span>
                </button>
                <figcaption><span>{String(index + 1).padStart(2, '0')} /</span>{shot.alt}</figcaption>
              </figure>
            ))}
          </section>
        </div>
      </article>
      {viewerIndex !== null ? <PhotoViewer initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} photos={work.screenshots} /> : null}
    </main>
  )
}
