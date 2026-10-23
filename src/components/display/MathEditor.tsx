import { localize } from '../../i18n/locale'
import { useEffect, useRef, useState } from 'react'
import type { MathfieldElement } from 'mathlive'
import { loadMathLive } from '../../editor/mathliveAdapter'
import type { EditorHandle } from '../../state/CalculatorProvider'

interface Props { onChange: (latex: string) => void; onReady: (handle: EditorHandle | null) => void; off: boolean; onEditIntent: () => void }
export default function MathEditor({ onChange, onReady, off, onEditIntent }: Props) {
  const intentRef=useRef(onEditIntent)
  intentRef.current=onEditIntent
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<MathfieldElement | null>(null)
  const readyRef=useRef(onReady)
  readyRef.current=onReady
  const offRef=useRef(off)
  offRef.current=off
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    let field: MathfieldElement | undefined
    const handleIntent=()=>intentRef.current()
    const handleNavigation=(event:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))handleIntent()}
    const handleInput = () => { if (field) onChangeRef.current(field.getValue('latex')) }
    void loadMathLive().then((Mathfield) => {
      if (disposed || !host.current) return
      field = new Mathfield()
      editor.current = field
      field.mathVirtualKeyboardPolicy = 'manual'
      field.disabled = offRef.current
      field.setAttribute('aria-label', localize('محرر المعادلة'))
      field.setAttribute('dir', 'ltr')
      field.setAttribute('default-mode', 'math')
      field.addEventListener('input', handleInput)
      field.addEventListener('pointerdown',handleIntent)
      field.addEventListener('keydown',handleNavigation)
      host.current.append(field)
      const execute=(operation:()=>void) => {
        if(!field||field.disabled)return
        operation()
        onChangeRef.current(field.getValue('latex'))
        field.focus()
      }
      readyRef.current({
        insert: latex=>execute(()=>field!.insert(latex,{selectionMode:latex.includes('#?')?'placeholder':'after'})),
        move: direction=>execute(()=>field!.executeCommand(({Left:'moveToPreviousChar',Right:'moveToNextChar',Up:'moveUp',Down:'moveDown'} as const)[direction])),
        deleteBackward: ()=>execute(()=>field!.executeCommand('deleteBackward')),
        clear: ()=>execute(()=>field!.setValue('',{silenceNotifications:true})),
        // Explicit history restore is silent; ordinary input never rewrites selection.
        replace: latex=>{field?.setValue(latex,{silenceNotifications:true});if(field)field.position=-1},
        focus: ()=>field?.focus(),
      })
    }).catch(() => { if (!disposed) setError('تعذر تحميل المحرر الرياضي') })
    return () => {
      disposed = true
      field?.removeEventListener('input', handleInput)
      field?.removeEventListener('pointerdown',handleIntent)
      field?.removeEventListener('keydown',handleNavigation)
      field?.remove()
      editor.current = null
      readyRef.current(null)
    }
  }, [])
  useEffect(()=>{if(editor.current)editor.current.disabled=off},[off])
  // Uncontrolled custom element: React never writes its value/selection on input.
  return (
    <div>
      <p id="editor-help" className="sr-only">{localize("المس أي موضع للتحرير، أو اسحب لتحديد جزء من المعادلة.")}</p>
      <div ref={host} className="math-editor-host" aria-describedby="editor-help" />
      {localize(error && <p role="alert">{localize(error)}</p>)}
    </div>
  )
}
