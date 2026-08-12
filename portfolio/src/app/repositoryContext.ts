import { createContext, useContext } from 'react'
import type { AdminContentRepository, ContentRepository } from '../domain/repository'

export const RepositoryContext = createContext<ContentRepository | null>(null)

export function useContentRepository(): ContentRepository {
  const repository = useContext(RepositoryContext)

  if (!repository) {
    throw new Error('Content repository is not available')
  }

  return repository
}

export function useAdminContentRepository(): AdminContentRepository {
  const repository = useContext(RepositoryContext)
  if (
    !repository ||
    !('listAllVideos' in repository) ||
    !('saveVideo' in repository) ||
    !('listAllPhotoSeries' in repository) ||
    !('savePhotoSeries' in repository) ||
    !('getProfile' in repository) ||
    !('saveProfile' in repository)
  ) {
    throw new Error('Admin content repository is not available')
  }
  return repository as AdminContentRepository
}
