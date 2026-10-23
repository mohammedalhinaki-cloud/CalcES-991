import {getLanguage} from '../i18n/locale'
import type { MathfieldElement } from 'mathlive'

let loading: Promise<typeof MathfieldElement> | undefined
export function loadMathLive(): Promise<typeof MathfieldElement> {
  if (typeof window === 'undefined') return Promise.reject(new Error('MathLive requires a browser'))
  return loading ??= import('mathlive').then(({ MathfieldElement }) => {
    // An absolute URL prevents MathLive from probing its module URL with HEAD offline.
    MathfieldElement.fontsDirectory = new URL(`${import.meta.env.BASE_URL}mathlive/fonts`,window.location.href).href
    MathfieldElement.soundsDirectory = null
    MathfieldElement.locale = getLanguage()
    return MathfieldElement
  })
}
