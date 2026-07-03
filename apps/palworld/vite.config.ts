import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

// Serve the sibling `data-palworld` / `resource-palworld` artifact repos in dev.
// They live next to the frontend repo root (3 up from `apps/palworld`); when
// running from a worktree under `frontend/.claude/worktrees/<name>` they are
// 6 up instead, so probe both. Override with PALWORLD_DATA_DIR /
// PALWORLD_RES_DIR if needed. In prod the frontend reads from
// VITE_DATA_BASE_URL / VITE_RESOURCE_BASE_URL instead.
function siblingRepo(name: string): string {
  for (const up of ['../../..', '../../../../../..']) {
    const p = path.resolve(__dirname, up, name)
    if (fs.existsSync(p)) return p
  }
  return path.resolve(__dirname, '../../..', name)
}
const DATA_DIR = process.env.PALWORLD_DATA_DIR ?? siblingRepo('data-palworld')
const RES_DIR = process.env.PALWORLD_RES_DIR ?? siblingRepo('resource-palworld')

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
}

function staticDirPlugin(name: string, urlPrefix: string, rootDir: string): Plugin {
  const root = path.resolve(rootDir)
  return {
    name,
    configureServer(server) {
      server.middlewares.use(urlPrefix, (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0])
        const file = path.resolve(path.join(root, rel))
        if (!file.startsWith(root)) { res.statusCode = 403; res.end(); return }
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { next(); return }
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    staticDirPlugin('palworld-data', '/data', DATA_DIR),
    staticDirPlugin('palworld-res', '/palres', RES_DIR),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
