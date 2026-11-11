import type { Campo, MapeoColumnas } from '../tipos'
import { normalizar } from './normalizar'

/** Campos obligatorios del archivo de despachos (RF-02). */
export const CAMPOS_REQUERIDOS: readonly Campo[] = ['plc', 'referencia', 'cantidad', 'descripcion'] as const

/** Todos los campos que la app entiende, en el orden en que se muestran. */
export const CAMPOS: readonly Campo[] = [
  'plc',
  'factura',
  'referencia',
  'descripcion',
  'um',
  'cantidad',
  'peso',
  'ruta',
  'placa',
  'codigoBarras',
] as const

/**
 * Nombres posibles de cada columna, en minúsculas y sin acentos, para
 * reconocer los encabezados automáticamente (RF-02). El código no depende
 * de posiciones fijas de columna.
 */
const ALIAS_EXACTOS: Record<Campo, readonly string[]> = {
  plc: ['plc', 'no plc', 'nro plc', 'numero plc', 'despacho', 'nro documento planilla'],
  factura: ['factura', 'no factura', 'nro factura', 'numero factura', 'factura no', 'documento', 'remision', 'nro documento'],
  referencia: ['referencia', 'ref', 'codigo', 'sku', 'item', 'articulo'],
  cantidad: ['cantidad', 'cant', 'unidades', 'cantidad despachada', 'cantidad solicitada', 'cantidad emp.'],
  descripcion: ['descripcion', 'producto', 'nombre producto', 'nombre', 'detalle', 'desc. item', 'desc item'],
  um: ['um', 'unidad de medida', 'unidad', 'unidad medida', 'u/m', 'u.m.'],
  peso: ['peso', 'peso total', 'kg'],
  ruta: ['ruta', 'nombre ruta', 'zona'],
  placa: ['placa', 'placa vehiculo', 'vehiculo'],
  codigoBarras: ['codigo de barras', 'codigo barras', 'barcode', 'ean', 'upc'],
}

/**
 * Alias "seguros" para la coincidencia parcial (el encabezado contiene al
 * alias). Se excluyen los alias muy genéricos (p. ej. "producto" o
 * "nombre") para no confundir columnas como "Referencia del producto".
 */
const ALIAS_PARCIALES: Record<Campo, readonly string[]> = {
  plc: ['plc', 'planilla'],
  factura: ['factura', 'remision', 'documento'],
  referencia: ['referencia', 'ref', 'codigo', 'sku', 'item', 'articulo'],
  cantidad: ['cantidad', 'cant', 'unidades'],
  descripcion: ['descripcion', 'nombre producto', 'desc. item', 'desc item'],
  um: ['unidad de medida', 'unidad medida'],
  peso: ['peso', 'kg'],
  ruta: ['ruta', 'zona'],
  placa: ['placa', 'vehiculo'],
  codigoBarras: ['codigo de barras', 'codigo barras', 'barcode', 'ean', 'upc'],
}

/**
 * Orden de la búsqueda parcial: los campos más específicos primero, para
 * que "Código de barras" no acabe asignado a "Referencia" (alias "código").
 */
const ORDEN_PARCIAL: readonly Campo[] = [
  'codigoBarras',
  'plc',
  'factura',
  'cantidad',
  'peso',
  'ruta',
  'placa',
  'um',
  'descripcion',
  'referencia',
]

/** Nombre legible de cada campo, para mostrar en la interfaz. */
export const NOMBRE_CAMPO: Record<Campo, string> = {
  plc: 'PLC',
  factura: 'Factura',
  referencia: 'Referencia',
  cantidad: 'Cantidad',
  descripcion: 'Descripción',
  um: 'Unidad de medida',
  peso: 'Peso',
  ruta: 'Ruta',
  placa: 'Placa',
  codigoBarras: 'Código de barras',
}

/** Mapeo vacío: ningún campo asignado. */
export function mapeoVacio(): MapeoColumnas {
  return {
    plc: null,
    factura: null,
    referencia: null,
    cantidad: null,
    descripcion: null,
    um: null,
    peso: null,
    ruta: null,
    placa: null,
    codigoBarras: null,
  }
}

