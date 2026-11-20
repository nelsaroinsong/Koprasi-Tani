// Didaftarkan lewat `node --import ./tests/support/register.mjs` (lihat script "test" di package.json)
import { register } from 'node:module';
register('./resolve-hook.mjs', import.meta.url);
