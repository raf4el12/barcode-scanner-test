# barcode-scanner-test

Captura de códigos de barras en una SPA React **sin que aparezca el teclado virtual en móvil**, soportando tanto escáneres HID (Zebra/Honeywell) como escáneres del celular que inyectan texto vía IME (cámara, apps de scanner).

**Demo:** https://barcode-scanner-test-p3yqee6yb-gomerorafael121-3462s-projects.vercel.app

---

## El problema

1. Los escáneres móviles del celular inyectan el código en el input enfocado, lo que **abre el teclado virtual** y rompe la UX.
2. Los escáneres entregan el texto de tres formas distintas:
   - HID puro: cada carácter como `keydown` + sufijo `Enter`.
   - IME del cel con sufijo: un solo `input` event con todo el string + `\n`.
   - IME del cel sin sufijo: un solo `input` event sin terminador.
3. Atributos para "ocultar el teclado" (`inputmode="none"`, `readonly`) **bloquean** la inyección IME del escáner.

## La solución

Un componente `<Barcode />` que renderiza un `<input>` invisible (1×1 px, transparente, intocable) **dentro del viewport** y le da foco **solo programáticamente** (sin gesto de usuario).

```tsx
import Barcode from './Barcode'

<Barcode
  onScan={(value) => console.log('Escaneado:', value)}
  onValid={(value) => value.length >= 3}  // opcional
  minLength={3}                            // opcional
/>
```

### Por qué funciona

| Pieza | Para qué sirve |
|---|---|
| `pointer-events: none` en el input | El usuario no puede tocarlo → no hay gesto → no se abre teclado |
| `opacity: 0` + `1×1 px` | Invisible visualmente |
| `position: fixed; top: 0; left: 0` | **Dentro del viewport** — el IME del cel necesita un elemento on-screen para inyectar |
| `.focus()` desde `useEffect` | Foco programático sin gesto de usuario → Android Chrome / iOS Safari **no abren el teclado** |
| Listener `keydown` Enter | Captura escáneres HID (Zebra, Honeywell) |
| Listener `input` + detección `\r\n` | Captura escáneres IME con sufijo Enter |
| Debounce 120 ms tras último `input` event | Fallback para escáneres IME **sin** sufijo Enter |
| `<input>` siempre montado | Foco persistente → escaneo masivo sin tap manual entre lecturas |

### Atributos clave que **NO** se deben usar

- ❌ `inputmode="none"` — bloquea la inyección IME en algunos escáneres del cel.
- ❌ `readOnly` — bloquea la inyección IME completamente.
- ❌ Posicionar offscreen (`top: -1000px`) — algunos IMEs ignoran elementos fuera del viewport.

---

## Estructura

```
src/
├── main.tsx                    # bootstrap React
├── App.tsx                     # layout + header
├── BarcodeScanner.tsx          # demo: lista acumulativa de escaneos
├── Barcode.tsx                 # ⭐ componente encapsulado (hook + input oculto)
├── useBarcodeScanner2.ts       # hook de captura (HID + IME)
├── useGlobalBarcodeScanner.ts  # hook alternativo: window keydown (solo HID)
└── index.css                   # @import "tailwindcss"
```

## API del componente `<Barcode />`

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `onScan` | `(value: string) => void \| Promise<void>` | — | **Requerido.** Disparado al completar un escaneo válido. |
| `onValid` | `(value: string) => boolean` | — | Filtro opcional. Si retorna `false`, el valor se reenvía al bus global `barcode-scanner:scan`. |
| `enabled` | `boolean` | `true` | Activa/desactiva la captura. |
| `autoFocus` | `boolean` | `true` | Mantiene el foco programático en el input oculto. |
| `minLength` | `number` | `3` | Longitud mínima del código para disparar `onScan`. |
| `debounceMs` | `number` | `120` | Ventana de espera (ms) antes de flushear cuando no llega `\n`. |
| `controls` | `Record<string, string>` | `{}` | Atajos `Ctrl/Alt/Meta+key` → `onScan(value)` (útil para pruebas). |
| `id` | `string` | — | Identificador para logs / debug. |

## Hooks (uso avanzado)

- **`useBarcodeScanner2`** — recibe un `inputRef` externo. Úsalo si necesitas control sobre el elemento `<input>`.
- **`useGlobalBarcodeScanner`** — listener global a nivel `window`. Solo HID; no requiere input. **No funciona con escáneres IME del cel.**

---

## Stack

- React 19.2 + TypeScript 6.0
- Vite 8 + Tailwind CSS v4 (`@tailwindcss/vite`)
- ESLint 10 (typescript-eslint + react-hooks)

## Scripts

```bash
npm install
npm run dev                       # http://localhost:5173
npm run dev -- --host 0.0.0.0     # accesible en LAN
npm run build                     # tsc + vite build
npm run lint
```

### Probar desde un celular en otra red

```bash
ssh -R 80:localhost:5173 serveo.net   # túnel HTTPS público
```

`vite.config.ts` ya tiene `server.allowedHosts` configurado para `*.serveousercontent.com` y `*.serveo.net`.

## Despliegue

Vercel CLI:

```bash
npx vercel login
npx vercel --prod
```

Cada `vercel --prod` genera una URL `*.vercel.app`. Para auto-deploy en push, conectar el repo desde el dashboard de Vercel.
