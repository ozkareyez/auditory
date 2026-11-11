import type { WorkBook } from 'xlsx'
import type { ArchivoDespachos, Hoja } from '../tipos'

const EXTENSIONES_ACEPTADAS = ['.xlsx', '.csv']

/**
 * Lee un archivo .xlsx o .csv completamente en el navegador, sin enviarlo
 * a ningún servidor (RF-01), y devuelve todas sus hojas como tablas de
 * texto. Cada celda queda como texto recortado para simplificar el resto
 * de la app.
 */
export async function leerArchivo(archivo: File): Promise<ArchivoDespachos> {
  const nombreEnMinusculas = archivo.name.toLowerCase()
  if (!EXTENSIONES_ACEPTADAS.some((extension) => nombreEnMinusculas.endsWith(extension))) {
    throw new Error(`Formato no soportado: "${archivo.name}". Usa un archivo .xlsx o .csv.`)
  }

  // SheetJS (unos 600 kB) solo se descarga cuando se elige un archivo.
  const XLSX = await import('xlsx')

  // Los CSV se leen como texto UTF-8 (SheetJS detecta el separador); los
  // Excel se leen como binario.
  let libro: WorkBook
  if (nombreEnMinusculas.endsWith('.csv')) {
    const texto = await archivo.text()
    libro = XLSX.read(texto, { type: 'string' })
  } else {
    const datos = await archivo.arrayBuffer()
    libro = XLSX.read(datos, { type: 'array' })
  }

  const hojas: Hoja[] = libro.SheetNames.map((nombre) => {
    const hoja = libro.Sheets[nombre]
    // header: 1 devuelve la hoja como matriz; raw: false usa el texto
    // formateado de cada celda (p. ej. "10" en lugar de 10).
    const celdas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
      header: 1,
      blankrows: false,
      raw: false,
    })
    return {
      nombre,
      filas: celdas.map((fila) => fila.map((celda) => String(celda ?? '').trim())),
    }
  })

  if (hojas.length === 0) {
    throw new Error('El archivo no contiene hojas con datos.')
  }
  return { nombreArchivo: archivo.name, hojas }
}
