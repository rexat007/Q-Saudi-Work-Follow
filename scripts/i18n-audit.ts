import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

type FindingKind = 'jsx-text' | 'jsx-attribute' | 'user-message';
type Finding = { file: string; line: number; kind: FindingKind; text: string; context: string };

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
        findings.push({ file: rel, line: pos.line + 1, kind: 'jsx-text', text, context: 'JSX text node' });
      }
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = jsxAttributeName(node.name);
      const text = clean(node.initializer.text);
      if (USER_ATTRS.has(name) && isMeaningful(text) && !isInsideTranslation(node)) {
        const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        findings.push({ file: rel, line: pos.line + 1, kind: 'jsx-attribute', text, context: `JSX ${name}` });
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && USER_CALLS.has(node.expression.text)) {
      for (const arg of node.arguments) {
        if (ts.isStringLiteral(arg) && isMeaningful(arg.text) && !isInsideTranslation(arg)) {
          const pos = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
          findings.push({ file: rel, line: pos.line + 1, kind: 'user-message', text: clean(arg.text), context: `${node.expression.text}()` });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.text.localeCompare(b.text));
const reportDir = path.join(ROOT, 'docs');
fs.mkdirSync(reportDir, { recursive: true });
const report = [
  '# i18n Audit Report', '', `Generated: ${new Date().toISOString()}`, '', `Findings: **${findings.length}**`, '',
  '| File | Line | Kind | Text | Context |', '|---|---:|---|---|---|',
  ...findings.map(f => `| ${f.file} | ${f.line} | ${f.kind} | ${f.text.replaceAll('|', '\\|')} | ${f.context} |`), '',
  '## Merge policy', '',
  '- New user-visible strings must be expressed through the typed `t(...)` catalog.',
  '- Existing findings must be migrated deliberately; this scanner does not auto-translate business/domain text.',
  '- Technical identifiers, CSS classes, enum values, URLs, and non-user-facing code are intentionally outside this report.', '',
].join('\n');
fs.writeFileSync(path.join(reportDir, 'I18N_AUDIT_REPORT.md'), report);
fs.writeFileSync(path.join(reportDir, 'I18N_AUDIT_REPORT.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: findings.length, findings }, null, 2));
console.log(`i18n audit: ${findings.length} user-visible hardcoded string candidates`);
if (process.argv.includes('--strict') && findings.length > 0) process.exit(1);
