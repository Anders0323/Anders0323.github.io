import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { VideoCategory, VideoWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { getVideoCover } from './videoCover'

export const VIDEO_CATEGORY_LABELS = {
  people: '人物叙事',
  brand: '品牌表达',
  event: '现场纪实',
  social: '社交创意',
} as const satisfies Record<VideoCategory, string>

const videoCategories = Object.entries(VIDEO_CATEGORY_LABELS) as Array<
  [VideoCategory, (typeof VIDEO_CATEGORY_LABELS)[VideoCategory]]
>

interface VideoIndexPageProps {
  repository: ContentRepository
}

type VideoListState =
  | { status: 'loading'; videos: VideoWork[] }
  | { status: 'ready'; videos: VideoWork[] }
  | { status: 'error'; videos: VideoWork[] }

function isVideoCategory(value: string | null): value is VideoCategory {
  return value !== null && Object.hasOwn(VIDEO_CATEGORY_LABELS, value)
}

export function VideoIndexPage({ repository }: VideoIndexPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category')
  const category = isVideoCategory(requestedCategory) ? requestedCategory : undefined
  const [retryCount, setRetryCount] = useState(0)
  const [listState, setListState] = useState<VideoListState>({ status: 'loading', videos: [] })

  useEffect(() => {
    let active = true
    setListState({ status: 'loading', videos: [] })

    void repository
      .listPublishedVideos(category)
      .then((videos) => {
        if (active) {
          setListState({ status: 'ready', videos })
        }
      })
      .catch(() => {
        if (active) {
          setListState({ status: 'error', videos: [] })
        }
      })

    return () => {
      active = false
    }
  }, [category, repository, retryCount])

  const selectCategory = (selectedCategory: VideoCategory) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.set('category', selectedCategory)
      return nextParams
    })
  }

  return (
    <main className="video-index-page" id="main-content">
      <header className="video-page-intro">
        <div className="section-frame video-page-intro-inner">
          <p className="section-index">01 / SHORT VIDEO</p>
          <h1 className="catalog-page-title">短视频作品</h1>
          <p>从真实人物、品牌现场到社交语境，记录内容如何被看见与记住。</p>
        </div>
      </header>

      <section className="video-catalog section-frame" aria-labelledby="video-catalog-heading">
        <h2 className="visually-hidden" id="video-catalog-heading">
          短视频作品列表
        </h2>

        <nav className="video-filter" aria-label="短视频分类">
          {videoCategories.map(([key, label]) => (
            <button
              aria-pressed={category === key}
              key={key}
              onClick={() => selectCategory(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {listState.status === 'loading' ? (
          <p className="catalog-state" role="status">
            正在加载短视频作品…
          </p>
        ) : null}

        {listState.status === 'error' ? (
          <div className="catalog-state" role="alert">
            <p>短视频作品暂时无法加载，请检查网络后重试。</p>
            <button className="outline-action" onClick={() => setRetryCount((count) => count + 1)} type="button">
              重新加载
            </button>
          </div>
        ) : null}

        {listState.status === 'ready' && listState.videos.length === 0 ? (
          <p className="catalog-state" role="status">
            这个分类暂时没有已发布作品。
          </p>
        ) : null}

        {listState.status === 'ready' && listState.videos.length > 0 ? (
          <div className="video-catalog-grid catalog-work-grid">
            {listState.videos.map((video, index) => {
              const cover = getVideoCover(video)

              return (
                <article
                  className={`video-catalog-card video-layout-${cover.modifier}`}
                  data-testid="video-work"
                  key={video.id}
                >
                  <Link to={`/videos/${video.slug}`}>
                    <ResponsiveImage
                      alt={`${video.title}短视频封面`}
                      className={`video-catalog-cover cover-${cover.modifier}`}
                      height={cover.height}
                      loading="lazy"
                      sizes="(min-width: 896px) 38vw, 100vw"
                      src={cover.src}
                      width={cover.width}
                    />
                    <div className="video-catalog-meta">
                      <span className="work-number">{String(index + 1).padStart(2, '0')} /</span>
                      <h3>{video.title}</h3>
                      <span>{video.summary}</span>
                      <small>
                        {video.roles.join(' / ')} · {video.year}
                      </small>
                    </div>
                  </Link>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}
