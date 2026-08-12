import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN_RELEASE_MARKERS = [
  'data-origin: fixture',
  '开发环境中的直播项目演示，通过横竖两种现场截图验证直播作品',
  '开发环境中的直播项目演示，以不同画幅的图片呈现城市试驾日的活动节奏',
  '开发环境中的 AIGC 光影视觉作品演示。',
  '开发环境中的 AIGC 动态视觉作品演示。',
  'creator@example.com',
  '林一川',
  '/media/fixture-',
  'data-e2e-harness',
  'local-e2e-admin',
  'e2e-only://',
]

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.mjs', '.svg', '.txt', '.xml'])

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

export function assertNoFixtures(directory = 'dist') {
  if (!fs.existsSync(directory)) {
    throw new Error(`正式发布被阻止：找不到构建目录 ${directory}`)
  }

  const files = walk(directory)
  const fixturePath = files.find((file) => path.basename(file).startsWith('fixture-'))
  if (fixturePath) {
    throw new Error(`正式发布被阻止：${fixturePath} 的文件路径仍包含演示素材。`)
  }

  for (const file of files.filter((item) => textExtensions.has(path.extname(item).toLowerCase()))) {
    const contents = fs.readFileSync(file, 'utf8')
    const match = FORBIDDEN_RELEASE_MARKERS.find((value) => contents.includes(value))
    if (match) {
      throw new Error(`正式发布被阻止：${file} 的构建产物仍包含演示内容 ${match}`)
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertNoFixtures(process.argv[2] ?? 'dist')
  console.log('发布内容扫描通过：未发现演示数据或 E2E harness 标记。')
}
