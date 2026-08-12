interface LoadStateProps {
  status: 'loading' | 'empty' | 'error'
  message: string
  onRetry?: () => void
}

export function LoadState({ status, message, onRetry }: LoadStateProps) {
  return (
    <div className="load-state" role={status === 'error' ? 'alert' : 'status'}>
      <p>{message}</p>
      {status === 'error' && onRetry ? (
        <button className="outline-action outline-action-dark" onClick={onRetry} type="button">
          重新加载
        </button>
      ) : null}
    </div>
  )
}
