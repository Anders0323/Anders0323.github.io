import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { AdminAuthPort } from './types'

export function AdminGuard({ auth, children }: { auth: Pick<AdminAuthPort, 'requireAdminSession'>; children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'rejected'>('checking')

  useEffect(() => {
    let active = true
    void auth.requireAdminSession().then(
      () => {
        if (active) setState('allowed')
      },
      () => {
        if (active) setState('rejected')
      },
    )
    return () => {
      active = false
    }
  }, [auth])

  if (state === 'checking') {
    return (
      <main className="load-message" id="main-content" role="status">
        正在验证管理员身份…
      </main>
    )
  }
  if (state === 'rejected') return <Navigate to="/admin/login" replace />
  return children
}
