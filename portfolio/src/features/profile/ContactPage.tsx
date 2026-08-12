import { useEffect, useState } from 'react'
import { LoadState } from '../../components/feedback/LoadState'
import type { SiteProfile } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

type ProfileState =
  | { status: 'loading'; profile: null }
  | { status: 'ready'; profile: SiteProfile }
  | { status: 'empty'; profile: null }
  | { status: 'error'; profile: null }

export function ContactPage({ repository }: { repository: ContentRepository }) {
  const [retryCount, setRetryCount] = useState(0)
  const [state, setState] = useState<ProfileState>({ status: 'loading', profile: null })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', profile: null })
    void repository
      .getPublishedProfile()
      .then((profile) => {
        if (active) {
          setState(profile?.status === 'published' ? { status: 'ready', profile } : { status: 'empty', profile: null })
        }
      })
      .catch(() => {
        if (active) setState({ status: 'error', profile: null })
      })

    return () => {
      active = false
    }
  }, [repository, retryCount])

  if (state.status === 'loading') {
    return <main className="profile-state" id="main-content"><LoadState status="loading" message="正在加载联系方式…" /></main>
  }

  if (state.status === 'empty') {
    return <main className="profile-state" id="main-content"><LoadState status="empty" message="暂时没有已发布的联系方式。" /></main>
  }

  if (state.status === 'error') {
    return (
      <main className="profile-state" id="main-content">
        <LoadState
          status="error"
          message="联系方式暂时无法加载，请稍后重试。"
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      </main>
    )
  }

  const { profile } = state

  return (
    <main className="contact-page" id="main-content">
      <header className="contact-heading">
        <div className="section-frame contact-heading-inner">
          <p className="section-index">04 / CONTACT</p>
          <h1>让我们聊聊<br />下一个好内容。</h1>
          <p>{profile.statement}</p>
          <a className="contact-email" href={`mailto:${profile.email}`}>
            <span>发送邮件</span>
            {profile.email}
          </a>
        </div>
      </header>

      <section className="contact-details section-frame" aria-label="联系方式">
        <div className="contact-qr-block">
          <p className="section-index">WECHAT / 01</p>
          <h2>微信联系</h2>
          <img className="contact-qr" src={profile.wechatQrUrl} alt="开发环境微信联系二维码示意图" />
          <p>开发环境联系示意二维码，仅用于验证版式，不对应真实微信账号。</p>
        </div>

        {profile.socialLinks.length > 0 ? (
          <section className="contact-social" aria-label="社交主页">
            <p className="section-index">SOCIAL / 02</p>
            <h2>社交主页</h2>
            <ul>
              {profile.socialLinks.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  )
}
