// Genera los archivos de ejemplo para probar la app en public/ejemplo/:
// un CSV y un XLSX con la estructura del documento real de despachos
// (planillas por cliente-factura) y 3 PLCs: uno para demostrar auditoría
// completa, otro con cantidad vacía (advertencia) y otro grande.
//
// El documento real no trae columna de código de barras: al escanear, la
// app cruza los últimos 6 dígitos del código contra la Referencia.
// Uso: node scripts/generar-ejemplo.mjs
import * as XLSX from 'xlsx'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const carpeta = join(aqui, '..', 'public', 'ejemplo')

const ENCABEZADOS = [
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
]

/** Construye una fila con el orden real de las columnas del documento. */
function fila(item, referencia, um, cantidad, peso, planilla, factura, cliente, placa, conductor, ruta, tipo) {
  return [
    item,
    referencia,
    um,
    cantidad,
    'KIL',
    peso,
    planilla,
    factura,
    cliente,
    `${placa} - ${conductor} - INNOVALOG - ${ruta} - ${tipo}`,
    placa,
    conductor,
    'INNOVALOG',
    ruta,
    tipo,
  ]
}

const filas = [
  // PLC-00009501 — SPN860, IVAN ESCOBAR: 3 líneas de 3 facturas distintas
  // (un despacho pequeño para la demo de auditoría completa).
  fila('7 VIDAS CREM SAB DE TIERRA CAJA 6*(6*13)', '152342', 'CJA', '1,00', '0,47', 'PLC-00009501', 'FEM-00181781', 'MURILLO  ENITH', 'SPN860', 'IVAN ESCOBAR', 'ALAMOS - ALTO MENGA', 'URBANO'),
  fila('7 VIDAS CREM SAB DE TIERRA CAJA 6*(6*13)', '152342', 'CJA', '1,00', '0,47', 'PLC-00009501', 'FEM-00181797', 'CASTRO CHAUX MARIAM CRISTINA', 'SPN860', 'IVAN ESCOBAR', 'ALAMOS - ALTO MENGA', 'URBANO'),
  fila('7 VIDAS SABORES DE LA TIERRA 3*1.3Kg', '156408', 'PAC', '1,00', '3,90', 'PLC-00009501', 'FEM-00181777', 'CARDONA  JOSE ALBERTO', 'SPN860', 'IVAN ESCOBAR', 'ALAMOS - ALTO MENGA', 'URBANO'),
  // PLC-00009496 — GVS671, ROGER LOPEZ: para demostrar faltantes contando
  // de menos; una fila trae la cantidad vacía para probar la advertencia.
  fila('7 VIDAS CREMOSO SABORES DE TIERRA 6*13g', '159979', 'BOL', '12,00', '0,94', 'PLC-00009496', 'FEM-00181749', 'SURTIFAMILIAR S.A.', 'GVS671', 'ROGER LOPEZ', 'SURTIFAMILIAR SUR', 'URBANO'),
  fila('7 VIDAS CREMOSO SABORES DE TIERRA 6*13g', '159979', 'BOL', '6,00', '0,47', 'PLC-00009496', 'FEM-00181752', 'SURTIFAMILIAR S.A.', 'GVS671', 'ROGER LOPEZ', 'SURTIFAMILIAR SUR', 'URBANO'),
  fila('7 VIDAS SABORES DE LA TIERRA*1.3Kg', '156404', 'UND', '6,00', '7,80', 'PLC-00009496', 'FEM-00181749', 'SURTIFAMILIAR S.A.', 'GVS671', 'ROGER LOPEZ', 'SURTIFAMILIAR SUR', 'URBANO'),
  fila('7 VIDAS SABORES DE LA TIERRA*1.3Kg', '156404', 'UND', '', '7,80', 'PLC-00009496', 'FEM-00181752', 'SURTIFAMILIAR S.A.', 'GVS671', 'ROGER LOPEZ', 'SURTIFAMILIAR SUR', 'URBANO'),
  fila('7 VIDAS SABORES DEL MAR *1.3Kg', '151836', 'UND', '6,00', '7,80', 'PLC-00009496', 'FEM-00181749', 'SURTIFAMILIAR S.A.', 'GVS671', 'ROGER LOPEZ', 'SURTIFAMILIAR SUR', 'URBANO'),
  // PLC-00009500 — ESZ484, LUIS CERON: despacho grande de 3 facturas.
  fila('7 VIDAS CREMOSO SABORES DE TIERRA 6*13g', '159979', 'BOL', '12,00', '0,94', 'PLC-00009500', 'FEM-00181764', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
  fila('7 VIDAS SABORES DE LA TIERRA*1.3Kg', '156404', 'UND', '24,00', '31,20', 'PLC-00009500', 'FEM-00181764', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
  fila('7 VIDAS SABORES DEL MAR*500g', '153618', 'UND', '20,00', '10,00', 'PLC-00009500', 'FEM-00181764', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
  fila('7 VIDAS TROZOS SABORES DE LA TIERRA*75g', '158965', 'UND', '48,00', '3,60', 'PLC-00009500', 'FEM-00181763', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
  fila('7 VIDAS TROZOS SABORES DE LA TIERRA*75g', '158965', 'UND', '12,00', '0,90', 'PLC-00009500', 'FEM-00181764', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
  fila('7 VIDAS TROZOS SABORES DE LA TIERRA*75g', '158965', 'UND', '12,00', '0,90', 'PLC-00009500', 'FEM-00181766', 'ALMACENES EXITO S A', 'ESZ484', 'LUIS CERON', 'ALMACENES EXITO', 'URBANO'),
]

const tabla = [ENCABEZADOS, ...filas]

// CSV con BOM para que Excel respete los acentos al abrirlo.
const csv =
  '\uFEFF' +
  tabla
    .map((unaFila) => unaFila.map((celda) => `"${String(celda).replaceAll('"', '""')}"`).join(','))
    .join('\n') +
  '\n'

mkdirSync(carpeta, { recursive: true })
writeFileSync(join(carpeta, 'despachos-ejemplo.csv'), csv, 'utf8')

// XLSX con una segunda hoja informativa, para probar la selección de hoja.
const libro = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(tabla), 'Despachos')
XLSX.utils.book_append_sheet(
  libro,
  XLSX.utils.aoa_to_sheet([
    ['Nota'],
    ['Esta hoja es solo informativa. La app debe usar la hoja "Despachos".'],
  ]),
  'Instructivo',
)
const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'buffer' })
writeFileSync(join(carpeta, 'despachos-ejemplo.xlsx'), datos)

console.log('Archivos de ejemplo generados en', carpeta)
