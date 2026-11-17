import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CONFIG_FILE, loadConfig } from './config.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function dirWith(config?: unknown, raw?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'gryphon-config-'));
  dirs.push(dir);
  if (raw !== undefined) writeFileSync(join(dir, CONFIG_FILE), raw);
  else if (config !== undefined) writeFileSync(join(dir, CONFIG_FILE), JSON.stringify(config));
  return dir;
}

const error = (dir: string, path?: string): string => {
  const result = loadConfig(dir, path);
  if (result.ok) throw new Error('expected an error');
  return result.error;
};

describe('loadConfig (AC2.7)', () => {
  it('uses defaults when there is no config file', () => {
    expect(loadConfig(dirWith())).toEqual({ ok: true, config: {}, file: undefined });
  });

  it('reads every supported field', () => {
    const config = {
      design: 'docs/DESIGN.md',
      include: ['src/**'],
      exclude: ['**/legacy/**'],
      tokenSources: ['src/styles/tokens.css'],
      rootPx: 10,
      rules: { 'off-token': 'warning', 'raw-token-value': 'off' },
    };
    expect(loadConfig(dirWith(config))).toEqual({ ok: true, config, file: CONFIG_FILE });
  });

  it('reads a config file from another path', () => {
    const dir = dirWith();
    mkdirSync(join(dir, 'conf'));
    writeFileSync(join(dir, 'conf', 'g.json'), '{"rootPx": 20}');
    expect(loadConfig(dir, 'conf/g.json')).toEqual({
      ok: true,
      config: { rootPx: 20 },
      file: 'conf/g.json',
    });
  });

  it('fails when an explicit config file is missing', () => {
    expect(error(dirWith(), 'nope.json')).toBe('Could not read the config file nope.json.');
  });

  it('fails on invalid JSON, and says JavaScript is not supported', () => {
    expect(error(dirWith(undefined, '{ design: "x" }'))).toMatch(
      /^gryphon\.config\.json is not valid JSON: .*\. The config file must be plain JSON\.$/,
    );
  });

  it.each([
    [[], 'gryphon.config.json must contain a JSON object.'],
    [
      { colour: 'red' },
      'gryphon.config.json: unknown option "colour". Known options: design, include, exclude, tokenSources, rootPx, rules.',
    ],
    [{ design: 3 }, 'gryphon.config.json: "design" must be a file path (a string).'],
    [{ include: 'src/**' }, 'gryphon.config.json: "include" must be a list of glob strings.'],
    [{ exclude: [1] }, 'gryphon.config.json: "exclude" must be a list of glob strings.'],
    [{ tokenSources: [''] }, 'gryphon.config.json: "tokenSources" must be a list of glob strings.'],
    [{ rootPx: 0 }, 'gryphon.config.json: "rootPx" must be a number greater than 0.'],
    [{ rootPx: '16' }, 'gryphon.config.json: "rootPx" must be a number greater than 0.'],
    [
      { rules: [] },
      'gryphon.config.json: "rules" must be an object, for example { "raw-token-value": "off" }.',
    ],
    [
      { rules: { 'no-such-rule': 'off' } },
      'gryphon.config.json: unknown rule "no-such-rule". Known rules: off-token, raw-token-value.',
    ],
    [
      { rules: { 'off-token': 'loud' } },
      'gryphon.config.json: rule "off-token" must be "error", "warning" or "off".',
    ],
  ])('rejects %j', (config, message) => {
    expect(error(dirWith(config))).toBe(message);
  });
});
