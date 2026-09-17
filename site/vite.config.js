import { readdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

// Preserve every public HTML route in the production build.
function htmlEntries(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'assets', 'scripts', '.git'].includes(entry.name)) return [];
    const filename = resolve(directory, entry.name);
    return entry.isDirectory() ? htmlEntries(filename) : entry.name.endsWith('.html') ? [filename] : [];
  });
}

export default defineConfig({
  root,
  appType: 'mpa',
  server: { host: '0.0.0.0' },
  build: { rollupOptions: { input: htmlEntries(root) } },
  publicDir: false, // We'll manually handle static files
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        const distDir = resolve(root, 'dist');

        // Copy ads.txt to dist
        const adsTxtSrc = resolve(root, 'ads.txt');
        const adsTxtDest = resolve(distDir, 'ads.txt');

        if (existsSync(adsTxtSrc)) {
          copyFileSync(adsTxtSrc, adsTxtDest);
        }
      }
    }
  ]
});
