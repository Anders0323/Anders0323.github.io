import { describe, expect, it, vi } from 'vitest'
import { ADMIN_LOGIN_ERROR, ADMIN_LOGOUT_ERROR, ADMIN_SESSION_ERROR, AdminAuth, isAuthenticatedAdminSession } from './auth'

function authApp(overrides: object = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { is_anonymous: false }, session: { access_token: 'token' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { user: { is_anonymous: false }, session: { access_token: 'token' } }, error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  }
}

describe('AdminAuth', () => {
  it('signs in with v3 username/password and returns authenticated data', async () => {
    const app = authApp()
    const result = await new AdminAuth(app).signInAdmin('editor', 'password')
    expect(app.auth.signInWithPassword).toHaveBeenCalledWith({ username: 'editor', password: 'password' })
    expect(result.session).toEqual({ access_token: 'token' })
  })

  it.each([
    { data: { user: null, session: null }, error: { message: 'backend detail' } },
    { data: { user: null, session: null }, error: null },
  ])('uses a stable safe login error for %o', async (response) => {
    const app = authApp({ signInWithPassword: vi.fn().mockResolvedValue(response) })
    await expect(new AdminAuth(app).signInAdmin('editor', 'bad')).rejects.toThrow(ADMIN_LOGIN_ERROR)
  })

  it('maps rejected sign-in requests to the stable login error', async () => {
    const app = authApp({ signInWithPassword: vi.fn().mockRejectedValue(new Error('raw network detail')) })
    await expect(new AdminAuth(app).signInAdmin('editor', 'bad')).rejects.toThrow(ADMIN_LOGIN_ERROR)
  })

  it.each([
    { data: { user: null, session: null }, error: null },
    { data: { user: { is_anonymous: true }, session: { access_token: 'token' } }, error: null },
    { data: { user: { is_anonymous: false }, session: null }, error: null },
    { data: { user: null, session: null }, error: { message: 'private' } },
  ])('rejects missing, anonymous, or errored sessions', async (response) => {
    const app = authApp({ getSession: vi.fn().mockResolvedValue(response) })
    await expect(new AdminAuth(app).requireAdminSession()).rejects.toThrow(ADMIN_SESSION_ERROR)
  })

  it('maps rejected session requests to the stable session error', async () => {
    const app = authApp({ getSession: vi.fn().mockRejectedValue(new Error('raw SDK detail')) })
    await expect(new AdminAuth(app).requireAdminSession()).rejects.toThrow(ADMIN_SESSION_ERROR)
  })

  it('accepts only a non-anonymous user with a session', async () => {
    const response = { data: { user: { is_anonymous: false }, session: { access_token: 'token' } }, error: null }
    expect(isAuthenticatedAdminSession(response)).toBe(true)
    await expect(new AdminAuth(authApp()).requireAdminSession()).resolves.toEqual(response.data)
  })

  it('signs out through CloudBase auth', async () => {
    const app = authApp()
    await expect(new AdminAuth(app).signOut()).resolves.toBeUndefined()
    expect(app.auth.signOut).toHaveBeenCalledOnce()
  })

  it.each([
    vi.fn().mockResolvedValue({ error: { message: 'private backend detail' } }),
    vi.fn().mockRejectedValue(new Error('raw network detail')),
  ])('maps failed sign-out requests to one safe error', async (signOut) => {
    const app = authApp({ signOut })
    await expect(new AdminAuth(app).signOut()).rejects.toThrow(ADMIN_LOGOUT_ERROR)
  })
})
