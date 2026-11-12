import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatosCargados } from '../tipos'
import type { AuditoriaTerminada } from './informe'
import { cargarArchivo, cargarSesion, guardarArchivo, guardarSesion } from './persistencia'

/** Almacenamiento en memoria para probar sin navegador. */
function almacenEnMemoria() {
  const valores = new Map<string, string>()
  return {
    getItem: (clave: string) => valores.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      valores.set(clave, valor)
    },
    removeItem: (clave: string) => {
      valores.delete(clave)
    },
    clear: () => valores.clear(),
    key: (indice: number) => [...valores.keys()][indice] ?? null,
    get length() {
      return valores.size
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', almacenEnMemoria())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('persistencia local', () => {
  it('guarda y recupera el archivo cargado', () => {
    const datos: DatosCargados = { despachos: [], advertencias: ['un aviso'] }
    guardarArchivo('despachos.xlsx', datos)
    expect(cargarArchivo()).toMatchObject({ nombreArchivo: 'despachos.xlsx', datos })
  })

  it('guarda y recupera la sesión con la auditoría en curso', () => {
    const terminada: AuditoriaTerminada = {
      plc: 'PLC-00009501',
      ruta: 'Ruta Norte',
      placa: 'ABC-123',
      fecha: new Date(2026, 10, 11, 9, 12),
      facturas: 2,
      lineas: [],
    }
    guardarSesion(['plc00009501'], [terminada], {
      plc: 'PLC-00009501',
      paso: 'auditoria',
      lineas: [],
    })
    const sesion = cargarSesion()
    expect(sesion?.auditadas).toEqual(['plc00009501'])
    expect(sesion?.terminadas[0].fecha).toBe(terminada.fecha.toISOString())
    expect(sesion?.enCurso?.plc).toBe('PLC-00009501')
    expect(sesion?.enCurso?.paso).toBe('auditoria')
  })

  it('devuelve null cuando no hay nada guardado', () => {
    expect(cargarArchivo()).toBeNull()
    expect(cargarSesion()).toBeNull()
  })
})
