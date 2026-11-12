import { describe, expect, it } from 'vitest'
import type { Despacho, Hoja, LineaDespacho } from '../tipos'
import {
  buscarPorPlc,
  buscarPorRuta,
  calcularTotales,
  consolidarLineas,
  construirDespachos,
  parsearCantidad,
  parsearPeso,
} from './despachos'
import { detectarMapeo } from './mapeoColumnas'

const ENCABEZADOS = [
  'PLC',
  'Factura',
  'Referencia',
  'Descripción',
  'UM',
  'Cantidad',
  'Peso',
  'Ruta',
  'Placa',
  'Código de barras',
]

/** Hoja de prueba con 2 despachos, una cantidad vacía y una fila sin PLC. */
function hojaDeEjemplo(): Hoja {
  return {
    nombre: 'Despachos',
    filas: [
      ENCABEZADOS,
      ['PLC90215', 'FE-4481201', '156350', 'CHUNKY ADULTO *14 Kg', 'BTO', '10', '25', 'Ruta Norte', 'ABC-123', '750123156350'],
      ['PLC90215', 'FE-4481202', '150208', 'CHUNKY GATOS PACK (20*500 g)', 'CJA', '4', '2', '', '', '750123150208'],
      ['PLC90216', 'FE-4481210', '158972', 'RECARGA BOMBONERA DELIDOG BONE *1 Kg', 'UND', '', '20', 'Ruta Sur', 'DEF-456', '750123158972'],
      // La factura repetida (con espacios de más) no debe contar dos veces.
      ['PLC90216', ' FE-4481210 ', '157528', 'MENU NAT POLLO CATS CAJA (6*200 g)', 'CJA', '2', '1.5', '', '', '750123157528'],
      ['', '', '100205', 'Fila sin PLC', '', '3', '1', '', '', ''],
    ],
  }
}

describe('construirDespachos', () => {
  it('agrupa las filas con el mismo PLC en un solo despacho', () => {
    const { despachos } = construirDespachos(hojaDeEjemplo(), detectarMapeo(ENCABEZADOS))
    expect(despachos).toHaveLength(2)
    const norte = despachos[0]
    expect(norte.plc).toBe('PLC90215')
    expect(norte.lineas).toHaveLength(2)
    // La ruta y la placa se toman de la primera fila que las traiga.
    expect(norte.ruta).toBe('Ruta Norte')
    expect(norte.placa).toBe('ABC-123')
    expect(norte.lineas[0].factura).toBe('FE-4481201')
    expect(norte.lineas[0].um).toBe('BTO')
  })

  it('trata la cantidad vacía como 0 y genera una advertencia', () => {
    const { despachos, advertencias } = construirDespachos(hojaDeEjemplo(), detectarMapeo(ENCABEZADOS))
    // La fila 4 del archivo (Cloro 2 L) tiene la cantidad vacía.
    expect(advertencias.some((aviso) => aviso.includes('Fila 4'))).toBe(true)
    expect(despachos[1].lineas[0].cantidadEsperada).toBe(0)
  })

  it('cuenta las filas sin PLC como ignoradas y lo avisa', () => {
    const { filasIgnoradas, advertencias } = construirDespachos(hojaDeEjemplo(), detectarMapeo(ENCABEZADOS))
    expect(filasIgnoradas).toBe(1)
    expect(advertencias.some((aviso) => aviso.includes('ignoradas'))).toBe(true)
  })
})

describe('consolidarLineas', () => {
  function linea(
    referencia: string,
    cantidad: number,
    um: string,
    factura: string,
    peso = '',
  ): LineaDespacho {
    return {
      referencia,
      descripcion: `Producto ${referencia}`,
      cantidadEsperada: cantidad,
      factura,
      um,
      peso,
      codigoBarras: '',
    }
  }

  it('suma las filas de la misma referencia y unidad de medida', () => {
    const consolidadas = consolidarLineas([
      linea('152342', 1, 'CJA', 'FEM-1'),
      linea('152342', 1, 'CJA', 'FEM-2'),
      linea('156408', 1, 'PAC', 'FEM-3'),
    ])
    expect(consolidadas).toHaveLength(2)
    expect(consolidadas[0].referencia).toBe('152342')
    expect(consolidadas[0].cantidadEsperada).toBe(2)
    expect(consolidadas[0].factura).toBe('') // la factura se resume aparte
  })

  it('separa la misma referencia cuando cambia la unidad de medida', () => {
    const consolidadas = consolidarLineas([
      linea('159979', 12, 'BOL', 'FEM-1'),
      linea('159979', 6, 'UND', 'FEM-2'),
    ])
    expect(consolidadas).toHaveLength(2)
  })

  it('suma los pesos de las filas consolidadas', () => {
    const consolidadas = consolidarLineas([
      linea('159979', 12, 'BOL', 'FEM-1', '0,94'),
      linea('159979', 6, 'BOL', 'FEM-2', '0,47'),
    ])
    expect(consolidadas).toHaveLength(1)
    expect(consolidadas[0].peso).toBe('1.41')
  })
})

