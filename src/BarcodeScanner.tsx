import { useCallback, useRef, useState } from 'react'
import Barcode from './Barcode'

const MIN_LENGTH = 3
const FLASH_MS = 350

interface ScanRecord {
  id: string
  timestamp: string
  value: string
}

const vibrate = (pattern: number | number[]) => {
  if(typeof navigator !== 'undefined' && 'vibrate' in navigator)
    navigator.vibrate(pattern)
}

interface CopyButtonProps {
  value: string
}

const CopyButton = ({ value }: CopyButtonProps) => {
  const [ copied, setCopied ] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      vibrate(20)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard puede fallar en contextos no seguros; silencioso
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h4a2 2 0 002-2M8 5a2 2 0 012-2h4a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
          </svg>
          Copiar
        </>
      )}
    </button>
  )
}

interface ScansListProps {
  flash: boolean
  scans: ScanRecord[]
  onClear: () => void
}

const ScansList = ({ flash, scans, onClear }: ScansListProps) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Escaneos</h3>
        <span className="text-xs text-slate-500">{scans.length}</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={scans.length === 0}
        className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
      >
        Limpiar
      </button>
    </div>
    <div className={`bg-slate-950/60 border backdrop-blur rounded-xl divide-y divide-slate-800 max-h-[60vh] overflow-y-auto transition-all ${
      flash
        ? 'border-emerald-500/70 shadow-xl shadow-emerald-500/30'
        : 'border-slate-700/50'
    }`}>
      {scans.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-slate-500 text-sm">Aún sin escaneos.</p>
          <p className="text-slate-600 text-xs mt-1">Dispara tu escáner — los códigos aparecerán aquí.</p>
        </div>
      ) : scans.map((s, i) => (
        <div key={s.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-mono w-8 text-right">#{scans.length - i}</span>
            <span className="text-xs text-slate-500">{s.timestamp}</span>
            <code className="text-sm font-mono text-emerald-200 break-all flex-1">{s.value}</code>
          </div>
          <CopyButton value={s.value} />
        </div>
      ))}
    </div>
  </div>
)

const BarcodeScanner = () => {
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ scans, setScans ] = useState<ScanRecord[]>([])
  const [ flash, setFlash ] = useState(false)

  const handleScan = useCallback((value: string) => {
    setScans(prev => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: new Date().toLocaleTimeString(), value },
      ...prev
    ])
    vibrate([ 30, 40, 30 ])

    if(flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setFlash(true)
    flashTimerRef.current = setTimeout(() => setFlash(false), FLASH_MS)
  }, [])

  const handleValid = useCallback((value: string): boolean => {
    const isValid = value.length >= MIN_LENGTH

    if(!isValid) vibrate(80)

    return isValid
  }, [])

  return (
    <div className="px-4 pb-10 max-w-3xl mx-auto flex flex-col gap-6">
      <Barcode minLength={MIN_LENGTH} onScan={handleScan} onValid={handleValid} />

      <ScansList flash={flash} scans={scans} onClear={() => setScans([])} />
    </div>
  )
}

export default BarcodeScanner
