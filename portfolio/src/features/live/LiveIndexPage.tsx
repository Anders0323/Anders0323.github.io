import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { LiveWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

interface LiveIndexPageProps {
  repository: ContentRepository
}

type LiveListState =
  | { status: 'loading'; works: LiveWork[] }
  | { status: 'ready'; works: LiveWork[] }
  | { status: 'error'; works: LiveWork[] }

export function LiveIndexPage({ repository }: LiveIndexPageProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [listState, setListState] = useState<LiveListState>({ status: 'loading', works: [] })

  useEffect(() => {
    let active = true
    setListState({ status: 'loading', works: [] })

    void repository.listPublishedLiveWorks().then(
      (works) => {
        if (active) setListState({ status: 'ready', works })
      },
      () => {
        if (active) setListState({ status: 'error', works: [] })
      },
    )

    return () => { active = false }
  }, [repository, retryCount])

  return (
    <main className="live-index-page" id="main-content">
      <header className="live-page-intro">
        <div className="section-frame live-page-intro-inner">
          <p className="section-index">04 / LIVE</p>
          <h1 className="catalog-page-title">直播项目</h1>
          <p>以现场截图保留直播项目的叙事、分工与真实节奏。</p>
        </div>
      </header>

      <section className="live-catalog section-frame" aria-labelledby="live-catalog-heading">
        <div className="live-catalog-heading">
          <p className="section-index">PROJECTS / LIVE</p>
          <h2 id="live-catalog-heading">现场项目</h2>
        </div>

        {listState.status === 'loading' ? <p className="catalog-state" role="status">正在加载直播项目…</p> : null}
        {listState.status === 'error' ? (
          <div className="catalog-state" role="alert">
            <p>直播项目暂时无法加载，请检查网络后重试。</p>
            <button className="outline-action" onClick={() => setRetryCount((count) => count + 1)} type="button">重新加载</button>
          </div>
        ) : null}
        {listState.status === 'ready' && listState.works.length === 0 ? (
          <p className="catalog-state" role="status">暂时没有已发布的直播项目。</p>
        ) : null}
        {listState.status === 'ready' && listState.works.length > 0 ? (
          <div className="live-catalog-grid catalog-work-grid">
            {listState.works.map((work, index) => {
              const cover = work.screenshots.find((shot) => shot.url === work.coverUrl)

              return (
                <article className="live-catalog-card" data-testid="live-work" key={work.id}>
                  <Link aria-label={`查看《${work.title}》直播项目`} to={`/live/${work.slug}`}>
                    <ResponsiveImage
                      alt={`${work.title}现场封面`}
                      className="live-catalog-cover"
                      height={cover?.height ?? 1067}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      sizes="(min-width: 896px) 52vw, 100vw"
                      src={work.coverUrl}
                      style={{ aspectRatio: `${cover?.width ?? 1600} / ${cover?.height ?? 1067}` }}
                      width={cover?.width ?? 1600}
                    />
                    <div className="live-catalog-meta">
                      <span className="work-number">LIVE {String(index + 1).padStart(2, '0')}</span>
                      <h3>{work.title}</h3>
                      <p>{work.summary}</p>
                      <small>{work.roles.join(' / ')} · {work.heldAt}</small>
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
