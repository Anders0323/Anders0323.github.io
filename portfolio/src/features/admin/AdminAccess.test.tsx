import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ADMIN_LOGIN_ERROR, ADMIN_LOGOUT_ERROR, ADMIN_SESSION_ERROR } from '../../infrastructure/cloudbase/auth'
import { AdminGuard } from './AdminGuard'
import { AdminLayout } from './AdminLayout'
import { AdminLoginPage } from './AdminLoginPage'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe('admin access', () => {
  it('disables login while pending and only exposes the safe login error', async () => {
    const user = userEvent.setup()
    const request = deferred<never>()
    const auth = { signInAdmin: vi.fn().mockReturnValue(request.promise) }

    render(
      <MemoryRouter>
        <AdminLoginPage auth={auth as never} />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('管理员账号'), 'editor')
    await user.type(screen.getByLabelText('密码'), 'private-password')
    await user.click(screen.getByRole('button', { name: '登录后台' }))
    expect(screen.getByRole('button', { name: '正在登录…' })).toBeDisabled()

    request.reject(new Error('raw SDK detail'))
    expect(await screen.findByRole('alert')).toHaveTextContent(ADMIN_LOGIN_ERROR)
    expect(screen.queryByText('raw SDK detail')).not.toBeInTheDocument()
  })

  it('does not flash protected content before the session resolves', async () => {
    const request = deferred<never>()
    const auth = { requireAdminSession: vi.fn().mockReturnValue(request.promise) }

    render(
      <MemoryRouter>
        <AdminGuard auth={auth as never}>
          <p>私密后台内容</p>
        </AdminGuard>
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('正在验证管理员身份…')
    expect(screen.queryByText('私密后台内容')).not.toBeInTheDocument()
  })

  it('submits username/password and enters the protected route after success', async () => {
    const user = userEvent.setup()
    const auth = { signInAdmin: vi.fn().mockResolvedValue({ user: {}, session: {} }) }
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage auth={auth as never} />} />
          <Route path="/admin" element={<p>后台首页</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('管理员账号'), 'editor')
    await user.type(screen.getByLabelText('密码'), 'secret')
    await user.click(screen.getByRole('button', { name: '登录后台' }))

    expect(auth.signInAdmin).toHaveBeenCalledWith('editor', 'secret')
    expect(await screen.findByText('后台首页')).toBeVisible()
  })

  it('redirects expired or anonymous sessions to login', async () => {
    const auth = { requireAdminSession: vi.fn().mockRejectedValue(new Error(ADMIN_SESSION_ERROR)) }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/login" element={<p>管理员登录页</p>} />
          <Route
            path="/admin"
            element={
              <AdminGuard auth={auth as never}>
                <p>私密后台内容</p>
              </AdminGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('管理员登录页')).toBeInTheDocument()
    expect(screen.queryByText('私密后台内容')).not.toBeInTheDocument()
  })

  it('logs out through CloudBase auth and returns to login', async () => {
    const user = userEvent.setup()
    const auth = { signOut: vi.fn().mockResolvedValue(undefined) }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/login" element={<p>管理员登录页</p>} />
          <Route path="/admin" element={<AdminLayout auth={auth as never}>私密后台内容</AdminLayout>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '退出登录' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(await screen.findByText('管理员登录页')).toBeInTheDocument()
  })

  it('makes every admin content area discoverable from the authenticated navigation', () => {
    const auth = { signOut: vi.fn() }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout auth={auth as never}>私密后台内容</AdminLayout>
      </MemoryRouter>,
    )

    const links = Array.from(screen.getByRole('navigation', { name: '后台导航' }).querySelectorAll('a')).map((link) => [
      link.textContent,
      link.getAttribute('href'),
    ])
    expect(links).toEqual([
      ['全部作品', '/admin'],
      ['直播', '/admin/live'],
      ['AIGC', '/admin/aigc'],
      ['个人资料', '/admin/profile'],
    ])
  })

  it('keeps the admin visible and shows a safe message when logout fails', async () => {
    const user = userEvent.setup()
    const auth = { signOut: vi.fn().mockRejectedValue(new Error('raw detail')) }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout auth={auth as never}>私密后台内容</AdminLayout>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '退出登录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(ADMIN_LOGOUT_ERROR)
    expect(screen.getByText('私密后台内容')).toBeInTheDocument()
    expect(screen.queryByText('raw detail')).not.toBeInTheDocument()
  })
})
