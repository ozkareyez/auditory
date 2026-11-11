// Pantalla inicial: cargar el archivo de despachos (RF-01).
import { useRef } from 'react'
import { Aviso, Boton } from './comunes'

interface Props {
  onElegir: (archivo: File) => void
  error: string | null
  cargando: boolean
}

export default function PantallaCarga({ onElegir, error, cargando }: Props) {
  const entrada = useRef<HTMLInputElement>(null)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      {/* Marca: planilla de control con verificación. */}
      <svg viewBox="0 0 64 64" className="size-14" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#0f172a" />
        <rect x="17" y="15" width="30" height="39" rx="4" fill="#ffffff" />
        <rect x="26" y="11" width="12" height="8" rx="2" fill="#94a3b8" />
        <path
          d="M23 35l7 7 12-13"
          fill="none"
          stroke="#15803d"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Auditoría de despachos</h1>
      <p className="mt-1 text-lg text-zinc-500">Revisión de mercancía por vehículo, antes de salir</p>

      <p className="mt-6 text-[15px] leading-relaxed text-zinc-600">
        Carga el archivo de despachos del día y haz la revisión aquí, en tu celular.
        El archivo <span className="font-semibold text-zinc-900">nunca sale del dispositivo</span>.
      </p>

      <Boton disabled={cargando} onClick={() => entrada.current?.click()} className="mt-6 w-full">
        {cargando ? 'Leyendo archivo…' : 'Cargar archivo'}
      </Boton>
      <p className="mt-2 text-center text-xs text-zinc-500">Formatos aceptados: .xlsx y .csv</p>

      {error !== null && (
        <div className="mt-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {/* Entrada de archivo oculta: el botón grande la dispara. */}
      <input
        ref={entrada}
        type="file"
        accept=".xlsx,.csv"
        className="sr-only"
        aria-label="Elegir archivo de despachos"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          if (archivo) onElegir(archivo)
          evento.target.value = '' // permite volver a elegir el mismo archivo
        }}
      />
    </main>
  )
}
