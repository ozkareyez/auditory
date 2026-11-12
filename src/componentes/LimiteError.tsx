// Límite de errores: si algo revienta en producción, se muestra un aviso
// claro en español en vez de una pantalla en blanco.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Boton } from './comunes'

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
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
          <p className="text-xs font-medium text-acero">La app se detuvo</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Algo falló</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-acero">
            Ocurrió un error inesperado y se cerró la pantalla. Ningún dato salió del
            dispositivo. Vuelve a cargar la página y repite la auditoría.
          </p>
          <p className="mt-4 border-l-4 border-l-rojo bg-rojo-claro p-3 font-mono text-xs break-words text-tinta">
            {this.state.error.message}
          </p>
          <Boton variante="senal" onClick={() => window.location.reload()} className="mt-6 self-start">
            Recargar la app
          </Boton>
        </main>
      )
    }
    return this.props.children
  }
}
