import { useRef, useState, type ChangeEvent } from 'react'
import type { LiveWork, PhotoAsset, PublishStatus } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import { adminLiveWorkSchema } from '../../domain/schemas'
import type { AdminMediaStoragePort } from './types'

interface AdminLiveEditorProps {
  repository: Pick<AdminContentRepository, 'saveLiveWork'>
  storage: AdminMediaStoragePort
  initialValue: LiveWork
  readImageDimensions?: (file: File) => Promise<{ width: number; height: number }>
}

async function browserImageDimensions(file: File) {
  const bitmap = await createImageBitmap(file)
  const dimensions = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return dimensions
}

export function AdminLiveEditor({ repository, storage, initialValue, readImageDimensions = browserImageDimensions }: AdminLiveEditorProps) {
  const [liveWork, setLiveWork] = useState(initialValue)
  const [roles, setRoles] = useState(initialValue.roles.join('\n'))
  const [uploadState, setUploadState] = useState<'等待上传' | '正在上传…' | '上传完成'>('等待上传')
  const [uploading, setUploading] = useState(false)
  const uploadInFlight = useRef(false)
  const [pendingRemoval, setPendingRemoval] = useState<PhotoAsset | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function markDirty() {
    setMessage('')
  }

  function update<K extends keyof LiveWork>(key: K, value: LiveWork[K]) {
    markDirty()
    setLiveWork((current) => ({ ...current, [key]: value }))
  }

  function updateScreenshot(index: number, patch: Partial<PhotoAsset>) {
    markDirty()
    setLiveWork((current) => ({ ...current, screenshots: current.screenshots.map((shot, shotIndex) => shotIndex === index ? { ...shot, ...patch } : shot) }))
  }

  function moveScreenshot(index: number, direction: -1 | 1) {
    markDirty()
    setLiveWork((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.screenshots.length) return current
      const screenshots = [...current.screenshots]
      ;[screenshots[index], screenshots[nextIndex]] = [screenshots[nextIndex], screenshots[index]]
      return { ...current, screenshots }
    })
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file || uploadInFlight.current || liveWork.screenshots.length >= 12) return
    uploadInFlight.current = true
    setUploading(true)
    markDirty()
    setError('')
    setUploadState('正在上传…')
    try {
      const dimensions = await readImageDimensions(file)
      const result = await storage.upload(file, 'live')
      markDirty()
      setLiveWork((current) => current.screenshots.length >= 12 ? current : { ...current, screenshots: [...current.screenshots, { id: result.id, url: result.url, alt: '', ...dimensions }] })
      setUploadState('上传完成')
    } catch {
      setUploadState('等待上传')
      setError('文件上传失败，请稍后重试。')
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  async function save(statusOverride?: PublishStatus) {
    if (uploadInFlight.current || uploading) return
    const status = statusOverride ?? liveWork.status
    const normalizedRoles = roles.split(/[\n,，]/).map((role) => role.trim()).filter(Boolean)
    if (status === 'published' && liveWork.screenshots.some((shot) => shot.alt.trim().length < 2)) {
      setError('请为每张截图填写有效的替代文字')
      setMessage('')
      return
    }
    if (status === 'published' && !liveWork.screenshots.some((shot) => shot.url === liveWork.coverUrl)) {
      setError('请选择有效的直播封面')
      setMessage('')
      return
    }
    const parsed = adminLiveWorkSchema.safeParse({ ...liveWork, roles: normalizedRoles, status })
    if (!parsed.success) {
      setError('请检查必填内容后重试。')
      setMessage('')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await repository.saveLiveWork(parsed.data)
      setLiveWork(saved)
      setRoles(saved.roles.join('\n'))
      setMessage('保存成功')
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  function confirmRemoval() {
    if (!pendingRemoval) return
    markDirty()
    setLiveWork((current) => {
      const screenshots = current.screenshots.filter((shot) => shot.id !== pendingRemoval.id)
      return { ...current, screenshots, coverUrl: current.coverUrl === pendingRemoval.url ? '' : current.coverUrl }
    })
    setPendingRemoval(null)
  }

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">LIVE / EDITOR</p><h1>直播作品</h1></div>
        <div className="admin-page-actions">
          <button type="button" disabled={saving || uploading} onClick={() => void save()}>保存直播作品</button>
          <button className="admin-primary-button" type="button" disabled={saving || uploading} onClick={() => void save('published')}>发布直播作品</button>
        </div>
      </header>
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {message ? <p className="admin-form-message success" role="status">{message}</p> : null}
      <form className="admin-form admin-editor-form" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="admin-editor-fields" disabled={saving}>
        <section className="admin-form-section">
          <h2>直播信息</h2>
          <div className="admin-field-grid">
            <label><span>直播 ID</span><input value={liveWork.id} onChange={(event) => update('id', event.currentTarget.value)} /></label>
            <label><span>URL 标识</span><input value={liveWork.slug} onChange={(event) => update('slug', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>标题</span><input value={liveWork.title} onChange={(event) => update('title', event.currentTarget.value)} /></label>
            <label><span>直播日期</span><input value={liveWork.heldAt} onChange={(event) => update('heldAt', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>封面 URL</span><input readOnly value={liveWork.coverUrl} /></label>
            <label className="admin-field-wide"><span>一句简介</span><input value={liveWork.summary} onChange={(event) => update('summary', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>详细说明</span><textarea rows={5} value={liveWork.description} onChange={(event) => update('description', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>创作角色</span><textarea rows={3} value={roles} onChange={(event) => { markDirty(); setRoles(event.currentTarget.value) }} /></label>
            <label><span>排序</span><input type="number" min="0" value={liveWork.sortOrder} onChange={(event) => update('sortOrder', Number(event.currentTarget.value))} /></label>
            <label><span>发布状态</span><select value={liveWork.status} onChange={(event) => update('status', event.currentTarget.value as PublishStatus)}><option value="draft">草稿</option><option value="published">已发布</option><option value="hidden">隐藏</option></select></label>
            <label className="admin-check"><input type="checkbox" checked={liveWork.featured} onChange={(event) => update('featured', event.currentTarget.checked)} /><span>首页推荐</span></label>
            <label><span>更新时间</span><input value={liveWork.updatedAt} onChange={(event) => update('updatedAt', event.currentTarget.value)} /></label>
          </div>
        </section>
        <section className="admin-form-section">
          <div className="admin-section-heading"><h2>截图（{liveWork.screenshots.length} / 12）</h2><label className="admin-upload"><span>上传直播截图</span><input aria-label="上传直播截图" type="file" accept="image/jpeg,image/png,image/webp" disabled={liveWork.screenshots.length >= 12 || uploading} onChange={(event) => void upload(event)} /><small>{uploadState}</small></label></div>
          <div className="admin-photo-assets">
            {liveWork.screenshots.map((shot, index) => (
              <fieldset className="admin-photo-asset" role="group" aria-label={`截图 ${index + 1}`} key={shot.id}>
                <legend>截图 {index + 1}</legend>
                <img src={shot.url} alt="" />
                <div className="admin-field-grid">
                  <label className="admin-field-wide"><span>截图 URL</span><input aria-label={`截图 ${index + 1} URL`} readOnly value={shot.url} /></label>
                  <label className="admin-field-wide"><span>替代文字</span><input aria-label={`截图 ${index + 1} 替代文字`} value={shot.alt} onChange={(event) => updateScreenshot(index, { alt: event.currentTarget.value })} /></label>
                  <label><span>宽度</span><input aria-label={`截图 ${index + 1} 宽度`} type="number" min="1" value={shot.width} onChange={(event) => updateScreenshot(index, { width: Number(event.currentTarget.value) })} /></label>
                  <label><span>高度</span><input aria-label={`截图 ${index + 1} 高度`} type="number" min="1" value={shot.height} onChange={(event) => updateScreenshot(index, { height: Number(event.currentTarget.value) })} /></label>
                </div>
                <div className="admin-asset-actions">
                  <button type="button" disabled={index === 0} onClick={() => moveScreenshot(index, -1)}>上移：{shot.alt || `截图 ${index + 1}`}</button>
                  <button type="button" disabled={index === liveWork.screenshots.length - 1} onClick={() => moveScreenshot(index, 1)}>下移：{shot.alt || `截图 ${index + 1}`}</button>
                  <button type="button" aria-pressed={liveWork.coverUrl === shot.url} onClick={() => update('coverUrl', shot.url)}>设为封面：{shot.alt || `截图 ${index + 1}`}</button>
                  <button className="admin-danger-button" type="button" onClick={() => setPendingRemoval(shot)}>移除：{shot.alt || `截图 ${index + 1}`}</button>
                </div>
              </fieldset>
            ))}
          </div>
        </section>
        </fieldset>
      </form>
      {pendingRemoval ? <div className="admin-dialog-backdrop"><div className="admin-dialog" role="dialog" aria-modal="true" aria-label="确认移除截图"><h2>确认移除截图</h2><p>确定移除“{pendingRemoval.alt}”吗？</p><div className="admin-page-actions"><button type="button" onClick={() => setPendingRemoval(null)}>取消</button><button className="admin-danger-button" type="button" onClick={confirmRemoval}>确认移除</button></div></div></div> : null}
    </main>
  )
}
