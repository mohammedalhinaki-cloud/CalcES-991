import {afterEach,expect,it} from 'vitest'
import {selectLanguage,translate,localize,readStoredLanguage} from '../../i18n/locale'
afterEach(()=>selectLanguage('ar'))
it('persists language and translates static and dynamic labels without changing numbers',()=>{
 selectLanguage('en')
 expect(readStoredLanguage()).toBe('en');expect(document.documentElement.dir).toBe('ltr')
 expect(translate('إغلاق')).toBe('Close');expect(translate('السجل (12)')).toBe('History (12)')
 expect(translate('معامل x^2')).toBe('Coefficient of x^2')
 expect(localize('123.45')).toBe('123.45');expect(localize(5)).toBe(5)
})
it('translates worker messages at the presentation boundary',()=>{
 selectLanguage('en')
 expect(translate('المصفوفة منفردة؛ لا يوجد معكوس')).toBe('The matrix is singular; no inverse exists')
 expect(translate('الاشتقاق الرمزي')).toBe('Symbolic differentiation')
})
it('retains the Arabic UI unchanged and tolerates corrupt preferences',()=>{
 selectLanguage('ar');expect(translate('النتيجة')).toBe('النتيجة')
 localStorage.setItem('calces_language','invalid');expect(readStoredLanguage()).toBeNull()
})
