import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null, globalError: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
  }

  componentDidMount() {
    // Catch errors outside React render (async, module init, etc.)
    window.addEventListener('error', (event) => {
      const err = event?.error || event?.message || event
      this.setState({ globalError: err })
    })

    window.addEventListener('unhandledrejection', (event) => {
      const err = event?.reason || event
      this.setState({ globalError: err })
    })
  }

  render() {
    const err = this.state.error || this.state.globalError
    if (err) {
      const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err)
      const info = this.state.errorInfo?.componentStack || ''

      return (
        <div style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          padding: 16,
          color: '#fff',
          background: '#7f1d1d',
          minHeight: '100vh',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            App crashed while loading
          </div>
          <div style={{ opacity: 0.95, marginBottom: 12 }}>
            Copy/paste this error back into chat so we can fix it fast.
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            padding: 12,
            borderRadius: 8
          }}>
            {msg}
            {info ? `\n\nReact component stack:\n${info}` : ''}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
