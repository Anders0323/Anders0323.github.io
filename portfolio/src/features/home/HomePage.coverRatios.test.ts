import homepageStyles from '../../styles/global.css?raw'
import { describe, expect, it } from 'vitest'

describe('homepage cover ratios', () => {
  it('keeps fixed photography covers at 3:4 while releasing image height', () => {
    expect(homepageStyles).toMatch(
      /\.photo-cover,\s*\.photography-series-cover\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*4;/s,
    )
    expect(homepageStyles).toMatch(
      /\.video-cover,\s*\.video-catalog-cover\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*object-fit:\s*cover;/s,
    )
  })

  it('uses data-driven portrait and landscape video cover ratios', () => {
    expect(homepageStyles).toMatch(/\.cover-portrait\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*4;/s)
    expect(homepageStyles).toMatch(/\.cover-landscape\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3;/s)
  })

  it('gives landscape video cards wider desktop spans without dense reordering', () => {
    expect(homepageStyles).toMatch(
      /\.video-card\.video-layout-portrait,\s*\.video-catalog-card\.video-layout-portrait\s*\{[^}]*grid-column:\s*span\s+5;/s,
    )
    expect(homepageStyles).toMatch(
      /\.video-card\.video-layout-landscape,\s*\.video-catalog-card\.video-layout-landscape\s*\{[^}]*grid-column:\s*span\s+7;/s,
    )
    expect(homepageStyles).not.toMatch(/grid-auto-flow:\s*dense/)
    expect(homepageStyles).not.toMatch(/\.video-(?:catalog-)?card:nth-child\([^)]*\)\s*\{[^}]*grid-column:/s)
  })
})
