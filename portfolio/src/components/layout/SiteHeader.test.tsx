import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SiteHeader } from './SiteHeader'

const expectedPublicNavigation = [
  ['首页', '/'],
  ['短视频', '/videos'],
  ['摄影', '/photography'],
  ['直播', '/live'],
  ['AIGC', '/aigc'],
  ['关于', '/about'],
  ['联系', '/contact'],
]

function linkPairs(navigation: HTMLElement) {
  return within(navigation)
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('href')])
}

describe('SiteHeader', () => {
  it('lists the exact seven public links in desktop navigation', () => {
    render(
      <MemoryRouter>
        <SiteHeader name="林一川" />
      </MemoryRouter>,
    )

    expect(linkPairs(screen.getByRole('navigation', { name: '主导航' }))).toEqual(expectedPublicNavigation)
  })

  it('lists the exact seven public links in mobile navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SiteHeader name="林一川" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '菜单' }))

    expect(linkPairs(screen.getByRole('navigation', { name: '移动主导航' }))).toEqual(expectedPublicNavigation)
  })

  it('closes the mobile menu after activating the live link', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SiteHeader name="林一川" />
      </MemoryRouter>,
    )

    const menuButton = screen.getByRole('button', { name: '菜单' })
    await user.click(menuButton)
    await user.click(within(screen.getByRole('navigation', { name: '移动主导航' })).getByRole('link', { name: '直播' }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '移动主导航' })).not.toBeInTheDocument()
  })

  it('closes the mobile menu after activating the AIGC link', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SiteHeader name="林一川" />
      </MemoryRouter>,
    )

    const menuButton = screen.getByRole('button', { name: '菜单' })
    await user.click(menuButton)
    await user.click(within(screen.getByRole('navigation', { name: '移动主导航' })).getByRole('link', { name: 'AIGC' }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '移动主导航' })).not.toBeInTheDocument()
  })

  it('discloses an accessible mobile menu and closes it after navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SiteHeader name="林一川" />
      </MemoryRouter>,
    )

    const menuButton = screen.getByRole('button', { name: '菜单' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '移动主导航' })).not.toBeInTheDocument()

    await user.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    const mobileNavigation = screen.getByRole('navigation', { name: '移动主导航' })
    expect(mobileNavigation).toBeInTheDocument()
    expect(within(mobileNavigation).getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')

    await user.click(within(mobileNavigation).getByRole('link', { name: '联系' }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '移动主导航' })).not.toBeInTheDocument()
  })
})
