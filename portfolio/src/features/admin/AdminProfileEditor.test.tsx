import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fixtureProfile } from '../../fixtures/content'
import { AdminProfileEditor } from './AdminProfileEditor'

function repositoryMock() {
  return { saveProfile: vi.fn().mockImplementation(async (profile) => profile) }
}

function storageMock() {
  return {
    upload: vi.fn()
      .mockResolvedValueOnce({ id: 'portrait', path: 'portrait', fullPath: 'cloud://portrait', url: 'https://assets.example.com/portrait.jpg' })
      .mockResolvedValueOnce({ id: 'wechat', path: 'wechat', fullPath: 'cloud://wechat', url: 'https://assets.example.com/wechat.png' })
      .mockResolvedValueOnce({ id: 'resume', path: 'resume', fullPath: 'cloud://resume', url: 'https://assets.example.com/resume.pdf' }),
  }
}

describe('AdminProfileEditor', () => {
  it('exposes every profile field and no phone field', () => {
    render(<AdminProfileEditor repository={repositoryMock() as never} storage={storageMock() as never} initialValue={fixtureProfile} />)

    for (const label of ['资料 ID', '姓名', '职业定位', '个人主张', '个人简介', '肖像 URL', '简历 URL', '邮箱', '微信二维码 URL', '发布状态', '更新时间', '经历 1', '能力 1', '社交链接 1 名称', '社交链接 1 URL']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/电话|手机/)).not.toBeInTheDocument()
  })

  it('adds repeatable experience, capabilities, and social links and saves valid data', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminProfileEditor repository={repository as never} storage={storageMock() as never} initialValue={fixtureProfile} />)

    await user.click(screen.getByRole('button', { name: '添加经历' }))
    await user.type(screen.getByLabelText('经历 3'), '真实项目：内容统筹')
    await user.click(screen.getByRole('button', { name: '添加能力' }))
    await user.type(screen.getByLabelText('能力 4'), '项目复盘')
    await user.click(screen.getByRole('button', { name: '添加社交链接' }))
    await user.type(screen.getByLabelText('社交链接 2 名称'), '个人主页')
    await user.type(screen.getByLabelText('社交链接 2 URL'), 'https://portfolio.example.com')
    await user.click(screen.getByRole('button', { name: '保存个人资料' }))

    expect(repository.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      experience: [...fixtureProfile.experience, '真实项目：内容统筹'],
      capabilities: [...fixtureProfile.capabilities, '项目复盘'],
      socialLinks: [...fixtureProfile.socialLinks, { label: '个人主页', url: 'https://portfolio.example.com' }],
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('保存成功')
  })

  it('uploads portrait, WeChat QR, and résumé independently and stores public URLs', async () => {
    const user = userEvent.setup()
    const storage = storageMock()
    render(<AdminProfileEditor repository={repositoryMock() as never} storage={storage as never} initialValue={fixtureProfile} />)

    await user.upload(screen.getByLabelText('上传肖像'), new File(['p'], 'portrait.jpg', { type: 'image/jpeg' }))
    await user.upload(screen.getByLabelText('上传微信二维码'), new File(['q'], 'wechat.png', { type: 'image/png' }))
    await user.upload(screen.getByLabelText('上传 PDF 简历'), new File(['r'], 'resume.pdf', { type: 'application/pdf' }))

    expect(storage.upload).toHaveBeenNthCalledWith(1, expect.any(File), 'profile')
    expect(storage.upload).toHaveBeenNthCalledWith(2, expect.any(File), 'profile')
    expect(storage.upload).toHaveBeenNthCalledWith(3, expect.any(File), 'resume')
    expect(screen.getByLabelText('肖像 URL')).toHaveValue('https://assets.example.com/portrait.jpg')
    expect(screen.getByLabelText('微信二维码 URL')).toHaveValue('https://assets.example.com/wechat.png')
    expect(screen.getByLabelText('简历 URL')).toHaveValue('https://assets.example.com/resume.pdf')
    expect(screen.getAllByText('上传完成')).toHaveLength(3)
  })

  it('validates the profile schema before repository writes', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminProfileEditor repository={repository as never} storage={storageMock() as never} initialValue={fixtureProfile} />)

    await user.clear(screen.getByLabelText('邮箱'))
    await user.type(screen.getByLabelText('邮箱'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: '保存个人资料' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请检查必填内容后重试')
    expect(repository.saveProfile).not.toHaveBeenCalled()
  })

  it('saves incomplete private profile drafts through the admin schema', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    const draft = {
      ...fixtureProfile, status: 'hidden' as const, name: '', role: '', statement: '', intro: '', portraitUrl: '',
      experience: [], capabilities: [], resumeUrl: '', email: '', wechatQrUrl: '', socialLinks: [],
    }
    render(<AdminProfileEditor repository={repository as never} storage={storageMock() as never} initialValue={draft} />)

    await user.click(screen.getByRole('button', { name: '保存个人资料' }))
    expect(repository.saveProfile).toHaveBeenCalledWith(draft)
  })

  it('keeps persisted profile media read-only and rejects private file URLs', async () => {
    const user = userEvent.setup()
    const repository = repositoryMock()
    render(<AdminProfileEditor repository={repository as never} storage={storageMock() as never} initialValue={{ ...fixtureProfile, status: 'draft', resumeUrl: 'file:///private/resume.pdf' }} />)

    expect(screen.getByLabelText('肖像 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('微信二维码 URL')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('简历 URL')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: '保存个人资料' }))
    expect(repository.saveProfile).not.toHaveBeenCalled()
  })
})
