import { cloudbaseApp } from './client'
import { ADMIN_LOGIN_ERROR, ADMIN_LOGOUT_ERROR, ADMIN_SESSION_ERROR } from './authMessages'

export { ADMIN_LOGIN_ERROR, ADMIN_LOGOUT_ERROR, ADMIN_SESSION_ERROR } from './authMessages'

type AuthResponse = { data: unknown; error: unknown }

interface AuthPort {
  signInWithPassword(credentials: { username: string; password: string }): Promise<AuthResponse>
  getSession(): Promise<AuthResponse>
  signOut(): Promise<void | { error?: unknown }>
}

interface AuthAppPort { auth: AuthPort }

export interface AuthenticatedSessionData {
  user: Record<string, unknown>
  session: Record<string, unknown>
}

function authenticatedData(response: unknown): AuthenticatedSessionData | null {
  if (typeof response !== 'object' || response === null || !('error' in response) || response.error) return null
  if (!('data' in response) || typeof response.data !== 'object' || response.data === null) return null
  const data = response.data as Record<string, unknown>
  if (typeof data.user !== 'object' || data.user === null || typeof data.session !== 'object' || data.session === null) return null
  const user = data.user as Record<string, unknown>
  if (user.is_anonymous !== false || user.loginType === 'ANONYMOUS') return null
  return { user, session: data.session as Record<string, unknown> }
}

export function isAuthenticatedAdminSession(response: unknown): boolean {
  return authenticatedData(response) !== null
}

export class AdminAuth {
  private readonly app: AuthAppPort

  constructor(app: AuthAppPort = cloudbaseApp() as unknown as AuthAppPort) {
    this.app = app
  }

  async signInAdmin(username: string, password: string): Promise<AuthenticatedSessionData> {
    let response: AuthResponse
    try {
      response = await this.app.auth.signInWithPassword({ username, password })
    } catch {
      throw new Error(ADMIN_LOGIN_ERROR)
    }
    const data = authenticatedData(response)
    if (!data) throw new Error(ADMIN_LOGIN_ERROR)
    return data
  }

  async requireAdminSession(): Promise<AuthenticatedSessionData> {
    let response: AuthResponse
    try {
      response = await this.app.auth.getSession()
    } catch {
      throw new Error(ADMIN_SESSION_ERROR)
    }
    const data = authenticatedData(response)
    if (!data) throw new Error(ADMIN_SESSION_ERROR)
    return data
  }

  async signOut(): Promise<void> {
    try {
      const response = await this.app.auth.signOut()
      if (response && typeof response === 'object' && 'error' in response && response.error) {
        throw new Error(ADMIN_LOGOUT_ERROR)
      }
    } catch {
      throw new Error(ADMIN_LOGOUT_ERROR)
    }
  }
}

export async function signInAdmin(username: string, password: string, app?: AuthAppPort) {
  return new AdminAuth(app).signInAdmin(username, password)
}
