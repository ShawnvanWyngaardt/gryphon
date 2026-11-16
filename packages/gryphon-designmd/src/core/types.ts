/**
 * Core types shared by the parser, scanners, matcher, CLI, Action and
 * playground. The JSON report (`Report`) is a public contract: any
 * change to it needs a new schema version (docs/SPEC.md AC5.5).
 */

/** The kinds of value we check (SPEC FR2). */
export type Category = 'color' | 'fontFamily' | 'fontSize' | 'spacing' | 'radius';

/** A 1-based line and column in a source file. */
export interface SourcePosition {
  line: number;
  column: number;
}

/** One value from the DESIGN.md front matter. */
export interface Token {
  /** Dotted path, for example `colors.primary` or `typography.body-md.fontSize`. */
  path: string;
  category: Category;
  /** The value exactly as written in DESIGN.md. */
  value: string;
  /** Where the value sits in DESIGN.md (AC1.8). */
  position: SourcePosition;
}

/** Everything the checker needs from a DESIGN.md. */
export interface TokenSet {
  /** The `version` field, for example `alpha`, if present. */
  specVersion: string | undefined;
  /** The `name` field, if present. */
  name: string | undefined;
  tokens: Token[];
}

/** A hard-coded value found by a scanner, before it is judged. */
export interface Occurrence extends SourcePosition {
  file: string;
  /** The CSS property, for example `padding-left`, or `class` for Tailwind. */
  property: string;
  value: string;
  category: Category;
}

export type RuleId = 'off-token' | 'raw-token-value';

export type Severity = 'error' | 'warning';

export interface NearestToken {
  path: string;
  value: string;
  /** OKLab distance for colours, px difference for sizes, 0 for exact matches (ADR 0005). */
  distance: number;
}

/** One reported problem. */
export interface Finding extends Occurrence {
  rule: RuleId;
  severity: Severity;
  /** `null` when no token of this category exists at all. */
  nearest: NearestToken | null;
  /** The suggested replacement, as text. Never applied automatically. */
  fix: string | null;
  message: string;
  /**
   * True when the comparison involved an `em` value. We measure em as if
   * the parent font size were the root size, which a static checker
   * cannot know for sure (review of PR 10).
   */
  approximate: boolean;
}

/** A file that could not be scanned (AC2.8). */
export interface SkippedFile {
  file: string;
  reason: string;
}

export interface ReportSummary {
  files: number;
  errors: number;
  warnings: number;
  /** Findings hidden by ignore comments (AC2.6). */
  suppressed: number;
  skipped: number;
}

/** The full result of one run. Printed as JSON by `--format json`. */
export interface Report {
  schemaVersion: 1;
  tool: { name: 'gryphon-designmd'; version: string };
  designFile: string;
  summary: ReportSummary;
  findings: Finding[];
  skipped: SkippedFile[];
}
