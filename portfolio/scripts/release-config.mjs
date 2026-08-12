import path from 'node:path'
import { fileURLToPath } from 'node:url'

const requiredVariables = [
  'VITE_CLOUDBASE_REGION',
  'VITE_CLOUDBASE_ENV_ID',
  'VITE_CLOUDBASE_PUBLISHABLE_KEY',
]

export function assertReleaseConfiguration(environment = process.env) {
  const missing = requiredVariables.filter((key) => !environment[key]?.trim())
  if (environment.VITE_CONTENT_BACKEND !== 'cloudbase' || missing.length > 0) {
    const details = missing.length > 0 ? `；缺少 ${missing.join('、')}` : ''
    throw new Error(`正式发布被阻止：请先配置 CloudBase 内容后端与完整浏览器配置${details}。`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertReleaseConfiguration()
  console.log('CloudBase 发布配置检查通过。')
}
