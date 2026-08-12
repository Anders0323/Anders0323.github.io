import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navigationItems = [
  { label: '首页', to: '/' },
  { label: '短视频', to: '/videos' },
  { label: '摄影', to: '/photography' },
  { label: '直播', to: '/live' },
  { label: 'AIGC', to: '/aigc' },
  { label: '关于', to: '/about' },
  { label: '联系', to: '/contact' },
]

interface SiteHeaderProps {
  name: string
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navigationItems.map((item) => (
        <NavLink end={item.to === '/'} key={item.to} onClick={onNavigate} to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export function SiteHeader({ name }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" to="/" aria-label={`${name}作品集首页`}>
            <strong>{name}</strong>
            <span>新媒体运营 / 内容创作者</span>
          </Link>

          <nav className="desktop-navigation" aria-label="主导航">
            <NavigationLinks />
          </nav>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? '关闭菜单' : '菜单'}
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? '关闭' : '菜单'}
          </button>
        </div>

        {menuOpen ? (
          <nav className="mobile-navigation" id="mobile-navigation" aria-label="移动主导航">
            <NavigationLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
        ) : null}
      </header>
    </>
  )
}
