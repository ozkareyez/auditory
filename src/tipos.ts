// Tipos compartidos de la aplicación de auditoría de despachos por PLC.

/** Una hoja del archivo cargado; todas las celdas ya son texto recortado. */
export interface Hoja {
  nombre: string
  /** filas[i][j] es la celda de la fila i, columna j ('' si está vacía). */
  filas: string[][]
}

/** Archivo de despachos ya leído en el navegador, con todas sus hojas. */
export interface ArchivoDespachos {
  nombreArchivo: string
  hojas: Hoja[]
}

/** Campos que la app sabe interpretar en el archivo (RF-02). */
export type Campo =
  | 'plc'
  | 'factura'
  | 'referencia'
  | 'cantidad'
  | 'descripcion'
  | 'um'
  | 'peso'
  | 'ruta'
  | 'placa'
  | 'codigoBarras'

/** Asignación de cada campo a una columna (índice) del archivo; null = sin asignar. */
export interface MapeoColumnas {
  plc: number | null
  factura: number | null
  referencia: number | null
  cantidad: number | null
  descripcion: number | null
  um: number | null
  peso: number | null
  ruta: number | null
  placa: number | null
  codigoBarras: number | null
}

/** Línea de producto tal como viene en el archivo. */
export interface LineaDespacho {
  referencia: string
  descripcion: string
  cantidadEsperada: number
  /** Número de factura a la que pertenece la línea (columna opcional). */
  factura: string
  /** Unidad de medida de la línea: BTO, CJA, UND, PAC… (columna opcional). */
  um: string
  peso: string
  codigoBarras: string
}

/** Despacho: todas las filas del archivo que comparten un PLC. */
export interface Despacho {
  plc: string
  ruta: string
  placa: string
  lineas: LineaDespacho[]
}

/** Línea de despacho durante la auditoría, con el conteo del auditor. */
export interface LineaAuditoria extends LineaDespacho {
  cantidadVerificada: number
  /** true cuando el faltante de la línea quedó explicado como reversión. */
  reversion: boolean
}

export type EstadoLinea = 'pendiente' | 'completo' | 'diferencia'

/** Producto leído que no corresponde a ninguna línea del PLC (fase 2: escaneo). */
export interface Sobrante {
  codigo: string
  descripcion: string
  cantidad: number
}

/** Resultado de cruzar un código de barras leído contra las líneas de un despacho. */
export interface CruceCodigo {
  /** Líneas que coinciden; más de una significa que hay que elegir (caso borde del PRD). */
  coincidencias: LineaDespacho[]
  /** true si la coincidencia fue por referencia (últimos 6 dígitos), no por código exacto. */
  porReferencia: boolean
}

/** Resumen de una auditoría finalizada (RF-07). */
export interface ResumenAuditoria {
  estado: 'completo' | 'con_diferencias'
  totalLineas: number
  revisadas: number
  completas: number
  faltantes: LineaAuditoria[]
  /** Faltantes que el auditor marcó como reversión, separados del resto. */
  reversiones: LineaAuditoria[]
  excedentes: LineaAuditoria[]
  sobrantes: Sobrante[]
}
