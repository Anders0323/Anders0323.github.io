import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  )
}
