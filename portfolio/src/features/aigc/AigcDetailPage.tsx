import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import { VideoPlayer } from '../../components/media/VideoPlayer'
import type { AigcWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

interface AigcDetailPageProps {
  repository: ContentRepository
}

type AigcDetailState =
  | { status: 'loading'; work: null }
  | { status: 'ready'; work: AigcWork }
  | { status: 'not-found'; work: null }
  | { status: 'error'; work: null }

export function AigcDetailPage({ repository }: AigcDetailPageProps) {
  const { slug } = useParams()
  const [retryCount, setRetryCount] = useState(0)
  const [detailState, setDetailState] = useState<AigcDetailState>({ status: 'loading', work: null })

  useEffect(() => {
    let active = true
    if (!slug) {
      setDetailState({ status: 'not-found', work: null })
      return () => { active = false }
    }

    setDetailState({ status: 'loading', work: null })
    void repository.getPublishedAigcWork(slug).then(
      (work) => { if (active) setDetailState(work ? { status: 'ready', work } : { status: 'not-found', work: null }) },
      () => { if (active) setDetailState({ status: 'error', work: null }) },
    )

    return () => { active = false }
  }, [repository, retryCount, slug])

  if (detailState.status === 'loading') {
    return <main className="aigc-detail-state" id="main-content" aria-live="polite">正在加载 AIGC 作品…</main>
  }

  if (detailState.status === 'error') {
    return (
      <main className="aigc-detail-state" id="main-content">
        <p className="section-index">AIGC / ERROR</p><h1>作品暂时无法加载</h1><p role="alert">请检查网络后重试。</p>
        <button className="outline-action outline-action-dark" onClick={() => setRetryCount((count) => count + 1)} type="button">重新加载</button>
        <Link className="text-link" to="/aigc">返回 AIGC 作品</Link>
      </main>
    )
  }

  if (detailState.status === 'not-found') {
    return (
      <main className="aigc-detail-state" id="main-content">
        <p className="section-index">AIGC / NOT FOUND</p><h1>没有找到这个 AIGC 作品</h1><p>作品可能尚未发布，或链接已经变更。</p>
        <Link className="text-link" to="/aigc">返回 AIGC 作品</Link>
      </main>
    )
  }

  const { work } = detailState
  return (
    <main className="aigc-detail-page" id="main-content">
      <article>
        <header className="aigc-detail-heading">
          <div className="section-frame aigc-detail-heading-inner">
            <Link className="aigc-detail-back" to="/aigc">← 全部 AIGC 作品</Link>
            <p className="section-index">AIGC / {work.year}</p>
            <h1>{work.title}</h1>
            <p>{work.summary}</p>
          </div>
        </header>
        <div className="aigc-detail-content section-frame">
          <div className="aigc-detail-media">
            {work.mediaType === 'image' ? (
              <ResponsiveImage alt={`${work.title}作品`} className="aigc-detail-image" height={1200} loading="eager" sizes="(min-width: 896px) 72vw, 100vw" src={work.mediaUrl} width={1600} />
            ) : (
              <VideoPlayer poster={work.coverUrl} src={work.mediaUrl} title={work.title} />
            )}
          </div>
          <div className="aigc-detail-copy">
            <p className="aigc-detail-byline">{work.year}</p>
            <Link className="text-link" to="/aigc">查看全部 AIGC 作品</Link>
          </div>
        </div>
      </article>
    </main>
  )
}
