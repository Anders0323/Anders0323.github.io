import { Link } from 'react-router-dom'

interface RouteErrorProps {
  title?: string
  message?: string
  label?: string
  error?: unknown
}

export function RouteError({
  title = '页面暂时无法显示',
  message = '请求的页面暂时无法显示。',
  label = 'ERROR / ROUTE',
}: RouteErrorProps) {
  return (
    <main className="route-error" id="main-content">
      <p className="section-index">{label}</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link className="text-link" to="/">
        返回首页
      </Link>
    </main>
  )
}
