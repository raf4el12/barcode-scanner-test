import { useRef } from 'react'
import useBarcodeScanner2 from './useBarcodeScanner2'

interface BarcodeProps {
  autoFocus?: boolean
  controls?: Record<string, string>
  debounceMs?: number
  enabled?: boolean
  id?: string
  minLength?: number
  onScan: (value: string) => void | Promise<void>
  onValid?: (value: string) => boolean
}

/**
 * Captura de códigos de barras sin UI visible ni teclado virtual en móvil.
 *
 * Renderiza un <input> 1×1 px transparente, intocable y dentro del viewport
 * (requerido para que el IME del cel pueda inyectar texto). El foco se mantiene
 * solo programáticamente desde el hook, sin gesto de usuario, lo que impide
 * que se abra el teclado virtual.
 *
 * Soporta:
 *  - Escáneres HID (keydown + Enter)
 *  - Escáneres IME / cámara del cel (input event con o sin sufijo Enter, debounce fallback)
 */
const Barcode = ({
  autoFocus = true,
  controls,
  debounceMs,
  enabled = true,
  id,
  minLength,
  onScan,
  onValid
}: BarcodeProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useBarcodeScanner2({
    autoFocus,
    controls,
    debounceMs,
    enabled,
    id,
    inputRef,
    minLength,
    onScan,
    onValid
  })

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-hidden="true"
      tabIndex={-1}
      className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
    />
  )
}

export default Barcode
