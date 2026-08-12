import { useEffect, useState } from 'react'
import type { LiveWork, PublishStatus } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'

const statusLabels: Record<PublishStatus, string> = { draft: '草稿', published: '已发布', hidden: '隐藏' }

export function AdminLiveListPage({ repository }: { repository: Pick<AdminContentRepository, 'listAllLiveWorks'> }) {
  const [liveWorks, setLiveWorks] = useState<LiveWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void repository.listAllLiveWorks().then(
      (items) => { if (active) { setLiveWorks(items); setLoading(false) } },
      () => { if (active) { setError('直播作品暂时无法加载，请稍后重试。'); setLoading(false) } },
    )
    return () => { active = false }
  }, [repository])

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading"><div><p className="section-index">LIVE / OVERVIEW</p><h1>直播作品</h1></div><a className="admin-primary-button" href="/admin/live/new">新建直播作品</a></header>
      {loading ? <p role="status">正在读取直播作品…</p> : null}
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {!loading && !error && liveWorks.length === 0 ? <p className="admin-empty">还没有直播作品。可以从“新建直播作品”开始。</p> : null}
      <div className="admin-list admin-live-list">
        {liveWorks.map((work) => <article className="admin-list-row" key={work.id}><div><span className={`admin-status ${work.status}`}>{statusLabels[work.status]}</span><h3>{work.title}</h3></div><dl><div><dt>直播日期</dt><dd>{work.heldAt}</dd></div><div><dt>截图</dt><dd>{work.screenshots.length} 张</dd></div></dl><div className="admin-row-actions"><a href={`/admin/live/${encodeURIComponent(work.id)}`}>编辑《{work.title}》</a></div></article>)}
      </div>
    </main>
  )
}
