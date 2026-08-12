import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '../app/router'
import { RepositoryContext } from '../app/repositoryContext'
import '../styles/global.css'
import { createE2EHarness } from './e2eHarness'

const harness = createE2EHarness()
document.body.dataset.e2eHarness = 'local-only'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryContext.Provider value={harness.repository}>
      <BrowserRouter>
        <AppRouter adminServices={harness.adminServices} />
      </BrowserRouter>
    </RepositoryContext.Provider>
  </StrictMode>,
)
