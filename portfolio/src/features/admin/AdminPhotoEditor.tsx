import { useState, type ChangeEvent } from 'react'
import type { PhotoAsset, PhotoCategory, PhotoSeries, PublishStatus } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import { adminPhotoSeriesSchema } from '../../domain/schemas'
import type { AdminMediaStoragePort } from './types'

interface AdminPhotoEditorProps {
  repository: Pick<AdminContentRepository, 'savePhotoSeries'>
  storage: AdminMediaStoragePort
  initialValue: PhotoSeries
  readImageDimensions?: (file: File) => Promise<{ width: number; height: number }>
}

const categories: Array<{ value: PhotoCategory; label: string }> = [
  { value: 'people-car', label: '人车之间' },
  { value: 'space', label: '空间与建筑' },
  { value: 'event', label: '活动现场' },
  { value: 'motion', label: '运动瞬间' },
  { value: 'product', label: '产品与静物' },
]

async function browserImageDimensions(file: File) {
  const bitmap = await createImageBitmap(file)
  const dimensions = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return dimensions
}

export function AdminPhotoEditor({ repository, storage, initialValue, readImageDimensions = browserImageDimensions }: AdminPhotoEditorProps) {
  const [series, setSeries] = useState(initialValue)
  const [uploadState, setUploadState] = useState<'等待上传' | '正在上传…' | '上传完成'>('等待上传')
  const [pendingRemoval, setPendingRemoval] = useState<PhotoAsset | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof PhotoSeries>(key: K, value: PhotoSeries[K]) {
    setSeries((current) => ({ ...current, [key]: value }))
  }

  function updatePhoto(index: number, patch: Partial<PhotoAsset>) {
    setSeries((current) => ({
      ...current,
      photos: current.photos.map((photo, photoIndex) => photoIndex === index ? { ...photo, ...patch } : photo),
    }))
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setSeries((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.photos.length) return current
      const photos = [...current.photos]
      ;[photos[index], photos[nextIndex]] = [photos[nextIndex], photos[index]]
      return { ...current, photos }
    })
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file || series.photos.length >= 30) return
    setError('')
    setUploadState('正在上传…')
    try {
      const dimensions = await readImageDimensions(file)
      const result = await storage.upload(file, 'photos')
      setSeries((current) => ({
        ...current,
        photos: [...current.photos, { id: result.id, url: result.url, alt: '', ...dimensions }],
      }))
      setUploadState('上传完成')
    } catch {
      setUploadState('等待上传')
      setError('文件上传失败，请稍后重试。')
    }
  }

  async function save(statusOverride?: PublishStatus) {
    const status = statusOverride ?? series.status
    if (status === 'published' && series.photos.some((photo) => photo.alt.trim().length < 2)) {
      setError('请为每张图片填写有效的替代文字')
      setMessage('')
      return
    }
    if (status === 'published' && !series.photos.some((photo) => photo.url === series.coverUrl)) {
      setError('请选择有效的系列封面')
      setMessage('')
      return
    }
    const parsed = adminPhotoSeriesSchema.safeParse({ ...series, status })
    if (!parsed.success) {
      setError('请检查必填内容后重试。')
      setMessage('')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await repository.savePhotoSeries(parsed.data)
      setSeries(saved)
      setMessage('保存成功')
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  function confirmRemoval() {
    if (!pendingRemoval) return
    setSeries((current) => {
      const photos = current.photos.filter((photo) => photo.id !== pendingRemoval.id)
      return { ...current, photos, coverUrl: current.coverUrl === pendingRemoval.url ? '' : current.coverUrl }
    })
    setPendingRemoval(null)
  }

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">PHOTOGRAPHY / EDITOR</p><h1>摄影系列</h1></div>
        <div className="admin-page-actions">
          <button type="button" disabled={saving} onClick={() => void save()}>保存摄影系列</button>
          <button className="admin-primary-button" type="button" disabled={saving} onClick={() => void save('published')}>发布摄影系列</button>
        </div>
      </header>
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {message ? <p className="admin-form-message success" role="status">{message}</p> : null}
      <form className="admin-form admin-editor-form" onSubmit={(event) => event.preventDefault()}>
        <section className="admin-form-section">
          <h2>系列信息</h2>
          <div className="admin-field-grid">
            <label><span>系列 ID</span><input value={series.id} onChange={(event) => update('id', event.currentTarget.value)} /></label>
            <label><span>URL 标识</span><input value={series.slug} onChange={(event) => update('slug', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>标题</span><input value={series.title} onChange={(event) => update('title', event.currentTarget.value)} /></label>
            <label><span>分类</span><select value={series.category} onChange={(event) => update('category', event.currentTarget.value as PhotoCategory)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>拍摄时间</span><input value={series.shotAt} onChange={(event) => update('shotAt', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>封面 URL</span><input readOnly value={series.coverUrl} /></label>
            <label className="admin-field-wide"><span>系列介绍</span><textarea rows={3} value={series.intro} onChange={(event) => update('intro', event.currentTarget.value)} /></label>
            <label><span>排序</span><input type="number" min="0" value={series.sortOrder} onChange={(event) => update('sortOrder', Number(event.currentTarget.value))} /></label>
            <label><span>发布状态</span><select value={series.status} onChange={(event) => update('status', event.currentTarget.value as PublishStatus)}><option value="draft">草稿</option><option value="published">已发布</option><option value="hidden">隐藏</option></select></label>
            <label className="admin-check"><input type="checkbox" checked={series.featured} onChange={(event) => update('featured', event.currentTarget.checked)} /><span>首页推荐</span></label>
            <label><span>更新时间</span><input value={series.updatedAt} onChange={(event) => update('updatedAt', event.currentTarget.value)} /></label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-section-heading"><h2>图片（{series.photos.length} / 30）</h2><label className="admin-upload"><span>上传摄影图片</span><input aria-label="上传摄影图片" type="file" accept="image/jpeg,image/png,image/webp" disabled={series.photos.length >= 30} onChange={(event) => void upload(event)} /><small>{uploadState}</small></label></div>
          <div className="admin-photo-assets">
            {series.photos.map((photo, index) => (
              <fieldset className="admin-photo-asset" role="group" aria-label={`图片 ${index + 1}`} key={photo.id}>
                <legend>图片 {index + 1}</legend>
                <img src={photo.url} alt="" />
                <div className="admin-field-grid">
                  <label className="admin-field-wide"><span>图片 URL</span><input aria-label={`图片 ${index + 1} URL`} readOnly value={photo.url} /></label>
                  <label className="admin-field-wide"><span>替代文字</span><input aria-label={`图片 ${index + 1} 替代文字`} value={photo.alt} onChange={(event) => updatePhoto(index, { alt: event.currentTarget.value })} /></label>
                  <label><span>宽度</span><input aria-label={`图片 ${index + 1} 宽度`} type="number" min="1" value={photo.width} onChange={(event) => updatePhoto(index, { width: Number(event.currentTarget.value) })} /></label>
                  <label><span>高度</span><input aria-label={`图片 ${index + 1} 高度`} type="number" min="1" value={photo.height} onChange={(event) => updatePhoto(index, { height: Number(event.currentTarget.value) })} /></label>
                </div>
                <div className="admin-asset-actions">
                  <button type="button" disabled={index === 0} onClick={() => movePhoto(index, -1)}>上移：{photo.alt || `图片 ${index + 1}`}</button>
                  <button type="button" disabled={index === series.photos.length - 1} onClick={() => movePhoto(index, 1)}>下移：{photo.alt || `图片 ${index + 1}`}</button>
                  <button type="button" aria-pressed={series.coverUrl === photo.url} onClick={() => update('coverUrl', photo.url)}>设为封面：{photo.alt || `图片 ${index + 1}`}</button>
                  <button className="admin-danger-button" type="button" onClick={() => setPendingRemoval(photo)}>移除：{photo.alt || `图片 ${index + 1}`}</button>
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      </form>
      {pendingRemoval ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-label="确认移除图片">
            <h2>确认移除图片</h2>
            <p>确定移除“{pendingRemoval.alt}”吗？</p>
            <div className="admin-page-actions">
              <button type="button" onClick={() => setPendingRemoval(null)}>取消</button>
              <button className="admin-danger-button" type="button" onClick={confirmRemoval}>确认移除</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
