import { useRef, useState, type ChangeEvent } from 'react'
import type { AigcWork, PublishStatus } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import { adminAigcWorkSchema } from '../../domain/schemas'
import type { AdminMediaStoragePort } from './types'

interface AdminAigcEditorProps {
  repository: Pick<AdminContentRepository, 'saveAigcWork'>
  storage: AdminMediaStoragePort
  initialValue: AigcWork
}

type UploadKey = 'media' | 'cover'
type UploadState = '等待上传' | '正在上传…' | '上传完成'

export function AdminAigcEditor({ repository, storage, initialValue }: AdminAigcEditorProps) {
  const [work, setWork] = useState(initialValue)
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({ media: '等待上传', cover: '等待上传' })
  const [pendingMediaType, setPendingMediaType] = useState<AigcWork['mediaType'] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const uploadInFlight = useRef(false)
  const saveInFlight = useRef(false)

  function markDirty() {
    setMessage('')
  }

  function update<K extends keyof AigcWork>(key: K, value: AigcWork[K]) {
    markDirty()
    setWork((current) => ({ ...current, [key]: value }))
  }

  async function upload(key: UploadKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file || uploadInFlight.current || saveInFlight.current) return
    uploadInFlight.current = true
    setUploading(true)
    setError('')
    markDirty()
    setUploads((current) => ({ ...current, [key]: '正在上传…' }))
    try {
      const folder = key === 'cover' || work.mediaType === 'image' ? 'aigc-images' : 'aigc-videos'
      const result = await storage.upload(file, folder)
      setWork((current) => key === 'cover' ? { ...current, coverUrl: result.url } : { ...current, mediaUrl: result.url })
      setUploads((current) => ({ ...current, [key]: '上传完成' }))
    } catch {
      setUploads((current) => ({ ...current, [key]: '等待上传' }))
      setError('文件上传失败，请稍后重试。')
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  function requestMediaType(nextType: AigcWork['mediaType']) {
    if (nextType === work.mediaType || uploading || saving) return
    if (!work.mediaUrl && !work.coverUrl) {
      update('mediaType', nextType)
      return
    }
    setPendingMediaType(nextType)
  }

  function confirmMediaType() {
    if (!pendingMediaType) return
    markDirty()
    setWork((current) => ({ ...current, mediaType: pendingMediaType, mediaUrl: '', coverUrl: '' }))
    setPendingMediaType(null)
  }

  async function save(statusOverride?: PublishStatus) {
    if (uploadInFlight.current || saveInFlight.current) return
    const status = statusOverride ?? work.status
    if (status === 'published' && work.mediaType === 'video' && !work.coverUrl.trim()) {
      setError('请上传视频封面')
      setMessage('')
      return
    }
    const parsed = adminAigcWorkSchema.safeParse({ ...work, status })
    if (!parsed.success) {
      setError('请检查必填内容后重试。')
      setMessage('')
      return
    }
    saveInFlight.current = true
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await repository.saveAigcWork(parsed.data)
      setWork(saved)
      setMessage('保存成功')
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }

  const isVideo = work.mediaType === 'video'
  const mediaUploadLabel = isVideo ? '上传最终 MP4' : '上传最终图片'

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">AIGC / EDITOR</p><h1>AIGC 作品</h1></div>
        <div className="admin-page-actions">
          <button type="button" disabled={saving || uploading} onClick={() => void save()}>保存 AIGC 作品</button>
          <button className="admin-primary-button" type="button" disabled={saving || uploading} onClick={() => void save('published')}>发布 AIGC 作品</button>
        </div>
      </header>
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {message ? <p className="admin-form-message success" role="status">{message}</p> : null}
      <form className="admin-form admin-editor-form" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="admin-editor-fields" disabled={saving}>
          <section className="admin-form-section">
            <h2>作品信息</h2>
            <div className="admin-field-grid">
              <label><span>作品 ID</span><input value={work.id} onChange={(event) => update('id', event.currentTarget.value)} /></label>
              <label><span>URL 标识</span><input value={work.slug} onChange={(event) => update('slug', event.currentTarget.value)} /></label>
              <label className="admin-field-wide"><span>标题</span><input value={work.title} onChange={(event) => update('title', event.currentTarget.value)} /></label>
              <label><span>媒体类型</span><select value={work.mediaType} disabled={uploading} onChange={(event) => requestMediaType(event.currentTarget.value as AigcWork['mediaType'])}><option value="image">图片</option><option value="video">视频</option></select></label>
              <label><span>年份</span><input type="number" min="2000" max="2100" value={work.year} onChange={(event) => update('year', Number(event.currentTarget.value))} /></label>
              <label><span>排序</span><input type="number" min="0" value={work.sortOrder} onChange={(event) => update('sortOrder', Number(event.currentTarget.value))} /></label>
              <label><span>发布状态</span><select value={work.status} onChange={(event) => update('status', event.currentTarget.value as PublishStatus)}><option value="draft">草稿</option><option value="published">已发布</option><option value="hidden">隐藏</option></select></label>
              <label className="admin-check"><input type="checkbox" checked={work.featured} onChange={(event) => update('featured', event.currentTarget.checked)} /><span>首页推荐</span></label>
              <label><span>更新时间</span><input value={work.updatedAt} onChange={(event) => update('updatedAt', event.currentTarget.value)} /></label>
              <label className="admin-field-wide"><span>一句简介</span><input value={work.summary} onChange={(event) => update('summary', event.currentTarget.value)} /></label>
            </div>
          </section>
          <section className="admin-form-section">
            <h2>最终媒体</h2>
            <div className="admin-field-grid">
              <label className="admin-field-wide"><span>最终媒体 URL</span><input readOnly value={work.mediaUrl} /></label>
              <label className="admin-upload"><span>{mediaUploadLabel}</span><input aria-label={mediaUploadLabel} type="file" accept={isVideo ? 'video/mp4' : 'image/jpeg,image/png,image/webp'} disabled={uploading} onChange={(event) => void upload('media', event)} /><small>{uploads.media}</small></label>
              {isVideo ? <>
                <label className="admin-field-wide"><span>视频封面 URL</span><input readOnly value={work.coverUrl} /></label>
                <label className="admin-upload"><span>上传视频封面</span><input aria-label="上传视频封面" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void upload('cover', event)} /><small>{uploads.cover}</small></label>
              </> : null}
            </div>
          </section>
        </fieldset>
      </form>
      {pendingMediaType ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-label="确认切换媒体类型">
            <p className="section-index">MEDIA / SWITCH</p>
            <h2>确认切换媒体类型</h2>
            <p>切换会清空当前最终媒体和视频封面 URL，是否继续？</p>
            <div className="admin-page-actions">
              <button type="button" onClick={() => setPendingMediaType(null)}>取消</button>
              <button className="admin-danger-button" type="button" onClick={confirmMediaType}>确认切换</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