describe('parsearCantidad', () => {
  it('acepta enteros y decimales con coma', () => {
    expect(parsearCantidad('10').cantidad).toBe(10)
    expect(parsearCantidad(' 2,5 ').cantidad).toBe(2)
    expect(parsearCantidad('4.0').cantidad).toBe(4)
    expect(parsearCantidad('3').advertencia).toBeNull()
  })

  it('trata vacío y texto como 0 con advertencia', () => {
    expect(parsearCantidad('')).toEqual({ cantidad: 0, advertencia: 'cantidad vacía' })
    expect(parsearCantidad('abc').cantidad).toBe(0)
    expect(parsearCantidad('abc').advertencia).toContain('no válida')
    expect(parsearCantidad('-3').advertencia).toContain('no válida')
  })
})

describe('parsearPeso', () => {
  it('acepta enteros, decimales con coma y unidades al final', () => {
    expect(parsearPeso('25')).toBe(25)
    expect(parsearPeso('6,5')).toBe(6.5)
    expect(parsearPeso('6.5 kg')).toBe(6.5)
    expect(parsearPeso(' 0.85 ')).toBe(0.85)
  })

  it('devuelve null cuando el peso no se puede interpretar', () => {
    expect(parsearPeso('')).toBeNull()
    expect(parsearPeso('n/d')).toBeNull()
    expect(parsearPeso('-2')).toBeNull()
    expect(parsearPeso('25-30')).toBeNull()
  })
})

describe('calcularTotales (control contra el impreso)', () => {
  const { despachos } = construirDespachos(hojaDeEjemplo(), detectarMapeo(ENCABEZADOS))

  it('suma unidades y pesos, y cuenta las facturas distintas', () => {
    const norte = calcularTotales(despachos[0])
    expect(norte.facturas).toBe(2)
    expect(norte.unidades).toBe(14)
    expect(norte.peso).toBe(27)
    expect(norte.lineasSinPeso).toBe(0)
    const sur = calcularTotales(despachos[1])
    expect(sur.facturas).toBe(1)
    expect(sur.unidades).toBe(2)
    expect(sur.peso).toBe(21.5)
  })

  it('devuelve facturas y peso en null cuando el archivo no los trae', () => {
    const despacho: Despacho = {
      plc: 'PLC99999',
      ruta: '',
      placa: '',
      lineas: [
        { referencia: '156350', descripcion: 'A', cantidadEsperada: 1, factura: '', um: '', peso: '', codigoBarras: '' },
      ],
    }
    const totales = calcularTotales(despacho)
    expect(totales.facturas).toBeNull()
    expect(totales.peso).toBeNull()
    expect(totales.unidades).toBe(1)
  })

  it('cuenta las líneas con peso ilegible', () => {
    const despacho: Despacho = {
      plc: 'PLC99999',
      ruta: '',
      placa: '',
      lineas: [
        { referencia: '156350', descripcion: 'A', cantidadEsperada: 1, factura: 'FE-1', um: 'BTO', peso: 'n/d', codigoBarras: '' },
      ],
    }
    expect(calcularTotales(despacho).lineasSinPeso).toBe(1)
  })
})

describe('búsqueda de despacho (RF-03)', () => {
  const { despachos } = construirDespachos(hojaDeEjemplo(), detectarMapeo(ENCABEZADOS))

  it('encuentra por PLC exacto ignorando mayúsculas y espacios', () => {
    expect(buscarPorPlc(despachos, '  plc90215 ')?.plc).toBe('PLC90215')
  })

  it('encuentra el PLC con formato de planilla aunque cambie el guion', () => {
    const planillas: Despacho[] = [{ plc: 'PLC-00009501', ruta: '', placa: '', lineas: [] }]
    expect(buscarPorPlc(planillas, 'PLC-00009501')?.plc).toBe('PLC-00009501')
    expect(buscarPorPlc(planillas, 'PLC00009501')?.plc).toBe('PLC-00009501')
    expect(buscarPorPlc(planillas, 'plc 00009501')?.plc).toBe('PLC-00009501')
  })

  it('no encuentra PLC inexistentes ni consultas vacías', () => {
    expect(buscarPorPlc(despachos, 'PLC99999')).toBeUndefined()
    expect(buscarPorPlc(despachos, '   ')).toBeUndefined()
  })

  it('encuentra por ruta con coincidencia parcial', () => {
    expect(buscarPorRuta(despachos, 'sur')).toHaveLength(1)
    expect(buscarPorRuta(despachos, 'RUTA NORTE')).toHaveLength(1)
    expect(buscarPorRuta(despachos, 'occidente')).toHaveLength(0)
  })
})
