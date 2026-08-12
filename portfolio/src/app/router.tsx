import { useEffect, useMemo, useState } from 'react'
import { Outlet, Route, Routes, useParams } from 'react-router-dom'
import type { AigcWork, LiveWork, PhotoSeries, SiteProfile, VideoWork } from '../domain/content'
import { RouteError } from '../components/feedback/RouteError'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { HomePage } from '../features/home/HomePage'
import { PhotographyIndexPage } from '../features/photography/PhotographyIndexPage'
import { PhotoSeriesPage } from '../features/photography/PhotoSeriesPage'
import { AboutPage } from '../features/profile/AboutPage'
import { ContactPage } from '../features/profile/ContactPage'
import { VideoDetailPage } from '../features/videos/VideoDetailPage'
import { VideoIndexPage } from '../features/videos/VideoIndexPage'
import { LiveDetailPage } from '../features/live/LiveDetailPage'
import { LiveIndexPage } from '../features/live/LiveIndexPage'
import { AigcDetailPage } from '../features/aigc/AigcDetailPage'
import { AigcIndexPage } from '../features/aigc/AigcIndexPage'
import { AdminGuard } from '../features/admin/AdminGuard'
import { AdminLayout } from '../features/admin/AdminLayout'
import { AdminListPage } from '../features/admin/AdminListPage'
import { AdminAigcListPage } from '../features/admin/AdminAigcListPage'
import { AdminAigcEditor } from '../features/admin/AdminAigcEditor'
import { AdminLiveListPage } from '../features/admin/AdminLiveListPage'
import { AdminLiveEditor } from '../features/admin/AdminLiveEditor'
import { AdminLoginPage } from '../features/admin/AdminLoginPage'
import { AdminPhotoEditor } from '../features/admin/AdminPhotoEditor'
import { AdminProfileEditor } from '../features/admin/AdminProfileEditor'
import { AdminVideoEditor } from '../features/admin/AdminVideoEditor'
import type { AdminAuthPort, AdminMediaStoragePort } from '../features/admin/types'
import { useAdminContentRepository, useContentRepository } from './repositoryContext'
import { ScrollToTop } from './ScrollToTop'

const NEUTRAL_DOCUMENT_TITLE = '新媒体作品集｜内容创作者'

function PublicShell() {
  const repository = useContentRepository()
  const [profile, setProfile] = useState<SiteProfile | null>(null)
  const [profileUnavailable, setProfileUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    document.title = NEUTRAL_DOCUMENT_TITLE
    void repository
      .getPublishedProfile()
      .then((publishedProfile) => {
        if (active) {
          setProfile(publishedProfile)
          document.title = `${publishedProfile.name}｜新媒体运营 / 内容创作者`
        }
      })
      .catch(() => {
        if (active) {
          setProfileUnavailable(true)
        }
      })

    return () => {
      active = false
      document.title = NEUTRAL_DOCUMENT_TITLE
    }
  }, [repository])

  return (
    <div className="site-shell">
      <ScrollToTop />
      <SiteHeader name={profile?.name ?? '作品集'} />
      {profileUnavailable ? (
        <p className="visually-hidden" role="status">
          个人资料暂时无法加载，正在显示基础导航。
        </p>
      ) : null}
      <Outlet />
      <SiteFooter profile={profile} />
    </div>
  )
}

function HomeRoute() {
  return <HomePage repository={useContentRepository()} />
}

function VideoIndexRoute() {
  return <VideoIndexPage repository={useContentRepository()} />
}

function VideoDetailRoute() {
  return <VideoDetailPage repository={useContentRepository()} />
}

function LiveIndexRoute() {
  return <LiveIndexPage repository={useContentRepository()} />
}

function LiveDetailRoute() {
  return <LiveDetailPage repository={useContentRepository()} />
}

function AigcIndexRoute() {
  return <AigcIndexPage repository={useContentRepository()} />
}

function AigcDetailRoute() {
  return <AigcDetailPage repository={useContentRepository()} />
}

function PhotographyIndexRoute() {
  return <PhotographyIndexPage repository={useContentRepository()} />
}

function PhotoSeriesRoute() {
  return <PhotoSeriesPage repository={useContentRepository()} />
}

function AboutRoute() {
  return <AboutPage repository={useContentRepository()} />
}

function ContactRoute() {
  return <ContactPage repository={useContentRepository()} />
}

function AdminListRoute() {
  return <AdminListPage repository={useAdminContentRepository()} />
}

function AdminLiveListRoute() {
  return <AdminLiveListPage repository={useAdminContentRepository()} />
}

function AdminAigcListRoute() {
  return <AdminAigcListPage repository={useAdminContentRepository()} />
}

