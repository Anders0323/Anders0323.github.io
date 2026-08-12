import type { MediaFolder, UploadedMedia } from '../../infrastructure/cloudbase/mediaStorage'

export interface AdminAuthPort {
  signInAdmin(username: string, password: string): Promise<{ user: Record<string, unknown>; session: Record<string, unknown> }>
  requireAdminSession(): Promise<{ user: Record<string, unknown>; session: Record<string, unknown> }>
  signOut(): Promise<void>
}

export interface AdminMediaStoragePort {
  upload(file: File, folder: MediaFolder): Promise<UploadedMedia>
}
