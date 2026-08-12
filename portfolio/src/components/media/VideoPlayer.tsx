import { useState } from 'react'

interface VideoPlayerProps {
  initialAspectRatio?: number
  poster: string
  src: string
  title: string
}

type PlayerState = 'poster' | 'playing' | 'error'

export function VideoPlayer({ initialAspectRatio = 9 / 16, poster, src, title }: VideoPlayerProps) {
  const [playerState, setPlayerState] = useState<PlayerState>('poster')
  const [sourceAttempt, setSourceAttempt] = useState(0)
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio)

  const handleRetry = () => {
    setSourceAttempt((attempt) => attempt + 1)
    setPlayerState('playing')
  }

  if (playerState === 'playing') {
    return (
      <div className="video-player" style={{ aspectRatio }}>
        <video
          aria-label={title}
          className="video-player-media"
          controls
          key={sourceAttempt}
          onLoadedMetadata={(event) => {
            const { videoHeight, videoWidth } = event.currentTarget
            if (videoWidth > 0 && videoHeight > 0) {
              setAspectRatio(videoWidth / videoHeight)
            }
          }}
          onError={() => setPlayerState('error')}
          playsInline
          poster={poster}
          preload="metadata"
        >
          <source onError={() => setPlayerState('error')} src={src} type="video/mp4" />
          当前浏览器无法播放该视频。
        </video>
      </div>
    )
  }

  return (
    <div className="video-player" style={{ aspectRatio }}>
      <img
        alt={`${title}视频封面`}
        className="video-player-poster"
        height={1672}
        src={poster}
        width={941}
      />
      <div className="video-player-overlay">
        {playerState === 'error' ? (
          <>
            <p className="video-player-error" role="alert">
              视频加载失败，请检查网络后重试
            </p>
            <button className="video-player-action" onClick={handleRetry} type="button">
              重试播放《{title}》
            </button>
          </>
        ) : (
          <button
            aria-label={`播放《${title}》`}
            className="video-player-action"
            onClick={() => setPlayerState('playing')}
            type="button"
          >
            <span aria-hidden="true">▶</span>
            播放
          </button>
        )}
      </div>
    </div>
  )
}
