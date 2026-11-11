import { describe, expect, it } from 'vitest'
import type { LineaAuditoria } from '../tipos'
import { tablasInforme, type AuditoriaTerminada } from './informe'

function linea(verificada: number, esperada: number, reversion = false): LineaAuditoria {
  return {
    referencia: '156350',
    descripcion: 'Producto de prueba',
    cantidadEsperada: esperada,
    factura: 'FEM-00181781',
    um: 'BTO',
    peso: '0,47',
    codigoBarras: '',
    cantidadVerificada: verificada,
    reversion,
  }
}

function auditoria(plc: string, lineas: LineaAuditoria[]): AuditoriaTerminada {
  return {
    plc,
    ruta: 'ALAMOS - ALTO MENGA',
    placa: 'SPN860',
    fecha: new Date(2026, 10, 11, 9, 12),
    lineas,
  }
}

describe('tablasInforme', () => {
  it('arma una fila por auditoría con estado, unidades y reversión', () => {
    const { resumen } = tablasInforme([
      auditoria('PLC-00009496', [linea(10, 10), linea(8, 10, true), linea(6, 10)]),
      auditoria('PLC-00009501', [linea(4, 4)]),
    ])
    expect(resumen).toHaveLength(3) // encabezado + una fila por auditoría
    const conDiferencias = resumen[1]
    expect(conDiferencias[0]).toBe('PLC-00009496')
    expect(conDiferencias[2]).toBe('ALAMOS - ALTO MENGA')
    expect(conDiferencias[4]).toBe('Con diferencias')
    expect(conDiferencias[5]).toBe(3) // líneas
    expect(conDiferencias[6]).toBe(1) // completas
    expect(conDiferencias[7]).toBe(1) // con faltante
    expect(conDiferencias[9]).toBe(30) // unidades esperadas
    expect(conDiferencias[10]).toBe(24) // unidades verificadas
    expect(conDiferencias[11]).toBe(6) // unidades faltantes
    expect(conDiferencias[12]).toBe('Sí')
    expect(conDiferencias[13]).toBe(2) // unidades en reversión
    const completa = resumen[2]
    expect(completa[4]).toBe('Completo')
    expect(completa[12]).toBe('No')
    expect(completa[13]).toBe(0)
  })

  it('lista en el detalle todos los productos de cada PLC', () => {
    const { detalle } = tablasInforme([
      auditoria('PLC-00009496', [
        linea(10, 10),
        linea(8, 10, true),
        linea(6, 10),
        linea(12, 10),
        linea(0, 4, true),
      ]),
    ])
    expect(detalle).toHaveLength(6) // encabezado + una fila por producto
    // Columnas: PLC, Fecha y hora, Placa, Referencia, Descripción, UM,
    // Factura, Peso, Esperado, Despachado, Diferencia, En reversión,
    // Reversión total.
    expect(detalle[1][1]).toBe('2026-11-11 09:12') // fecha y hora de la auditoría
    expect(detalle[1][2]).toBe('SPN860') // placa del vehículo
    expect(detalle[1][9]).toBe(10) // despachado
    expect(detalle[1][10]).toBe(0)
    expect(detalle[1][11]).toBe(0)
    expect(detalle[2][6]).toBe('FEM-00181781') // factura
    expect(detalle[2][9]).toBe(8)
    expect(detalle[2][10]).toBe(2)
    expect(detalle[2][11]).toBe(2) // unidades en reversión
    expect(detalle[2][12]).toBe('No') // reversión parcial
    expect(detalle[3][10]).toBe(4) // faltante
    expect(detalle[3][11]).toBe(0)
    expect(detalle[4][10]).toBe(-2) // excedente: diferencia negativa
    expect(detalle[5][9]).toBe(0) // nada despachado
    expect(detalle[5][11]).toBe(4)
    expect(detalle[5][12]).toBe('Sí') // reversión total
  })
})
