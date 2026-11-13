import { describe, expect, it } from 'vitest'
import { formatConvertedValue, SCIENTIFIC_CONSTANTS, UNIT_GROUPS, convertUnitValue } from '../../features/unit-converter/conversions'

describe('unit conversions and scientific constants', () => {
  it('converts metric units and temperature scales', () => {
    expect(formatConvertedValue(convertUnitValue('1', 'length', 'km', 'm'))).toBe('1000')
    expect(Number(formatConvertedValue(convertUnitValue('32', 'temperature', 'fahrenheit', 'celsius')))).toBeCloseTo(0)
    expect(Number(formatConvertedValue(convertUnitValue('0', 'temperature', 'celsius', 'fahrenheit')))).toBeCloseTo(32)
  })

  it('rejects invalid values, unsupported categories, and mismatched units', () => {
    expect(() => convertUnitValue('NaN', 'length', 'm', 'km')).toThrow()
    expect(() => convertUnitValue('1', 'length', 'm', 's')).toThrow()
    expect(() => convertUnitValue('1', 'unknown' as never, 'm', 'km')).toThrow()
  })

  it('provides nine categories and insertable scientific constants', () => {
    expect(UNIT_GROUPS).toHaveLength(9)
    expect(SCIENTIFIC_CONSTANTS.length).toBeGreaterThanOrEqual(7)
    for (const constant of SCIENTIFIC_CONSTANTS) expect(Number(constant.value)).toBeGreaterThan(0)
  })
})
