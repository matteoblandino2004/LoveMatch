import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearState } from '../lib/storage'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * A crash in a shipped app should not be a white screen. This catches one,
 * explains it, and offers the two ways out: reload, or start clean if the
 * saved data itself is what's broken.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No analytics to send this to, so leave it where a developer would look.
    console.error('Wingman crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="app">
        <div className="screen" style={{ paddingTop: 48 }}>
          <div style={{ fontSize: 40 }}>😖</div>
          <h1 className="screen-title" style={{ marginTop: 12 }}>
            Well, that wasn't supposed to happen.
          </h1>
          <p className="screen-sub" style={{ marginTop: 10 }}>
            Something in the app broke. Your profiles and matches are still saved on this device —
            reloading usually picks up where you left off.
          </p>

          <div className="stack" style={{ marginTop: 24 }}>
            <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
              Reload Wingman
            </button>
            <button
              className="btn btn-danger btn-block"
              onClick={() => {
                if (
                  confirm(
                    'Start over? This deletes every account, profile, photo and match on this device.',
                  )
                ) {
                  clearState()
                  window.location.reload()
                }
              }}
            >
              Start over with a clean slate
            </button>
          </div>

          <div className="card tiny" style={{ marginTop: 22 }}>
            <b>What went wrong</b>
            <p style={{ marginTop: 6, wordBreak: 'break-word' }}>{error.message || String(error)}</p>
          </div>
        </div>
      </div>
    )
  }
}
