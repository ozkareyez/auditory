import { describe, expect, it } from 'vitest'
import type { Despacho, LineaAuditoria } from '../tipos'
import { calcularResumen, crearAuditoria, diferenciaDeLinea, estadoDeLinea } from './auditoria'

/** Línea de auditoria de prueba con las cantidades indicadas. */
function linea(verificada: number, esperada: number): LineaAuditoria {
  return {
    referencia: '100201',
    descripcion: 'Producto de prueba',
    cantidadEsperada: esperada,
    factura: 'FE-1',
    um: 'UND',
    peso: '1',
    codigoBarras: '750100100201',
    cantidadVerificada: verificada,
    reversion: false,
  }
}

describe('crearAuditoria', () => {
  it('empieza con las cantidades verificadas en 0', () => {
    const despacho: Despacho = {
      plc: 'PLC90215',
      ruta: 'Ruta Norte',
      placa: 'ABC-123',
      lineas: [
        { referencia: '100201', descripcion: 'A', cantidadEsperada: 10, factura: 'FE-1', um: 'UND', peso: '1', codigoBarras: '750100100201' },
        { referencia: '100202', descripcion: 'B', cantidadEsperada: 4, factura: 'FE-1', um: 'UND', peso: '2', codigoBarras: '750100100202' },
      ],
    }
    const lineas = crearAuditoria(despacho)
    expect(lineas).toHaveLength(2)
    expect(lineas.every((unaLinea) => unaLinea.cantidadVerificada === 0)).toBe(true)
    expect(lineas.every((unaLinea) => unaLinea.reversion === false)).toBe(true)
  })
})

describe('estadoDeLinea', () => {
  it('clasifica pendiente, completo y diferencia', () => {
    expect(estadoDeLinea(linea(0, 10))).toBe('pendiente')
    expect(estadoDeLinea(linea(10, 10))).toBe('completo')
    expect(estadoDeLinea(linea(8, 10))).toBe('diferencia')
    expect(estadoDeLinea(linea(12, 10))).toBe('diferencia')
    // Una línea esperada en 0 está completa de entrada.
    expect(estadoDeLinea(linea(0, 0))).toBe('completo')
  })
})

describe('diferenciaDeLinea', () => {
  it('devuelve las unidades que faltan (o que sobran, en negativo)', () => {
    expect(diferenciaDeLinea(linea(8, 10))).toBe(2)
    expect(diferenciaDeLinea(linea(6, 4))).toBe(-2)
  })
})

describe('calcularResumen (RF-07)', () => {
  it('marca completo cuando todas las líneas coinciden (criterio 3)', () => {
    const resumen = calcularResumen([linea(10, 10), linea(4, 4)])
    expect(resumen.estado).toBe('completo')
    expect(resumen.faltantes).toHaveLength(0)
    expect(resumen.completas).toBe(2)
    expect(resumen.revisadas).toBe(2)
  })

  it('marca faltante de 2 y estado con diferencias (criterio 4)', () => {
    const resumen = calcularResumen([linea(10, 10), linea(8, 10)])
    expect(resumen.estado).toBe('con_diferencias')
    expect(resumen.faltantes).toHaveLength(1)
    expect(resumen.faltantes[0].cantidadEsperada).toBe(10)
    expect(resumen.faltantes[0].cantidadVerificada).toBe(8)
  })

  it('cuenta las líneas sin revisar como faltantes al finalizar', () => {
    const resumen = calcularResumen([linea(0, 10)])
    expect(resumen.revisadas).toBe(0)
    expect(resumen.faltantes).toHaveLength(1)
  })

  it('separa las líneas con excedente', () => {
    const resumen = calcularResumen([linea(6, 4)])
    expect(resumen.excedentes).toHaveLength(1)
    expect(resumen.estado).toBe('con_diferencias')
  })

  it('separa los faltantes marcados como reversión', () => {
    const resumen = calcularResumen([linea(10, 10), { ...linea(8, 10), reversion: true }, linea(6, 10)])
    expect(resumen.faltantes).toHaveLength(1)
    expect(resumen.faltantes[0].cantidadVerificada).toBe(6)
    expect(resumen.reversiones).toHaveLength(1)
    expect(resumen.reversiones[0].cantidadVerificada).toBe(8)
    expect(resumen.estado).toBe('con_diferencias')
  })

  it('un despacho solo con reversiones no queda como completo', () => {
    const resumen = calcularResumen([{ ...linea(8, 10), reversion: true }])
    expect(resumen.faltantes).toHaveLength(0)
    expect(resumen.reversiones).toHaveLength(1)
    expect(resumen.estado).toBe('con_diferencias')
  })

  it('una reversión total (nada entregado) es una línea decidida', () => {
    const total = { ...linea(0, 10), reversion: true }
    expect(estadoDeLinea(total)).toBe('diferencia')
    const resumen = calcularResumen([total])
    expect(resumen.reversiones).toHaveLength(1)
    expect(resumen.reversiones).toHaveLength(1)
    expect(resumen.reversiones[0].cantidadVerificada).toBe(0)
    expect(resumen.revisadas).toBe(1)
  })
})
