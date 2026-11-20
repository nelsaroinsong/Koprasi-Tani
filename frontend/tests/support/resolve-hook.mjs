/**
 * Resolver untuk test Node.js bawaan (node:test) tanpa dependensi:
 * - alias "@/..." -> folder frontend
 * - import tanpa ekstensi -> coba .ts / .tsx / index.ts
 * - modul infrastruktur (Redis, email) diganti stub agar test tidak tersambung ke layanan luar
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STUBS = {
  '@/lib/redis': 'tests/support/stubs/redis.ts',
  '@/lib/mailer': 'tests/support/stubs/mailer.ts',
};
const EXTS = ['.ts', '.tsx', '/index.ts'];

function tryFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) {
    return { url: pathToFileURL(path.join(ROOT, STUBS[specifier])).href, shortCircuit: true };
  }
  // Paket Next.js tidak punya peta "exports" untuk subpath (mis. next/server -> next/server.js)
  if (/^next\/[a-z/-]+$/.test(specifier)) {
    return next(`${specifier}.js`, context);
  }
  if (specifier.startsWith('@/')) {
    const file = tryFile(path.join(ROOT, specifier.slice(2)));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const file = tryFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}
