import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fixtureAigcWorks } from '../../fixtures/content'
import { AdminAigcListPage } from './AdminAigcListPage'

describe('AdminAigcListPage', () => {
  it('lists all AIGC works with edit links after the request settles', async () => {
    render(<AdminAigcListPage repository={{ listAllAigcWorks: async () => fixtureAigcWorks }} />)

    expect(await screen.findByRole('heading', { name: '光影习作' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '编辑《流动习作》' })).toHaveAttribute('href', `/admin/aigc/${encodeURIComponent(fixtureAigcWorks[1]!.id)}`)
  })
})
