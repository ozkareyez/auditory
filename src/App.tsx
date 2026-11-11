// Aplicación de auditoría de despachos por PLC.
// Flujo: cargar archivo (columnas detectadas solas) → buscar PLC → cotejar → auditar → resumen.
import { useState } from 'react'
import PantallaAuditoria from './componentes/PantallaAuditoria'
import PantallaBusqueda from './componentes/PantallaBusqueda'
import PantallaCarga from './componentes/PantallaCarga'
import PantallaConfirmacion from './componentes/PantallaConfirmacion'
import PantallaMapeo from './componentes/PantallaMapeo'
import PantallaResumen from './componentes/PantallaResumen'
import { crearAuditoria } from './logica/auditoria'
import { buscarPorPlc, clavePlc, construirDespachos } from './logica/despachos'
import { descargarInforme } from './logica/informe'
import type { AuditoriaTerminada } from './logica/informe'
import { leerArchivo } from './logica/leerArchivo'
import { camposFaltantes, guardarMapeo, mapeoInicial } from './logica/mapeoColumnas'
import type {
  Campo,
  Despacho,
  Hoja,
  LineaAuditoria,
  MapeoColumnas,
} from './tipos'

type Paso = 'carga' | 'mapeo' | 'busqueda' | 'confirmacion' | 'auditoria' | 'resumen'

/** Archivo ya procesado, listo para buscar despachos. */
interface DatosCargados {
  despachos: Despacho[]
  advertencias: string[]
}

