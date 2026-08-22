import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors anywhere below it so a bad document (e.g. a payment
 * without `amount`) shows a recovery screen instead of a blank white app.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] uncaught render error', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-3xl">
              ⚠️
            </div>
            <h1 className="text-lg font-bold text-slate-800">Ocurrió un error inesperado</h1>
            <p className="mt-2 text-sm text-slate-500">
              La aplicación encontró un problema al mostrar esta pantalla. Puedes intentar recargar; si el
              problema persiste, contacta al administrador del sistema.
            </p>
            <button
              onClick={this.handleReload}
              className="btn-primary mt-6 w-full"
            >
              Recargar aplicación
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-500">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
