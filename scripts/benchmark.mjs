// Benchmark for NFR-P1 and NFR-P3 (G4-07).
//
// Generates 1,000 UI files (CSS, SCSS and Vue, about 150 lines each)
// from a fixed seed, then times the built CLI on them as a separate
// process, Node start-up included, as users run it. Fails when the run
// takes longer than the limit, or when the heap goes over 512 MB.
//
// Usage: npm run build && npm run bench
// BENCH_LIMIT_MS overrides the time limit (default 15000, the CI limit
// agreed in SPEC NFR-P1; the laptop target is 10000).

import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

const FILES = 1000;
const LINES_PER_FILE = 150;
const LIMIT_MS = Number(process.env.BENCH_LIMIT_MS ?? 15000);
const HEAP_MB = 512;
const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'packages/gryphon-designmd/dist/src/cli/main.js');

// Small deterministic random generator (mulberry32), so every run checks the same files.
let seed = 20261122;
const random = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];

// A mix of on-token, off-token and always-allowed values, like real code.
const colors = [
  '#1B1A17',
  '#1F5C45',
  '#6366f1',
  '#f34213',
  'var(--color-ink)',
  'currentColor',
  'rgb(27 26 23)',
];
const sizes = ['8px', '16px', '13px', '1rem', '0', 'var(--space-md)', '24px', '7px'];
const declarations = [
  () => `color: ${pick(colors)};`,
  () => `background: ${pick(colors)};`,
  () => `padding: ${pick(sizes)} ${pick(sizes)};`,
  () => `margin: ${pick(sizes)};`,
  () => `gap: ${pick(sizes)};`,
  () => `border-radius: ${pick(['2px', '4px', '6px', '0'])};`,
  () => `font-size: ${pick(['14px', '16px', '15px', '1.125rem'])};`,
  () =>
    `font-family: ${pick(['"Atkinson Hyperlegible Next", sans-serif', 'Inter, sans-serif', 'var(--font)'])};`,
  () => `width: ${pick(['100%', '320px', 'auto'])};`,
];

// Whole rules only, so every file is valid CSS. (A first version cut
// files mid-rule, so most were skipped as unparseable and the run
// looked fast for the wrong reason. The skipped check below guards it.)
function cssBody(lines) {
  const out = [];
  let i = 0;
  while (out.length + 9 <= lines) {
    out.push(`.block-${i++} {`);
    for (let d = 0; d < 6; d++) out.push(`  ${pick(declarations)()}`);
    out.push('}', '');
    if (random() < 0.2 && out.length < lines) out.push('/* layout notes */');
  }
  return out.join('\n');
}

function vueFile(lines) {
  const template = [
    '<template>',
    '  <section class="card" style="padding: 13px">',
    '    <h2>Title</h2>',
    '  </section>',
    '</template>',
    '',
  ];
  return [...template, '<style scoped>', cssBody(lines - template.length - 2), '</style>', ''].join(
    '\n',
  );
}

const dir = mkdtempSync(join(tmpdir(), 'gryphon-bench-'));
try {
  for (let n = 0; n < FILES; n++) {
    const folder = join(dir, 'src', `area-${n % 20}`);
    mkdirSync(folder, { recursive: true });
    const kind = n % 3;
    const name = kind === 0 ? `c${n}.css` : kind === 1 ? `s${n}.scss` : `V${n}.vue`;
    writeFileSync(
      join(folder, name),
      kind === 2 ? vueFile(LINES_PER_FILE) : cssBody(LINES_PER_FILE),
    );
  }

  const started = performance.now();
  const result = spawnSync(
    process.execPath,
    [
      `--max-old-space-size=${HEAP_MB}`,
      cli,
      'check',
      'src',
      '--design',
      join(root, 'DESIGN.md'),
      '--format',
      'json',
    ],
    { cwd: dir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const ms = Math.round(performance.now() - started);

  if (result.status !== 0 && result.status !== 1) {
    console.error(`The CLI failed (exit ${result.status}, signal ${result.signal ?? 'none'}).`);
    console.error(result.stderr.slice(-2000));
    process.exit(1);
  }
  const report = JSON.parse(result.stdout);
  if (report.summary.files !== FILES) {
    console.error(`Expected ${FILES} files checked, got ${report.summary.files}.`);
    process.exit(1);
  }
  // Every file must be scanned for real: a skipped file costs almost nothing.
  if (report.summary.skipped !== 0) {
    console.error(`${report.summary.skipped} files were skipped: the fixture is broken.`);
    console.error(JSON.stringify(report.skipped.slice(0, 3)));
    process.exit(1);
  }

  const findings = report.summary.errors + report.summary.warnings;
  console.log(
    `Checked ${FILES} files (about ${FILES * LINES_PER_FILE} lines, none skipped) in ${ms} ms, ${findings} findings.`,
  );
  console.log(`Limit: ${LIMIT_MS} ms (NFR-P1), heap capped at ${HEAP_MB} MB (NFR-P3).`);
  if (ms > LIMIT_MS) {
    console.error(`Too slow: ${ms} ms is over the ${LIMIT_MS} ms limit.`);
    process.exit(1);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