/**
 * Detecta automáticamente las columnas a partir de los encabezados (RF-02).
 * Primero busca coincidencia exacta y luego parcial; una misma columna
 * nunca se asigna a dos campos.
 */
export function detectarMapeo(encabezados: string[]): MapeoColumnas {
  const mapeo = mapeoVacio()
  const normalizados = encabezados.map(normalizar)
  const usadas = new Set<number>()

  // Busca la primera columna libre que coincida con el campo.
  const buscar = (campo: Campo, parcial: boolean): number => {
    const alias = parcial ? ALIAS_PARCIALES[campo] : ALIAS_EXACTOS[campo]
    for (let indice = 0; indice < normalizados.length; indice++) {
      if (usadas.has(indice)) continue
      const encabezado = normalizados[indice]
      const hayCoincidencia = parcial
        ? alias.some((unAlias) => encabezado.includes(unAlias))
        : alias.includes(encabezado)
      if (hayCoincidencia) return indice
    }
    return -1
  }

  for (const campo of CAMPOS) {
    const indice = buscar(campo, false)
    if (indice !== -1) {
      mapeo[campo] = indice
      usadas.add(indice)
    }
  }
  for (const campo of ORDEN_PARCIAL) {
    if (mapeo[campo] !== null) continue
    const indice = buscar(campo, true)
    if (indice !== -1) {
      mapeo[campo] = indice
      usadas.add(indice)
    }
  }
  return mapeo
}

/** Campos obligatorios que aún no tienen columna asignada. */
export function camposFaltantes(mapeo: MapeoColumnas): Campo[] {
  return CAMPOS_REQUERIDOS.filter((campo) => mapeo[campo] === null)
}

// --- Recordatorio de asignaciones (RF-02) ----------------------------------
// La asignación manual se guarda en localStorage para no volver a pedirla
// con el siguiente archivo que tenga los mismos encabezados.

const CLAVE_ALMACEN = 'auditoria.mapeo-columnas'
const LIMITE_FIRMAS = 20

/** Interfaz mínima de almacenamiento (permite probar sin navegador). */
export type Almacen = Pick<Storage, 'getItem' | 'setItem'>

function almacenPorDefecto(): Almacen | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Identifica un conjunto de encabezados, sin mayúsculas ni acentos. */
export function firmaDeEncabezados(encabezados: string[]): string {
  return encabezados.map(normalizar).join('§')
}

/** Guarda la asignación de columnas para estos encabezados (RF-02). */
export function guardarMapeo(
  encabezados: string[],
  mapeo: MapeoColumnas,
  almacen: Almacen | null = almacenPorDefecto(),
): void {
  if (!almacen) return
  const firma = firmaDeEncabezados(encabezados)
  let guardados: Record<string, MapeoColumnas> = {}
  try {
    guardados = JSON.parse(almacen.getItem(CLAVE_ALMACEN) ?? '{}')
  } catch {
    guardados = {}
  }
  guardados[firma] = mapeo
  // localStorage es pequeño: conservar solo las últimas asignaciones.
  const otras = Object.keys(guardados).filter((clave) => clave !== firma)
  while (otras.length >= LIMITE_FIRMAS) {
    delete guardados[otras.shift() as string]
  }
  almacen.setItem(CLAVE_ALMACEN, JSON.stringify(guardados))
}

/** Devuelve la asignación recordada para estos encabezados, si existe. */
export function cargarMapeoGuardado(
  encabezados: string[],
  almacen: Almacen | null = almacenPorDefecto(),
): MapeoColumnas | null {
  if (!almacen) return null
  try {
    const guardados: Record<string, MapeoColumnas> = JSON.parse(almacen.getItem(CLAVE_ALMACEN) ?? '{}')
    return guardados[firmaDeEncabezados(encabezados)] ?? null
  } catch {
    return null
  }
}

/**
 * Mapeo inicial para la pantalla de columnas: el recordado para estos
 * encabezados o, si nunca se asignó, el detectado automáticamente.
 */
export function mapeoInicial(encabezados: string[], almacen?: Almacen | null): MapeoColumnas {
  return cargarMapeoGuardado(encabezados, almacen) ?? detectarMapeo(encabezados)
}
