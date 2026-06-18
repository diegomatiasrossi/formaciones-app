import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info)
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-negro p-8 text-center">
          <div className="text-3xl mb-3 opacity-50">⚠</div>
          <h2 className="text-sm font-medium text-blanco-calido mb-2">Algo salió mal</h2>
          <p className="text-xs text-gris/70 mb-4 max-w-xs">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-4 py-2 bg-dorado hover:bg-dorado-oscuro text-negro text-xs font-semibold rounded-md transition-colors"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