export interface AdminRouteServices {
  auth: AdminAuthPort
  storage: AdminMediaStoragePort
  readImageDimensions?: (file: File) => Promise<{ width: number; height: number }>
}

function lazyAdminServices(): AdminRouteServices {
  return {
    auth: {
      signInAdmin: async (username, password) => {
        const { AdminAuth } = await import('../infrastructure/cloudbase/auth')
        return new AdminAuth().signInAdmin(username, password)
      },
      requireAdminSession: async () => {
        const { AdminAuth } = await import('../infrastructure/cloudbase/auth')
        return new AdminAuth().requireAdminSession()
      },
      signOut: async () => {
        const { AdminAuth } = await import('../infrastructure/cloudbase/auth')
        return new AdminAuth().signOut()
      },
    },
    storage: {
      upload: async (file, folder) => {
        const { CloudBaseMediaStorage } = await import('../infrastructure/cloudbase/mediaStorage')
        return new CloudBaseMediaStorage().upload(file, folder)
      },
    },
  }
}

function AdminVideoRoute({ storage }: { storage: AdminMediaStoragePort }) {
  const repository = useAdminContentRepository()
  const { id = '' } = useParams()
  const [value, setValue] = useState<VideoWork | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    if (id === 'new') {
      const timestamp = Date.now()
      setValue({
        id: `video-${timestamp}`, slug: `new-video-${timestamp}`, title: '', category: 'people', horizontalCoverUrl: '',
        verticalCoverUrl: '', coverOrientation: 'portrait', videoUrl: '', roles: ['待填写'], year: new Date().getFullYear(), summary: '', description: '',
        featured: false, sortOrder: 0, status: 'draft', updatedAt: new Date().toISOString(),
      })
      return () => { active = false }
    }
    void repository.listAllVideos().then(
      (videos) => {
        if (!active) return
        const item = videos.find((video) => video.id === id)
        if (item) setValue(item)
        else setMissing(true)
      },
      () => { if (active) setMissing(true) },
    )
    return () => { active = false }
  }, [id, repository])

  if (missing) return <RouteError title="没有找到这个短视频" message="请返回作品管理页重试。" label="ADMIN / 404" />
  if (!value) return <main className="load-message" id="main-content" role="status">正在读取短视频…</main>
  return <AdminVideoEditor repository={repository} storage={storage} initialValue={value} />
}

function AdminPhotoRoute({ storage }: { storage: AdminMediaStoragePort }) {
  const repository = useAdminContentRepository()
  const { id = '' } = useParams()
  const [value, setValue] = useState<PhotoSeries | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    if (id === 'new') {
      const timestamp = Date.now()
      setValue({
        id: `photo-${timestamp}`, slug: `new-photo-${timestamp}`, title: '', category: 'people-car', coverUrl: '', shotAt: `${new Date().getFullYear()}`,
        intro: '', photos: [], featured: false, sortOrder: 0, status: 'draft', updatedAt: new Date().toISOString(),
      })
      return () => { active = false }
    }
    void repository.listAllPhotoSeries().then(
      (items) => {
        if (!active) return
        const item = items.find((series) => series.id === id)
        if (item) setValue(item)
        else setMissing(true)
      },
      () => { if (active) setMissing(true) },
    )
    return () => { active = false }
  }, [id, repository])

  if (missing) return <RouteError title="没有找到这个摄影系列" message="请返回作品管理页重试。" label="ADMIN / 404" />
  if (!value) return <main className="load-message" id="main-content" role="status">正在读取摄影系列…</main>
  return <AdminPhotoEditor repository={repository} storage={storage} initialValue={value} />
}

function AdminLiveRoute({ storage, readImageDimensions }: Pick<AdminRouteServices, 'storage' | 'readImageDimensions'>) {
  const repository = useAdminContentRepository()
  const { id = '' } = useParams()
  const [value, setValue] = useState<LiveWork | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    if (id === 'new') {
      const timestamp = Date.now()
      setValue({
        id: `live-${timestamp}`, slug: `new-live-${timestamp}`, title: '', summary: '', description: '', roles: [], heldAt: '', coverUrl: '',
        screenshots: [], featured: false, sortOrder: 0, status: 'draft', updatedAt: new Date().toISOString(),
      })
      return () => { active = false }
    }
    void repository.listAllLiveWorks().then(
      (items) => {
        if (!active) return
        const item = items.find((work) => work.id === id)
        if (item) setValue(item)
        else setMissing(true)
      },
      () => { if (active) setMissing(true) },
    )
    return () => { active = false }
  }, [id, repository])

  if (missing) return <RouteError title="没有找到这个直播作品" message="请返回作品管理页重试。" label="ADMIN / 404" />
  if (!value) return <main className="load-message" id="main-content" role="status">正在读取直播作品…</main>
  return <AdminLiveEditor repository={repository} storage={storage} initialValue={value} readImageDimensions={readImageDimensions} />
}

