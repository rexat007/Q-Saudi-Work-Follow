import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

type FindingKind = 'jsx-text' | 'jsx-attribute' | 'user-message';
type Classification =
  | 'REAL_USER_FACING'
  | 'TECHNICAL_IDENTIFIER'
  | 'DATA_VALUE'
  | 'CODE_VALUE'
  | 'COMMENT'
  | 'TEST_FIXTURE'
  | 'LOG_ONLY'
  | 'FALSE_POSITIVE'
  | 'INTENTIONAL_NON_TRANSLATABLE';
type Finding = { file: string; line: number; kind: FindingKind; text: string; context: string; classification: Classification };

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const IGNORE = new Set(['locales', 'i18n', 'node_modules']);
const USER_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'aria-description', 'alt', 'label', 'helperText', 'errorMessage']);
const USER_CALLS = new Set(['alert', 'confirm', 'toast', 'notify', 'setError', 'setSuccess', 'setWarning', 'setInfo']);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function clean(text: string): string { return text.replace(/\s+/g, ' ').trim(); }
function isMeaningful(text: string): boolean {
  const value = clean(text);
  if (!value || value.length < 2) return false;
  if (/^[{}()\[\].,:;!?+\-*/=<>|&]+$/.test(value)) return false;
  if (/^(https?:\/\/|mailto:|tel:)/.test(value)) return false;
  return /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
}
function jsxAttributeName(name: ts.JsxAttributeName): string {
  return ts.isIdentifier(name) ? name.text : name.getText();
}
function isInsideTranslation(node: ts.Node): boolean {
  let p: ts.Node | undefined = node.parent;
  while (p) {
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && ['t', 'translate'].includes(p.expression.text)) return true;
    p = p.parent;
  }
  return false;
}
function classify(file: string, text: string, kind: FindingKind, context: string): Classification {
  const value = clean(text);
  if (file.includes('/tests/')) return 'TEST_FIXTURE';
  if (kind === 'user-message') return 'REAL_USER_FACING';
  if (/^(null|undefined|true|false|NaN|Infinity)$/i.test(value)) return 'CODE_VALUE';
  if (/^(https?:\/\/|mailto:|tel:|[A-Za-z]:\\|\/)/.test(value)) return 'TECHNICAL_IDENTIFIER';
  if (/\b(createEvent|createTrip|transition)\([^)]*\)/.test(value)) return 'INTENTIONAL_NON_TRANSLATABLE';
  if (/^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)+$/.test(value)) return 'TECHNICAL_IDENTIFIER';
  if (/^[A-Z0-9_-]{3,}$/.test(value) && !/\s/.test(value)) return 'TECHNICAL_IDENTIFIER';
  if (/^\.?[A-Za-z0-9_-]+\.(md|json|csv|xlsx?|pdf)$/i.test(value)) return 'TECHNICAL_IDENTIFIER';
  if (context.includes('JSX title') || context.includes('JSX aria-') || context.includes('JSX placeholder') || context.includes('JSX label') || context.includes('JSX helperText') || context.includes('JSX errorMessage')) return 'REAL_USER_FACING';
  if (['KG', 'SAR', 'PDF', 'ID:', 'UUID'].includes(value)) return 'INTENTIONAL_NON_TRANSLATABLE';
  return 'REAL_USER_FACING';
}

const findings: Finding[] = [];
for (const file of files(SRC)) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = clean(node.getText(sf));
      if (isMeaningful(text)) {
        const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const context = 'JSX text node';
        findings.push({ file: rel, line: pos.line + 1, kind: 'jsx-text', text, context, classification: classify(rel, text, 'jsx-text', context) });
      }
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = jsxAttributeName(node.name);
      const text = clean(node.initializer.text);
      if (USER_ATTRS.has(name) && isMeaningful(text) && !isInsideTranslation(node)) {
        const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const context = `JSX ${name}`;
        findings.push({ file: rel, line: pos.line + 1, kind: 'jsx-attribute', text, context, classification: classify(rel, text, 'jsx-attribute', context) });
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && USER_CALLS.has(node.expression.text)) {
      for (const arg of node.arguments) {
        if (ts.isStringLiteral(arg) && isMeaningful(arg.text) && !isInsideTranslation(arg)) {
          const pos = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
          const context = `${node.expression.text}()`;
          findings.push({ file: rel, line: pos.line + 1, kind: 'user-message', text: clean(arg.text), context, classification: 'REAL_USER_FACING' });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.text.localeCompare(b.text));
const counts = findings.reduce<Record<string, number>>((acc, f) => { acc[f.classification] = (acc[f.classification] ?? 0) + 1; return acc; }, {});
const reportDir = path.join(ROOT, 'docs');
fs.mkdirSync(reportDir, { recursive: true });
const real = findings.filter(f => f.classification === 'REAL_USER_FACING');
const report = [
  '# i18n Audit Report', '', `Generated: ${new Date().toISOString()}`, '', `Total scanner findings: **${findings.length}**`, `Real user-facing: **${real.length}**`, '',
  '## Classification summary', '',
  ...Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `- ${k}: **${v}**`), '',
  '| File | Line | Kind | Classification | Text | Context |', '|---|---:|---|---|---|---|',
  ...findings.map(f => `| ${f.file} | ${f.line} | ${f.kind} | ${f.classification} | ${f.text.replaceAll('|', '\\|')} | ${f.context} |`), '',
  '## Merge policy', '',
  '- `REAL_USER_FACING` findings are merge blockers until migrated to the typed catalog.',
  '- Technical identifiers, test fixtures, code values, and intentional non-translatable UI tokens are reported for auditability but do not fail the strict gate.',
  '- The classifier is deliberately conservative: uncertain text remains `REAL_USER_FACING` rather than being silently suppressed.', '',
].join('\n');
fs.writeFileSync(path.join(reportDir, 'I18N_AUDIT_REPORT.md'), report);
fs.writeFileSync(path.join(reportDir, 'I18N_AUDIT_REPORT.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: findings.length, counts, findings }, null, 2));
console.log(`i18n audit: ${findings.length} findings; ${real.length} real user-facing blockers`);
if (process.argv.includes('--strict') && real.length > 0) process.exit(1);
