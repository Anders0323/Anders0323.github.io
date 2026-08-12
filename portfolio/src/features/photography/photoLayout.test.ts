import { describe, expect, it } from 'vitest'
import { getPhotoLayout } from './photoLayout'

describe('getPhotoLayout', () => {
  it('classifies intrinsic photo dimensions into editorial layout tiers and cycles alignment by array index', () => {
    expect(getPhotoLayout({ id: 'landscape', url: '/landscape.jpg', alt: '横幅', width: 1600, height: 900 }, 0)).toEqual({
      orientation: 'landscape',
      align: 'start',
    })
    expect(getPhotoLayout({ id: 'portrait', url: '/portrait.jpg', alt: '竖幅', width: 900, height: 1600 }, 1)).toEqual({
      orientation: 'portrait',
      align: 'end',
    })
    expect(getPhotoLayout({ id: 'detail', url: '/detail.jpg', alt: '细节', width: 1200, height: 1100 }, 2)).toEqual({
      orientation: 'detail',
      align: 'center',
    })
  })
})
