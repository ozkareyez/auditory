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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      {/* Marca: hoja de control con sello de verificación. */}
      <svg viewBox="0 0 64 64" className="size-14" aria-hidden="true">
        <rect width="64" height="64" fill="#151a17" />
        <rect x="17" y="14" width="30" height="40" fill="#f8f8f3" />
        <rect x="26" y="10" width="12" height="8" fill="#f5c400" />
        <path
          d="M23 35l7 7 12-13"
          fill="none"
          stroke="#f5c400"
          strokeWidth="5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>

      <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight">
        Auditoría de despachos
      </h1>
      <p className="mt-2 text-lg leading-snug text-acero">
        Revisión de mercancía por vehículo, antes de salir.
      </p>

      <section className="mt-7 border-2 border-tinta bg-hoja" aria-label="Cargar archivo">
        <div className="cinta-precaucion h-1.5" />
        <div className="p-4">
          <p className="text-sm font-semibold">Archivo de despachos del día</p>
          <p className="mt-1 text-[15px] leading-relaxed text-acero">
            Carga el archivo y haz la revisión aquí, en tu celular. El archivo{' '}
            <span className="font-semibold text-tinta">nunca sale del dispositivo</span>.
          </p>

          <Boton
            variante="senal"
            disabled={cargando}
            onClick={() => entrada.current?.click()}
            className="mt-4 w-full"
          >
            {cargando ? 'Leyendo archivo…' : 'Cargar archivo'}
          </Boton>
          <p className="mt-2 text-center text-xs text-acero">Formatos aceptados: .xlsx y .csv</p>
        </div>
      </section>

      {error !== null && (
        <div className="mt-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      <p className="mt-5 text-xs text-acero">
        Después de la primera carga, la app funciona sin señal en el patio.
      </p>

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
