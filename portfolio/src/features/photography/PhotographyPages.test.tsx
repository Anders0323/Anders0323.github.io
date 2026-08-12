import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { PhotoSeries } from '../../domain/content'
import { fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { PhotographyIndexPage } from './PhotographyIndexPage'
import { PhotoSeriesPage } from './PhotoSeriesPage'

const repository = new MemoryContentRepository(fixtureVideos, fixturePhotoSeries, fixtureProfile)

const orderedSeries: PhotoSeries = {
  ...fixturePhotoSeries[0],
  photos: [
    { id: 'ordered-3', url: '/media/ordered-3.jpg', alt: '系列第三幕', width: 1600, height: 1067 },
    { id: 'ordered-1', url: '/media/ordered-1.jpg', alt: '系列第一幕', width: 1067, height: 1600 },
    { id: 'ordered-2', url: '/media/ordered-2.jpg', alt: '系列第二幕', width: 1200, height: 1100 },
  ],
}

describe('PhotographyIndexPage', () => {
  it('uses the shared compact catalog title and two-column work grid', async () => {
    const { container } = render(
      <MemoryRouter>
        <PhotographyIndexPage repository={repository} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '摄影作品' })).toHaveClass('catalog-page-title')
    expect(await screen.findAllByTestId('photo-series')).toHaveLength(5)
    expect(container.querySelector('.photography-series-grid')).toHaveClass('catalog-work-grid')
  })

  it('presents the five published photography categories as ordered series with their real fixture covers', async () => {
    render(
      <MemoryRouter>
        <PhotographyIndexPage repository={repository} />
      </MemoryRouter>,
    )

    const seriesCards = await screen.findAllByTestId('photo-series')
    expect(seriesCards).toHaveLength(5)
    expect(seriesCards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      '人车之间',
      '空间与建筑',
      '活动现场',
      '运动瞬间',
      '产品与静物',
    ])
    expect(seriesCards.map((card) => within(card).getByRole('img').getAttribute('src'))).toEqual([
      '/media/fixture-photo-people-car.jpg',
      '/media/fixture-photo-space.jpg',
      '/media/fixture-photo-event.jpg',
      '/media/fixture-photo-motion.jpg',
      '/media/fixture-photo-product.jpg',
    ])
    expect(screen.getByRole('link', { name: '查看《人车之间》摄影系列' })).toHaveAttribute(
      'href',
      '/photography/people-and-cars',
    )
  })
})

describe('PhotoSeriesPage', () => {
  it('keeps repository photo order, reserves intrinsic space, and lazy-loads every image after the first', async () => {
    const orderedRepository = new MemoryContentRepository(fixtureVideos, [orderedSeries], fixtureProfile)
    render(
      <MemoryRouter initialEntries={['/photography/people-and-cars']}>
        <Routes>
          <Route path="/photography/:slug" element={<PhotoSeriesPage repository={orderedRepository} />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '人车之间' })).toBeInTheDocument()
    const thumbnails = screen.getAllByRole('button', { name: /全屏查看/ })
    const images = thumbnails.map((thumbnail) => within(thumbnail).getByRole('img'))

    expect(images.map((image) => image.getAttribute('alt'))).toEqual(['系列第三幕', '系列第一幕', '系列第二幕'])
    expect(images.map((image) => [image.getAttribute('width'), image.getAttribute('height')])).toEqual([
      ['1600', '1067'],
      ['1067', '1600'],
      ['1200', '1100'],
    ])
    expect(images.map((image) => image.getAttribute('loading'))).toEqual(['eager', 'lazy', 'lazy'])

    const items = document.querySelectorAll<HTMLElement>('.photo-series-item')
    expect(Array.from(items, (item) => item.dataset.layout)).toEqual(['landscape', 'portrait', 'detail'])
    expect(Array.from(items, (item) => item.dataset.align)).toEqual(['start', 'end', 'center'])
  })

  it('opens the selected series image and restores focus to that exact thumbnail after close', async () => {
    const user = userEvent.setup()
    const orderedRepository = new MemoryContentRepository(fixtureVideos, [orderedSeries], fixtureProfile)
    render(
      <MemoryRouter initialEntries={['/photography/people-and-cars']}>
        <Routes>
          <Route path="/photography/:slug" element={<PhotoSeriesPage repository={orderedRepository} />} />
        </Routes>
      </MemoryRouter>,
    )

    const thumbnails = await screen.findAllByRole('button', { name: /全屏查看/ })
    await user.click(thumbnails[1])

    expect(screen.getByRole('dialog', { name: '摄影作品全屏浏览' })).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.queryByRole('dialog', { name: '摄影作品全屏浏览' })).not.toBeInTheDocument()
    expect(thumbnails[1]).toHaveFocus()
  })

  it('shows a not-found state when a photography series is not published', async () => {
    const draftSeries: PhotoSeries = { ...orderedSeries, status: 'draft' }
    const draftRepository = new MemoryContentRepository(fixtureVideos, [draftSeries], fixtureProfile)
    render(
      <MemoryRouter initialEntries={['/photography/people-and-cars']}>
        <Routes>
          <Route path="/photography/:slug" element={<PhotoSeriesPage repository={draftRepository} />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '没有找到这个摄影系列' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回摄影作品' })).toHaveAttribute('href', '/photography')
  })
})
