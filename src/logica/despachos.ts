import type { Despacho, MapeoColumnas } from '../tipos'
import { normalizar } from './normalizar'

export interface ResultadoConstruccion {
  /** Despachos agrupados por PLC, en el orden en que aparecen en el archivo. */
  despachos: Despacho[]
  /** Filas descartadas por no tener PLC ni referencia. */
  filasIgnoradas: number
  /** Avisos para mostrar al usuario (cantidades no válidas, filas ignoradas…). */
  advertencias: string[]
}

/**
 * Interpreta la cantidad de una celda. Si viene vacía o con texto, se
 * trata como 0 y se devuelve una advertencia (caso borde del PRD).
 */
export function parsearCantidad(valor: string): { cantidad: number; advertencia: string | null } {
  const texto = valor.trim().replace(',', '.') // acepta decimales con coma
  if (texto === '') return { cantidad: 0, advertencia: 'cantidad vacía' }
  const numero = Number(texto)
  if (!Number.isFinite(numero) || numero < 0) {
    return { cantidad: 0, advertencia: `cantidad no válida ("${valor.trim()}")` }
  }
  return { cantidad: Math.trunc(numero), advertencia: null }
}

/**
 * Agrupa las filas de la hoja en despachos por PLC (RF-03): todas las filas
 * con el mismo PLC forman un solo despacho; la ruta y la placa se toman de
 * la primera fila que las traiga.
 */
export function construirDespachos(
  hoja: { filas: string[][] },
  mapeo: MapeoColumnas,
): ResultadoConstruccion {
  const filas = hoja.filas.slice(1) // la primera fila son los encabezados
  const celda = (fila: string[], columna: number | null): string =>
    columna === null ? '' : (fila[columna] ?? '').trim()

  const porPlc = new Map<string, Despacho>()
  const advertencias: string[] = []
  let filasIgnoradas = 0

  filas.forEach((fila, i) => {
    const numeroFila = i + 2 // en el archivo, la fila 1 es la de encabezados
    const plc = celda(fila, mapeo.plc)
    const referencia = celda(fila, mapeo.referencia)
    if (plc === '' || referencia === '') {
      filasIgnoradas += 1
      return
    }

    const { cantidad, advertencia } = parsearCantidad(celda(fila, mapeo.cantidad))
    if (advertencia !== null) {
      advertencias.push(`Fila ${numeroFila} (${referencia}): ${advertencia}, se tomará como 0.`)
    }

    // Se agrupa por PLC normalizado para juntar "PLC90215" y "plc 90215".
    const clave = normalizar(plc)
    let despacho = porPlc.get(clave)
    if (despacho === undefined) {
      despacho = { plc, ruta: '', placa: '', lineas: [] }
      porPlc.set(clave, despacho)
    }
    if (despacho.ruta === '') despacho.ruta = celda(fila, mapeo.ruta)
    if (despacho.placa === '') despacho.placa = celda(fila, mapeo.placa)
    despacho.lineas.push({
      referencia,
      descripcion: celda(fila, mapeo.descripcion),
      cantidadEsperada: cantidad,
      factura: celda(fila, mapeo.factura),
      um: celda(fila, mapeo.um),
      peso: celda(fila, mapeo.peso),
      codigoBarras: celda(fila, mapeo.codigoBarras),
    })
  })

  if (filasIgnoradas > 0) {
    advertencias.push(`${filasIgnoradas} filas sin PLC o sin referencia fueron ignoradas.`)
  }

  return { despachos: [...porPlc.values()], filasIgnoradas, advertencias }
}

/**
 * Clave de comparación de un PLC: solo letras y números, para que
 * "PLC-00009501" coincida con "PLC00009501" o "plc 00009501".
 */
export function clavePlc(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]/g, '')
}

/** Busca un despacho por PLC, ignorando mayúsculas, espacios y guiones (RF-03). */
export function buscarPorPlc(despachos: Despacho[], consulta: string): Despacho | undefined {
  const objetivo = clavePlc(consulta)
  if (objetivo === '') return undefined
  return despachos.find((despacho) => clavePlc(despacho.plc) === objetivo)
}

/** Busca despachos por nombre de ruta, con coincidencia parcial (RF-03). */
export function buscarPorRuta(despachos: Despacho[], consulta: string): Despacho[] {
  const objetivo = normalizar(consulta)
  if (objetivo === '') return []
  return despachos.filter((despacho) => normalizar(despacho.ruta).includes(objetivo))
}

// --- Totales de control ----------------------------------------------------
// Al abrir un PLC se suman las cantidades y los pesos del documento para
// cotejarlos con el PLC impreso antes de empezar a contar.

/** Totales de control de un despacho, para comparar con el PLC impreso. */
export interface TotalesDespacho {
  /** Facturas distintas que componen el despacho; null si el archivo no la trae. */
  facturas: number | null
  /** Suma de la columna Cantidad (unidades esperadas). */
  unidades: number
  /** Suma de la columna Peso, en kg; null si ninguna línea trae peso. */
  peso: number | null
  /** Líneas que traen algo en Peso pero no se pudo interpretar como número. */
  lineasSinPeso: number
}

/**
 * Interpreta el peso de una celda como número en kg: acepta "25", "6.5",
 * "6,5" o "6,5 kg". El peso de la fila es el total de la línea (no por
 * unidad). Si no se puede interpretar, devuelve null.
 */
export function parsearPeso(valor: string): number | null {
  const texto = valor.trim().replace(',', '.').replace(/[^0-9.-]/g, '')
  if (texto === '' || texto === '.') return null
  const peso = Number(texto)
  return Number.isFinite(peso) && peso >= 0 ? peso : null
}

/**
 * Suma las cifras de control del despacho: facturas distintas, unidades y
 * peso, para cotejar que el archivo quedó bien cargado contra el impreso.
 */
export function calcularTotales(despacho: Despacho): TotalesDespacho {
  const facturas = new Set<string>()
  let unidades = 0
  let peso = 0
  let hayPeso = false
  let lineasSinPeso = 0
  for (const linea of despacho.lineas) {
    // Se normaliza para que "FE-1" y "fe 1" cuenten como la misma factura.
    const factura = normalizar(linea.factura)
    if (factura !== '') facturas.add(factura)
    unidades += linea.cantidadEsperada
    const pesoLinea = parsearPeso(linea.peso)
    if (pesoLinea !== null) {
      peso += pesoLinea
      hayPeso = true
    } else if (linea.peso.trim() !== '') {
      lineasSinPeso += 1
    }
  }
  return {
    facturas: facturas.size > 0 ? facturas.size : null,
    unidades,
    peso: hayPeso ? peso : null,
    lineasSinPeso,
  }
}
