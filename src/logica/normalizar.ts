/**
 * Normaliza un texto para comparar sin importar mayúsculas, acentos ni
 * espacios al inicio o al final. Los espacios internos repetidos se
 * colapsan en uno solo.
 *
 * Así " PLC 90215 " coincide con "plc 90215", y "Español" con "espanol"
 * (los caracteres con acentos o eñe se reducen a su letra base).
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
