import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(source, process.argv[2] || '.');
const skipped = new Set(['node_modules', 'dist', '.git', 'scripts']);

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (skipped.has(entry.name)) return [];
    const filename = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(filename) : [filename];
  });
}

const files = filesIn(root);
const pages = files.filter((file) => file.endsWith('.html'));
const errors = [];
let references = 0;

for (const file of files.filter((item) => /\.(html|css|js)$/.test(item))) {
  const text = readFileSync(file, 'utf8');
  const label = relative(root, file);
  if (/(?:fynudge|finudge|finvexa)/i.test(text)) errors.push(`${label}: obsolete branding`);
  const urls = extname(file) === '.html'
    ? [...text.matchAll(/\b(?:src|href|action)\s*=\s*["']([^"']+)["']/g)].map((match) => match[1])
    : extname(file) === '.css'
      ? [...text.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)].map((match) => match[1])
      : [...text.matchAll(/\b(?:from\s*|import\s*)["']([^"']+)["']/g)].map((match) => match[1]);

  for (const value of urls) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    if (file.endsWith('.js') && !value.startsWith('.') && !value.startsWith('/')) continue;
    const url = new URL(value.replaceAll('&amp;', '&'), `https://local.invalid/${label.split(sep).join('/')}`);
    const pathname = decodeURIComponent(url.pathname);
    const target = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    references += 1;
    if (!existsSync(target)) {
      errors.push(`${label}: missing ${value}`);
    } else if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      const content = readFileSync(target, 'utf8');
      if (![...content.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)].some((match) => match[1] === id)) {
        errors.push(`${label}: missing fragment ${value}`);
      }
    }
  }
}

if (root !== source) {
  for (const file of filesIn(source).filter((item) => item.endsWith('.html'))) {
    if (!existsSync(resolve(root, relative(source, file)))) errors.push(`Build omitted ${relative(source, file)}`);
  }
}

assert.ok(pages.length > 0, 'No HTML pages found');
assert.equal(errors.length, 0, errors.join('\n'));
console.info(`Validated ${pages.length} pages and ${references} local references in ${relative(source, root) || 'source'}.`);
