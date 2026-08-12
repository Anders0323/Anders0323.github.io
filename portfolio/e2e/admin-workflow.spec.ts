import { expect, test, type Page } from '@playwright/test'
import { Buffer } from 'node:buffer'

async function spaNavigate(page: Page, path: string) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

test('authenticated local harness manages visibility, ordering, and delayed deletion in one memory session', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/admin')
  await expect(page.locator('body')).toHaveAttribute('data-e2e-harness', 'local-only')
  await expect(page.getByRole('heading', { name: '作品管理' })).toBeVisible()

  await spaNavigate(page, '/admin/videos/new')
  await page.getByLabel('标题').fill('E2E 草稿作品')
  await page.getByRole('button', { name: '保存作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')

  await spaNavigate(page, '/admin')
  const draftRow = page.getByRole('article').filter({ hasText: 'E2E 草稿作品' })
  await expect(draftRow).toContainText('草稿')

  await spaNavigate(page, '/videos?category=people')
  await expect(page.getByRole('heading', { name: 'E2E 草稿作品' })).toHaveCount(0)

  await spaNavigate(page, '/admin/videos/data-origin%3A%20fixture%3Avideo-people')
  await page.getByLabel('发布状态').selectOption('hidden')
  await page.getByRole('button', { name: '保存作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')
  await spaNavigate(page, '/videos?category=people')
  await expect(page.getByRole('heading', { name: '归途的对话' })).toHaveCount(0)

  await spaNavigate(page, '/admin/videos/data-origin%3A%20fixture%3Avideo-people')
  await page.getByRole('button', { name: '发布作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')
  await spaNavigate(page, '/videos?category=people')
  await expect(page.getByRole('heading', { name: '归途的对话' })).toBeVisible()

  await spaNavigate(page, '/admin/photography/data-origin%3A%20fixture%3Aphoto-people-car')
  const firstPhotoBefore = await page.getByLabel('图片 1 URL').inputValue()
  const secondPhotoBefore = await page.getByLabel('图片 2 URL').inputValue()
  await page.getByRole('button', { name: /下移：/ }).first().click()
  await expect(page.getByLabel('图片 1 URL')).toHaveValue(secondPhotoBefore)
  await expect(page.getByLabel('图片 2 URL')).toHaveValue(firstPhotoBefore)
  await page.getByRole('button', { name: '上移：开发演示人车摄影' }).click()
  await expect(page.getByLabel('图片 1 URL')).toHaveValue(firstPhotoBefore)
  await expect(page.getByLabel('图片 2 URL')).toHaveValue(secondPhotoBefore)
  await page.getByRole('button', { name: '保存摄影系列' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')

  await spaNavigate(page, '/admin')
  await page.clock.install()
  const deleteButton = page.getByRole('button', { name: '删除《E2E 草稿作品》' })
  await deleteButton.click()
  const confirm = page.getByRole('button', { name: '确认删除《E2E 草稿作品》' })
  await expect(confirm).toBeDisabled()
  await page.clock.fastForward(799)
  await expect(confirm).toBeDisabled()
  await page.clock.fastForward(1)
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page.getByRole('heading', { name: 'E2E 草稿作品' })).toHaveCount(0)
})

test('authenticated local harness creates, updates, publishes, and exposes live and AIGC work in one SPA session', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/admin')
  await expect(page.locator('body')).toHaveAttribute('data-e2e-harness', 'local-only')
  await expect(page.getByRole('heading', { name: '作品管理' })).toBeVisible()

  await spaNavigate(page, '/admin/live/new')
  await expect(page.getByRole('heading', { name: '直播作品' })).toBeVisible()
  await page.getByLabel('URL 标识').fill('e2e-live-public-work')
  await page.getByLabel('标题').fill('E2E 直播初稿')
  await page.getByLabel('直播日期').fill('2026-08-12')
  await page.getByLabel('一句简介').fill('由本地 E2E 内存仓库发布的直播项目。')
  await page.getByLabel('详细说明').fill('这个编辑流程不调用 CloudBase，并在同一个 SPA 会话中验证公开可见性。')
  await page.getByLabel('创作角色').fill('直播统筹\n现场导演')
  await page.getByLabel('上传直播截图').setInputFiles({
    name: 'live-first.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('live-first'),
  })
  await expect(page.getByText('上传完成')).toHaveCount(1)
  await page.getByLabel('上传直播截图').setInputFiles({
    name: 'live-second.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('live-second'),
  })
  await expect(page.getByText('上传完成')).toHaveCount(1)
  await page.getByLabel('截图 1 替代文字').fill('直播后台第一张截图')
  await page.getByLabel('截图 2 替代文字').fill('直播后台第二张截图')
  const firstScreenshotUrl = await page.getByLabel('截图 1 URL').inputValue()
  const secondScreenshotUrl = await page.getByLabel('截图 2 URL').inputValue()
  await page.getByRole('button', { name: '下移：直播后台第一张截图' }).click()
  await expect(page.getByLabel('截图 1 URL')).toHaveValue(secondScreenshotUrl)
  await page.getByRole('button', { name: '上移：直播后台第一张截图' }).click()
  await expect(page.getByLabel('截图 1 URL')).toHaveValue(firstScreenshotUrl)
  await page.getByRole('button', { name: '设为封面：直播后台第一张截图' }).click()
  await page.getByRole('button', { name: '保存直播作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')
  await page.getByLabel('标题').fill('E2E 直播公开作品')
  await page.getByRole('button', { name: '发布直播作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')

  await spaNavigate(page, '/live')
  await expect(page.getByRole('heading', { name: 'E2E 直播公开作品' })).toBeVisible()

  await spaNavigate(page, '/admin/aigc/new')
  await expect(page.getByRole('heading', { name: 'AIGC 作品' })).toBeVisible()
  await page.getByLabel('媒体类型').selectOption('video')
  await page.getByLabel('URL 标识').fill('e2e-aigc-public-work')
  await page.getByLabel('标题').fill('E2E AIGC 初稿')
  await page.getByLabel('一句简介').fill('由本地 E2E 内存仓库发布的动态视觉作品。')
  await page.getByLabel('上传最终 MP4').setInputFiles({
    name: 'aigc-final.mp4', mimeType: 'video/mp4', buffer: Buffer.from('aigc-video'),
  })
  await page.getByLabel('上传视频封面').setInputFiles({
    name: 'aigc-cover.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('aigc-cover'),
  })
  await page.getByRole('button', { name: '保存 AIGC 作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')
  await page.getByLabel('标题').fill('E2E AIGC 公开作品')
  await page.getByRole('button', { name: '发布 AIGC 作品' }).click()
  await expect(page.getByRole('status')).toContainText('保存成功')

  await spaNavigate(page, '/aigc')
  await expect(page.getByRole('heading', { name: 'E2E AIGC 公开作品' })).toBeVisible()
})
