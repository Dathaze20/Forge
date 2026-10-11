import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Reads the exact same public/version.json that scripts/generate-version.mjs
// just wrote (it always runs first - see package.json), so the "current"
// version baked into this bundle and the "latest deployed" version.json
// served alongside it can never drift apart: both come from one file write.
function readBuildVersion(): string {
  try {
    const versionPath = join(__dirname, 'public', 'version.json');
    if (!existsSync(versionPath)) return 'dev';
    const parsed = JSON.parse(readFileSync(versionPath, 'utf-8'));
    return typeof parsed.commit === 'string' && parsed.commit ? parsed.commit : 'dev';
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(readBuildVersion()),
  },
  server: {
    port: 3000,
    host: true,
  },
});
