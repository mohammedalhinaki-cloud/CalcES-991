import type {BigNumber} from 'mathjs'
import {math} from '../engine/mathInstance'

export function decimalInput(text:string){
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()))throw new Error('Enter a finite number')
 const value=math.bignumber(text.trim())
 if(!value.isFinite())throw new Error('Enter a finite number')
 return value
}
export const displayNumber=(value:BigNumber)=>math.format(value,{precision:16})
export function quadratic(aText:string,bText:string,cText:string){
 const a=decimalInput(aText),b=decimalInput(bText),c=decimalInput(cText)
 if(a.isZero())throw new Error('a must be nonzero')
 const discriminant=b.times(b).minus(a.times(c).times(4)),denominator=a.times(2)
 let roots:string[]
 if(discriminant.isNegative()){
  const re=displayNumber(b.negated().div(denominator)),im=displayNumber(discriminant.negated().sqrt().div(denominator.abs()))
  roots=[`${re} + ${im}i`,`${re} − ${im}i`]
 }else if(discriminant.isZero())roots=[displayNumber(b.negated().div(denominator)),displayNumber(b.negated().div(denominator))]
 else{
  // Stable quadratic formula avoids subtracting nearly equal positive values.
  const q=b.plus(discriminant.sqrt().times(b.isNegative()?-1:1)).times('-0.5')
  roots=[displayNumber(q.div(a)),displayNumber(c.div(q))]
 }
 return {a:a.toString(),b:b.toString(),c:c.toString(),discriminant:displayNumber(discriminant),kind:discriminant.isNegative()?'complex':discriminant.isZero()?'repeated':'real',roots}
}
export interface Unit {id:string;en:string;ar:string;factor:string;offset?:string}
const u=(id:string,en:string,ar:string,factor:string,offset?:string):Unit=>({id,en,ar,factor,offset})
export const categories={
 length:{en:'Length',ar:'الطول',units:[u('m','Meters','متر','1'),u('km','Kilometers','كيلومتر','1000'),u('cm','Centimeters','سنتيمتر','.01'),u('mm','Millimeters','مليمتر','.001'),u('in','Inches','بوصة','.0254'),u('ft','Feet','قدم','.3048'),u('yd','Yards','ياردة','.9144'),u('mi','Miles','ميل','1609.344')]},
 mass:{en:'Mass / weight',ar:'الكتلة / الوزن',units:[u('kg','Kilograms','كيلوغرام','1'),u('g','Grams','غرام','.001'),u('mg','Milligrams','مليغرام','.000001'),u('t','Metric tonnes','طن متري','1000'),u('lb','Pounds','رطل','.45359237'),u('oz','Ounces','أونصة','.028349523125')]},
 temperature:{en:'Temperature',ar:'درجة الحرارة',units:[u('K','Kelvin','كلفن','1'),u('C','Celsius','سيلسيوس','1','273.15'),u('F','Fahrenheit','فهرنهايت','0.5555555555555555555555555555555555555555555555555555555555555556','255.3722222222222222222222222222222222222222222222222222222222222')]},
 area:{en:'Area',ar:'المساحة',units:[u('m2','Square meters','متر مربع','1'),u('km2','Square kilometers','كيلومتر مربع','1000000'),u('cm2','Square centimeters','سنتيمتر مربع','.0001'),u('ha','Hectares','هكتار','10000'),u('acre','Acres','أكر (Acre)','4046.8564224'),u('ft2','Square feet','قدم مربع','.09290304')]},
 volume:{en:'Volume',ar:'الحجم',units:[u('L','Liters','لتر','1'),u('mL','Milliliters','مليلتر','.001'),u('m3','Cubic meters','متر مكعب','1000'),u('cm3','Cubic centimeters','سنتيمتر مكعب','.001'),u('galUS','US gallons','غالون أمريكي','3.785411784'),u('galUK','Imperial gallons','غالون إمبراطوري','4.54609')]},
 speed:{en:'Speed',ar:'السرعة',units:[u('m/s','Meters / second','متر / ثانية','1'),u('km/h','Kilometers / hour','كيلومتر / ساعة','0.2777777777777777777777777777777777777777777777777777777777777778'),u('mph','Miles / hour','ميل / ساعة','.44704'),u('ft/s','Feet / second','قدم / ثانية','.3048'),u('kn','Knots','عقدة','0.5144444444444444444444444444444444444444444444444444444444444444')]},
 time:{en:'Time',ar:'الزمن',units:[u('s','Seconds','ثانية','1'),u('ms','Milliseconds','ملي ثانية','.001'),u('min','Minutes','دقيقة','60'),u('h','Hours','ساعة','3600'),u('d','Days','يوم','86400'),u('wk','Weeks','أسبوع','604800')]},
} satisfies Record<string,{en:string;ar:string;units:Unit[]}>
export type Category=keyof typeof categories
export function convert(value:string,category:Category,fromId:string,toId:string){
 const units:Unit[]=categories[category].units,from=units.find(u=>u.id===fromId),to=units.find(u=>u.id===toId)
 if(!from||!to)throw new Error('Invalid unit')
 const input=decimalInput(value)
 // Temperature affine transforms are evaluated as exact decimal ratios.
 const kelvin=category==='temperature'?(from.id==='F'?input.minus(32).times(5).div(9).plus('273.15'):from.id==='C'?input.plus('273.15'):input):null
 if(kelvin?.isNegative())throw new Error('Below absolute zero')
 if(kelvin)return displayNumber(to.id==='F'?kelvin.minus('273.15').times(9).div(5).plus(32):to.id==='C'?kelvin.minus('273.15'):kelvin)
 return displayNumber(input.times(from.factor).div(to.factor))
}
export const constants=[
 {symbol:'c',en:'Speed of light in vacuum',ar:'سرعة الضوء في الفراغ',value:'299792458',unit:'m s⁻¹',exact:true},
 {symbol:'h',en:'Planck constant',ar:'ثابت بلانك',value:'6.62607015e-34',unit:'J s',exact:true},
 {symbol:'Nₐ',en:'Avogadro constant',ar:'ثابت أفوغادرو',value:'6.02214076e23',unit:'mol⁻¹',exact:true},
 {symbol:'G',en:'Newtonian gravitational constant',ar:'ثابت الجاذبية',value:'6.67430e-11',unit:'m³ kg⁻¹ s⁻²',exact:false},
 {symbol:'e',en:'Elementary charge',ar:'الشحنة الأولية',value:'1.602176634e-19',unit:'C',exact:true},
 {symbol:'k',en:'Boltzmann constant',ar:'ثابت بولتزمان',value:'1.380649e-23',unit:'J K⁻¹',exact:true},
 {symbol:'R',en:'Molar gas constant',ar:'ثابت الغاز المولي',value:'8.31446261815324',unit:'J mol⁻¹ K⁻¹',exact:true},
 {symbol:'F',en:'Faraday constant',ar:'ثابت فاراداي',value:'96485.3321233100184',unit:'C mol⁻¹',exact:true},
 {symbol:'mₑ',en:'Electron mass',ar:'كتلة الإلكترون',value:'9.1093837139e-31',unit:'kg',exact:false},
 {symbol:'mₚ',en:'Proton mass',ar:'كتلة البروتون',value:'1.67262192595e-27',unit:'kg',exact:false},
 {symbol:'ε₀',en:'Vacuum electric permittivity',ar:'سماحية الفراغ',value:'8.8541878188e-12',unit:'F m⁻¹',exact:false},
 {symbol:'g₀',en:'Standard gravity',ar:'تسارع الجاذبية القياسي',value:'9.80665',unit:'m s⁻²',exact:true},
]
