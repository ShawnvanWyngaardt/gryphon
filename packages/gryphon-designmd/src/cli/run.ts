import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import pkg from '../../package.json' with { type: 'json' };
import {
  buildReport,
  createMatcher,
  parseDesignMd,
  scanCss,
  scanVue,
  ungovernedCategories,
  isSuppressed,
  type Category,
  type Finding,
  type SkippedFile,
} from '../core/index.js';
import { loadConfig, type Config } from './config.js';
import { EXTENSIONS, findFiles } from './files.js';
import { ansiStyle, formatText, plainStyle } from './format.js';
import { matchesAny } from './glob.js';

export interface Io {
  cwd: string;
  env: Record<string, string | undefined>;
  stdout: { write(text: string): unknown; isTTY?: boolean };
  stderr: { write(text: string): unknown };
}

/** Exit codes (AC5.3). */
export const EXIT = { ok: 0, problems: 1, failed: 2 } as const;

const HELP = `Usage: gryphon check [paths...] [options]

Checks CSS, SCSS and Vue files against the design tokens in DESIGN.md.
Without paths, checks the current folder. Checks ${EXTENSIONS.join(', ')} files.

Options:
  --design <path>       DESIGN.md to read (default: ./DESIGN.md, or "design" in the config)
  --config <path>       Config file (default: ./gryphon.config.json, if it exists)
  --format text|json    Output format (default: text)
  --max-warnings <n>    Fail when there are more than n warnings
  -h, --help            Show this help
  -v, --version         Show the version

Exit codes: 0 no errors, 1 errors (or too many warnings), 2 could not run.
`;

class UsageError extends Error {}

const NOTICE: Record<Category, string> = {
  color: 'colour tokens, so colours were not checked.',
  fontFamily: 'font family tokens, so font families were not checked.',
  fontSize: 'font size tokens, so font sizes were not checked.',
  spacing: 'spacing tokens, so spacing was not checked.',
  radius: 'radius tokens, so radius was not checked.',
};

/** The whole CLI as a function, so it can be tested without a process. */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  try {
    return await check(argv, io);
  } catch (error) {
    if (error instanceof UsageError || isParseArgsError(error)) {
      io.stderr.write(`Error: ${(error as Error).message}\nRun gryphon --help for usage.\n`);
      return EXIT.failed;
    }
    throw error;
  }
}

function isParseArgsError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    String((error as { code?: unknown }).code).startsWith('ERR_PARSE_ARGS')
  );
}

async function check(argv: readonly string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      design: { type: 'string' },
      config: { type: 'string' },
      format: { type: 'string', default: 'text' },
      'max-warnings': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.help === true) {
    io.stdout.write(HELP);
    return EXIT.ok;
  }
  if (values.version === true) {
    io.stdout.write(`${pkg.version}\n`);
    return EXIT.ok;
  }
  const [command, ...paths] = positionals;
  if (command !== 'check')
    throw new UsageError(
      command === undefined ? 'Missing command.' : `Unknown command "${command}".`,
    );
  if (values.format !== 'text' && values.format !== 'json') {
    throw new UsageError(`--format must be text or json, not "${values.format}".`);
  }
  const maxWarningsText = values['max-warnings'];
  const maxWarnings = maxWarningsText === undefined ? Infinity : Number(maxWarningsText);
  if (!Number.isInteger(maxWarnings) && maxWarnings !== Infinity) {
    throw new UsageError(`--max-warnings must be a whole number, not "${maxWarningsText ?? ''}".`);
  }

  // DESIGN.md problems stop the run with exit code 2 (AC5.3).
  // The config file is read before DESIGN.md, because it can name it (AC2.7).
  const loaded = loadConfig(io.cwd, values.config);
  if (!loaded.ok) {
    io.stderr.write(`${loaded.error}\n`);
    return EXIT.failed;
  }
  const config: Config = loaded.config;
  const matcherOptions = config.rootPx === undefined ? {} : { rootPx: config.rootPx };

  const designPath = values.design ?? config.design ?? 'DESIGN.md';
  let designText: string;
  try {
    designText = readFileSync(resolve(io.cwd, designPath), 'utf8');
  } catch {
    io.stderr.write(
      `Could not read DESIGN.md at ${designPath}. Run gryphon in your project root, or pass --design <path>.\n`,
    );
    return EXIT.failed;
  }
  const parsed = parseDesignMd(designText);
  if (!parsed.ok) {
    const at = parsed.error.position;
    io.stderr.write(
      `${designPath}${at === undefined ? '' : `:${at.line}:${at.column}`}: ${parsed.error.message}\n`,
    );
    return EXIT.failed;
  }
  for (const warning of parsed.warnings) {
    io.stderr.write(
      `${designPath}:${warning.position.line}:${warning.position.column}: warning: ${warning.message}\n`,
    );
  }

  // Decision D2: a category without tokens is not governed by DESIGN.md.
  const skippedCategories = ungovernedCategories(parsed.tokens, matcherOptions);
  for (const category of skippedCategories) {
    io.stderr.write(`${designPath} defines no ${NOTICE[category]}\n`);
  }
  const match = createMatcher(parsed.tokens, matcherOptions);
  const files = findFiles(io.cwd, paths).filter(
    (file) =>
      (config.include === undefined || matchesAny(config.include, file)) &&
      !matchesAny(config.exclude ?? [], file),
  );
  const findings: Finding[] = [];
  const skipped: SkippedFile[] = [];
  let suppressed = 0;
  for (const file of files) {
    const source = readFileSync(resolve(io.cwd, file), 'utf8');
    // With tokenSources in the config, exactly those files hold tokens (D3).
    const tokenSource =
      config.tokenSources === undefined
        ? {}
        : { tokenSource: matchesAny(config.tokenSources, file) };
    const result = file.endsWith('.vue')
      ? scanVue(source, file, tokenSource)
      : scanCss(source, file, { syntax: file.endsWith('.scss') ? 'scss' : 'css', ...tokenSource });
    if (result.error !== undefined) {
      skipped.push({ file, reason: result.error });
      continue;
    }
    for (const occurrence of result.occurrences) {
      const finding = match(occurrence);
      if (finding === null) continue;
      // Per-rule severity from the config; "off" drops the finding (AC2.7).
      const setting = config.rules?.[finding.rule];
      if (setting === 'off') continue;
      // Ignore comments (G4-03): counted, never hidden silently (AC2.6).
      if (isSuppressed(result.ignore, finding.line)) {
        suppressed += 1;
        continue;
      }
      findings.push(setting === undefined ? finding : { ...finding, severity: setting });
    }
  }

  const report = buildReport({
    toolVersion: pkg.version,
    designFile: designPath,
    filesScanned: files.length,
    findings,
    suppressed,
    skipped,
  });

  if (values.format === 'json') {
    io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const useColor = io.stdout.isTTY === true && (io.env['NO_COLOR'] ?? '') === '';
    io.stdout.write(
      formatText(report, useColor ? ansiStyle : plainStyle, {
        partial: skippedCategories.length > 0,
      }),
    );
  }

  const { errors, warnings } = report.summary;
  return errors > 0 || warnings > maxWarnings ? EXIT.problems : EXIT.ok;
}
