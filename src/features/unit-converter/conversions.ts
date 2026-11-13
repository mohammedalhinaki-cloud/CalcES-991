import type { BigNumber } from 'mathjs'
import { formatScientific } from '../../engine/formatResult'
import { math } from '../../engine/mathInstance'

export type UnitCategory = 'length' | 'mass' | 'temperature' | 'time' | 'speed' | 'area' | 'volume' | 'energy' | 'pressure'

export interface UnitDefinition {
  id: string
  name: string
  symbol: string
  factor: string
}

export interface UnitGroup {
  id: UnitCategory
  name: string
  units: readonly UnitDefinition[]
}

export interface ScientificConstant {
  id: string
  symbol: string
  name: string
  nameEn: string
  value: string
  unit: string
  latex: string
}

export const UNIT_GROUPS: readonly UnitGroup[] = [
  { id: 'length', name: 'الطول', units: [
    { id: 'm', name: 'متر', symbol: 'm', factor: '1' },
    { id: 'km', name: 'كيلومتر', symbol: 'km', factor: '1000' },
    { id: 'cm', name: 'سنتيمتر', symbol: 'cm', factor: '0.01' },
    { id: 'mm', name: 'مليمتر', symbol: 'mm', factor: '0.001' },
    { id: 'mi', name: 'ميل', symbol: 'mi', factor: '1609.344' },
    { id: 'ft', name: 'قدم', symbol: 'ft', factor: '0.3048' },
    { id: 'in', name: 'بوصة', symbol: 'in', factor: '0.0254' },
  ] },
  { id: 'mass', name: 'الكتلة', units: [
    { id: 'kg', name: 'كيلوغرام', symbol: 'kg', factor: '1' },
    { id: 'g', name: 'غرام', symbol: 'g', factor: '0.001' },
    { id: 'mg', name: 'مليغرام', symbol: 'mg', factor: '0.000001' },
    { id: 'lb', name: 'رطل', symbol: 'lb', factor: '0.45359237' },
    { id: 'oz', name: 'أونصة', symbol: 'oz', factor: '0.028349523125' },
  ] },
  { id: 'temperature', name: 'درجة الحرارة', units: [
    { id: 'celsius', name: 'مئوية', symbol: '°C', factor: '1' },
    { id: 'fahrenheit', name: 'فهرنهايت', symbol: '°F', factor: '1' },
    { id: 'kelvin', name: 'كلفن', symbol: 'K', factor: '1' },
  ] },
  { id: 'time', name: 'الزمن', units: [
    { id: 's', name: 'ثانية', symbol: 's', factor: '1' },
    { id: 'min', name: 'دقيقة', symbol: 'min', factor: '60' },
    { id: 'h', name: 'ساعة', symbol: 'h', factor: '3600' },
    { id: 'day', name: 'يوم', symbol: 'day', factor: '86400' },
  ] },
  { id: 'speed', name: 'السرعة', units: [
    { id: 'mps', name: 'متر/ثانية', symbol: 'm/s', factor: '1' },
    { id: 'kph', name: 'كيلومتر/ساعة', symbol: 'km/h', factor: '0.2777777777777777777777777777777777777777777777777777777777777778' },
    { id: 'mph', name: 'ميل/ساعة', symbol: 'mph', factor: '0.44704' },
    { id: 'fps', name: 'قدم/ثانية', symbol: 'ft/s', factor: '0.3048' },
  ] },
  { id: 'area', name: 'المساحة', units: [
    { id: 'm2', name: 'متر مربع', symbol: 'm²', factor: '1' },
    { id: 'km2', name: 'كيلومتر مربع', symbol: 'km²', factor: '1000000' },
    { id: 'cm2', name: 'سنتيمتر مربع', symbol: 'cm²', factor: '0.0001' },
    { id: 'ha', name: 'هكتار', symbol: 'ha', factor: '10000' },
    { id: 'acre', name: 'فدان دولي', symbol: 'acre', factor: '4046.8564224' },
  ] },
  { id: 'volume', name: 'الحجم والسعة', units: [
    { id: 'l', name: 'لتر', symbol: 'L', factor: '1' },
    { id: 'ml', name: 'مليلتر', symbol: 'mL', factor: '0.001' },
    { id: 'm3', name: 'متر مكعب', symbol: 'm³', factor: '1000' },
    { id: 'gal', name: 'غالون أمريكي', symbol: 'US gal', factor: '3.785411784' },
    { id: 'cup', name: 'كوب أمريكي', symbol: 'US cup', factor: '0.2365882365' },
  ] },
  { id: 'energy', name: 'الطاقة', units: [
    { id: 'j', name: 'جول', symbol: 'J', factor: '1' },
    { id: 'kj', name: 'كيلوجول', symbol: 'kJ', factor: '1000' },
    { id: 'cal', name: 'سعرة حرارية صغيرة', symbol: 'cal', factor: '4.184' },
    { id: 'kcal', name: 'كيلوسعرة', symbol: 'kcal', factor: '4184' },
    { id: 'wh', name: 'واط ساعة', symbol: 'Wh', factor: '3600' },
    { id: 'kwh', name: 'كيلوواط ساعة', symbol: 'kWh', factor: '3600000' },
  ] },
  { id: 'pressure', name: 'الضغط', units: [
    { id: 'pa', name: 'باسكال', symbol: 'Pa', factor: '1' },
    { id: 'kpa', name: 'كيلوباسكال', symbol: 'kPa', factor: '1000' },
    { id: 'bar', name: 'بار', symbol: 'bar', factor: '100000' },
    { id: 'atm', name: 'ضغط جوي معياري', symbol: 'atm', factor: '101325' },
    { id: 'psi', name: 'رطل/بوصة مربعة', symbol: 'psi', factor: '6894.757293168' },
  ] },
]

