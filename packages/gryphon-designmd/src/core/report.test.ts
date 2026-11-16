import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { buildReport, REPORT_SCHEMA_VERSION } from './report.js';
import type { Finding } from './types.js';
import schema from '../../schema/report-v1.schema.json' with { type: 'json' };
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

function finding(overrides: Partial<Finding>): Finding {
  return {
    rule: 'off-token',
    severity: 'error',
    file: 'src/a.css',
    line: 1,
    column: 1,
    property: 'color',
    value: '#123456',
    category: 'color',
    nearest: { path: 'colors.primary', value: '#1B1A17', distance: 0.12 },
    fix: 'var(--color-primary)',
    message: '#123456 is not a DESIGN.md colour. Nearest token: colors.primary (#1B1A17).',
    approximate: false,
    ...overrides,
  };
}

const base = {
  toolVersion: '0.0.0',
  designFile: 'DESIGN.md',
  filesScanned: 3,
  suppressed: 0,
  skipped: [],
};

describe('buildReport', () => {
  it('counts errors and warnings', () => {
    const report = buildReport({
      ...base,
      findings: [
        finding({}),
        finding({ rule: 'raw-token-value', severity: 'warning', line: 2 }),
        finding({ line: 3 }),
      ],
    });
    expect(report.summary).toEqual({
      files: 3,
      errors: 2,
      warnings: 1,
      suppressed: 0,
      skipped: 0,
    });
  });

  it('sorts findings by file, then line, then column (AC3.5)', () => {
    const report = buildReport({
      ...base,
      findings: [
        finding({ file: 'b.css', line: 1, column: 1 }),
        finding({ file: 'a.css', line: 9, column: 1 }),
        finding({ file: 'a.css', line: 2, column: 7 }),
        finding({ file: 'a.css', line: 2, column: 3 }),
      ],
    });
    expect(report.findings.map((f) => `${f.file}:${f.line}:${f.column}`)).toEqual([
      'a.css:2:3',
      'a.css:2:7',
      'a.css:9:1',
      'b.css:1:1',
    ]);
  });

  it('does not change the input array', () => {
    const findings = [finding({ line: 2 }), finding({ line: 1 })];
    buildReport({ ...base, findings });
    expect(findings.map((f) => f.line)).toEqual([2, 1]);
  });

  it('counts skipped files and suppressions', () => {
    const report = buildReport({
      ...base,
      findings: [],
      suppressed: 4,
      skipped: [{ file: 'broken.scss', reason: 'could not parse: Unclosed block' }],
    });
    expect(report.summary.suppressed).toBe(4);
    expect(report.summary.skipped).toBe(1);
  });

  it('stamps the schema version and tool name', () => {
    const report = buildReport({ ...base, findings: [] });
    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.tool).toEqual({ name: 'gryphon-designmd', version: '0.0.0' });
  });
});

describe('report JSON schema v1 (AC5.5)', () => {
  it('accepts a report built by buildReport', () => {
    const report = buildReport({
      ...base,
      findings: [finding({}), finding({ nearest: null, fix: null, category: 'fontFamily' })],
      skipped: [{ file: 'x.vue', reason: 'could not parse' }],
    });
    // Round-trip through JSON, as the CLI will print it.
    const ok = validate(JSON.parse(JSON.stringify(report)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it('rejects a finding with an unknown rule', () => {
    const report = buildReport({ ...base, findings: [finding({})] });
    const bad = JSON.parse(JSON.stringify(report));
    bad.findings[0].rule = 'made-up-rule';
    expect(validate(bad)).toBe(false);
  });

  it('rejects zero-based positions', () => {
    const report = buildReport({ ...base, findings: [finding({})] });
    const bad = JSON.parse(JSON.stringify(report));
    bad.findings[0].line = 0;
    expect(validate(bad)).toBe(false);
  });

  it('rejects extra top-level fields, so the schema stays the full contract', () => {
    const report = buildReport({ ...base, findings: [] });
    expect(validate({ ...JSON.parse(JSON.stringify(report)), extra: true })).toBe(false);
  });
});
