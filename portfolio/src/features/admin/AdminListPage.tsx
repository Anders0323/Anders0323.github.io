import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { AigcWork, LiveWork, PhotoSeries, PublishStatus, VideoCategory, VideoWork } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'

type PendingDelete = { kind: 'video' | 'photo' | 'live' | 'aigc'; id: string; title: string }

function assertNever(value: never): never {
  throw new Error(`Unexpected pending delete: ${String(value)}`)
}

const videoCategoryLabels: Record<VideoCategory, string> = {
  people: '人物叙事',
  brand: '品牌表达',
  event: '现场纪实',
  social: '社交创意',
}
const photoCategoryLabels = {
  'people-car': '人车之间',
  space: '空间与建筑',
  event: '活动现场',
  motion: '运动瞬间',
  product: '产品与静物',
}
const statusLabels: Record<PublishStatus, string> = { draft: '草稿', published: '已发布', hidden: '隐藏' }
const mediaTypeLabels: Record<AigcWork['mediaType'], string> = { image: '图片', video: '视频' }

export function AdminListPage({ repository }: { repository: AdminContentRepository }) {
  const [videos, setVideos] = useState<VideoWork[]>([])
  const [photoSeries, setPhotoSeries] = useState<PhotoSeries[]>([])
  const [liveWorks, setLiveWorks] = useState<LiveWork[]>([])
  const [aigcWorks, setAigcWorks] = useState<AigcWork[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [confirmEnabled, setConfirmEnabled] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const deletingRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    setActionError('')
    void Promise.all([repository.listAllVideos(), repository.listAllPhotoSeries(), repository.listAllLiveWorks(), repository.listAllAigcWorks()]).then(
      ([nextVideos, nextPhotos, nextLiveWorks, nextAigcWorks]) => {
        if (!active) return
        setVideos(nextVideos)
        setPhotoSeries(nextPhotos)
        setLiveWorks(nextLiveWorks)
        setAigcWorks(nextAigcWorks)
        setLoading(false)
      },
      () => {
        if (!active) return
        setLoadError('作品列表暂时无法加载，请稍后重试。')
        setLoading(false)
      },
    )
    return () => { active = false }
  }, [repository])

  useEffect(() => {
    if (!pendingDelete) return
    setConfirmEnabled(false)
    const timer = window.setTimeout(() => setConfirmEnabled(true), 800)
    cancelRef.current?.focus()
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDialog()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [pendingDelete])

  function openDialog(item: PendingDelete, event: MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget
    setPendingDelete(item)
  }

  function closeDialog() {
    if (deletingRef.current) return
    setPendingDelete(null)
    setConfirmEnabled(false)
    openerRef.current?.focus()
  }

  async function confirmDelete() {
    if (!pendingDelete || !confirmEnabled) return
    deletingRef.current = true
    setDeleting(true)
    setActionError('')
    try {
      switch (pendingDelete.kind) {
        case 'video':
          await repository.deleteVideo(pendingDelete.id)
          setVideos((current) => current.filter((video) => video.id !== pendingDelete.id))
          break
        case 'photo':
          await repository.deletePhotoSeries(pendingDelete.id)
          setPhotoSeries((current) => current.filter((series) => series.id !== pendingDelete.id))
          break
        case 'live':
          await repository.deleteLiveWork(pendingDelete.id)
          setLiveWorks((current) => current.filter((work) => work.id !== pendingDelete.id))
          break
        case 'aigc':
          await repository.deleteAigcWork(pendingDelete.id)
          setAigcWorks((current) => current.filter((work) => work.id !== pendingDelete.id))
          break
        default:
          assertNever(pendingDelete.kind)
      }
      setPendingDelete(null)
    } catch {
      setActionError('删除失败，请稍后重试。')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">CONTENT / OVERVIEW</p><h1>作品管理</h1></div>
        <div className="admin-page-actions"><a className="admin-button" href="/admin/videos/new">新建短视频</a><a className="admin-button" href="/admin/photography/new">新建摄影系列</a><a className="admin-button" href="/admin/live/new">新建直播作品</a><a className="admin-primary-button" href="/admin/aigc/new">新建 AIGC 作品</a></div>
      </header>
      {loading ? <p role="status">正在读取作品…</p> : null}
      {loadError || actionError ? <p className="admin-form-message error" role="alert">{loadError || actionError}</p> : null}
      {!loading && !loadError ? (
        <div className="admin-content-sections">
          <section className="admin-list-section" aria-labelledby="admin-videos-heading">
            <div className="admin-section-heading"><h2 id="admin-videos-heading">短视频</h2><span>{videos.length} 条</span></div>
            {videos.length === 0 ? <p className="admin-empty">还没有短视频作品。可以从“新建短视频”开始。</p> : (
              <div className="admin-list">
                {videos.map((video) => (
                  <article className="admin-list-row" key={video.id}>
                    <div><span className={`admin-status ${video.status}`}>{statusLabels[video.status]}</span><h3>{video.title}</h3></div>
                    <dl><div><dt>分类</dt><dd>{videoCategoryLabels[video.category]}</dd></div><div><dt>年份</dt><dd>{video.year}</dd></div></dl>
                    <div className="admin-row-actions"><a href={`/admin/videos/${encodeURIComponent(video.id)}`}>编辑《{video.title}》</a><button className="admin-danger-button" type="button" onClick={(event) => openDialog({ kind: 'video', id: video.id, title: video.title }, event)}>删除《{video.title}》</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="admin-list-section" aria-labelledby="admin-photos-heading">
            <div className="admin-section-heading"><h2 id="admin-photos-heading">摄影系列</h2><span>{photoSeries.length} 组</span></div>
            {photoSeries.length === 0 ? <p className="admin-empty">还没有摄影系列。可以从“新建摄影系列”开始。</p> : (
              <div className="admin-list">
                {photoSeries.map((series) => (
                  <article className="admin-list-row" key={series.id}>
                    <div><span className={`admin-status ${series.status}`}>{statusLabels[series.status]}</span><h3>{series.title}</h3></div>
                    <dl><div><dt>分类</dt><dd>{photoCategoryLabels[series.category]}</dd></div><div><dt>拍摄时间</dt><dd>{series.shotAt}</dd></div></dl>
                    <div className="admin-row-actions"><a href={`/admin/photography/${encodeURIComponent(series.id)}`}>编辑《{series.title}》</a><button className="admin-danger-button" type="button" onClick={(event) => openDialog({ kind: 'photo', id: series.id, title: series.title }, event)}>删除《{series.title}》</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="admin-list-section" aria-labelledby="admin-live-heading">
            <div className="admin-section-heading"><h2 id="admin-live-heading">直播作品</h2><span>{liveWorks.length} 场</span></div>
            {liveWorks.length === 0 ? <p className="admin-empty">还没有直播作品。可以从“新建直播作品”开始。</p> : (
              <div className="admin-list">
                {liveWorks.map((work) => (
                  <article className="admin-list-row" key={work.id}>
                    <div><span className={`admin-status ${work.status}`}>{statusLabels[work.status]}</span><h3>{work.title}</h3></div>
                    <dl><div><dt>直播日期</dt><dd>{work.heldAt}</dd></div><div><dt>截图</dt><dd>{work.screenshots.length} 张</dd></div></dl>
                    <div className="admin-row-actions"><a href={`/admin/live/${encodeURIComponent(work.id)}`}>编辑《{work.title}》</a><button className="admin-danger-button" type="button" onClick={(event) => openDialog({ kind: 'live', id: work.id, title: work.title }, event)}>删除《{work.title}》</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="admin-list-section" aria-labelledby="admin-aigc-heading">
            <div className="admin-section-heading"><h2 id="admin-aigc-heading">AIGC 作品</h2><span>{aigcWorks.length} 件</span></div>
            {aigcWorks.length === 0 ? <p className="admin-empty">还没有 AIGC 作品。可以从“新建 AIGC 作品”开始。</p> : (
              <div className="admin-list">
                {aigcWorks.map((work) => (
                  <article className="admin-list-row" key={work.id}>
                    <div><span className={`admin-status ${work.status}`}>{statusLabels[work.status]}</span><h3>{work.title}</h3></div>
                    <dl><div><dt>媒体类型</dt><dd>{mediaTypeLabels[work.mediaType]}</dd></div><div><dt>年份</dt><dd>{work.year}</dd></div></dl>
                    <div className="admin-row-actions"><a href={`/admin/aigc/${encodeURIComponent(work.id)}`}>编辑《{work.title}》</a><button className="admin-danger-button" type="button" onClick={(event) => openDialog({ kind: 'aigc', id: work.id, title: work.title }, event)}>删除《{work.title}》</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
      {pendingDelete ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-label="确认删除作品" aria-modal="true">
            <p className="section-index">DELETE / CONFIRM</p>
            <h2>确认删除作品</h2>
            <p>确定删除《{pendingDelete.title}》吗？删除后无法撤销。</p>
            <div className="admin-page-actions">
              <button ref={cancelRef} type="button" disabled={deleting} onClick={closeDialog}>取消</button>
              <button className="admin-danger-button" type="button" disabled={!confirmEnabled || deleting} onClick={() => void confirmDelete()}>{deleting ? '正在删除…' : `确认删除《${pendingDelete.title}》`}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
