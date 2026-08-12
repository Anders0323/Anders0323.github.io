import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ADMIN_LOGOUT_ERROR } from '../../infrastructure/cloudbase/authMessages'
import type { AdminAuthPort } from './types'

export function AdminLayout({ auth, children }: { auth: Pick<AdminAuthPort, 'signOut'>; children?: ReactNode }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setPending(true)
    setError('')
    try {
      await auth.signOut()
      navigate('/admin/login', { replace: true })
    } catch {
      setError(ADMIN_LOGOUT_ERROR)
      setPending(false)
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href="/admin">作品管理</a>
        <nav aria-label="后台导航">
          <NavLink end to="/admin">全部作品</NavLink>
          <NavLink to="/admin/live">直播</NavLink>
          <NavLink to="/admin/aigc">AIGC</NavLink>
          <NavLink to="/admin/profile">个人资料</NavLink>
        </nav>
        <button type="button" disabled={pending} onClick={() => void logout()}>
          {pending ? '正在退出…' : '退出登录'}
        </button>
      </header>
      {error ? <p className="admin-global-error" role="alert">{error}</p> : null}
      {children ?? <Outlet />}
    </div>
  )
}
