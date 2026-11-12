// Lector de código de barras con la cámara del celular (RF-05).
// Usa el mismo lector que vox-inventory: ZXing (@zxing/library) leyendo en
// continuo cada 200 ms y pidiendo la cámara a 1280x720, que es mucho más
// ágil que dejar que el navegador entregue la resolución máxima.
// La librería se carga solo al abrir el escáner, para no engordar el
// paquete inicial de la app.
import { useEffect, useRef, useState } from 'react'

interface Props {
  onLeer: (codigo: string) => void
  onCerrar: () => void
}

/** Texto de error de cámara según el motivo, igual que en vox-inventory. */
function mensajeCamara(error: unknown): string {
  const nombre = error instanceof Error ? error.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'El navegador bloqueó la cámara. Habilítala en los permisos o escribe el código en el buscador.'
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No se encontró una cámara. Escribe el código en el buscador.'
  }
  if (nombre === 'NotReadableError') {
    return 'La cámara está ocupada por otra aplicación. Ciérrala o escribe el código en el buscador.'
  }
  return 'No se pudo abrir la cámara. Escribe el código en el buscador.'
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
    let lector: { reset: () => void } | null = null
    let stream: MediaStream | null = null

    function detener() {
      if (lector !== null) {
        try {
          lector.reset()
        } catch {
          // El lector pudo haberse detenido ya; no hay nada que hacer.
        }
        lector = null
      }
      if (stream !== null) {
        try {
          stream.getTracks().forEach((pista) => pista.stop())
        } catch {
          // Las pistas pudieron cerrarse solas al apagar la cámara.
        }
        stream = null
      }
      const video = videoRef.current
      if (video !== null) {
        try {
          video.pause()
        } catch {
          // El video pudo no haber empezado a reproducirse.
        }
        video.srcObject = null
      }
    }

    void (async () => {
      try {
        if (!window.isSecureContext) {
          setFallo('La cámara necesita https. Escribe el código en el buscador.')
          setAbriendo(false)
          return
        }
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          setFallo('Este navegador no da acceso a la cámara. Escribe el código en el buscador.')
          setAbriendo(false)
          return
        }

        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const video = videoRef.current
        if (cerrado || video === null) return

        // 200 ms entre intentos de lectura: la misma agilidad de vox-inventory.
        const nuevoLector = new BrowserMultiFormatReader(undefined, 200)
        lector = nuevoLector

        const nuevoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cerrado) {
          nuevoStream.getTracks().forEach((pista) => pista.stop())
          return
        }
        stream = nuevoStream

        await nuevoLector.decodeFromStream(nuevoStream, video, (resultado) => {
          if (cerrado || resultado === undefined) return
          cerrado = true
          const codigo = resultado.getText()
          detener()
          alLeerRef.current(codigo)
        })
      } catch (excepcion) {
        if (cerrado) return
        detener()
        setFallo(mensajeCamara(excepcion))
      } finally {
        if (!cerrado) setAbriendo(false)
      }
    })()

    return () => {
      cerrado = true
      detener()
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
