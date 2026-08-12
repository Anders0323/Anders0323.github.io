import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureAigcWorks, fixtureLiveWorks, fixturePhotoSeries, fixtureProfile, fixtureVideos } from '../../fixtures/content'
import { MemoryContentRepository } from '../../infrastructure/memory/contentRepository'
import { AdminListPage } from './AdminListPage'

afterEach(() => vi.useRealTimers())

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe('AdminListPage', () => {
  it('summarizes every admin work type with its create and edit entry points', async () => {
    const repository = new MemoryContentRepository(
      fixtureVideos,
      fixturePhotoSeries,
      fixtureProfile,
      fixtureLiveWorks,
      fixtureAigcWorks,
    )

    render(<AdminListPage repository={repository} />)

    const expectedSections = [
      { heading: '短视频', count: '5 条' },
      { heading: '摄影系列', count: '5 组' },
      { heading: '直播作品', count: '2 场' },
      { heading: 'AIGC 作品', count: '2 件' },
    ]
    for (const expected of expectedSections) {
      const section = (await screen.findByRole('heading', { name: expected.heading })).closest('section')
      expect(section).not.toBeNull()
      expect(within(section!).getByText(expected.count)).toBeVisible()
    }

    expect(screen.getByRole('link', { name: '新建短视频' })).toHaveAttribute('href', '/admin/videos/new')
    expect(screen.getByRole('link', { name: '新建摄影系列' })).toHaveAttribute('href', '/admin/photography/new')
    expect(screen.getByRole('link', { name: '新建直播作品' })).toHaveAttribute('href', '/admin/live/new')
    expect(screen.getByRole('link', { name: '新建 AIGC 作品' })).toHaveAttribute('href', '/admin/aigc/new')
    expect(screen.getByRole('link', { name: '编辑《人车之间》' })).toHaveAttribute('href', `/admin/photography/${encodeURIComponent(fixturePhotoSeries[0]!.id)}`)
    expect(screen.getByRole('link', { name: '编辑《社区共创论坛直播》' })).toHaveAttribute('href', `/admin/live/${encodeURIComponent(fixtureLiveWorks[0]!.id)}`)
    expect(screen.getByRole('link', { name: '编辑《光影习作》' })).toHaveAttribute('href', `/admin/aigc/${encodeURIComponent(fixtureAigcWorks[0]!.id)}`)
  })

  it('shows a safe load error without presenting failed overview data as empty', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([fixturePhotoSeries[0]]),
      listAllLiveWorks: vi.fn().mockResolvedValue([fixtureLiveWorks[0]]),
      listAllAigcWorks: vi.fn().mockRejectedValue(new Error('private transport detail')),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }

    render(<AdminListPage repository={repository as never} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('作品列表暂时无法加载，请稍后重试。')
    expect(screen.queryByText('还没有短视频作品。可以从“新建短视频”开始。')).not.toBeInTheDocument()
    expect(screen.queryByText('private transport detail')).not.toBeInTheDocument()
  })

  it('clears a previous repository load error when a replacement repository succeeds', async () => {
    const failingRepository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockRejectedValue(new Error('private first repository detail')),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    const succeedingRepository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }

    const view = render(<AdminListPage repository={failingRepository as never} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('作品列表暂时无法加载，请稍后重试。')

    view.rerender(<AdminListPage repository={succeedingRepository as never} />)

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '归途的对话' })).toBeVisible()
    })
  })

  it('hides a successful previous overview while a replacement repository is pending', async () => {
    const replacementAigcRequest = deferred<never[]>()
    const firstRepository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    const pendingRepository = {
      listAllVideos: vi.fn().mockResolvedValue([]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockReturnValue(replacementAigcRequest.promise),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }

    const view = render(<AdminListPage repository={firstRepository as never} />)
    expect(await screen.findByRole('heading', { name: '归途的对话' })).toBeVisible()

    view.rerender(<AdminListPage repository={pendingRepository as never} />)

    expect(screen.getByRole('status')).toHaveTextContent('正在读取作品…')
    expect(screen.queryByRole('heading', { name: '归途的对话' })).not.toBeInTheDocument()
  })

  it('requires an exact confirmation before deletion', async () => {
    const user = userEvent.setup()
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([fixtureLiveWorks[0]]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }

    render(<AdminListPage repository={repository as never} />)

    await user.click(await screen.findByRole('button', { name: '删除《归途的对话》' }))

    expect(screen.getByRole('dialog', { name: '确认删除作品' })).toBeVisible()
    expect(repository.deleteVideo).not.toHaveBeenCalled()
  })

  it('keeps final confirmation disabled for exactly 800ms and deletes only after repository success', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn().mockResolvedValue(undefined),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)
    const opener = await screen.findByRole('button', { name: '删除《归途的对话》' })
    vi.useFakeTimers()
    fireEvent.click(opener)
    const confirm = screen.getByRole('button', { name: '确认删除《归途的对话》' })
    expect(confirm).toBeDisabled()

    await act(async () => vi.advanceTimersByTime(799))
    expect(confirm).toBeDisabled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(confirm).toBeEnabled()
    vi.useRealTimers()

    await act(async () => fireEvent.click(confirm))
    expect(repository.deleteVideo).toHaveBeenCalledWith(fixtureVideos[0].id)
    expect(screen.queryByRole('heading', { name: '归途的对话' })).not.toBeInTheDocument()
  })

  it('repeats metadata and restores focus to the exact opener when cancelled', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)

    expect(await screen.findByText('人物叙事')).toBeVisible()
    expect(screen.getByText('已发布')).toBeVisible()
    expect(screen.getByText('2025')).toBeVisible()
    const opener = screen.getByRole('button', { name: '删除《归途的对话》' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: '确认删除作品' })
    expect(dialog).toHaveTextContent('归途的对话')
    await userEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(opener).toHaveFocus()
  })

  it('closes on Escape and does not remove a row before the repository succeeds', async () => {
    let finishDelete!: () => void
    const deleteRequest = new Promise<void>((resolve) => { finishDelete = resolve })
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn().mockReturnValue(deleteRequest),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)
    const opener = await screen.findByRole('button', { name: '删除《归途的对话》' })
    await userEvent.click(opener)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '确认删除作品' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()

    vi.useFakeTimers()
    fireEvent.click(opener)
    await act(async () => vi.advanceTimersByTime(800))
    const confirm = screen.getByRole('button', { name: '确认删除《归途的对话》' })
    fireEvent.click(confirm)
    expect(screen.getByRole('heading', { name: '归途的对话' })).toBeInTheDocument()
    finishDelete()
    vi.useRealTimers()
    expect(await screen.findByText('还没有短视频作品。可以从“新建短视频”开始。')).toBeVisible()
  })

  it('ignores Escape and keeps focus away from the opener while deletion is in flight', async () => {
    const deleteRequest = deferred<void>()
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn().mockReturnValue(deleteRequest.promise),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)

    const opener = await screen.findByRole('button', { name: '删除《归途的对话》' })
    vi.useFakeTimers()
    fireEvent.click(opener)
    await act(async () => vi.advanceTimersByTime(800))
    const confirm = screen.getByRole('button', { name: '确认删除《归途的对话》' })
    confirm.focus()
    fireEvent.click(confirm)

    expect(screen.getByRole('button', { name: '正在删除…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: '确认删除作品' })).toBeVisible()
    expect(confirm).toHaveFocus()
    expect(opener).not.toHaveFocus()

    vi.useRealTimers()
    await act(async () => deleteRequest.resolve())
    expect(screen.queryByRole('dialog', { name: '确认删除作品' })).not.toBeInTheDocument()
  })

  it('keeps all loaded overview data visible after closing a rejected deletion dialog', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([fixtureVideos[0]]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([fixturePhotoSeries[0]]),
      listAllLiveWorks: vi.fn().mockResolvedValue([fixtureLiveWorks[0]]),
      listAllAigcWorks: vi.fn().mockResolvedValue([fixtureAigcWorks[0]]),
      deleteVideo: vi.fn().mockRejectedValue(new Error('private delete detail')),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)

    const opener = await screen.findByRole('button', { name: '删除《归途的对话》' })
    vi.useFakeTimers()
    fireEvent.click(opener)
    await act(async () => vi.advanceTimersByTime(800))
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: '确认删除《归途的对话》' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('删除失败，请稍后重试。')
    expect(screen.getByRole('heading', { name: '归途的对话' })).toBeVisible()
    expect(screen.getByRole('dialog', { name: '确认删除作品' })).toBeVisible()
    expect(screen.queryByText('private delete detail')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(screen.queryByRole('dialog', { name: '确认删除作品' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('删除失败，请稍后重试。')
    for (const heading of ['短视频', '摄影系列', '直播作品', 'AIGC 作品']) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  it('lists and deletes live works through the same delayed destructive confirmation', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([fixtureLiveWorks[0]]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn().mockResolvedValue(undefined),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)

    const opener = await screen.findByRole('button', { name: '删除《社区共创论坛直播》' })
    expect(screen.getByRole('link', { name: '编辑《社区共创论坛直播》' })).toHaveAttribute('href', `/admin/live/${encodeURIComponent(fixtureLiveWorks[0]!.id)}`)
    vi.useFakeTimers()
    fireEvent.click(opener)
    const confirm = screen.getByRole('button', { name: '确认删除《社区共创论坛直播》' })
    expect(confirm).toBeDisabled()
    await act(async () => vi.advanceTimersByTime(800))
    expect(confirm).toBeEnabled()
    vi.useRealTimers()
    await act(async () => fireEvent.click(confirm))
    expect(repository.deleteLiveWork).toHaveBeenCalledWith(fixtureLiveWorks[0]!.id)
    expect(await screen.findByText('还没有直播作品。可以从“新建直播作品”开始。')).toBeVisible()
  })

  it('deletes photo series with the photo repository method only after confirmation succeeds', async () => {
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([fixturePhotoSeries[0]]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn().mockResolvedValue(undefined),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn(),
    }
    render(<AdminListPage repository={repository as never} />)

    const opener = await screen.findByRole('button', { name: '删除《人车之间》' })
    expect(screen.getByRole('link', { name: '编辑《人车之间》' })).toHaveAttribute('href', `/admin/photography/${encodeURIComponent(fixturePhotoSeries[0]!.id)}`)
    vi.useFakeTimers()
    fireEvent.click(opener)
    await act(async () => vi.advanceTimersByTime(800))
    fireEvent.click(screen.getByRole('button', { name: '确认删除《人车之间》' }))
    vi.useRealTimers()

    expect(repository.deletePhotoSeries).toHaveBeenCalledWith(fixturePhotoSeries[0]!.id)
    expect(repository.deleteVideo).not.toHaveBeenCalled()
    expect(repository.deleteLiveWork).not.toHaveBeenCalled()
    expect(repository.deleteAigcWork).not.toHaveBeenCalled()
    expect(await screen.findByText('还没有摄影系列。可以从“新建摄影系列”开始。')).toBeVisible()
  })

  it('lists and deletes AIGC works through the delayed confirmation without optimistic removal', async () => {
    let finishDelete!: () => void
    const repository = {
      listAllVideos: vi.fn().mockResolvedValue([]),
      listAllPhotoSeries: vi.fn().mockResolvedValue([]),
      listAllLiveWorks: vi.fn().mockResolvedValue([]),
      listAllAigcWorks: vi.fn().mockResolvedValue([fixtureAigcWorks[0]]),
      deleteVideo: vi.fn(),
      deletePhotoSeries: vi.fn(),
      deleteLiveWork: vi.fn(),
      deleteAigcWork: vi.fn().mockReturnValue(new Promise<void>((resolve) => { finishDelete = resolve })),
    }
    render(<AdminListPage repository={repository as never} />)

    const opener = await screen.findByRole('button', { name: '删除《光影习作》' })
    expect(screen.getByRole('link', { name: '编辑《光影习作》' })).toHaveAttribute('href', `/admin/aigc/${encodeURIComponent(fixtureAigcWorks[0]!.id)}`)
    vi.useFakeTimers()
    fireEvent.click(opener)
    await act(async () => vi.advanceTimersByTime(800))
    fireEvent.click(screen.getByRole('button', { name: '确认删除《光影习作》' }))
    expect(screen.getByRole('heading', { name: '光影习作' })).toBeInTheDocument()
    finishDelete()
    vi.useRealTimers()
    expect(await screen.findByText('还没有 AIGC 作品。可以从“新建 AIGC 作品”开始。')).toBeVisible()
  })
})
