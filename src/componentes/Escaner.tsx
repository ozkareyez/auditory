// Lector de código de barras con la cámara del celular (RF-05).
// La librería de lectura (@zxing/browser) se carga solo al abrir el
// escáner, para no engordar el paquete inicial de la app.
import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'

interface Props {
  onLeer: (codigo: string) => void
  onCerrar: () => void
}

export default function Escaner({ onLeer, onCerrar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Se guarda en una referencia para que la cámara no se reinicie cuando
  // la pantalla de auditoría se vuelve a renderizar (el conteo cambia).
  const alLeerRef = useRef(onLeer)
  useEffect(() => {
    alLeerRef.current = onLeer
  })
  const [abriendo, setAbriendo] = useState(true)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    let cerrado = false
    let controles: IScannerControls | undefined

    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const video = videoRef.current
        if (cerrado || video === null) return
        const lector = new BrowserMultiFormatReader()
        // Cámara trasera del celular, leyendo en continuo hasta lograr un código.
        controles = await lector.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video,
          (resultado, _error, controlesLectura) => {
            if (cerrado || resultado === undefined) return
            cerrado = true
            controlesLectura.stop()
            alLeerRef.current(resultado.getText())
          },
        )
      } catch {
        if (!cerrado) {
          // La cámara exige una conexión segura (https) y permiso del usuario.
          setFallo('No se pudo abrir la cámara. Comprueba el permiso y que la app esté servida con https.')
        }
      } finally {
        if (!cerrado) setAbriendo(false)
      }
    })()

    return () => {
      cerrado = true
      controles?.stop()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear código de barras"
    >
      <video ref={videoRef} muted autoPlay playsInline className="h-full w-full object-cover" />

      {/* Marco de guía: el resto de la pantalla se oscurece con una sombra. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-10">
        <div className="mx-auto aspect-[3/2] w-full max-w-[280px] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-slate-950/80 to-transparent px-4 pb-10 pt-4">
        <p className="text-sm font-semibold text-white">Escanear producto</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el escáner"
          className="flex size-12 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white backdrop-blur
            focus-visible:outline-2 focus-visible:outline-white"
        >
          ✕
        </button>
      </div>

      <p className="absolute inset-x-0 bottom-[calc(3rem+var(--area-segura-inferior))] px-6 text-center text-sm leading-snug text-slate-200">
        {fallo ?? (abriendo ? 'Abriendo la cámara…' : 'Apunta al código de barras del producto')}
      </p>
    </div>
  )
}
