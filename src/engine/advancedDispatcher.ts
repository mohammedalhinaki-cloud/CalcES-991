import type { AdvancedRequest, AdvancedResult } from './advancedTypes'
import { integrate, derivative } from './calculus'
import { solveRoot, solveLinear, solvePolynomial } from './equations'
import { matrixOperation } from './matrices'
import { statistics } from './statistics'
import { baseOperation } from './baseN'
import { evaluateComplex, fromPolar } from './complex'
import { finiteSum } from './summation'
export function calculateAdvanced(request:AdvancedRequest):AdvancedResult {
 switch(request.kind){
  case 'integrate':return integrate(request.latex,request.lower,request.upper,request.angle)
  case 'derivative':return derivative(request.latex,request.point,request.angle)
  case 'root':return solveRoot(request.latex,request.lower,request.upper,request.angle)
  case 'sum':return finiteSum(request.latex,request.lower,request.upper,request.angle,request.variables,request.answer)
  case 'polynomial':return solvePolynomial(request.coefficients)
  case 'linear':return solveLinear(request.a,request.b)
  case 'matrix':return matrixOperation(request.operation,request.a,request.b)
  case 'statistics':return statistics(request.operation,request.data)
  case 'complex':return evaluateComplex(request.latex,request.angle)
  case 'polar':return fromPolar(request.radius,request.theta,request.angle)
  case 'base':return baseOperation(request.operation,request.a,request.b,request.base)
 }
}
