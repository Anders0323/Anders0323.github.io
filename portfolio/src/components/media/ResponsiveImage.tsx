import { useState } from 'react'
import type { CSSProperties } from 'react'

interface ResponsiveImageProps {
  src: string
  alt: string
  width: number
  height: number
  loading: 'eager' | 'lazy'
  sizes: string
  className?: string
  style?: CSSProperties
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  loading,
  sizes,
  className,
  style,
}: ResponsiveImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className={`image-fallback ${className ?? ''}`} role="img" aria-label={`${alt}（图片暂不可用）`}>
        图片暂不可用
      </span>
    )
  }

  return (
    <img
      alt={alt}
      className={className}
      decoding="async"
      height={height}
      loading={loading}
      onError={() => setFailed(true)}
      sizes={sizes}
      src={src}
      style={style}
      width={width}
    />
  )
}
