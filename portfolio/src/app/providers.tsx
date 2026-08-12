import { useEffect, useState, type ReactNode } from 'react'
import type { AdminContentRepository } from '../domain/repository'
import { createContentRepository } from '../infrastructure/repositoryFactory'
import { RepositoryContext } from './repositoryContext'

export function AppProviders({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<AdminContentRepository | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    void createContentRepository()
      .then((createdRepository) => {
        if (active) {
          setRepository(createdRepository)
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (failed) {
    return (
      <main className="load-message" id="main-content">
        <h1>作品集暂时无法打开</h1>
        <p>请稍后刷新页面重试。</p>
      </main>
    )
  }

  if (!repository) {
    return (
      <main className="load-message" id="main-content" aria-live="polite">
        正在打开作品集…
      </main>
    )
  }

  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
}
