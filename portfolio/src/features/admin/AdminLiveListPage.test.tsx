import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminLiveListPage } from './AdminLiveListPage'

describe('AdminLiveListPage', () => {
  it('keeps the empty state hidden until the live request settles', async () => {
    let finishLoad!: (items: []) => void
    const repository = { listAllLiveWorks: () => new Promise<[]>((resolve) => { finishLoad = resolve }) }
    render(<AdminLiveListPage repository={repository} />)

    expect(screen.getByRole('status')).toHaveTextContent('正在读取直播作品…')
    expect(screen.queryByText('还没有直播作品。可以从“新建直播作品”开始。')).not.toBeInTheDocument()
    await act(async () => finishLoad([]))
    expect(await screen.findByText('还没有直播作品。可以从“新建直播作品”开始。')).toBeVisible()
  })
})
