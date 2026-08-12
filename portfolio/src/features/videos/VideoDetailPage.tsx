import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { VideoPlayer } from '../../components/media/VideoPlayer'
import type { VideoWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { VIDEO_CATEGORY_LABELS } from './VideoIndexPage'

interface VideoDetailPageProps {
  repository: ContentRepository
}

type VideoDetailState =
  | { status: 'loading'; video: null }
  | { status: 'ready'; video: VideoWork }
  | { status: 'not-found'; video: null }
  | { status: 'error'; video: null }

export function VideoDetailPage({ repository }: VideoDetailPageProps) {
  const { slug } = useParams()
  const [retryCount, setRetryCount] = useState(0)
  const [detailState, setDetailState] = useState<VideoDetailState>({ status: 'loading', video: null })

  useEffect(() => {
    let active = true

    if (!slug) {
      setDetailState({ status: 'not-found', video: null })
      return () => {
        active = false
      }
    }

    setDetailState({ status: 'loading', video: null })
    void repository
      .getPublishedVideo(slug)
      .then((video) => {
        if (active) {
          setDetailState(video ? { status: 'ready', video } : { status: 'not-found', video: null })
        }
      })
      .catch(() => {
        if (active) {
          setDetailState({ status: 'error', video: null })
        }
      })

    return () => {
      active = false
    }
  }, [repository, retryCount, slug])

  if (detailState.status === 'loading') {
    return (
      <main className="video-detail-state" id="main-content" aria-live="polite">
        正在加载作品…
      </main>
    )
  }

  if (detailState.status === 'error') {
    return (
      <main className="video-detail-state" id="main-content">
        <p className="section-index">VIDEO / ERROR</p>
        <h1>作品暂时无法加载</h1>
        <p role="alert">请检查网络后重试。</p>
        <button className="outline-action outline-action-dark" onClick={() => setRetryCount((count) => count + 1)} type="button">
          重新加载
        </button>
        <Link className="text-link" to="/videos">
          返回短视频作品
        </Link>
      </main>
    )
  }

  if (detailState.status === 'not-found') {
    return (
      <main className="video-detail-state" id="main-content">
        <p className="section-index">VIDEO / NOT FOUND</p>
        <h1>没有找到这支作品</h1>
        <p>作品可能尚未发布，或链接已经变更。</p>
        <Link className="text-link" to="/videos">
          返回短视频作品
        </Link>
      </main>
    )
  }

  const { video } = detailState
  const isLandscape = video.coverOrientation === 'landscape'

  return (
    <main className="video-detail-page" id="main-content">
      <article>
        <header className="video-detail-heading">
          <div className="section-frame video-detail-heading-inner">
            <Link className="video-detail-back" to={`/videos?category=${video.category}`}>
              ← {VIDEO_CATEGORY_LABELS[video.category]}
            </Link>
            <p className="section-index">VIDEO / {video.year}</p>
            <h1>{video.title}</h1>
            <p>{video.summary}</p>
          </div>
        </header>

        <div className="video-detail-content section-frame">
          <div className="video-detail-player">
            <VideoPlayer
              initialAspectRatio={isLandscape ? 16 / 9 : 9 / 16}
              poster={isLandscape ? video.horizontalCoverUrl : video.verticalCoverUrl}
              src={video.videoUrl}
              title={video.title}
            />
          </div>
          <div className="video-detail-copy">
            <p className="video-detail-byline">
              {video.roles.join(' / ')} · {video.year}
            </p>
            <p>{video.description}</p>
            {video.platform ? <p>发布平台 / {video.platform}</p> : null}
            {video.metrics ? <p>项目成效 / {video.metrics}</p> : null}
            <Link className="text-link" to="/videos">
              查看全部短视频作品
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
