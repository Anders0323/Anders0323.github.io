import type { VideoWork } from '../../domain/content'

export function getVideoCover(video: VideoWork) {
  return video.coverOrientation === 'landscape'
    ? { src: video.horizontalCoverUrl, width: 4, height: 3, modifier: 'landscape' as const }
    : { src: video.verticalCoverUrl, width: 3, height: 4, modifier: 'portrait' as const }
}
