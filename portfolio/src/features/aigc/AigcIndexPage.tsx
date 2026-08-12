import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { AigcWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

interface AigcIndexPageProps {
  repository: ContentRepository
}

type AigcListState =
  | { status: 'loading'; works: AigcWork[] }
  | { status: 'ready'; works: AigcWork[] }
  | { status: 'error'; works: AigcWork[] }

function getCover(work: AigcWork) {
  return work.mediaType === 'image' ? work.mediaUrl : work.coverUrl
}

export function AigcIndexPage({ repository }: AigcIndexPageProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [listState, setListState] = useState<AigcListState>({ status: 'loading', works: [] })

  useEffect(() => {
    let active = true
    setListState({ status: 'loading', works: [] })

    void repository.listPublishedAigcWorks().then(
      (works) => { if (active) setListState({ status: 'ready', works }) },
      () => { if (active) setListState({ status: 'error', works: [] }) },
    )

    return () => { active = false }
  }, [repository, retryCount])

  return (
    <main className="aigc-index-page" id="main-content">
      <header className="aigc-page-intro">
        <div className="section-frame aigc-page-intro-inner">
          <p className="section-index">05 / AIGC</p>
          <h1 className="catalog-page-title">AIGC 作品</h1>
          <p>以图像与动态影像展开的视觉习作。</p>
        </div>
      </header>

      <section className="aigc-catalog section-frame" aria-labelledby="aigc-catalog-heading">
        <div className="aigc-catalog-heading">
          <p className="section-index">SELECTED / AIGC</p>
          <h2 id="aigc-catalog-heading">视觉作品</h2>
        </div>

        {listState.status === 'loading' ? <p className="catalog-state" role="status">正在加载 AIGC 作品…</p> : null}
        {listState.status === 'error' ? (
          <div className="catalog-state" role="alert">
            <p>AIGC 作品暂时无法加载，请检查网络后重试。</p>
            <button className="outline-action" onClick={() => setRetryCount((count) => count + 1)} type="button">重新加载</button>
          </div>
        ) : null}
        {listState.status === 'ready' && listState.works.length === 0 ? (
          <p className="catalog-state" role="status">暂时没有已发布的 AIGC 作品。</p>
        ) : null}
        {listState.status === 'ready' && listState.works.length > 0 ? (
          <div className="aigc-catalog-grid catalog-work-grid">
            {listState.works.map((work, index) => (
              <article className="aigc-catalog-card" data-testid="aigc-work" key={work.id}>
                <Link aria-label={`查看《${work.title}》作品`} to={`/aigc/${work.slug}`}>
                  <ResponsiveImage
                    alt={`${work.title}作品封面`}
                    className="aigc-catalog-cover"
                    height={3}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    sizes="(min-width: 896px) 40vw, 100vw"
                    src={getCover(work)}
                    width={4}
                  />
                  <div className="aigc-catalog-meta">
                    <span className="work-number">AIGC {String(index + 1).padStart(2, '0')}</span>
                    <h3>{work.title}</h3>
                    <p>{work.summary}</p>
                    <small>{work.year}</small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}
