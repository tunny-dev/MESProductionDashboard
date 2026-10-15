/**
 * Rà thư viện: package nào đã cài mà không dùng, package nào dùng mà chưa khai.
 *
 * Chạy: node scripts/audit-deps.mjs
 *
 * Cần khi người ta hỏi "sao nhiều thư viện thế". Cái thật không phải số dòng
 * trong package.json mà là có bao nhiêu thứ KHÔNG dùng: chúng vẫn được cài,
 * vẫn vào lockfile, vẫn chậm lần build sau.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

/** Mọi thư mục không đọc vào khi rà. */
const SKIP = new Set([
  'node_modules',
  'dist',
  '.git',
  '.idea',
  'coverage',
  '.agents',
  'public',
  'api',
  'design',
  'docs',
]);

const SCAN_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.css']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const sources = files.map((f) => ({ path: f, text: readFileSync(f, 'utf8') }));

/** Tên mà code có thể xuất hiện: cả `pkg` lẫn `@scope/pkg` (bỏ scope). */
function namesFor(name) {
  return name.startsWith('@') ? [name, name.split('/')[1]] : [name];
}

function countUsages(pkgName) {
  const names = namesFor(pkgName);
  const hits = [];
  for (const file of sources) {
    if (file.path.includes('package.json') || file.path.includes('skills-lock')) continue;
    const used = names.some(
      (n) =>
        file.text.includes(`'${n}'`) ||
        file.text.includes(`"${n}"`) ||
        file.text.includes(`'${n}/`) ||
        file.text.includes(`"${n}/`)
    );
    if (used) hits.push(relative(ROOT, file.path).replaceAll('\\', '/'));
  }
  return hits;
}

const groups = [
  ['dependencies', pkg.dependencies ?? {}],
  ['devDependencies', pkg.devDependencies ?? {}],
];

const unused = [];
const used = [];

for (const [group, deps] of groups) {
  for (const [name, version] of Object.entries(deps)) {
    const hits = countUsages(name);
    const row = { name, version, group, hits };
    if (hits.length === 0) unused.push(row);
    else used.push(row);
  }
}

console.log(`# Rà thư viện — ${sources.length} tệp nguồn đã đọc\n`);

console.log(`## Dùng (${used.length})`);
for (const r of used.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${r.name.padEnd(32)} ${r.version.padEnd(12)} ${r.hits.length} tệp`);
}

console.log(`\n## KHÔNG dùng (${unused.length})`);
if (unused.length === 0) console.log('  (không có)');
for (const r of unused.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${r.name.padEnd(32)} ${r.version.padEnd(12)} [${r.group}]`);
}
