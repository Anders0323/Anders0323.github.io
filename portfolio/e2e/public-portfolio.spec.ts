import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test('recruiter browses categories and explicitly starts video playback on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '新媒体运营 / 内容创作者' })).toBeVisible()
  await expect(page.getByText('人物叙事').first()).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)

  await page.getByRole('link', { name: /归途的对话/ }).click()
  await expect(page.locator('video')).toHaveCount(0)
  await page.getByRole('button', { name: /播放《归途的对话》/ }).click()
  await expect(page.locator('video')).toHaveAttribute('playsinline', '')
  await expect(page.getByRole('alert')).toContainText('视频加载失败')

  await page.goto('/videos')
  await page.getByRole('button', { name: '品牌表达' }).click()
  await expect(page).toHaveURL(/category=brand/)
  await expect(page.getByRole('heading', { name: '工作室的清晨' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '归途的对话' })).toHaveCount(0)
})

for (const [path, heading] of [
  ['/', '新媒体运营 / 内容创作者'],
  ['/videos', '短视频作品'],
  ['/photography', '摄影作品'],
  ['/live', '直播项目'],
  ['/aigc', 'AIGC 作品'],
  ['/about', '林一川'],
  ['/contact', '让我们聊聊'],
] as const) {
  test(`public top-level route ${path} renders its content`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  })
}

test('recruiter opens a landscape catalog card into its mixed-cover video detail', async ({ page }) => {
  await page.goto('/videos')

  await page.getByRole('button', { name: '品牌表达' }).click()
  const brandCard = page.getByTestId('video-work').filter({ hasText: '工作室的清晨' })
  await expect(brandCard).toHaveClass(/video-layout-landscape/)
  await brandCard.getByRole('link').click()

  await expect(page).toHaveURL(/\/videos\/studio-morning/)
  await expect(page.getByRole('heading', { name: '工作室的清晨' })).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
})

test('recruiter can close photography viewer and reach profile, contact, and safe 404 pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/photography/people-and-cars')
  await page.getByRole('button', { name: /全屏查看/ }).first().click()
  await expect(page.getByRole('dialog', { name: '摄影作品全屏浏览' })).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await expect(page.getByRole('dialog', { name: '摄影作品全屏浏览' })).toHaveCount(0)

  await page.goto('/about')
  await expect(page.getByRole('heading', { name: '林一川' })).toBeVisible()
  await page.goto('/contact')
  await expect(page.getByRole('heading', { name: /让我们聊聊/ })).toBeVisible()
  await page.goto('/definitely-not-a-portfolio-route')
  await expect(page.getByRole('heading', { name: '页面未找到' })).toBeVisible()
})

test('recruiter opens and closes a live screenshot viewer', async ({ page }) => {
  await page.goto('/live/community-forum-live')

  await page.getByRole('button', { name: /全屏查看：社区论坛舞台与观众的横向全景/ }).click()
  await expect(page.getByRole('dialog', { name: '摄影作品全屏浏览' })).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await expect(page.getByRole('dialog', { name: '摄影作品全屏浏览' })).toHaveCount(0)
})

test('AIGC video detail keeps media out of the DOM before explicit playback', async ({ page }) => {
  await page.goto('/aigc/aigc-motion-study')

  await expect(page.getByRole('heading', { name: '流动习作' })).toBeVisible()
  await expect(page.getByRole('button', { name: '播放《流动习作》' })).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
})

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1024 },
]) {
  test(`${viewport.name} public pages have no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const path of ['/', '/videos', '/photography', '/about', '/contact']) {
      await page.goto(path)
      await expect(page.locator('#main-content')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
  })
}
