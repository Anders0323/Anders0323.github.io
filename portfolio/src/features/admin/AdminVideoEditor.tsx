import { useState, type ChangeEvent } from 'react'
import type { CoverOrientation, PublishStatus, VideoCategory, VideoWork } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import { adminVideoWorkSchema } from '../../domain/schemas'
import type { AdminMediaStoragePort } from './types'

type UploadKey = 'horizontal' | 'vertical' | 'video'
type UploadState = '等待上传' | '正在上传…' | '上传完成'

interface AdminVideoEditorProps {
  repository: Pick<AdminContentRepository, 'saveVideo'>
  storage: AdminMediaStoragePort
  initialValue: VideoWork
}

const categories: Array<{ value: VideoCategory; label: string }> = [
  { value: 'people', label: '人物叙事' },
  { value: 'brand', label: '品牌表达' },
  { value: 'event', label: '现场纪实' },
  { value: 'social', label: '社交创意' },
]

export function AdminVideoEditor({ repository, storage, initialValue }: AdminVideoEditorProps) {
  const [video, setVideo] = useState(initialValue)
  const [roles, setRoles] = useState(initialValue.roles.join('\n'))
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({
    horizontal: '等待上传',
    vertical: '等待上传',
    video: '等待上传',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof VideoWork>(key: K, value: VideoWork[K]) {
    setVideo((current) => ({ ...current, [key]: value }))
  }

  async function upload(key: UploadKey, file: File | undefined) {
    if (!file) return
    setError('')
    setUploads((current) => ({ ...current, [key]: '正在上传…' }))
    try {
      const result = await storage.upload(file, key === 'video' ? 'videos' : 'covers')
      if (key === 'horizontal') update('horizontalCoverUrl', result.url)
      if (key === 'vertical') update('verticalCoverUrl', result.url)
      if (key === 'video') update('videoUrl', result.url)
      setUploads((current) => ({ ...current, [key]: '上传完成' }))
    } catch {
      setUploads((current) => ({ ...current, [key]: '等待上传' }))
      setError('文件上传失败，请稍后重试。')
    }
  }

  async function save(statusOverride?: PublishStatus) {
    const status = statusOverride ?? video.status
    const selectedCoverUrl = video.coverOrientation === 'landscape' ? video.horizontalCoverUrl : video.verticalCoverUrl
    if (status === 'published' && !selectedCoverUrl.trim()) {
      setError(video.coverOrientation === 'landscape' ? '请上传横版封面' : '请上传竖版封面')
      setMessage('')
      return
    }
    const parsed = adminVideoWorkSchema.safeParse({
      ...video,
      roles: roles.split(/[\n,，]/).map((role) => role.trim()).filter(Boolean),
      status,
    })
    if (!parsed.success) {
      setError('请检查必填内容后重试。')
      setMessage('')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await repository.saveVideo(parsed.data)
      setVideo(saved)
      setRoles(saved.roles.join('\n'))
      setMessage('保存成功')
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  function fileHandler(key: UploadKey) {
    return (event: ChangeEvent<HTMLInputElement>) => void upload(key, event.currentTarget.files?.[0])
  }

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">VIDEO / EDITOR</p><h1>短视频作品</h1></div>
        <div className="admin-page-actions">
          <button type="button" disabled={saving} onClick={() => void save()}>保存作品</button>
          <button className="admin-primary-button" type="button" disabled={saving} onClick={() => void save('published')}>发布作品</button>
        </div>
      </header>
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {message ? <p className="admin-form-message success" role="status">{message}</p> : null}
      <form className="admin-form admin-editor-form" onSubmit={(event) => event.preventDefault()}>
        <section className="admin-form-section">
          <h2>基础信息</h2>
          <div className="admin-field-grid">
            <label><span>作品 ID</span><input value={video.id} onChange={(event) => update('id', event.currentTarget.value)} /></label>
            <label><span>URL 标识</span><input value={video.slug} onChange={(event) => update('slug', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>标题</span><input value={video.title} onChange={(event) => update('title', event.currentTarget.value)} /></label>
            <label><span>分类</span><select value={video.category} onChange={(event) => update('category', event.currentTarget.value as VideoCategory)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>封面版式</span><select aria-label="封面版式" value={video.coverOrientation} onChange={(event) => update('coverOrientation', event.currentTarget.value as CoverOrientation)}><option value="portrait">竖版 3:4</option><option value="landscape">横版 4:3</option></select></label>
            <label><span>年份</span><input type="number" value={video.year} onChange={(event) => update('year', Number(event.currentTarget.value))} /></label>
            <label><span>发布平台</span><input value={video.platform ?? ''} onChange={(event) => update('platform', event.currentTarget.value || undefined)} /></label>
            <label><span>排序</span><input type="number" min="0" value={video.sortOrder} onChange={(event) => update('sortOrder', Number(event.currentTarget.value))} /></label>
            <label><span>发布状态</span><select value={video.status} onChange={(event) => update('status', event.currentTarget.value as PublishStatus)}><option value="draft">草稿</option><option value="published">已发布</option><option value="hidden">隐藏</option></select></label>
            <label className="admin-check"><input type="checkbox" checked={video.featured} onChange={(event) => update('featured', event.currentTarget.checked)} /><span>首页推荐</span></label>
            <label><span>更新时间</span><input value={video.updatedAt} onChange={(event) => update('updatedAt', event.currentTarget.value)} /></label>
          </div>
        </section>

        <section className="admin-form-section">
          <h2>媒体素材</h2>
          <div className="admin-field-grid">
            <label className="admin-field-wide"><span>横版封面 URL</span><input readOnly value={video.horizontalCoverUrl} /></label>
            <label className="admin-upload"><span>上传横版封面</span><input aria-label="上传横版封面" type="file" accept="image/jpeg,image/png,image/webp" onChange={fileHandler('horizontal')} /><small>{uploads.horizontal}</small></label>
            <label className="admin-field-wide"><span>竖版封面 URL</span><input readOnly value={video.verticalCoverUrl} /></label>
            <label className="admin-upload"><span>上传竖版封面</span><input aria-label="上传竖版封面" type="file" accept="image/jpeg,image/png,image/webp" onChange={fileHandler('vertical')} /><small>{uploads.vertical}</small></label>
            <label className="admin-field-wide"><span>视频 URL</span><input readOnly value={video.videoUrl} /></label>
            <label className="admin-upload"><span>上传 MP4</span><input aria-label="上传 MP4" type="file" accept="video/mp4" onChange={fileHandler('video')} /><small>{uploads.video}</small></label>
          </div>
        </section>

        <section className="admin-form-section">
          <h2>内容说明</h2>
          <div className="admin-field-grid">
            <label className="admin-field-wide"><span>创作角色</span><textarea rows={3} value={roles} onChange={(event) => setRoles(event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>一句简介</span><input value={video.summary} onChange={(event) => update('summary', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>详细说明</span><textarea rows={5} value={video.description} onChange={(event) => update('description', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>数据表现</span><input value={video.metrics ?? ''} onChange={(event) => update('metrics', event.currentTarget.value || undefined)} /></label>
          </div>
        </section>
      </form>
    </main>
  )
}
