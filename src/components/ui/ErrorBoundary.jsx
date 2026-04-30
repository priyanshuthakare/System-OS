import { Component } from 'react'

/**
 * @intent Global error boundary that catches render errors and shows a
 *         recovery UI instead of white-screening the entire app.
 *         Accepts an optional `fallback` prop for context-specific fallbacks
 *         (e.g. wrapping the 3D brain map with a simpler message).
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo)
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 bg-black min-h-screen">
                    <div className="font-condensed font-black text-[28px] text-red uppercase tracking-[2px]">
                        System Error
                    </div>
                    <div className="font-mono text-[10px] text-text3 text-center leading-relaxed max-w-[280px]">
                        Something went wrong. Your data is safe — it's stored locally on your device.
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="mt-2 px-6 py-2 border border-white/20 font-mono text-[10px] text-white tracking-[2px] uppercase hover:bg-white/5 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
