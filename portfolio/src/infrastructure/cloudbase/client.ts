import cloudbase from '@cloudbase/js-sdk'

export const CLOUDBASE_CONFIGURATION_ERROR = 'CloudBase 配置不完整，请联系网站管理员。'

export interface CloudBaseEnvironment {
  backend: string
  envId: string
  publishableKey: string
  region: string
}

type InitOptions = { env: string; region: string; accessKey: string }
type InitPort<T> = (options: InitOptions) => T

export function readCloudBaseEnvironment(): CloudBaseEnvironment {
  return {
    backend: import.meta.env.VITE_CONTENT_BACKEND ?? 'memory',
    envId: import.meta.env.VITE_CLOUDBASE_ENV_ID ?? '',
    publishableKey: import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY ?? '',
    region: import.meta.env.VITE_CLOUDBASE_REGION ?? '',
  }
}

export class CloudBaseClientProvider<T = ReturnType<typeof cloudbase.init>> {
  private app: T | null = null
  private readonly init: InitPort<T>

  constructor(init: InitPort<T>) {
    this.init = init
  }

  forBackend(config: CloudBaseEnvironment): T | null {
    if (config.backend !== 'cloudbase') return null
    if (!config.envId || !config.publishableKey) throw new Error(CLOUDBASE_CONFIGURATION_ERROR)
    if (!this.app) {
      this.app = this.init({
        env: config.envId,
        region: config.region || 'ap-shanghai',
        accessKey: config.publishableKey,
      })
    }
    return this.app
  }
}

const defaultProvider = new CloudBaseClientProvider((options) => cloudbase.init(options))

export function cloudbaseApp() {
  const app = defaultProvider.forBackend(readCloudBaseEnvironment())
  if (!app) throw new Error(CLOUDBASE_CONFIGURATION_ERROR)
  return app
}
