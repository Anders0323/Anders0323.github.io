import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('exposes the public shell and portfolio purpose', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: '新媒体运营 / 内容创作者' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
