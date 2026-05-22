import { useEffect, useRef } from 'react'

interface UseGlobalBarcodeScannerProps {
  bufferTimeout?: number
  enabled?: boolean
  minLength?: number
  onScan: (value: string) => void | Promise<void>
  onValid?: (value: string) => boolean
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if(!(target instanceof HTMLElement)) return false

  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.isContentEditable
}

export const useGlobalBarcodeScanner = ({
  bufferTimeout = 50,
  enabled = true,
  minLength = 3,
  onScan,
  onValid
}: UseGlobalBarcodeScannerProps) => {
  const onScanRef = useRef(onScan)
  const onValidRef = useRef(onValid)

  useEffect(() => { onScanRef.current = onScan }, [ onScan ])
  useEffect(() => { onValidRef.current = onValid }, [ onValid ])

  useEffect(() => {
    if(!enabled) return

    const buffer: string[] = []
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const clearBuffer = () => {
      buffer.length = 0

      if(resetTimer) {
        clearTimeout(resetTimer)
        resetTimer = null
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea/contenteditable real
      if(isTypingTarget(event.target)) return

      if(resetTimer) clearTimeout(resetTimer)

      // Terminador 'Enter' por defecto en Zebra/Honeywell
      if(event.key === 'Enter') {
        const barcode = buffer.join('').trim()

        clearBuffer()

        if(barcode.length >= minLength && (!onValidRef.current || onValidRef.current(barcode)))
          onScanRef.current(barcode)

        return
      }

      // Capturar solo caracteres imprimibles (evitar Shift, Ctrl, etc.)
      if(event.key.length === 1)
        buffer.push(event.key)

      // Si la ráfaga se detiene sin 'Enter', limpiamos para no acumular tecleo humano lento
      resetTimer = setTimeout(clearBuffer, bufferTimeout)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearBuffer()
    }
  }, [ bufferTimeout, enabled, minLength ])
}

export default useGlobalBarcodeScanner
