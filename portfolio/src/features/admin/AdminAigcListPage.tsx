import { useEffect, useState } from 'react'
import type { AigcWork, PublishStatus } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'

const statusLabels: Record<PublishStatus, string> = { draft: '草稿', published: '已发布', hidden: '隐藏' }
const mediaTypeLabels: Record<AigcWork['mediaType'], string> = { image: '图片', video: '视频' }

export function AdminAigcListPage({ repository }: { repository: Pick<AdminContentRepository, 'listAllAigcWorks'> }) {
  const [works, setWorks] = useState<AigcWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void repository.listAllAigcWorks().then(
      (items) => { if (active) { setWorks(items); setLoading(false) } },
      () => { if (active) { setError('AIGC 作品暂时无法加载，请稍后重试。'); setLoading(false) } },
    )
    return () => { active = false }
  }, [repository])

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading"><div><p className="section-index">AIGC / OVERVIEW</p><h1>AIGC 作品</h1></div><a className="admin-primary-button" href="/admin/aigc/new">新建 AIGC 作品</a></header>
      {loading ? <p role="status">正在读取 AIGC 作品…</p> : null}
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {!loading && !error && works.length === 0 ? <p className="admin-empty">还没有 AIGC 作品。可以从“新建 AIGC 作品”开始。</p> : null}
      <div className="admin-list admin-aigc-list">
        {works.map((work) => <article className="admin-list-row" key={work.id}><div><span className={`admin-status ${work.status}`}>{statusLabels[work.status]}</span><h3>{work.title}</h3></div><dl><div><dt>媒体类型</dt><dd>{mediaTypeLabels[work.mediaType]}</dd></div><div><dt>年份</dt><dd>{work.year}</dd></div></dl><div className="admin-row-actions"><a href={`/admin/aigc/${encodeURIComponent(work.id)}`}>编辑《{work.title}》</a></div></article>)}
      </div>
    </main>
  )
}
