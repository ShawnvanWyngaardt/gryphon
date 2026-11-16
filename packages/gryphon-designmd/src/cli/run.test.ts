import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { Ajv2020 } from 'ajv/dist/2020.js';
import { afterEach, describe, expect, it } from 'vitest';

import schema from '../../schema/report-v1.schema.json' with { type: 'json' };
import { run } from './run.js';

const DESIGN = `---
name: Test
colors:
  primary: "#1B1A17"
  accent: "#1F5C45"
spacing:
  sm: 8px
  md: 16px
rounded:
  sm: 2px
typography:
  body:
    fontFamily: Inter
    fontSize: 16px
---
`;

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Creates a temporary project from a map of relative paths to contents. */
function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'gryphon-cli-'));
  dirs.push(dir);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

async function cli(
  cwd: string,
  ...argv: string[]
): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await run(argv, {
    cwd,
    env: {},
    stdout: { write: (s: string) => void (out += s), isTTY: false },
    stderr: { write: (s: string) => void (err += s) },
  });
  return { code, out, err };
}

describe('gryphon check: results and exit codes (AC5.1, AC5.3)', () => {
  it('reports off-token values with file, line and column, and exits 1', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'src/a.css': '.a {\n  color: #6366f1;\n  padding: 8px 13px;\n}\n',
    });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(1);
    expect(out).toContain('src/a.css');
    expect(out).toMatch(/2:10 +error +off-token +#6366f1 is not a DESIGN\.md colour/);
    expect(out).toMatch(/3:16 +error +off-token +13px is not a DESIGN\.md spacing value/);
    expect(out).toMatch(/3:12 +warning +raw-token-value +8px is the value of spacing\.sm/);
    expect(out).toContain('2 errors, 1 warning in 1 file (1 file checked)');
  });

  it('exits 0 when there are only warnings', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { color: #1B1A17; }' });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(0);
    expect(out).toContain('0 errors, 1 warning');
  });

  it('fails on warnings past --max-warnings', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { color: #1B1A17; }' });
    expect((await cli(dir, 'check', '--max-warnings', '0')).code).toBe(1);
    expect((await cli(dir, 'check', '--max-warnings', '1')).code).toBe(0);
  });

  it('says so when everything follows DESIGN.md', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': '.a { color: var(--primary); margin: 0; }',
    });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(0);
    expect(out).toContain('No problems found in 1 file.');
  });

  it('checks only the paths given', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a/x.css': '.a { color: red; }',
      'b/y.css': '.a { color: blue; }',
    });
    const { out } = await cli(dir, 'check', 'a');
    expect(out).toContain('a/x.css');
    expect(out).not.toContain('b/y.css');
  });

  it('reports files it could not parse without stopping (AC2.8)', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'bad.css': '.a { color: red;',
      'ok.css': '.a { color: blue; }',
    });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(1);
    expect(out).toContain('bad.css: skipped, could not parse: Unclosed block');
    expect(out).toContain('ok.css');
  });
});

describe('gryphon check: DESIGN.md problems exit 2 (AC5.3)', () => {
  it('exits 2 when DESIGN.md is missing', async () => {
    const { code, err } = await cli(project({ 'a.css': '' }), 'check');
    expect(code).toBe(2);
    expect(err).toContain('Could not read DESIGN.md');
  });

  it('exits 2 with the parser message and line when DESIGN.md is invalid', async () => {
    const dir = project({ 'DESIGN.md': '---\ncolors:\n  ink: "{colors.nope}"\n---\n' });
    const { code, err } = await cli(dir, 'check');
    expect(code).toBe(2);
    expect(err).toContain(
      'DESIGN.md:3:8: colors.ink refers to {colors.nope}, which is not defined in DESIGN.md.',
    );
  });

  it('prints DESIGN.md warnings to stderr and carries on', async () => {
    const dir = project({
      'DESIGN.md': DESIGN.replace('name: Test', 'name: Test\nmotion:\n  fast: 1s'),
      'a.css': '',
    });
    const { code, err } = await cli(dir, 'check');
    expect(code).toBe(0);
    expect(err).toMatch(/DESIGN\.md:\d+:\d+: warning: "motion" is not a token group/);
  });

  it('reads DESIGN.md from --design', async () => {
    const dir = project({ 'docs/DESIGN.md': DESIGN, 'a.css': '.a { color: #1B1A17; }' });
    expect((await cli(dir, 'check', '--design', 'docs/DESIGN.md')).code).toBe(0);
  });
});