export const SCIENTIFIC_CONSTANTS: readonly ScientificConstant[] = [
  { id: 'c', symbol: 'c', name: 'سرعة الضوء في الفراغ', nameEn: 'Speed of light in vacuum', value: '299792458', unit: 'm·s⁻¹', latex: '299792458' },
  { id: 'h', symbol: 'h', name: 'ثابت بلانك', nameEn: 'Planck constant', value: '6.62607015e-34', unit: 'J·s', latex: '6.62607015\\times10^{-34}' },
  { id: 'G', symbol: 'G', name: 'ثابت الجاذبية العام', nameEn: 'Gravitational constant', value: '6.67430e-11', unit: 'm³·kg⁻¹·s⁻²', latex: '6.67430\\times10^{-11}' },
  { id: 'g', symbol: 'g', name: 'تسارع الجاذبية القياسي', nameEn: 'Standard gravity', value: '9.80665', unit: 'm·s⁻²', latex: '9.80665' },
  { id: 'N_A', symbol: 'Nₐ', name: 'ثابت أفوجادرو', nameEn: 'Avogadro constant', value: '6.02214076e23', unit: 'mol⁻¹', latex: '6.02214076\\times10^{23}' },
  { id: 'k_B', symbol: 'kᵦ', name: 'ثابت بولتزمان', nameEn: 'Boltzmann constant', value: '1.380649e-23', unit: 'J·K⁻¹', latex: '1.380649\\times10^{-23}' },
  { id: 'e', symbol: 'e', name: 'الشحنة الأولية', nameEn: 'Elementary charge', value: '1.602176634e-19', unit: 'C', latex: '1.602176634\\times10^{-19}' },
] as const

const NUMBER_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i
const bn = (value: number | string) => math.bignumber(value)

function toCelsius(value: BigNumber, unit: string): BigNumber {
  if (unit === 'fahrenheit') return math.divide(math.multiply(math.subtract(value, bn(32)), bn(5)), bn(9)) as BigNumber
  if (unit === 'kelvin') return math.subtract(value, bn('273.15')) as BigNumber
  return value
}

function fromCelsius(value: BigNumber, unit: string): BigNumber {
  if (unit === 'fahrenheit') return math.add(math.divide(math.multiply(value, bn(9)), bn(5)), bn(32)) as BigNumber
  if (unit === 'kelvin') return math.add(value, bn('273.15')) as BigNumber
  return value
}

export function convertUnitValue(value: string, category: UnitCategory, fromId: string, toId: string): BigNumber {
  const text = value.trim()
  if (!NUMBER_PATTERN.test(text)) throw new Error('أدخل عددًا عشريًا صالحًا')
  const amount = bn(text)
  if (!amount.isFinite()) throw new Error('أدخل عددًا عشريًا صالحًا')

  const group = UNIT_GROUPS.find(item => item.id === category)
  const from = group?.units.find(unit => unit.id === fromId)
  const to = group?.units.find(unit => unit.id === toId)
  if (!from || !to) throw new Error('الوحدات المختارة غير متوافقة')

  if (category === 'temperature') return fromCelsius(toCelsius(amount, from.id), to.id)
  const base = math.multiply(amount, bn(from.factor)) as BigNumber
  return math.divide(base, bn(to.factor)) as BigNumber
}

export function formatConvertedValue(value: BigNumber): string {
  return formatScientific(value)
}
