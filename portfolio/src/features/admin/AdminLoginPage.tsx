import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_LOGIN_ERROR } from '../../infrastructure/cloudbase/authMessages'
import type { AdminAuthPort } from './types'

export function AdminLoginPage({ auth }: { auth: AdminAuthPort }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await auth.signInAdmin(username, password)
      navigate('/admin', { replace: true })
    } catch {
      setError(ADMIN_LOGIN_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="admin-login" id="main-content">
      <div className="admin-login-panel">
        <p className="section-index">PRIVATE / CONTENT MANAGER</p>
        <h1>作品管理后台</h1>
        <p>仅限作品集所有者登录。</p>
        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>管理员账号</span>
            <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.currentTarget.value)} />
          </label>
          <label>
            <span>密码</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button className="admin-primary-button" type="submit" disabled={pending}>
            {pending ? '正在登录…' : '登录后台'}
          </button>
        </form>
      </div>
    </main>
  )
}
