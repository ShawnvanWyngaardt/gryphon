/**
 * Public entry point of the checking engine.
 *
 * Everything under src/core must run in Node and in the browser.
 * Do not import Node modules here. ESLint enforces this rule.
 */
export const SPEC_VERSION = 'alpha';

export { buildReport, REPORT_SCHEMA_VERSION } from './report.js';
export type { ReportInput } from './report.js';
export { parseDesignMd } from './parser/parse.js';
export type {
  ParseError,
  ParseErrorCode,
  ParseFailure,
  ParseResult,
  ParseSuccess,
  ParseWarning,
  ParseWarningCode,
  Section,
} from './parser/parse.js';
export type * from './types.js';
export { parseColor } from './values/color.js';
export type { NormalColor } from './values/color.js';
export { parseDimension } from './values/dimension.js';
export { createMatcher, FAR_COLOR, SAME_COLOR } from './matcher/match.js';
export type { MatcherOptions } from './matcher/match.js';
export { scanCss } from './scanner/css.js';
export type { ScanCssOptions, ScanResult } from './scanner/css.js';
export { scanVue } from './scanner/vue.js';
