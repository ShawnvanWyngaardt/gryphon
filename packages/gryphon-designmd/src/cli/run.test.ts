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

  it('checks an absolute path outside the current folder, even inside a git repo', async () => {
    const other = project({ 'DESIGN.md': DESIGN, 'src/x.css': '.a { color: red; }' });
    const here = project({ 'README.md': '' });
    execFileSync('git', ['init', '-q'], { cwd: here });
    const { code, out } = await cli(
      here,
      'check',
      join(other, 'src'),
      '--design',
      join(other, 'DESIGN.md'),
    );
    expect(code).toBe(1);
    expect(out).toContain('(1 file checked)');
  });

  it('checks a relative path that goes up out of the current folder', async () => {
    const parent = project({
      'app/DESIGN.md': DESIGN,
      'app/src/x.css': '.a { color: red; }',
      'tool/README.md': '',
    });
    const { out } = await cli(
      join(parent, 'tool'),
      'check',
      '../app/src',
      '--design',
      '../app/DESIGN.md',
    );
    expect(out).toContain('../app/src/x.css');
  });

  it('reports Vue findings at their line and column in the .vue file (G4-01)', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'src/Card.vue':
        '<template>\n  <div style="padding: 13px"></div>\n</template>\n\n<style scoped>\n.a { color: #6366f1; }\n</style>\n',
    });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(1);
    expect(out).toContain('src/Card.vue');
    expect(out).toMatch(/2:24 +error +off-token +13px/);
    expect(out).toMatch(/6:13 +error +off-token +#6366f1/);
  });

  it('reports a Vue file it could not parse without stopping', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'Bad.vue': '<template><div></template>',
      'ok.css': '.a { color: red; }',
    });
    const { out } = await cli(dir, 'check');
    expect(out).toMatch(/Bad\.vue: skipped, could not parse: /);
    expect(out).toContain('ok.css');
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

  it('skips categories DESIGN.md has no tokens for, with one notice each (D2)', async () => {
    const dir = project({
      'DESIGN.md': '---\ncolors:\n  primary: "#1B1A17"\n---\n',
      'a.css': '.a { color: red; padding: 13px; border-radius: 3px; }',
    });
    const { code, out, err } = await cli(dir, 'check');
    expect(code).toBe(1);
    expect(out).toContain('1 error, 0 warnings');
    expect(out).not.toContain('13px');
    expect(err).toContain('DESIGN.md defines no spacing tokens, so spacing was not checked.');
    expect(err).toContain('DESIGN.md defines no radius tokens, so radius was not checked.');
    expect(err).toContain(
      'DESIGN.md defines no font family tokens, so font families were not checked.',
    );
  });

  it('reads DESIGN.md from --design', async () => {
    const dir = project({ 'docs/DESIGN.md': DESIGN, 'a.css': '.a { color: #1B1A17; }' });
    expect((await cli(dir, 'check', '--design', 'docs/DESIGN.md')).code).toBe(0);
  });
});

describe('gryphon check: gryphon.config.json (G4-04, AC2.7)', () => {
  const css = '.a { color: #6366f1; padding: 8px; }';

  it('turns a rule off or changes its severity', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': css,
      'gryphon.config.json': JSON.stringify({
        rules: { 'raw-token-value': 'off', 'off-token': 'warning' },
      }),
    });
    const { code, out } = await cli(dir, 'check');
    expect(code).toBe(0);
    expect(out).toContain('0 errors, 1 warning');
    expect(out).toMatch(/warning +off-token +#6366f1/);
  });

  it('can make raw-token-value an error', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': '.a { padding: 8px; }',
      'gryphon.config.json': '{ "rules": { "raw-token-value": "error" } }',
    });
    expect((await cli(dir, 'check')).code).toBe(1);
  });

  it('applies include and exclude globs to the files found', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'src/a.css': css,
      'src/legacy/old.css': css,
      'other/b.css': css,
      'gryphon.config.json': '{ "include": ["src/**"], "exclude": ["**/legacy/**"] }',
    });
    const { out } = await cli(dir, 'check');
    expect(out).toContain('(1 file checked)');
    expect(out).toContain('src/a.css');
  });

  it('reads DESIGN.md from the config, and --design wins over it', async () => {
    const dir = project({
      'docs/DESIGN.md': DESIGN,
      'a.css': '.a { padding: 8px; }',
      'gryphon.config.json': '{ "design": "docs/DESIGN.md" }',
    });
    expect((await cli(dir, 'check')).code).toBe(0);
    expect((await cli(dir, 'check', '--design', 'nope.md')).code).toBe(2);
  });

  it('uses rootPx for rem values', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': '.a { padding: 1rem; }',
      'gryphon.config.json': '{ "rootPx": 8 }',
    });
    expect((await cli(dir, 'check')).out).toContain('1rem is the value of spacing.sm');
  });

  it('reads a config from --config', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'a.css': css,
      'ci/g.json': '{ "rules": { "off-token": "off" } }',
    });
    const { code, out } = await cli(dir, 'check', '--config', 'ci/g.json');
    // off-token is off, so only the raw-token-value warning for 8px is left.
    expect(code).toBe(0);
    expect(out).toContain('0 errors, 1 warning');
    expect(out).not.toContain('off-token');
  });

  it('uses tokenSources to decide where tokens may be defined (D3)', async () => {
    const files = {
      'DESIGN.md': DESIGN,
      'styles/tokens.css': '.theme { --accent: #1F5C45; }',
      'src/hero.css': '.hero { --hero-orange: #f34213; --hero-ink: #1B1A17; }',
    };
    // Without config, neither file has :root, so both are checked.
    const auto = (await cli(project(files), 'check')).out;
    expect(auto).toContain('styles/tokens.css');
    expect(auto).toContain('src/hero.css');
    const dir = project({ ...files, 'gryphon.config.json': '{ "tokenSources": ["styles/**"] }' });
    const { out } = await cli(dir, 'check');
    expect(out).not.toContain('styles/tokens.css');
    expect(out).toMatch(/error +off-token +#f34213/);
    expect(out).toMatch(/warning +raw-token-value +#1B1A17 is the value of colors\.primary/);
  });

  it('exits 2 with a clear message for an invalid config', async () => {
    const dir = project({
      'DESIGN.md': DESIGN,
      'gryphon.config.json': '{ "rules": { "off-token": "loud" } }',
    });
    const { code, err } = await cli(dir, 'check');
    expect(code).toBe(2);
    expect(err).toContain('rule "off-token" must be "error", "warning" or "off".');
  });
});

describe('gryphon check: summary when categories were skipped (review of PR 19)', () => {
  it('says "in the checked categories" when DESIGN.md left some out', async () => {
    const dir = project({
      'DESIGN.md': '---\ncolors:\n  primary: "#1B1A17"\n---\n',
      'a.css': '.a { padding: 13px; }',
    });
    expect((await cli(dir, 'check')).out).toContain(
      'No problems found in the checked categories in 1 file.',
    );
  });

  it('keeps the plain wording when every category was checked', async () => {
    const dir = project({ 'DESIGN.md': DESIGN, 'a.css': '.a { margin: 0; }' });
    expect((await cli(dir, 'check')).out).toContain('No problems found in 1 file.');
  });
});

describe('gryphon check: file discovery (AC2.9)', () => {
  it('checks .css, .scss and .vue, and skips node_modules, dist, build and coverage', async () => {
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
    expect(out).toContain('3 errors, 0 warnings in 3 files (3 files checked)');
    expect(out).toContain('c.vue');
    expect(out).not.toMatch(/node_modules|dist\/|build\/|coverage\//);
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