export default function App() {
  const [paso, setPaso] = useState<Paso>('carga')
  const [error, setError] = useState<string | null>(null)
  const [leyendo, setLeyendo] = useState(false)

  // Carga del archivo (RF-01 y RF-02).
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [hojas, setHojas] = useState<Hoja[]>([])
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [mapeo, setMapeo] = useState<MapeoColumnas | null>(null)
  const [datos, setDatos] = useState<DatosCargados | null>(null)

  // Auditoría en curso (se conserva en memoria durante la sesión).
  const [despacho, setDespacho] = useState<Despacho | null>(null)
  const [lineas, setLineas] = useState<LineaAuditoria[] | null>(null)
  // PLCs que ya se auditaron con el archivo actual (clave normalizada).
  const [auditadas, setAuditadas] = useState<Set<string>>(new Set())
  // Auditorías terminadas de la sesión, para el informe de cierre.
  const [terminadas, setTerminadas] = useState<AuditoriaTerminada[]>([])

  async function alElegirArchivo(archivoElegido: File) {
    setError(null)
    setLeyendo(true)
    try {
      const leido = await leerArchivo(archivoElegido)
      const conDatos = leido.hojas.filter((unaHoja) => unaHoja.filas.length > 0)
      if (conDatos.length === 0) {
        throw new Error('El archivo no tiene filas de datos.')
      }
      setNombreArchivo(leido.nombreArchivo)
      setHojas(conDatos)

      // Las columnas se reconocen solas: se usa la primera hoja que
      // complete los campos obligatorios y traiga despachos. Así no hace
      // falta confirmar nada antes de empezar a buscar.
      for (const unaHoja of conDatos) {
        const mapeoHoja = mapeoInicial(unaHoja.filas[0] ?? [])
        if (camposFaltantes(mapeoHoja).length > 0) continue
        const resultado = construirDespachos(unaHoja, mapeoHoja)
        if (resultado.despachos.length === 0) continue
        // Recordar la asignación para el siguiente archivo con estos
        // mismos encabezados.
        guardarMapeo(unaHoja.filas[0] ?? [], mapeoHoja)
        setError(null)
        setDatos({ despachos: resultado.despachos, advertencias: resultado.advertencias })
        // Las marcas de "auditada" y el informe eran del archivo anterior.
        setAuditadas(new Set())
        setTerminadas([])
        setPaso('busqueda')
        return
      }

      // Rescate de emergencia: ningún encabezado reconocible; solo aquí
      // se pide la asignación manual de columnas.
      setHoja(conDatos[0])
      setMapeo(mapeoInicial(conDatos[0].filas[0] ?? []))
      setDatos(null)
      setError(
        'No se pudieron reconocer las columnas de este archivo. Asigna manualmente las columnas obligatorias.',
      )
      setPaso('mapeo')
    } catch (excepcion) {
      setError(
        excepcion instanceof Error ? excepcion.message : 'No se pudo leer el archivo.',
      )
    } finally {
      setLeyendo(false)
    }
  }

  function alCambiarHoja(nuevaHoja: Hoja) {
    setHoja(nuevaHoja)
    setMapeo(mapeoInicial(nuevaHoja.filas[0] ?? []))
  }

  function alAsignarColumna(campo: Campo, columna: number | null) {
    setMapeo((actual) => {
      if (actual === null) return actual
      const siguiente: MapeoColumnas = { ...actual }
      siguiente[campo] = columna
      return siguiente
    })
  }

  function alConfirmarColumnas() {
    if (hoja === null || mapeo === null) return
    const resultado = construirDespachos(hoja, mapeo)
    if (resultado.despachos.length === 0) {
      setError(
        'No se encontró ningún despacho en esta hoja. Revisa las columnas de PLC y Referencia.',
      )
      return
    }
    // Recordar la asignación para el siguiente archivo con estos encabezados.
    guardarMapeo(hoja.filas[0] ?? [], mapeo)
    setError(null)
    setDatos({ despachos: resultado.despachos, advertencias: resultado.advertencias })
    // Las marcas de "auditada" y el informe eran del archivo anterior.
    setAuditadas(new Set())
    setTerminadas([])
    setPaso('busqueda')
  }

  /** Busca el despacho y muestra la vista previa para cotejarla con el impreso. */
  function alBuscar(consulta: string): boolean {
    if (datos === null) return false
    const encontrado = buscarPorPlc(datos.despachos, consulta)
    if (encontrado === undefined) return false
    setDespacho(encontrado)
    setLineas(null)
    setPaso('confirmacion')
    return true
  }

  /** Arranca la auditoría del despacho elegido. */
  function alIniciarAuditoria() {
    if (despacho === null) return
    setLineas(crearAuditoria(despacho))
    setPaso('auditoria')
  }

  function alCambiarCantidad(indice: number, cantidad: number) {
    setLineas((actuales) => {
      if (actuales === null) return actuales
      const siguientes = [...actuales]
      const actual = siguientes[indice]
      const verificada = Math.max(0, cantidad)
      siguientes[indice] = {
        ...actual,
        cantidadVerificada: verificada,
        // Al cuadrar o sobrar unidades, la marca de reversión pierde sentido.
        reversion: verificada >= actual.cantidadEsperada ? false : actual.reversion,
      }
      return siguientes
    })
  }

  /** Marca (o desmarca) el faltante de una línea como reversión. */
  function alMarcarReversion(indice: number, reversion: boolean) {
    setLineas((actuales) => {
      if (actuales === null) return actuales
      const siguientes = [...actuales]
      siguientes[indice] = { ...siguientes[indice], reversion }
      return siguientes
    })
  }

  /** Termina la auditoría: marca el PLC y graba el resultado para el informe. */
  function alFinalizar() {
    if (despacho !== null && lineas !== null) {
      const clave = clavePlc(despacho.plc)
      setAuditadas((actuales) => new Set(actuales).add(clave))
      const registro: AuditoriaTerminada = {
        plc: despacho.plc,
        ruta: despacho.ruta,
        placa: despacho.placa,
        fecha: new Date(),
        lineas: lineas.map((linea) => ({ ...linea })),
      }
      // Si se corrigió una auditoría ya grabada, se reemplaza (sin duplicar).
      setTerminadas((actuales) => [...actuales.filter((una) => clavePlc(una.plc) !== clave), registro])
    }
    setPaso('resumen')
  }

  function alNuevaAuditoria() {
    setDespacho(null)
    setLineas(null)
    setPaso('busqueda')
  }

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900 antialiased">
      {paso === 'carga' && (
        <PantallaCarga onElegir={alElegirArchivo} error={error} cargando={leyendo} />
      )}

      {paso === 'mapeo' && hoja !== null && mapeo !== null && (
        <PantallaMapeo
          nombreArchivo={nombreArchivo}
          hojas={hojas}
          hoja={hoja}
          mapeo={mapeo}
          faltan={camposFaltantes(mapeo)}
          onCambiarHoja={alCambiarHoja}
          onAsignar={alAsignarColumna}
          onConfirmar={alConfirmarColumnas}
          onVolver={() => setPaso('carga')}
          error={error}
        />
      )}

      {paso === 'busqueda' && datos !== null && (
        <PantallaBusqueda
          nombreArchivo={nombreArchivo}
          despachos={datos.despachos}
          advertencias={datos.advertencias}
          auditadas={auditadas}
          terminadas={terminadas.length}
          onBuscar={alBuscar}
          onDescargarInforme={() => void descargarInforme(terminadas)}
          onCambiarArchivo={() => setPaso('carga')}
        />
      )}

      {paso === 'confirmacion' && despacho !== null && (
        <PantallaConfirmacion
          despacho={despacho}
          auditada={auditadas.has(clavePlc(despacho.plc))}
          onIniciar={alIniciarAuditoria}
          onVolver={() => setPaso('busqueda')}
        />
      )}

      {paso === 'auditoria' && despacho !== null && lineas !== null && (
        <PantallaAuditoria
          despacho={despacho}
          lineas={lineas}
          onCambiarCantidad={alCambiarCantidad}
          onMarcarReversion={alMarcarReversion}
          onFinalizar={alFinalizar}
          onVolver={() => setPaso('busqueda')}
        />
      )}

      {paso === 'resumen' && despacho !== null && lineas !== null && (
        <PantallaResumen
          despacho={despacho}
          lineas={lineas}
          onRegresar={() => setPaso('auditoria')}
          onNueva={alNuevaAuditoria}
        />
      )}
    </div>
  )
}