describe('gryphon check: file discovery (AC2.9)', () => {
  it('checks .css and .scss, and skips node_modules, dist, build and coverage', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': '.a { color: red; }',
      'b.scss': '.b { color: red; }',
      'c.vue': '<style>.c { color: red; }</style>',
      'node_modules/x/x.css': '.x { color: red; }',
      'dist/d.css': '.d { color: red; }',
      'build/e.css': '.e { color: red; }',
      'coverage/f.css': '.f { color: red; }',
    });
    const { out } = await cli(dir, 'check');
    expect(out).toContain('2 errors, 0 warnings in 2 files (2 files checked)');
    expect(out).not.toMatch(/node_modules|dist\/|build\/|coverage\/|c\.vue/);
  });

  it('respects .gitignore inside a git repository', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      '.gitignore': 'generated/\n',
      'a.css': '.a { color: red; }',
      'generated/g.css': '.g { color: red; }',
    });
    execFileSync('git', ['init', '-q'], { cwd: dir });
    const { out } = await cli(dir, 'check');
    expect(out).toContain('(1 file checked)');
    expect(out).not.toContain('generated');
  });
});

describe('gryphon check: output (AC5.2, AC5.4)', () => {
  it('prints a report that matches the JSON schema with --format json', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { color: #6366f1; padding: 1em; }' });
    const { code, out } = await cli(dir, 'check', '--format', 'json');
    expect(code).toBe(1);
    const report = JSON.parse(out);
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(validate(report)).toBe(true);
    expect(report.summary).toMatchObject({ files: 1, errors: 1, warnings: 1 });
    expect(report.findings[1]).toMatchObject({ value: '1em', approximate: true });
  });

  it('never uses colour as the only signal, and adds no colour codes when not a terminal', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { color: red; }' });
    const { out } = await cli(dir, 'check');
    expect(out).toContain('error');
    // eslint-disable-next-line no-control-regex
    expect(out).not.toMatch(/\u001b\[/);
  });

  it('uses colour in a terminal, unless NO_COLOR is set', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { color: red; }' });
    let out = '';
    const io = (env: Record<string, string>) => ({
      cwd: dir,
      env,
      stdout: { write: (s: string) => void (out += s), isTTY: true },
      stderr: { write: () => undefined },
    });
    await run(['check'], io({}));
    // eslint-disable-next-line no-control-regex
    expect(out).toMatch(/\u001b\[/);
    out = '';
    await run(['check'], io({ NO_COLOR: '1' }));
    // eslint-disable-next-line no-control-regex
    expect(out).not.toMatch(/\u001b\[/);
  });

  it('marks approximate em findings in text output', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { padding: 1em; }' });
    expect((await cli(dir, 'check')).out).toContain('Approximate: em is measured');
  });
});

describe('gryphon: help, version and bad usage (AC5.2)', () => {
  it('prints help and exits 0', async () => {
    const { code, out } = await cli(project({}), '--help');
    expect(code).toBe(0);
    expect(out).toContain('Usage: gryphon check [paths...]');
  });

  it('prints the version', async () => {
    const { code, out } = await cli(project({}), '--version');
    expect(code).toBe(0);
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exits 2 on an unknown option or command, with a hint', async () => {
    for (const argv of [
      ['check', '--nope'],
      ['lint'],
      ['check', '--format', 'xml'],
      ['check', '--max-warnings', 'x'],
    ]) {
      const { code, err } = await cli(project({}), ...argv);
      expect(code).toBe(2);
      expect(err).toContain('gryphon --help');
    }
  });
});
