import BarcodeScanner from './BarcodeScanner'

const App = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
    <header className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Entorno de pruebas
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
        Lector de Código de Barras
      </h1>
      <p className="text-slate-400 mt-2 text-sm">
        Prueba los dos hooks de escaneo en tiempo real
      </p>
    </header>
    <BarcodeScanner />
  </div>
)

export default App
