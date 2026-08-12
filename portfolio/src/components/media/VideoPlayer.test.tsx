import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { VideoPlayer } from './VideoPlayer'
import globalStyles from '../../styles/global.css?raw'

describe('VideoPlayer', () => {
  it('starts from the supplied orientation and updates to the intrinsic video ratio', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <VideoPlayer
        initialAspectRatio={16 / 9}
        poster="/cover.webp"
        src="/film.mp4"
        title="横版纪录片"
      />,
    )

    expect(container.querySelector('.video-player')).toHaveStyle({ aspectRatio: `${16 / 9}` })

    await user.click(screen.getByRole('button', { name: '播放《横版纪录片》' }))
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1080 },
      videoHeight: { configurable: true, value: 1920 },
    })
    fireEvent.loadedMetadata(video)

    expect(container.querySelector('.video-player')).toHaveStyle({ aspectRatio: `${1080 / 1920}` })
  })

  it('contains the whole video frame instead of cropping it', () => {
    expect(globalStyles).toMatch(
      /\.video-player-media\s*\{[^}]*object-fit:\s*contain;/s,
    )
  })

  it('does not create the video element before consent to play', async () => {
    const user = userEvent.setup()
    const { container } = render(<VideoPlayer poster="/cover.webp" src="/film.mp4" title="归途的对话" />)

    expect(container.querySelector('video')).toBeNull()

    await user.click(screen.getByRole('button', { name: '播放《归途的对话》' }))

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveAttribute('poster', '/cover.webp')
    expect(video?.querySelector('source')).toHaveAttribute('src', '/film.mp4')
    expect(video?.querySelector('source')).toHaveAttribute('type', 'video/mp4')
  })

  it('keeps the poster visible after a playback error and remounts the video on retry', async () => {
    const user = userEvent.setup()
    const { container } = render(<VideoPlayer poster="/cover.webp" src="/film.mp4" title="归途的对话" />)

    await user.click(screen.getByRole('button', { name: '播放《归途的对话》' }))
    const firstVideo = container.querySelector('video')
    expect(firstVideo).not.toBeNull()

    fireEvent.error(firstVideo as HTMLVideoElement)

    expect(screen.getByRole('alert')).toHaveTextContent('视频加载失败，请检查网络后重试')
    expect(screen.getByRole('img', { name: '归途的对话视频封面' })).toHaveAttribute('src', '/cover.webp')

    await user.click(screen.getByRole('button', { name: '重试播放《归途的对话》' }))

    const retriedVideo = container.querySelector('video')
    expect(retriedVideo).not.toBe(firstVideo)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
