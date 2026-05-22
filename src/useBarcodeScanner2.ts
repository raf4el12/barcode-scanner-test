import { useEffect, useMemo, useRef, type RefObject } from 'react'

interface UseBarcodeScanner2Props {
  autoFocus?: boolean
  controls?: Record<string, string>
  debounceMs?: number
  enabled?: boolean
  id?: string
  inputRef: RefObject<HTMLInputElement | null>
  minLength?: number
  onScan: (value: string) => void | Promise<void>
  onValid?: (value: string) => boolean
}

const EXTERNAL_SCAN_EVENT = 'barcode-scanner:scan'

interface ExternalScanDetail {
  value: string
}

const normalizeCombo = (combo: string): string =>
  combo.toLowerCase().split('+').map(k => k.trim()).sort().join('+')

const isTypingElement = (el: Element | null): boolean => {
  if(!(el instanceof HTMLElement)) return false

  return el.tagName === 'TEXTAREA' || el.isContentEditable
}

const useBarcodeScanner2 = ({
  autoFocus = true,
  controls = {},
  debounceMs = 120,
  enabled = true,
  inputRef,
  minLength = 3,
  onScan,
  onValid
}: UseBarcodeScanner2Props) => {
  const onScanRef = useRef(onScan)
  const onValidRef = useRef(onValid)

  useEffect(() => { onScanRef.current = onScan }, [ onScan ])
  useEffect(() => { onValidRef.current = onValid }, [ onValid ])

  const normalizedControls = useMemo(() => Object.fromEntries(
    Object.entries(controls).map(([ combo, val ]) => [ normalizeCombo(combo), val ])
  ), [ controls ])

  useEffect(() => {
    if(!enabled) return

    const input = inputRef.current

    if(!input) return

    const ensureFocus = () => {
      if(!autoFocus) return
      if(isTypingElement(document.activeElement)) return
      if(document.activeElement === input) return

      input.focus({ preventScroll: true })
    }

    const dispatchValid = (value: string) => {
      if(!onValidRef.current || onValidRef.current(value)) {
        onScanRef.current(value)

        return
      }

      window.dispatchEvent(new CustomEvent<ExternalScanDetail>(EXTERNAL_SCAN_EVENT, {
        detail: { value }
      }))
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const cancelDebounce = () => {
      if(debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    }

    const flush = () => {
      cancelDebounce()

      const value = input.value.replace(/[\r\n]+/g, '').trim()

      input.value = ''

      if(value.length >= minLength) dispatchValid(value)
    }

    const handleControlCombo = (e: KeyboardEvent): boolean => {
      if(!e.ctrlKey && !e.altKey && !e.metaKey) return false

      const keys: string[] = []

      if(e.ctrlKey) keys.push('ctrl')
      if(e.shiftKey) keys.push('shift')
      if(e.altKey) keys.push('alt')
      if(e.key.length === 1) keys.push(e.key.toLowerCase())

      const mapped = normalizedControls[keys.sort().join('+')]

      if(!mapped) return false

      e.preventDefault()
      e.stopPropagation()
      onScanRef.current(mapped)

      return true
    }

    const handleGlobalKeydown = (e: KeyboardEvent) => {
      handleControlCombo(e)
    }

    const handleInputKeyDown = (e: KeyboardEvent) => {
      if(handleControlCombo(e)) return

      if(e.key === 'Enter') {
        e.preventDefault()
        flush()
      }
    }

    // Escáneres del cel (IME / cámara) inyectan texto sin keydown.
    // - Si llega un terminador \r/\n → flush inmediato.
    // - Si no, debounce: si no llegan más eventos en `debounceMs`, flusheamos igual.
    //   Esto cubre escáneres que no añaden sufijo Enter.
    const handleInputEvent = () => {
      if(/[\r\n]/.test(input.value)) {
        flush()
        return
      }

      cancelDebounce()
      debounceTimer = setTimeout(flush, debounceMs)
    }

    const handleExternalScan = (e: Event) => {
      const detail = (e as CustomEvent<ExternalScanDetail>).detail

      if(!detail?.value) return

      if(!onValidRef.current || onValidRef.current(detail.value))
        onScanRef.current(detail.value)
    }

    if(autoFocus) {
      ensureFocus()
      window.addEventListener('focusin', ensureFocus)
    }

    window.addEventListener('keydown', handleGlobalKeydown)
    window.addEventListener(EXTERNAL_SCAN_EVENT, handleExternalScan)
    input.addEventListener('keydown', handleInputKeyDown)
    input.addEventListener('input', handleInputEvent)

    return () => {
      cancelDebounce()

      if(autoFocus)
        window.removeEventListener('focusin', ensureFocus)

      window.removeEventListener('keydown', handleGlobalKeydown)
      window.removeEventListener(EXTERNAL_SCAN_EVENT, handleExternalScan)
      input.removeEventListener('keydown', handleInputKeyDown)
      input.removeEventListener('input', handleInputEvent)
    }
  }, [ autoFocus, debounceMs, enabled, inputRef, minLength, normalizedControls ])
}

export default useBarcodeScanner2
