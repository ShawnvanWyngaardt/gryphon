import type { Finding, Report } from '../core/index.js';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface Style {
  red(text: string): string;
  yellow(text: string): string;
  dim(text: string): string;
  bold(text: string): string;
}

export const plainStyle: Style = {
  red: (t) => t,
  yellow: (t) => t,
  dim: (t) => t,
  bold: (t) => t,
};

export const ansiStyle: Style = {
  red: (t) => `\u001b[31m${t}\u001b[39m`,
  yellow: (t) => `\u001b[33m${t}\u001b[39m`,
  dim: (t) => `\u001b[2m${t}\u001b[22m`,
  bold: (t) => `\u001b[1m${t}\u001b[22m`,
};

/**
 * Human-readable report, grouped by file. Severity is always written
 * as a word, so colour is never the only signal (AC5.4).
 */
export interface FormatOptions {
  /** True when some categories were not checked (D2), so "no problems" only covers the rest. */
  partial?: boolean;
}

export function formatText(report: Report, style: Style, options: FormatOptions = {}): string {
  const lines: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const finding of report.findings) {
    byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding]);
  }

  for (const [file, findings] of byFile) {
    lines.push(style.bold(file));
    for (const f of findings) {
      const where = style.dim(`${f.line}:${f.column}`.padEnd(8));
      const severity = f.severity === 'error' ? style.red('error  ') : style.yellow('warning');
      lines.push(`  ${where} ${severity}  ${f.rule.padEnd(15)}  ${f.message}`);
    }
    lines.push('');
  }

  for (const skipped of report.skipped) {
    lines.push(`${style.bold(skipped.file)}: skipped, ${skipped.reason}`);
  }
  if (report.skipped.length > 0) lines.push('');

  const { errors, warnings, files } = report.summary;
  if (errors === 0 && warnings === 0) {
    // Review of PR 19: do not claim more than was checked.
    const scope = options.partial === true ? ' in the checked categories' : '';
    lines.push(`No problems found${scope} in ${plural(files, 'file')}.`);
  } else {
    const summary = `${plural(errors, 'error')}, ${plural(warnings, 'warning')} in ${plural(byFile.size, 'file')} (${plural(files, 'file')} checked)`;
    lines.push(errors > 0 ? style.red(summary) : style.yellow(summary));
  }
  if (report.summary.suppressed > 0)
    lines.push(`${report.summary.suppressed} suppressed by ignore comments.`);
  return `${lines.join('\n')}\n`;
}
