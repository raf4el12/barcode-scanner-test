import { useCallback, useRef, useState } from 'react'
import useBarcodeScanner2 from './useBarcodeScanner2'
import useGlobalBarcodeScanner from './useGlobalBarcodeScanner'

type LogType = 'error' | 'info' | 'success'
type HookMode = 'input' | 'global'

interface LogEntry {
  message: string
  timestamp: string
  type: LogType
}

interface HookConfig {
  description: string
  label: string
  minLength: number
}

const MAX_LOGS = 50

const HOOKS: Record<HookMode, HookConfig> = {
  global: {
    description: 'Captura teclas a nivel ventana. Ideal para escáneres HID dedicados.',
    label      : 'Global',
    minLength  : 5
  },
  input: {
    description: 'Input enfocado sin teclado virtual. Soporta inyección IME (cel).',
    label      : 'Input',
    minLength  : 3
  }
}

const LOG_COLOR: Record<LogType, string> = {
  error  : 'text-rose-400',
  info   : 'text-slate-300',
  success: 'text-emerald-400'
}

const LOG_DOT: Record<LogType, string> = {
  error  : 'bg-rose-400',
  info   : 'bg-slate-500',
  success: 'bg-emerald-400'
}

const vibrate = (pattern: number | number[]) => {
  if(typeof navigator !== 'undefined' && 'vibrate' in navigator)
    navigator.vibrate(pattern)
}

interface LogPanelProps {
  logs: LogEntry[]
  onClear: () => void
}

const LogPanel = ({ logs, onClear }: LogPanelProps) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Log de eventos</h3>
        <span className="text-xs text-slate-500">{logs.length} / {MAX_LOGS}</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={logs.length === 0}
        className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
      >
        Limpiar
      </button>
    </div>
    <div className="bg-slate-950/60 border border-slate-700/50 backdrop-blur text-sm font-mono rounded-xl p-4 h-60 overflow-y-auto">
      {logs.length === 0
        ? <div className="text-slate-600 italic">Esperando eventos...</div>
        : logs.map((log, i) => (
          <div key={`${log.timestamp}-${i}`} className={`py-0.5 flex items-start gap-2 ${LOG_COLOR[log.type]}`}>
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${LOG_DOT[log.type]}`}></span>
            <span className="text-slate-500 text-xs">{log.timestamp}</span>
            <span className="flex-1 break-all">{log.message}</span>
          </div>
        ))
      }
    </div>
  </div>
)

interface HookToggleProps {
  mode: HookMode
  onChange: (mode: HookMode) => void
}

const HookToggle = ({ mode, onChange }: HookToggleProps) => (
  <div className="w-full flex flex-col items-center gap-3">
    <div className="inline-flex p-1 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur">
      {(Object.keys(HOOKS) as HookMode[]).map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === key
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {HOOKS[key].label}
        </button>
      ))}
    </div>
    <p className="text-xs text-slate-500 text-center max-w-sm">
      {HOOKS[mode].description}
    </p>
  </div>
)

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

interface ScanSurfaceProps {
  config: HookConfig
  focused: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onFocus: () => void
  onBlur: () => void
}

const ScanSurface = ({ config, focused, inputRef, onFocus, onBlur }: ScanSurfaceProps) => (
  <div
    className={`relative w-full rounded-2xl p-10 text-center backdrop-blur transition-all overflow-hidden ${
      focused
        ? 'bg-blue-500/10 border-2 border-blue-500/60 shadow-xl shadow-blue-500/20'
        : 'bg-slate-800/40 border-2 border-slate-700/50'
    }`}
  >
    {/* Input invisible, dentro del viewport y enfocado programáticamente. Sin inputMode="none"
        para que el IME del escáner inyecte texto. Sin pointer-events para que un tap accidental
        no dispare el teclado (el foco se mantiene desde el useEffect del hook). */}
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Área de escaneo"
      onFocus={onFocus}
      onBlur={onBlur}
      className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none"
    />

    <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
      {focused && <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>}
      <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-full border ${
        focused
          ? 'bg-blue-500/20 border-blue-500/60'
          : 'bg-slate-700/40 border-slate-600'
      }`}>
        <svg className={`w-9 h-9 ${focused ? 'text-blue-300' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2M7 12h10" />
        </svg>
      </div>
    </div>
    <h2 className="text-xl font-semibold text-slate-100 mb-1">
      {focused ? 'Listo para escanear' : 'Activando…'}
    </h2>
    <p className="text-xs text-slate-400 mb-3">
      {focused ? 'Dispara tu escáner ahora' : 'Esperando foco automático'}
    </p>
    <div className="flex items-center justify-center gap-2 text-xs">
      <span className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-medium">
        {config.label}
      </span>
      <span className="px-2 py-1 rounded-md bg-slate-700/50 border border-slate-600/50 text-slate-300">
        min {config.minLength} chars
      </span>
    </div>
  </div>
)

const BarcodeScanner = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ scannedValue, setScannedValue ] = useState<string | null>(null)
  const [ logs, setLogs ] = useState<LogEntry[]>([])
  const [ mode, setMode ] = useState<HookMode>('input')
  const [ focused, setFocused ] = useState(false)

  const config = HOOKS[mode]

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    setLogs(prev => [
      { message, timestamp: new Date().toLocaleTimeString(), type },
      ...prev.slice(0, MAX_LOGS - 1)
    ])
  }, [])

  const handleScan = useCallback((value: string) => {
    addLog(`onScan: "${value}"`, 'success')
    setScannedValue(value)
    vibrate([ 30, 40, 30 ])
  }, [ addLog ])

  const handleValid = useCallback((value: string): boolean => {
    const isValid = value.length >= HOOKS.input.minLength
    addLog(`onValid("${value}") → ${isValid}`, isValid ? 'info' : 'error')

    if(!isValid) vibrate(80)

    return isValid
  }, [ addLog ])

  useGlobalBarcodeScanner({
    enabled  : mode === 'global',
    minLength: HOOKS.global.minLength,
    onScan   : handleScan,
    onValid  : handleValid
  })

  useBarcodeScanner2({
    autoFocus: mode === 'input',
    enabled  : mode === 'input',
    id       : 'demo',
    inputRef,
    minLength: HOOKS.input.minLength,
    onScan   : handleScan,
    onValid  : handleValid
  })

  const reset = () => {
    setScannedValue(null)
    addLog('Reset - esperando nuevo escaneo')
    inputRef.current?.focus({ preventScroll: true })
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="px-4 pb-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
      <HookToggle mode={mode} onChange={setMode} />

      {scannedValue ? (
        <div className="w-full bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/40 rounded-2xl p-8 text-center backdrop-blur shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-emerald-300 mb-1">Escaneo exitoso</h2>
          <p className="text-sm text-slate-400 mb-4">Código capturado</p>
          <code className="block text-2xl md:text-3xl font-mono bg-slate-950/60 border border-emerald-500/30 px-6 py-4 rounded-xl text-emerald-200 break-all mb-4">
            {scannedValue}
          </code>
          <div className="flex justify-center mb-4">
            <CopyButton value={scannedValue} />
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/30"
          >
            Escanear otro código
          </button>
        </div>
      ) : (
        <ScanSurface
          config={config}
          focused={focused}
          inputRef={inputRef}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}

      <LogPanel logs={logs} onClear={clearLogs} />
    </div>
  )
}

export default BarcodeScanner
