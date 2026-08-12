import { describe, expect, it, vi } from 'vitest'
import { CloudBaseClientProvider, CLOUDBASE_CONFIGURATION_ERROR } from './client'

describe('CloudBaseClientProvider', () => {
  it('does not validate CloudBase values in memory mode', () => {
    const init = vi.fn()
    const provider = new CloudBaseClientProvider(init)
    expect(provider.forBackend({ backend: 'memory', envId: '', publishableKey: '', region: '' })).toBeNull()
    expect(init).not.toHaveBeenCalled()
  })

  it('uses one public-safe configuration error in CloudBase mode', () => {
    const provider = new CloudBaseClientProvider(vi.fn())
    expect(() => provider.forBackend({ backend: 'cloudbase', envId: '', publishableKey: '', region: '' })).toThrow(CLOUDBASE_CONFIGURATION_ERROR)
    expect(() => provider.forBackend({ backend: 'cloudbase', envId: 'env', publishableKey: '', region: '' })).toThrow(CLOUDBASE_CONFIGURATION_ERROR)
  })

  it('initializes exactly once with v3 browser-safe options and default region', () => {
    const app = { marker: true }
    const init = vi.fn().mockReturnValue(app)
    const provider = new CloudBaseClientProvider(init)
    const config = { backend: 'cloudbase', envId: 'test-env', publishableKey: 'public-key', region: '' } as const
    expect(provider.forBackend(config)).toBe(app)
    expect(provider.forBackend(config)).toBe(app)
    expect(init).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledWith({ env: 'test-env', region: 'ap-shanghai', accessKey: 'public-key' })
  })
})
