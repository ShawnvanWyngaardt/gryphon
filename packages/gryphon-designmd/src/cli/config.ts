import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RuleId } from '../core/index.js';

export const CONFIG_FILE = 'gryphon.config.json';

export type RuleSetting = 'error' | 'warning' | 'off';

/** gryphon.config.json (AC2.7). Every field is optional. */
export interface Config {
  /** Path to DESIGN.md. `--design` wins over it. */
  design?: string;
  /** Only files matching one of these globs are checked. */
  include?: string[];
  /** Files matching one of these globs are not checked. */
  exclude?: string[];
  /** Files where tokens are defined, for example `src/styles/tokens.css` (used by D3, G4-22). */
  tokenSources?: string[];
  /** px per rem and em. Default 16. */
  rootPx?: number;
  /** Severity per rule, or "off". */
  rules?: Partial<Record<RuleId, RuleSetting>>;
}

export type ConfigResult =
  { ok: true; config: Config; file: string | undefined } | { ok: false; error: string };

const KNOWN = ['design', 'include', 'exclude', 'tokenSources', 'rootPx', 'rules'];
const RULES: RuleId[] = ['off-token', 'raw-token-value'];
const SETTINGS: RuleSetting[] = ['error', 'warning', 'off'];

const isGlobList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string' && v !== '');
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads gryphon.config.json from `cwd`, or the file given with
 * `--config`. The file is plain JSON: it is read, never executed
 * (NFR-S4). A missing default file is fine; a missing explicit file,
 * invalid JSON, an unknown option or a wrong type is an error.
 */
export function loadConfig(cwd: string, explicitPath?: string): ConfigResult {
  const file = explicitPath ?? CONFIG_FILE;
  let text: string;
  try {
    text = readFileSync(resolve(cwd, file), 'utf8');
  } catch {
    if (explicitPath === undefined) return { ok: true, config: {}, file: undefined };
    return { ok: false, error: `Could not read the config file ${file}.` };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: `${file} is not valid JSON: ${(error as Error).message}. The config file must be plain JSON.`,
    };
  }
  const fail = (message: string): ConfigResult => ({ ok: false, error: `${file}: ${message}` });
  if (!isObject(data)) return { ok: false, error: `${file} must contain a JSON object.` };

  for (const key of Object.keys(data)) {
    if (!KNOWN.includes(key))
      return fail(`unknown option "${key}". Known options: ${KNOWN.join(', ')}.`);
  }
  const { design, include, exclude, tokenSources, rootPx, rules } = data;
  if (design !== undefined && (typeof design !== 'string' || design === '')) {
    return fail('"design" must be a file path (a string).');
  }
  for (const [name, value] of [
    ['include', include],
    ['exclude', exclude],
    ['tokenSources', tokenSources],
  ] as const) {
    if (value !== undefined && !isGlobList(value))
      return fail(`"${name}" must be a list of glob strings.`);
  }
  if (rootPx !== undefined && (typeof rootPx !== 'number' || !(rootPx > 0))) {
    return fail('"rootPx" must be a number greater than 0.');
  }
  if (rules !== undefined) {
    if (!isObject(rules))
      return fail('"rules" must be an object, for example { "raw-token-value": "off" }.');
    for (const [rule, setting] of Object.entries(rules)) {
      if (!RULES.includes(rule as RuleId))
        return fail(`unknown rule "${rule}". Known rules: ${RULES.join(', ')}.`);
      if (!SETTINGS.includes(setting as RuleSetting)) {
        return fail(`rule "${rule}" must be "error", "warning" or "off".`);
      }
    }
  }
  return { ok: true, config: data as Config, file };
}
