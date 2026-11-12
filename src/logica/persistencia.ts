// Persistencia local: el archivo cargado y la sesión de auditoría se
// guardan en el navegador para que recargar la página no borre el trabajo.
// Se usan dos llaves separadas: el archivo (grande y casi inmutable) y la
// sesión (avance, auditorías terminadas y auditoría en curso).
import type { DatosCargados, LineaAuditoria } from '../tipos'
import type { AuditoriaTerminada } from './informe'

const CLAVE_ARCHIVO = 'auditoria.archivo.v1'
const CLAVE_SESION = 'auditoria.sesion.v1'
const VERSION = 1

/** Pantallas de una auditoría que se pueden retomar al recargar. */
export type PasoGuardado = 'confirmacion' | 'auditoria' | 'resumen'

export interface EnCursoGuardado {
  plc: string
  paso: PasoGuardado
  lineas: LineaAuditoria[] | null
}

export interface ArchivoGuardado {
  version: number
  nombreArchivo: string
  datos: DatosCargados
}

export interface SesionGuardada {
  version: number
  auditadas: string[]
  terminadas: (Omit<AuditoriaTerminada, 'fecha'> & { fecha: string })[]
  enCurso: EnCursoGuardado | null
}

function leer<T extends { version: number }>(clave: string): T | null {
  try {
    const texto = localStorage.getItem(clave)
    if (texto === null) return null
    const valor = JSON.parse(texto) as T
    if (valor === null || valor.version !== VERSION) return null
    return valor
  } catch {
    return null
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue en memoria.
  }
}

function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Almacenamiento bloqueado: no hay nada que borrar.
  }
}

export function cargarArchivo(): ArchivoGuardado | null {
  return leer<ArchivoGuardado>(CLAVE_ARCHIVO)
}

export function guardarArchivo(nombreArchivo: string, datos: DatosCargados): void {
  escribir(CLAVE_ARCHIVO, { version: VERSION, nombreArchivo, datos } satisfies ArchivoGuardado)
}

export function borrarArchivo(): void {
  borrar(CLAVE_ARCHIVO)
}

export function cargarSesion(): SesionGuardada | null {
  return leer<SesionGuardada>(CLAVE_SESION)
}

export function guardarSesion(
  auditadas: string[],
  terminadas: AuditoriaTerminada[],
  enCurso: EnCursoGuardado | null,
): void {
  escribir(CLAVE_SESION, {
    version: VERSION,
    auditadas,
    terminadas: terminadas.map(({ fecha, ...resto }) => ({ ...resto, fecha: fecha.toISOString() })),
    enCurso,
  } satisfies SesionGuardada)
}

export function borrarSesion(): void {
  borrar(CLAVE_SESION)
}
