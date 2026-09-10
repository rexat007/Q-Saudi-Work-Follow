import fs from 'node:fs';
import path from 'node:path';
import ar from '../src/locales/ar';
import en from '../src/locales/en';
import ur from '../src/locales/ur';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs');
fs.mkdirSync(OUT, { recursive: true });

function leafPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    out.push(...leafPaths(child, next));
  }
  return out;
}

const sets = {
  ar: new Set(leafPaths(ar)),
  en: new Set(leafPaths(en)),
  ur: new Set(leafPaths(ur)),
};
const all = new Set([...sets.ar, ...sets.en, ...sets.ur]);
const missing = {
  ar: [...all].filter(k => !sets.ar.has(k)).sort(),
  en: [...all].filter(k => !sets.en.has(k)).sort(),
  ur: [...all].filter(k => !sets.ur.has(k)).sort(),
};
const report = {
  totalKeys: all.size,
  localeKeys: Object.fromEntries(Object.entries(sets).map(([locale, set]) => [locale, set.size])),
  missing,
};
fs.writeFileSync(path.join(OUT, 'I18N_MISSING_KEYS.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT, 'I18N_MISSING_KEYS.md'), [
  '# i18n Missing-Key Report', '',
  `Total unique translation keys: **${all.size}**`, '',
  ...Object.entries(sets).map(([locale, set]) => `- ${locale}: **${set.size}** keys`), '',
  `Missing Arabic keys: **${missing.ar.length}**`,
  `Missing English keys: **${missing.en.length}**`,
  `Missing Urdu keys: **${missing.ur.length}**`, '',
  ...Object.entries(missing).flatMap(([locale, keys]) => [`## ${locale}`, '', ...(keys.length ? keys.map(k => `- ${k}`) : ['- None']), '']),
].join('\n'));

if (missing.ar.length || missing.en.length || missing.ur.length) process.exit(1);
console.log(`i18n key parity: ${all.size} keys; all locales complete`);
