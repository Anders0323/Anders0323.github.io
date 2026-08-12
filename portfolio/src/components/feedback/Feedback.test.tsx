import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoadState } from './LoadState'
import { RouteError } from './RouteError'

describe('LoadState', () => {
  it('announces loading and empty messages without offering a retry action', () => {
    const loading = render(<LoadState status="loading" message="正在加载个人资料…" />)
    expect(screen.getByRole('status')).toHaveTextContent('正在加载个人资料…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    loading.unmount()

    render(<LoadState status="empty" message="暂时没有已发布内容。" />)
    expect(screen.getByRole('status')).toHaveTextContent('暂时没有已发布内容。')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('announces request errors and exposes a native retry button only when retry is available', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(
      <LoadState status="error" message="内容暂时无法加载。" onRetry={onRetry} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('内容暂时无法加载。')
    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(onRetry).toHaveBeenCalledOnce()

    rerender(<LoadState status="error" message="内容暂时无法加载。" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('RouteError', () => {
  it('shows only public-safe navigation copy and never exposes the supplied error detail', () => {
    render(
      <MemoryRouter>
        <RouteError
          title="页面未找到"
          message="没有找到这个页面。"
          error={new Error('CloudBase env-123 SELECT * FROM private_collection')}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '页面未找到' })).toBeInTheDocument()
    expect(screen.getByText('没有找到这个页面。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/CloudBase|env-123|SELECT|private_collection/)).not.toBeInTheDocument()
  })

  it('uses a generic public-safe fallback when rendered for a route exception', () => {
    render(
      <MemoryRouter>
        <RouteError error={new Error('private exception detail')} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '页面暂时无法显示' })).toBeInTheDocument()
    expect(screen.getByText('请求的页面暂时无法显示。')).toBeInTheDocument()
    expect(screen.queryByText('private exception detail')).not.toBeInTheDocument()
  })
})
