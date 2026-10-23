import { cp, mkdir } from 'node:fs/promises'
// Serve the pinned package's fonts locally, without MathLive CDN requests.
await mkdir('public/mathlive', { recursive: true })
await cp('node_modules/mathlive/fonts', 'public/mathlive/fonts', { recursive: true })
