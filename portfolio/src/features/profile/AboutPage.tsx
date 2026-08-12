import { useEffect, useState } from 'react'
import { LoadState } from '../../components/feedback/LoadState'
import type { SiteProfile } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'

type ProfileState =
  | { status: 'loading'; profile: null }
  | { status: 'ready'; profile: SiteProfile }
  | { status: 'empty'; profile: null }
  | { status: 'error'; profile: null }

export function AboutPage({ repository }: { repository: ContentRepository }) {
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
    return <main className="profile-state" id="main-content"><LoadState status="loading" message="正在加载个人资料…" /></main>
  }

  if (state.status === 'empty') {
    return <main className="profile-state" id="main-content"><LoadState status="empty" message="暂时没有已发布的个人资料。" /></main>
  }

  if (state.status === 'error') {
    return (
      <main className="profile-state" id="main-content">
        <LoadState
          status="error"
          message="个人资料暂时无法加载，请稍后重试。"
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      </main>
    )
  }

  const { profile } = state

  return (
    <main className="about-page" id="main-content">
      <header className="profile-intro">
        <div className="section-frame profile-intro-inner">
          <p className="section-index">03 / ABOUT</p>
          <p className="profile-role">{profile.role}</p>
          <h1>{profile.name}</h1>
          <p className="profile-statement">{profile.statement}</p>
        </div>
      </header>

      <section className="profile-body section-frame" aria-labelledby="profile-introduction-heading">
        <div className="profile-portrait-wrap">
          <img className="profile-portrait" src={profile.portraitUrl} alt={`${profile.name}的个人肖像`} />
        </div>
        <div className="profile-copy">
          <p className="section-index">PROFILE / 01</p>
          <h2 id="profile-introduction-heading">个人简介</h2>
          <p className="profile-intro-copy">{profile.intro}</p>
          <a className="outline-action profile-resume" href={profile.resumeUrl} download>
            下载 PDF 简历
          </a>
        </div>
      </section>

      <section className="profile-details section-frame" aria-label="经历与能力">
        <div>
          <p className="section-index">EXPERIENCE / 02</p>
          <h2>工作经历</h2>
          <ul aria-label="工作经历">
            {profile.experience.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="section-index">CAPABILITIES / 03</p>
          <h2>专业能力</h2>
          <ul aria-label="专业能力">
            {profile.capabilities.map((item, index) => (
              <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
