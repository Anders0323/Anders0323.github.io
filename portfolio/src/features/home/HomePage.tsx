import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PhotoSeries, SiteProfile, VideoCategory, VideoWork } from '../../domain/content'
import type { ContentRepository } from '../../domain/repository'
import { ResponsiveImage } from '../../components/media/ResponsiveImage'
import { getVideoCover } from '../videos/videoCover'

const videoCategories: Array<{ key: VideoCategory; label: string }> = [
  { key: 'people', label: '人物叙事' },
  { key: 'brand', label: '品牌表达' },
  { key: 'event', label: '现场纪实' },
  { key: 'social', label: '社交创意' },
]

interface HomePageProps {
  repository: ContentRepository
}

export function HomePage({ repository }: HomePageProps) {
  const [videos, setVideos] = useState<VideoWork[]>([])
  const [photoSeries, setPhotoSeries] = useState<PhotoSeries[]>([])
  const [profile, setProfile] = useState<SiteProfile | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true

    void Promise.all([
      Promise.all(videoCategories.map(({ key }) => repository.listPublishedVideos(key))),
      repository.listPublishedPhotoSeries(),
      repository.getPublishedProfile(),
    ])
      .then(([categoryVideos, publishedPhotoSeries, publishedProfile]) => {
        if (active) {
          setVideos(categoryVideos.flatMap((items) => items.filter((video) => video.featured).slice(0, 1)))
          setPhotoSeries(publishedPhotoSeries.filter((series) => series.featured).slice(0, 5))
          setProfile(publishedProfile)
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true)
        }
      })

    return () => {
      active = false
    }
  }, [repository])

  if (loadFailed) {
    return (
      <main className="load-message" id="main-content">
        <h1>内容暂时无法加载</h1>
        <p>请稍后刷新页面重试。</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="load-message" id="main-content" aria-live="polite">
        正在整理作品…
      </main>
    )
  }

  return (
    <main id="main-content">
      <section className="hero-section" aria-labelledby="hero-heading">
        <ResponsiveImage
          alt={`${profile.name}在城市建筑与汽车之间`}
          className="hero-image"
          height={1066}
          loading="eager"
          sizes="100vw"
          src={profile.portraitUrl}
          width={1600}
        />
        <div className="hero-content section-frame">
          <p className="hero-kicker">{profile.name} / PORTFOLIO</p>
          <p className="hero-display" aria-hidden="true">
            <span>CONTENT</span>
            <span>CREATOR</span>
          </p>
          <h1 id="hero-heading">{profile.role}</h1>
          <p className="hero-statement">{profile.statement}</p>
          <a className="text-link hero-action" href="#selected-work">
            查看作品
          </a>
        </div>
      </section>

      <div className="works-surface">
        <section className="video-section section-frame" id="selected-work" aria-labelledby="video-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-index">01 / SELECTED VIDEO</p>
              <h2 id="video-heading">短视频作品</h2>
            </div>
            <Link className="text-link" to="/videos">
              全部作品
            </Link>
          </div>

          <nav className="category-nav" aria-label="短视频分类">
            {videoCategories.map(({ key, label }) => (
              <Link to={`/videos?category=${key}`} key={key}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="video-grid">
            {videos.map((video, index) => {
              const cover = getVideoCover(video)

              return (
                <article className={`video-card video-layout-${cover.modifier}`} key={video.id}>
                  <Link className="video-card-link" to={`/videos/${video.slug}`}>
                    <ResponsiveImage
                      alt={`${video.title}短视频封面`}
                      className={`video-cover cover-${cover.modifier}`}
                      height={cover.height}
                      loading="lazy"
                      sizes="(min-width: 900px) 32vw, 44vw"
                      src={cover.src}
                      width={cover.width}
                    />
                    <span className="video-meta">
                      <span className="work-number">{String(index + 1).padStart(2, '0')} /</span>
                      <strong>{video.title}</strong>
                      <span>{video.summary}</span>
                      <small>
                        {video.roles.join(' / ')} · {video.year}
                      </small>
                    </span>
                  </Link>
                </article>
              )
            })}
          </div>
        </section>

        <section className="photo-section section-frame" aria-labelledby="photo-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-index">02 / PHOTOGRAPHY</p>
              <h2 id="photo-heading">摄影作品</h2>
            </div>
            <Link className="text-link" to="/photography">
              全部作品
            </Link>
          </div>

          <div className="photo-rail">
            {photoSeries.map((series, index) => (
              <article className="photo-card" key={series.id}>
                <Link to={`/photography/${series.slug}`}>
                  <ResponsiveImage
                    alt={series.photos[0]?.alt ?? `${series.title}摄影系列封面`}
                    className="photo-cover"
                    height={1402}
                    loading="lazy"
                    sizes="(min-width: 900px) 18vw, 42vw"
                    src={series.coverUrl}
                    width={1122}
                  />
                  <span className="photo-card-title">
                    <small>{String(index + 1).padStart(2, '0')}</small>
                    <strong>{series.title}</strong>
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="capability-section section-frame" aria-labelledby="capability-heading">
          <div>
            <p className="section-index">03 / PRACTICE</p>
            <h2 id="capability-heading">能力与经历</h2>
          </div>
          <ul className="capability-list">
            {profile.capabilities.map((capability, index) => (
              <li key={capability}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {capability}
              </li>
            ))}
          </ul>
          <div className="experience-block">
            {profile.experience.map((item) => (
              <p key={item}>{item}</p>
            ))}
            <a className="text-link" href={profile.resumeUrl}>
              下载 PDF 简历
            </a>
          </div>
        </section>

        <section className="contact-preview section-frame" aria-labelledby="contact-heading">
          <p className="section-index">04 / CONTACT</p>
          <h2 id="contact-heading">内容是我的语言，连接真实的品牌与人。</h2>
          <div className="contact-links">
            <a className="text-link" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <Link className="text-link" to="/contact">
              合作联系
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
