import { useState, type ChangeEvent } from 'react'
import type { PublishStatus, SiteProfile } from '../../domain/content'
import type { AdminContentRepository } from '../../domain/repository'
import { adminSiteProfileSchema } from '../../domain/schemas'
import type { AdminMediaStoragePort } from './types'

type UploadKey = 'portrait' | 'wechat' | 'resume'
type UploadState = '等待上传' | '正在上传…' | '上传完成'

interface AdminProfileEditorProps {
  repository: Pick<AdminContentRepository, 'saveProfile'>
  storage: AdminMediaStoragePort
  initialValue: SiteProfile
}

export function AdminProfileEditor({ repository, storage, initialValue }: AdminProfileEditorProps) {
  const [profile, setProfile] = useState(initialValue)
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({ portrait: '等待上传', wechat: '等待上传', resume: '等待上传' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function updateStringList(key: 'experience' | 'capabilities', index: number, value: string) {
    setProfile((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }))
  }

  function addStringList(key: 'experience' | 'capabilities') {
    setProfile((current) => current[key].length >= 10 ? current : { ...current, [key]: [...current[key], ''] })
  }

  function removeStringList(key: 'experience' | 'capabilities', index: number) {
    setProfile((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }))
  }

  function updateSocial(index: number, key: 'label' | 'url', value: string) {
    setProfile((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, linkIndex) => linkIndex === index ? { ...link, [key]: value } : link),
    }))
  }

  async function upload(key: UploadKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setError('')
    setUploads((current) => ({ ...current, [key]: '正在上传…' }))
    try {
      const result = await storage.upload(file, key === 'resume' ? 'resume' : 'profile')
      if (key === 'portrait') update('portraitUrl', result.url)
      if (key === 'wechat') update('wechatQrUrl', result.url)
      if (key === 'resume') update('resumeUrl', result.url)
      setUploads((current) => ({ ...current, [key]: '上传完成' }))
    } catch {
      setUploads((current) => ({ ...current, [key]: '等待上传' }))
      setError('文件上传失败，请稍后重试。')
    }
  }

  async function save() {
    const parsed = adminSiteProfileSchema.safeParse(profile)
    if (!parsed.success) {
      setError('请检查必填内容后重试。')
      setMessage('')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await repository.saveProfile(parsed.data)
      setProfile(saved)
      setMessage('保存成功')
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-page-heading">
        <div><p className="section-index">PROFILE / EDITOR</p><h1>个人资料</h1></div>
        <button className="admin-primary-button" type="button" disabled={saving} onClick={() => void save()}>保存个人资料</button>
      </header>
      {error ? <p className="admin-form-message error" role="alert">{error}</p> : null}
      {message ? <p className="admin-form-message success" role="status">{message}</p> : null}
      <form className="admin-form admin-editor-form" onSubmit={(event) => event.preventDefault()}>
        <section className="admin-form-section">
          <h2>基础资料</h2>
          <div className="admin-field-grid">
            <label><span>资料 ID</span><input value={profile.id} readOnly /></label>
            <label><span>姓名</span><input value={profile.name} onChange={(event) => update('name', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>职业定位</span><input value={profile.role} onChange={(event) => update('role', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>个人主张</span><input value={profile.statement} onChange={(event) => update('statement', event.currentTarget.value)} /></label>
            <label className="admin-field-wide"><span>个人简介</span><textarea rows={5} value={profile.intro} onChange={(event) => update('intro', event.currentTarget.value)} /></label>
            <label><span>邮箱</span><input type="email" value={profile.email} onChange={(event) => update('email', event.currentTarget.value)} /></label>
            <label><span>发布状态</span><select value={profile.status} onChange={(event) => update('status', event.currentTarget.value as PublishStatus)}><option value="draft">草稿</option><option value="published">已发布</option><option value="hidden">隐藏</option></select></label>
            <label><span>更新时间</span><input value={profile.updatedAt} onChange={(event) => update('updatedAt', event.currentTarget.value)} /></label>
          </div>
        </section>

        <section className="admin-form-section">
          <h2>公开素材</h2>
          <div className="admin-field-grid">
            <label className="admin-field-wide"><span>肖像 URL</span><input readOnly value={profile.portraitUrl} /></label>
            <label className="admin-upload"><span>上传肖像</span><input aria-label="上传肖像" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload('portrait', event)} /><small>{uploads.portrait}</small></label>
            <label className="admin-field-wide"><span>微信二维码 URL</span><input readOnly value={profile.wechatQrUrl} /></label>
            <label className="admin-upload"><span>上传微信二维码</span><input aria-label="上传微信二维码" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload('wechat', event)} /><small>{uploads.wechat}</small></label>
            <label className="admin-field-wide"><span>简历 URL</span><input readOnly value={profile.resumeUrl} /></label>
            <label className="admin-upload"><span>上传 PDF 简历</span><input aria-label="上传 PDF 简历" type="file" accept="application/pdf" onChange={(event) => void upload('resume', event)} /><small>{uploads.resume}</small></label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-section-heading"><h2>经历</h2><button type="button" disabled={profile.experience.length >= 10} onClick={() => addStringList('experience')}>添加经历</button></div>
          <div className="admin-repeater">
            {profile.experience.map((item, index) => <div className="admin-repeater-row" key={`experience-${index}`}><label><span>经历 {index + 1}</span><input value={item} onChange={(event) => updateStringList('experience', index, event.currentTarget.value)} /></label><button type="button" disabled={profile.experience.length <= 1} onClick={() => removeStringList('experience', index)}>移除经历 {index + 1}</button></div>)}
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-section-heading"><h2>能力</h2><button type="button" disabled={profile.capabilities.length >= 10} onClick={() => addStringList('capabilities')}>添加能力</button></div>
          <div className="admin-repeater">
            {profile.capabilities.map((item, index) => <div className="admin-repeater-row" key={`capability-${index}`}><label><span>能力 {index + 1}</span><input value={item} onChange={(event) => updateStringList('capabilities', index, event.currentTarget.value)} /></label><button type="button" disabled={profile.capabilities.length <= 1} onClick={() => removeStringList('capabilities', index)}>移除能力 {index + 1}</button></div>)}
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-section-heading"><h2>社交链接</h2><button type="button" disabled={profile.socialLinks.length >= 10} onClick={() => update('socialLinks', [...profile.socialLinks, { label: '', url: '' }])}>添加社交链接</button></div>
          <div className="admin-repeater">
            {profile.socialLinks.map((link, index) => <div className="admin-repeater-row admin-social-row" key={`social-${index}`}><label><span>社交链接 {index + 1} 名称</span><input value={link.label} onChange={(event) => updateSocial(index, 'label', event.currentTarget.value)} /></label><label><span>社交链接 {index + 1} URL</span><input type="url" value={link.url} onChange={(event) => updateSocial(index, 'url', event.currentTarget.value)} /></label><button type="button" onClick={() => update('socialLinks', profile.socialLinks.filter((_, linkIndex) => linkIndex !== index))}>移除社交链接 {index + 1}</button></div>)}
          </div>
        </section>
      </form>
    </main>
  )
}
