import type { Finding, Report, SkippedFile } from './types.js';

export const REPORT_SCHEMA_VERSION = 1;

export interface ReportInput {
  toolVersion: string;
  designFile: string;
  filesScanned: number;
  findings: readonly Finding[];
  suppressed: number;
  skipped: readonly SkippedFile[];
}

/** Sort order for stable output across runs (AC3.5). */
function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
}

/** Builds a report: sorts findings and counts the summary. Does not change its input. */
export function buildReport(input: ReportInput): Report {
  const findings = [...input.findings].sort(compareFindings);
  const errors = findings.filter((f) => f.severity === 'error').length;
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    tool: { name: 'gryphon-designmd', version: input.toolVersion },
    designFile: input.designFile,
    summary: {
      files: input.filesScanned,
      errors,
      warnings: findings.length - errors,
      suppressed: input.suppressed,
      skipped: input.skipped.length,
    },
    findings,
    skipped: [...input.skipped],
  };
}
