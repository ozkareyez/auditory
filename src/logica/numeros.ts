/** Muestra un número con hasta 2 decimales y sin ceros de más ("33.5", "52", "0.85"). */
export function formatearNumero(valor: number): string {
  return String(Number(valor.toFixed(2)))
}
