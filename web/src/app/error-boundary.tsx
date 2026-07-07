import { Component, type ErrorInfo, type ReactNode } from "react"

import { ErrorState } from "@/lib/errors/ErrorState"

type AppErrorBoundaryProps = {
  children: ReactNode
  onReset: () => void
}

type AppErrorBoundaryState = {
  error: unknown
}

const initialState: AppErrorBoundaryState = {
  error: null,
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = initialState

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <AppErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      )
    }
    return this.props.children
  }

  private handleRetry = () => {
    this.props.onReset()
    this.setState(initialState)
  }
}

function AppErrorFallback({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  return (
    <div
      data-slot="app-error-boundary"
      className="flex min-h-svh min-w-0 items-center justify-center p-6"
    >
      <ErrorState
        className="max-w-md flex-none"
        error={error}
        onRetry={onRetry}
        surface="crash"
      />
    </div>
  )
}
