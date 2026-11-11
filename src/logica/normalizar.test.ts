import { describe, expect, it } from 'vitest'
import { normalizar } from './normalizar'

describe('normalizar', () => {
  it('ignora mayúsculas, acentos y espacios al inicio y al final', () => {
    expect(normalizar('  PLC90215 ')).toBe(normalizar('plc90215'))
    expect(normalizar('PLC 90215')).toBe(normalizar('plc 90215'))
  })

  it('quita acentos y colapsa espacios internos repetidos', () => {
    expect(normalizar('Descripción')).toBe('descripcion')
    expect(normalizar('Español   en   México')).toBe('espanol en mexico')
  })
})
