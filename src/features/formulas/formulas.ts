export type FormulaCategory = 'الجبر' | 'الهندسة' | 'الفيزياء' | 'التفاضل والتكامل'

export interface Formula {
  id: string
  category: FormulaCategory
  name: string
  nameEn: string
  expression: string
  description: string
  latex: string
  keywords: string
}

export const FORMULAS: readonly Formula[] = [
  { id: 'quadratic', category: 'الجبر', name: 'القانون العام للمعادلة التربيعية', nameEn: 'Quadratic formula', expression: 'x = (−b ± √(b² − 4ac)) / 2a', description: 'حل ax² + bx + c = 0', latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', keywords: 'roots discriminant polynomial' },
  { id: 'pythagorean', category: 'الهندسة', name: 'نظرية فيثاغورس', nameEn: 'Pythagorean theorem', expression: 'a² + b² = c²', description: 'للمثلث القائم الزاوية', latex: 'a^2+b^2=c^2', keywords: 'triangle right triangle hypotenuse' },
  { id: 'circle-area', category: 'الهندسة', name: 'مساحة الدائرة', nameEn: 'Area of a circle', expression: 'A = πr²', description: 'r نصف قطر الدائرة', latex: 'A=\\pi r^2', keywords: 'circle radius area' },
  { id: 'circle-circumference', category: 'الهندسة', name: 'محيط الدائرة', nameEn: 'Circumference of a circle', expression: 'C = 2πr', description: 'r نصف قطر الدائرة', latex: 'C=2\\pi r', keywords: 'circle radius perimeter' },
  { id: 'distance', category: 'الفيزياء', name: 'السرعة المتوسطة', nameEn: 'Average speed', expression: 'v = d / t', description: 'المسافة المقطوعة مقسومة على الزمن', latex: 'v=\\frac{d}{t}', keywords: 'velocity distance time motion' },
  { id: 'newton', category: 'الفيزياء', name: 'قانون نيوتن الثاني', nameEn: "Newton's second law", expression: 'F = ma', description: 'القوة تساوي الكتلة في التسارع', latex: 'F=ma', keywords: 'force mass acceleration' },
  { id: 'kinetic-energy', category: 'الفيزياء', name: 'الطاقة الحركية', nameEn: 'Kinetic energy', expression: 'Eₖ = ½mv²', description: 'm الكتلة وv السرعة', latex: 'E_k=\\frac{1}{2}mv^2', keywords: 'energy mass velocity' },
  { id: 'density', category: 'الفيزياء', name: 'الكثافة', nameEn: 'Density', expression: 'ρ = m / V', description: 'الكتلة مقسومة على الحجم', latex: '\\rho=\\frac{m}{V}', keywords: 'mass volume' },
  { id: 'derivative-power', category: 'التفاضل والتكامل', name: 'قاعدة القوة للمشتقات', nameEn: 'Power rule for derivatives', expression: 'd(xⁿ)/dx = nxⁿ⁻¹', description: 'لأي أس حقيقي n ضمن مجال الاشتقاق', latex: '\\frac{d}{dx}x^n=nx^{n-1}', keywords: 'derivative differentiation' },
  { id: 'power-integral', category: 'التفاضل والتكامل', name: 'تكامل قاعدة القوة', nameEn: 'Power rule for integration', expression: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C', description: 'عندما n ≠ −1', latex: '\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C', keywords: 'integral integration antiderivative' },
] as const
