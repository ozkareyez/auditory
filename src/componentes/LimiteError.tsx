// Límite de errores: si algo revienta en producción, se muestra un aviso
// claro en español en vez de una pantalla en blanco.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class LimiteError extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error inesperado en la app.', error, info)
  }

  render() {
    if (this.state.error !== null) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10 text-zinc-900">
          <h1 className="text-2xl font-bold tracking-tight">Algo falló</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
            Ocurrió un error inesperado y se cerró la pantalla. Ningún dato salió del
            dispositivo. Vuelve a cargar la página y repite la auditoría.
          </p>
          <p className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs break-words text-zinc-600">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-12 self-start rounded-xl bg-slate-900 px-4 text-lg font-bold tracking-tight text-white
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-black"
          >
            Recargar la app
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
