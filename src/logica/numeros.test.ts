import { describe, expect, it } from 'vitest'
import { formatearNumero } from './numeros'

describe('formatearNumero', () => {
  it('muestra enteros sin decimales', () => {
    expect(formatearNumero(52)).toBe('52')
    expect(formatearNumero(0)).toBe('0')
  })

  it('conserva los decimales que aportan y recorta a 2', () => {
    expect(formatearNumero(33.5)).toBe('33.5')
    expect(formatearNumero(0.85)).toBe('0.85')
    expect(formatearNumero(190.24)).toBe('190.24')
    expect(formatearNumero(33.456)).toBe('33.46')
  })
})
