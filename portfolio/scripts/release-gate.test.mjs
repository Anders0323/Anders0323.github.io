import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { assertNoFixtures } from './assert-no-fixtures.mjs'
import { assertReleaseConfiguration } from './release-config.mjs'

test('release configuration rejects memory backend and incomplete browser configuration', () => {
  assert.throws(
    () => assertReleaseConfiguration({
      VITE_CONTENT_BACKEND: 'memory',
      VITE_CLOUDBASE_REGION: 'ap-shanghai',
      VITE_CLOUDBASE_ENV_ID: '',
      VITE_CLOUDBASE_PUBLISHABLE_KEY: '',
    }),
    /正式发布被阻止：请先配置 CloudBase 内容后端/,
  )
})

test('release configuration CLI exits nonzero with safe Chinese guidance when browser configuration is missing', () => {
  const result = spawnSync(process.execPath, ['scripts/release-config.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      VITE_CONTENT_BACKEND: 'cloudbase',
      VITE_CLOUDBASE_REGION: 'ap-shanghai',
      VITE_CLOUDBASE_ENV_ID: '',
      VITE_CLOUDBASE_PUBLISHABLE_KEY: '',
    },
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /正式发布被阻止：请先配置 CloudBase 内容后端与完整浏览器配置；缺少 VITE_CLOUDBASE_ENV_ID、VITE_CLOUDBASE_PUBLISHABLE_KEY。/)
})

test('release configuration accepts an explicit CloudBase browser configuration', () => {
  assert.doesNotThrow(() => assertReleaseConfiguration({
    VITE_CONTENT_BACKEND: 'cloudbase',
    VITE_CLOUDBASE_REGION: 'ap-shanghai',
    VITE_CLOUDBASE_ENV_ID: 'portfolio-production',
    VITE_CLOUDBASE_PUBLISHABLE_KEY: 'publishable-key-for-test-only',
  }))
})

test('fixture scanner rejects existing forbidden copy, fixture paths, and E2E harness markers', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-fixture-gate-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(
      path.join(directory, 'assets', 'index.js'),
      '林一川 creator@example.com /media/fixture-profile.jpg data-e2e-harness',
    )
    assert.throws(
      () => assertNoFixtures(directory),
      /正式发布被阻止：.*构建产物仍包含演示内容/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fixture scanner rejects exact live fixture copy', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-expanded-fixture-copy-gate-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(
      path.join(directory, 'assets', 'live.js'),
      '开发环境中的直播项目演示，通过横竖两种现场截图验证直播作品。',
    )
    assert.throws(
      () => assertNoFixtures(directory),
      /正式发布被阻止：.*构建产物仍包含演示内容/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fixture scanner rejects exact AIGC fixture copy', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-expanded-fixture-copy-gate-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(
      path.join(directory, 'assets', 'aigc.js'),
      '开发环境中的 AIGC 动态视觉作品演示。',
    )
    assert.throws(
      () => assertNoFixtures(directory),
      /正式发布被阻止：.*构建产物仍包含演示内容/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fixture scanner accepts clean textual output and ignores binary files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-clean-gate-'))
  try {
    await writeFile(path.join(directory, 'index.html'), '<main>真实作品集</main>')
    await writeFile(path.join(directory, 'portrait.jpg'), Buffer.from([0, 1, 2, 3]))
    assert.doesNotThrow(() => assertNoFixtures(directory))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fixture scanner rejects live and AIGC fixture-named binary assets even when no text references them', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-fixture-media-gate-'))
  try {
    await mkdir(path.join(directory, 'media'))
    await writeFile(path.join(directory, 'media', 'fixture-live-community-forum.jpg'), Buffer.from([0, 1, 2, 3]))
    assert.throws(
      () => assertNoFixtures(directory),
      /正式发布被阻止：.*文件路径仍包含演示素材/,
    )
    await rm(path.join(directory, 'media', 'fixture-live-community-forum.jpg'))
    await writeFile(path.join(directory, 'media', 'fixture-aigc-motion-study.mp4'), Buffer.from([0, 1, 2, 3]))
    assert.throws(
      () => assertNoFixtures(directory),
      /正式发布被阻止：.*文件路径仍包含演示素材/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fixture scanner accepts production media names and ordinary live or AIGC copy', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-production-copy-gate-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(path.join(directory, 'assets', 'index.js'), '直播项目与 AIGC 作品现已发布。')
    await writeFile(path.join(directory, 'assets', '2026-spring-live-cover.jpg'), Buffer.from([0, 1, 2, 3]))
    await writeFile(path.join(directory, 'assets', 'aigc-motion-final.mp4'), Buffer.from([0, 1, 2, 3]))
    assert.doesNotThrow(() => assertNoFixtures(directory))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
