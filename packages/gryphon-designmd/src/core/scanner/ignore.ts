/**
 * Ignore comments (G4-03, AC2.6). Written in CSS (`/* ... *\/`), SCSS
 * (`// ...`) or HTML (`<!-- ... -->`) comments:
 *
 * - `gryphon-ignore-next-line` suppresses findings on the next line.
 * - `gryphon-ignore-file`, before any rule, suppresses the whole file.
 *
 * A reason may follow after a space or colon. Scanners report what is
 * ignored; they still return every occurrence, so the caller can count
 * each suppressed finding instead of hiding it silently.
 */

export type Directive = 'next-line' | 'file';

export interface IgnoreInfo {
  /** True when the whole file is ignored. */
  file: boolean;
  /** 1-based lines whose findings are suppressed, sorted. */
  lines: number[];
}

export const NO_IGNORES: IgnoreInfo = { file: false, lines: [] };

const DIRECTIVE = /^gryphon-ignore-(next-line|file)(?=$|[\s:])/;

/** The directive in a comment's text, or null. Case-sensitive, so a typo is not silently accepted. */
export function parseDirective(text: string): Directive | null {
  const match = DIRECTIVE.exec(text.trim());
  return match?.[1] === 'next-line' || match?.[1] === 'file' ? match[1] : null;
}

export function isSuppressed(ignore: IgnoreInfo, line: number): boolean {
  return ignore.file || ignore.lines.includes(line);
}

/** Sorted, without duplicates. */
export const sortedLines = (lines: Iterable<number>): number[] =>
  [...new Set(lines)].sort((a, b) => a - b);
