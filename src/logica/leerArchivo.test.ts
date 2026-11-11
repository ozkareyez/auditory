import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { leerArchivo } from './leerArchivo'

const ENCABEZADOS = [
  'PLC',
  'Referencia',
  'Cantidad',
  'Descripción',
  'Peso',
  'Ruta',
  'Placa',
  'Código de barras',
]

const CSV = [
  ENCABEZADOS.join(','),
  'PLC90215,100201,10,Paño de cocina microfibra,25,Ruta Norte,ABC-123,750100100201',
  'PLC90216,100203,8,Cloro 2 L,20,Ruta Sur,DEF-456,750100100203',
].join('\n')

describe('leerArchivo (RF-01)', () => {
  it('lee un CSV y devuelve sus hojas como texto', async () => {
    const archivo = new File([CSV], 'despachos.csv', { type: 'text/csv' })
    const leido = await leerArchivo(archivo)
    expect(leido.nombreArchivo).toBe('despachos.csv')
    expect(leido.hojas).toHaveLength(1)
    const filas = leido.hojas[0].filas
    expect(filas[0]).toEqual(ENCABEZADOS)
    expect(filas[1][0]).toBe('PLC90215')
    expect(filas[1][3]).toBe('Paño de cocina microfibra')
  })

  it('lee un XLSX generado en memoria y respeta el nombre de la hoja', async () => {
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet([
        ENCABEZADOS,
        ['PLC90215', '100201', '10', 'Paño de cocina', '25', 'Ruta Norte', 'ABC-123', '750100100201'],
      ]),
      'Despachos',
    )
    const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
    const archivo = new File([datos], 'despachos.xlsx')
    const leido = await leerArchivo(archivo)
    expect(leido.hojas[0].nombre).toBe('Despachos')
    expect(leido.hojas[0].filas[1][2]).toBe('10')
  })

  it('rechaza formatos no soportados con un mensaje claro', async () => {
    const archivo = new File(['contenido'], 'despachos.pdf')
    await expect(leerArchivo(archivo)).rejects.toThrow(/no soportado/)
  })

  it('avisa cuando el archivo no tiene hojas con datos', async () => {
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([[]]), 'Vacía')
    const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
    const archivo = new File([datos], 'vacio.xlsx')
    const leido = await leerArchivo(archivo)
    expect(leido.hojas[0].filas).toHaveLength(0)
  })
})