function AdminAigcRoute({ storage }: { storage: AdminMediaStoragePort }) {
  const repository = useAdminContentRepository()
  const { id = '' } = useParams()
  const [value, setValue] = useState<AigcWork | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    if (id === 'new') {
      const timestamp = Date.now()
      setValue({
        id: `aigc-${timestamp}`, slug: `new-aigc-${timestamp}`, title: '', mediaType: 'image', mediaUrl: '', coverUrl: '', summary: '',
        year: new Date().getFullYear(), featured: false, sortOrder: 0, status: 'draft', updatedAt: new Date().toISOString(),
      })
      return () => { active = false }
    }
    void repository.listAllAigcWorks().then(
      (items) => {
        if (!active) return
        const item = items.find((work) => work.id === id)
        if (item) setValue(item)
        else setMissing(true)
      },
      () => { if (active) setMissing(true) },
    )
    return () => { active = false }
  }, [id, repository])

  if (missing) return <RouteError title="没有找到这个 AIGC 作品" message="请返回作品管理页重试。" label="ADMIN / 404" />
  if (!value) return <main className="load-message" id="main-content" role="status">正在读取 AIGC 作品…</main>
  return <AdminAigcEditor repository={repository} storage={storage} initialValue={value} />
}

function AdminProfileRoute({ storage }: { storage: AdminMediaStoragePort }) {
  const repository = useAdminContentRepository()
  const [value, setValue] = useState<SiteProfile | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    void repository.getProfile().then(
      (profile) => {
        if (!active) return
        setValue(profile ?? {
          id: 'main',
          name: '',
          role: '',
          statement: '',
          intro: '',
          portraitUrl: '',
          experience: [''],
          capabilities: [''],
          resumeUrl: '',
          email: '',
          wechatQrUrl: '',
          socialLinks: [],
          status: 'draft',
          updatedAt: new Date().toISOString(),
        })
      },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [repository])
  if (failed) return <RouteError title="个人资料暂时无法读取" message="请稍后重试。" label="ADMIN / ERROR" />
  if (!value) return <main className="load-message" id="main-content" role="status">正在读取个人资料…</main>
  return <AdminProfileEditor repository={repository} storage={storage} initialValue={value} />
}

export function AppRouter({ adminServices: injectedServices }: { adminServices?: AdminRouteServices } = {}) {
  const defaultServices = useMemo(lazyAdminServices, [])
  const adminServices = injectedServices ?? defaultServices
  return (
    <Routes>
      <Route path="admin/login" element={<AdminLoginPage auth={adminServices.auth} />} />
      <Route
        path="admin"
        element={
          <AdminGuard auth={adminServices.auth}>
            <AdminLayout auth={adminServices.auth} />
          </AdminGuard>
        }
      >
        <Route index element={<AdminListRoute />} />
        <Route path="videos/:id" element={<AdminVideoRoute storage={adminServices.storage} />} />
        <Route path="photography/:id" element={<AdminPhotoRoute storage={adminServices.storage} />} />
        <Route path="live" element={<AdminLiveListRoute />} />
        <Route path="live/:id" element={<AdminLiveRoute storage={adminServices.storage} readImageDimensions={adminServices.readImageDimensions} />} />
        <Route path="aigc" element={<AdminAigcListRoute />} />
        <Route path="aigc/:id" element={<AdminAigcRoute storage={adminServices.storage} />} />
        <Route path="profile" element={<AdminProfileRoute storage={adminServices.storage} />} />
      </Route>
      <Route element={<PublicShell />}>
        <Route index element={<HomeRoute />} />
        <Route path="videos" element={<VideoIndexRoute />} />
        <Route path="videos/:slug" element={<VideoDetailRoute />} />
        <Route path="live" element={<LiveIndexRoute />} />
        <Route path="live/:slug" element={<LiveDetailRoute />} />
        <Route path="aigc" element={<AigcIndexRoute />} />
        <Route path="aigc/:slug" element={<AigcDetailRoute />} />
        <Route path="photography" element={<PhotographyIndexRoute />} />
        <Route path="photography/:slug" element={<PhotoSeriesRoute />} />
        <Route path="about" element={<AboutRoute />} />
        <Route path="contact" element={<ContactRoute />} />
        <Route
          path="*"
          element={<RouteError title="页面未找到" message="没有找到这个页面。" label="ERROR / 404" />}
        />
      </Route>
    </Routes>
  )
}
