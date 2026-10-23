// Shared contracts; reducer transitions and editor commands remain separate.
export type CalculatorMode = 'COMP' | 'CMPLX' | 'STAT' | 'MATRIX' | 'EQUATION' | 'BASE-N'
export type KeyLayer = 'NORMAL' | 'SHIFT' | 'ALPHA'
export type AngleUnit = 'DEG' | 'RAD' | 'GRA'
export type NumericBase = 2 | 8 | 10 | 16
export type CalculationStatus = 'idle' | 'computing' | 'success' | 'error'

