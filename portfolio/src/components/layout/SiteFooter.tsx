import { Link } from 'react-router-dom'
import type { SiteProfile } from '../../domain/content'

interface SiteFooterProps {
  profile: SiteProfile | null
}

export function SiteFooter({ profile }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner section-frame">
        <p className="footer-statement">{profile?.statement ?? '内容连接真实的品牌与人。'}</p>
        <div className="footer-navigation" aria-label="页尾链接">
          <Link to="/">首页</Link>
          <Link to="/videos">短视频</Link>
          <Link to="/photography">摄影</Link>
          <Link to="/live">直播</Link>
          <Link to="/aigc">AIGC</Link>
          <Link to="/about">关于</Link>
          <Link to="/contact">联系</Link>
        </div>
        <div className="footer-meta">
          <span>{profile?.name ?? '个人作品集'}</span>
          {profile ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : null}
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  )
}
