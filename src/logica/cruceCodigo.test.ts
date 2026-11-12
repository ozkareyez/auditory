import { describe, expect, it } from 'vitest'
import type { LineaDespacho } from '../tipos'
import { coincideBusquedaManual, cruzarCodigo, destinoEscaneo, referenciaDesdeCodigo } from './cruceCodigo'

const lineas: LineaDespacho[] = [
  {
    referencia: '100201',
    descripcion: 'Paño de cocina microfibra',
    cantidadEsperada: 10,
    factura: 'FE-1',
    um: 'UND',
    peso: '25',
    codigoBarras: '750100100201',
  },
  {
    referencia: '100202',
    descripcion: 'Jabón rey 400 g',
    cantidadEsperada: 4,
    factura: 'FE-1',
    um: 'UND',
    peso: '2',
    codigoBarras: '750100100202',
  },
  {
    referencia: '100203',
    descripcion: 'Caja de paños de cocina',
    cantidadEsperada: 2,
    factura: 'FE-2',
    um: 'CJA',
    peso: '10',
    codigoBarras: '750100100203',
  },
]

describe('referenciaDesdeCodigo', () => {
  it('toma los últimos 6 dígitos del código', () => {
    expect(referenciaDesdeCodigo('750100100201')).toBe('100201')
  })

  it('ignora caracteres que no son dígitos', () => {
    expect(referenciaDesdeCodigo('750-100 100201')).toBe('100201')
  })
})

describe('cruzarCodigo (RF-05)', () => {
  it('cruza por coincidencia exacta del código de barras', () => {
    const cruce = cruzarCodigo(lineas, '750100100202')
    expect(cruce.coincidencias).toHaveLength(1)
    expect(cruce.coincidencias[0].referencia).toBe('100202')
    expect(cruce.porReferencia).toBe(false)
  })

  it('cruza por referencia (últimos 6 dígitos) aunque el código completo sea distinto', () => {
    const cruce = cruzarCodigo(lineas, '440999100201')
    expect(cruce.coincidencias).toHaveLength(1)
    expect(cruce.coincidencias[0].referencia).toBe('100201')
    expect(cruce.porReferencia).toBe(true)
  })

  it('devuelve varias coincidencias si dos líneas comparten referencia', () => {
    const repetidas: LineaDespacho[] = [
      lineas[0],
      { ...lineas[0], descripcion: 'Paño de cocina (segunda línea)' },
    ]
    const cruce = cruzarCodigo(repetidas, '750100100201')
    expect(cruce.coincidencias).toHaveLength(2)
  })

  it('devuelve vacío cuando el código no corresponde a ninguna línea (sobrante)', () => {
    const cruce = cruzarCodigo(lineas, '750100999999')
    expect(cruce.coincidencias).toHaveLength(0)
    expect(cruce.porReferencia).toBe(false)
  })

  it('tolera ceros a la izquierda y prefijos en la referencia del archivo', () => {
    const conPrefijo: LineaDespacho[] = [
      { ...lineas[0], referencia: 'REF-100201' },
      { ...lineas[1], referencia: '0100202' },
    ]
    expect(cruzarCodigo(conPrefijo, '750100100201').coincidencias).toHaveLength(1)
    expect(cruzarCodigo(conPrefijo, '750100100202').coincidencias).toHaveLength(1)
  })
})

describe('destinoEscaneo (escáner con cámara)', () => {
  it('devuelve la línea única para sumarle 1 al conteo', () => {
    expect(destinoEscaneo(lineas, '750100100202')).toEqual({ tipo: 'unica', indice: 1 })
  })

  it('indica varias cuando el código casa con más de una línea', () => {
    const repetidas: LineaDespacho[] = [
      lineas[0],
      { ...lineas[0], descripcion: 'Paño de cocina (segunda línea)' },
    ]
    expect(destinoEscaneo(repetidas, '750100100201')).toEqual({
      tipo: 'multiple',
      coincidencias: 2,
    })
  })

  it('indica ninguna cuando el código no pertenece al despacho', () => {
    expect(destinoEscaneo(lineas, '750100999999')).toEqual({ tipo: 'ninguna' })
  })
})

describe('coincideBusquedaManual (RF-06)', () => {
  it('filtra por descripción mientras se escribe, sin importar acentos', () => {
    expect(coincideBusquedaManual(lineas[1], 'jabón')).toBe(true)
    expect(coincideBusquedaManual(lineas[1], 'JABON')).toBe(true)
    expect(coincideBusquedaManual(lineas[0], 'jabón')).toBe(false)
  })

  it('filtra por referencia o por el código de barras completo', () => {
    expect(coincideBusquedaManual(lineas[0], '100201')).toBe(true)
    expect(coincideBusquedaManual(lineas[0], '750100100201')).toBe(true)
    expect(coincideBusquedaManual(lineas[0], '999999')).toBe(false)
  })

  it('encuentra la línea al escanear un código cuyo prefijo cambia', () => {
    // El lector manda el código completo; la referencia son sus últimos 6 dígitos.
    expect(coincideBusquedaManual(lineas[0], '440999100201')).toBe(true)
    expect(coincideBusquedaManual(lineas[1], '440999100201')).toBe(false)
  })

  it('filtra por unidad de medida aunque se escriba en plural', () => {
    expect(coincideBusquedaManual(lineas[2], 'cajas')).toBe(true)
    expect(coincideBusquedaManual(lineas[2], 'CJA')).toBe(true)
    expect(coincideBusquedaManual(lineas[0], 'cajas')).toBe(false)
  })

  it('filtra por el nombre completo de la unidad de medida', () => {
    expect(coincideBusquedaManual(lineas[0], 'unidades')).toBe(true)
    expect(coincideBusquedaManual(lineas[0], 'UND')).toBe(true)
  })

  it('deja pasar todo cuando la consulta está vacía', () => {
    expect(coincideBusquedaManual(lineas[0], '  ')).toBe(true)
  })
})
