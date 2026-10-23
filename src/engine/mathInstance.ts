import { all, create } from 'mathjs'

// Isolated instance: never mutate math.js's shared global configuration.
// Decimal precision is not a guarantee of exact numerical integration or complex arithmetic.
export const math = create(all, { number: 'BigNumber', precision: 64 })
