import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import type { PhotoCategory, PhotoSeries } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

export const PHOTO_CATEGORY_LABELS = {
  'people-car': '人车之间',
  space: '空间与建筑',
  event: '活动现场',
  motion: '运动瞬间',
  product: '产品与静物',
} as const satisfies Record<PhotoCategory, string>

interface PhotographyIndexPageProps {
  repository: ContentRepository
}

type PhotographyListState =
  | { status: 'loading'; series: PhotoSeries[] }
  | { status: 'ready'; series: PhotoSeries[] }
  | { status: 'error'; series: PhotoSeries[] }

export function PhotographyIndexPage({ repository }: PhotographyIndexPageProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [listState, setListState] = useState<PhotographyListState>({ status: 'loading', series: [] })

  useEffect(() => {
    let active = true
    setListState({ status: 'loading', series: [] })

    void repository
      .listPublishedPhotoSeries()
      .then((series) => {
        if (active) {
          setListState({ status: 'ready', series })
        }
      })
      .catch(() => {
        if (active) {
          setListState({ status: 'error', series: [] })
        }
      })

    return () => {
      active = false
    }
  }, [repository, retryCount])

  return (
    <main className="photography-index-page" id="main-content">
      <header className="photography-page-intro">
        <div className="section-frame photography-page-intro-inner">
          <p className="section-index">02 / PHOTOGRAPHY</p>
          <h1 className="catalog-page-title">摄影作品</h1>
          <p>五个固定方向，以完整系列呈现人与现场、空间与物的连续关系。</p>
        </div>
      </header>

      <section className="photography-catalog section-frame" aria-labelledby="photography-catalog-heading">
        <div className="photography-catalog-heading">
          <p className="section-index">SERIES / 01—05</p>
          <h2 id="photography-catalog-heading">按系列浏览</h2>
        </div>

        {listState.status === 'loading' ? (
          <p className="catalog-state" role="status">
            正在加载摄影系列…
          </p>
        ) : null}

        {listState.status === 'error' ? (
          <div className="catalog-state" role="alert">
            <p>摄影系列暂时无法加载，请检查网络后重试。</p>
            <button className="outline-action" onClick={() => setRetryCount((count) => count + 1)} type="button">
              重新加载
            </button>
          </div>
        ) : null}

        {listState.status === 'ready' && listState.series.length === 0 ? (
          <p className="catalog-state" role="status">
            暂时没有已发布的摄影系列。
          </p>
        ) : null}

        {listState.status === 'ready' && listState.series.length > 0 ? (
          <div className="photography-series-grid catalog-work-grid">
            {listState.series.map((series, index) => (
              <article className="photography-series-card" data-testid="photo-series" key={series.id}>
                <Link aria-label={`查看《${series.title}》摄影系列`} to={`/photography/${series.slug}`}>
                  <ResponsiveImage
                    alt={`${series.title}摄影系列封面`}
                    className="photography-series-cover"
                    height={1402}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    sizes="(min-width: 896px) 36vw, 100vw"
                    src={series.coverUrl}
                    width={1122}
                  />
                  <div className="photography-series-meta">
                    <span className="work-number">SERIES {String(index + 1).padStart(2, '0')}</span>
                    <h3>{series.title}</h3>
                    <p>{series.intro}</p>
                    <small>
                      {PHOTO_CATEGORY_LABELS[series.category]} · {series.shotAt}
                    </small>
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
