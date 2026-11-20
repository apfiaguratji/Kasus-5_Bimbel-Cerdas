import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './server/apiRouter.ts';

const PORT = Number(process.env.PORT || 3000);
const isProdStart =
  process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';

async function startServer() {
  const app = express();
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(rootDir, 'dist');
  const distIndex = path.join(distDir, 'index.html');

  // Mount REST API endpoints
  app.use('/api', createApiRouter());

  let mountedVite = false;
  if (!isProdStart || !fs.existsSync(distIndex)) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      mountedVite = true;
    } catch {
      mountedVite = false;
    }
  }

  if (!mountedVite) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bimbel Cerdas server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Bimbel Cerdas server:', err);
  process.exit(1);
});
