import { describe, expect, it } from 'vitest'
import type { Almacen } from './mapeoColumnas'
import {
  camposFaltantes,
  cargarMapeoGuardado,
  detectarMapeo,
  guardarMapeo,
  mapeoInicial,
} from './mapeoColumnas'

const ENCABEZADOS = [
  'PLC',
  'Factura',
  'Referencia',
  'Cantidad',
  'Descripción',
  'UM',
  'Peso',
  'Ruta',
  'Placa',
  'Código de barras',
]

/** Almacén falso en memoria para probar el recordatorio de asignaciones. */
function almacenFalso(): Almacen {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  }
}

describe('detectarMapeo', () => {
  it('detecta las columnas estándar', () => {
    const mapeo = detectarMapeo(ENCABEZADOS)
    expect(mapeo.plc).toBe(0)
    expect(mapeo.factura).toBe(1)
    expect(mapeo.referencia).toBe(2)
    expect(mapeo.cantidad).toBe(3)
    expect(mapeo.descripcion).toBe(4)
    expect(mapeo.um).toBe(5)
    expect(mapeo.peso).toBe(6)
    expect(mapeo.ruta).toBe(7)
    expect(mapeo.placa).toBe(8)
    expect(mapeo.codigoBarras).toBe(9)
  })

  it('reconoce variantes de factura y de unidad de medida', () => {
    const conFactura = detectarMapeo(['Nro. Factura', 'PLC', 'Referencia', 'Descripción', 'Cantidad'])
    expect(conFactura.factura).toBe(0)
    const conUm = detectarMapeo(['PLC', 'Referencia', 'Descripción', 'Cantidad', 'Unidad Medida'])
    expect(conUm.um).toBe(4)
    const conUmCorta = detectarMapeo(['PLC', 'Referencia', 'Descripción', 'Cantidad', 'UM'])
    expect(conUmCorta.um).toBe(4)
  })

  it('detecta el encabezado real del documento de despachos', () => {
    const mapeo = detectarMapeo([
      'Desc. item',
      'Referencia',
      'U.M.',
      'Cantidad emp.',
      'U.M. inv.',
      'Peso',
      'Nro documento planilla',
      'Nro documento',
      'Razón social cliente factura',
      'Notas transportador',
      'Placa',
      'Conductor',
      'Transportadora',
      'Ruta',
      'Tipo de Ruta',
    ])
    expect(mapeo.descripcion).toBe(0)
    expect(mapeo.referencia).toBe(1)
    expect(mapeo.um).toBe(2)
    expect(mapeo.cantidad).toBe(3)
    expect(mapeo.peso).toBe(5)
    expect(mapeo.plc).toBe(6)
    expect(mapeo.factura).toBe(7)
    expect(mapeo.placa).toBe(10)
    expect(mapeo.ruta).toBe(13)
    // El archivo real no trae código de barras, ni cliente ni conductor.
    expect(mapeo.codigoBarras).toBeNull()
  })

  it('ignora mayúsculas, acentos y espacios de más', () => {
    const mapeo = detectarMapeo([' plc ', 'REFERENCIA', 'Cantidad', 'Producto'])
    expect(mapeo.plc).toBe(0)
    expect(mapeo.referencia).toBe(1)
    expect(mapeo.cantidad).toBe(2)
    expect(mapeo.descripcion).toBe(3)
  })

  it('reconoce variantes con coincidencia parcial', () => {
    const mapeo = detectarMapeo(['No. PLC', 'Ref.', 'Cantidad despachada', 'Descripción del producto'])
    expect(mapeo.plc).toBe(0)
    expect(mapeo.referencia).toBe(1)
    expect(mapeo.cantidad).toBe(2)
    expect(mapeo.descripcion).toBe(3)
  })

  it('no asigna "Código de barras" a Referencia', () => {
    const mapeo = detectarMapeo(['Código', 'Código de barras'])
    expect(mapeo.referencia).toBe(0)
    expect(mapeo.codigoBarras).toBe(1)
  })

  it('no reparte una misma columna en dos campos', () => {
    const mapeo = detectarMapeo(['Cantidad', 'Cantidad despachada', 'PLC', 'Referencia', 'Descripción'])
    expect(mapeo.cantidad).toBe(0)
    expect(mapeo.plc).toBe(2)
    expect(mapeo.referencia).toBe(3)
    expect(mapeo.descripcion).toBe(4)
    expect(mapeo.peso).toBeNull()
  })

  it('detecta las columnas obligatorias que faltan', () => {
    const mapeo = detectarMapeo(['PLC', 'Otra columna'])
    expect(camposFaltantes(mapeo)).toEqual(['referencia', 'cantidad', 'descripcion'])
  })
})

describe('recordatorio de asignaciones', () => {
  it('guarda y recupera el mapeo para los mismos encabezados', () => {
    const almacen = almacenFalso()
    const mapeo = detectarMapeo(ENCABEZADOS)
    guardarMapeo(ENCABEZADOS, { ...mapeo, referencia: 5 }, almacen)
    expect(cargarMapeoGuardado(ENCABEZADOS, almacen)?.referencia).toBe(5)
  })

  it('reconoce encabezados iguales aunque cambien mayúsculas y acentos', () => {
    const almacen = almacenFalso()
    const mapeo = detectarMapeo(ENCABEZADOS)
    guardarMapeo(ENCABEZADOS, mapeo, almacen)
    const variante = ENCABEZADOS.map((encabezado) => ` ${encabezado.toLowerCase()} `)
    expect(cargarMapeoGuardado(variante, almacen)).toEqual(mapeo)
  })

  it('no usa la asignación de otros encabezados', () => {
    const almacen = almacenFalso()
    guardarMapeo(ENCABEZADOS, detectarMapeo(ENCABEZADOS), almacen)
    expect(cargarMapeoGuardado(['A', 'B', 'C'], almacen)).toBeNull()
  })

  it('el mapeo inicial prefiere el guardado; si no hay, detecta', () => {
    const almacen = almacenFalso()
    expect(mapeoInicial(ENCABEZADOS, almacen).descripcion).toBe(4)
    guardarMapeo(ENCABEZADOS, { ...detectarMapeo(ENCABEZADOS), descripcion: 0 }, almacen)
    expect(mapeoInicial(ENCABEZADOS, almacen).descripcion).toBe(0)
  })
})
