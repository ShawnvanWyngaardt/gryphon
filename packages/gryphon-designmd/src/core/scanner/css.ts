import { parse as parseCss, type CssSyntaxError, type Declaration, type Root } from 'postcss';
import { parse as parseScss } from 'postcss-scss';
import valueParser, { type Node as ValueNode } from 'postcss-value-parser';

import { parseColor } from '../values/color.js';
import { parseDimension } from '../values/dimension.js';
import type { Category, Occurrence } from '../types.js';

export interface ScanCssOptions {
  syntax: 'css' | 'scss';
  /** Lines before this CSS in its file, for a Vue `<style>` block (G4-01). */
  lineOffset?: number;
  /** Columns before the CSS on its first line. */
  columnOffset?: number;
}

export interface ScanResult {
  occurrences: Occurrence[];
  /** Set when the file could not be parsed (AC2.8). */
  error?: string;
}

/** Properties whose colours we check (SPEC FR2). Shorthands give only their colour part. */
const COLOR_PROPERTY =
  /^(color|background(-color)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|text-decoration(-color)?|caret-color|accent-color|column-rule(-color)?)$/;
const SPACING_PROPERTY =
  /^((margin|padding)(-.+)?|gap|row-gap|column-gap|inset(-.+)?|top|right|bottom|left)$/;
const RADIUS_PROPERTY = /^border(-.+)?-radius$/;

/** Functions whose content we never read: indirection, or not a design value. */
const SKIP_FUNCTIONS = new Set(['var', 'env', 'url', 'attr', 'image-set']);
const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color-mix',
]);
const FONT_SYSTEM_KEYWORDS = new Set([
  'caption',
  'icon',
  'menu',
  'message-box',
  'small-caption',
  'status-bar',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);
const FONT_SIZE_KEYWORDS = new Set([
  'xx-small',
  'x-small',
  'small',
  'medium',
  'large',
  'x-large',
  'xx-large',
  'xxx-large',
  'smaller',
  'larger',
  'math',
]);

/** A length we can compare with tokens: px, rem or em, not zero (AC2.2 allows 0). */
const isCheckableLength = (word: string): boolean => {
  const px = parseDimension(word);
  return px !== null && px !== 0;
};
const isAnyLength = (word: string): boolean => /^-?(\d*\.?\d+)([a-z]+|%)$/i.test(word);
/** SCSS variables, interpolation and custom properties are references, not values. */
const isReference = (word: string): boolean => /^[$@]|^--|#\{/.test(word);

/**
 * Finds hard-coded colours, font families, font sizes, spacing and
 * radius values in CSS or SCSS (SPEC FR2). It does not judge them: the
 * matcher does that (ADR 0004). Custom property and SCSS variable
 * definitions are skipped, because they are definitions, not usages
 * (AC2.4).
 */
export function scanCss(source: string, file: string, options: ScanCssOptions): ScanResult {
  let root: Root;
  try {
    root = options.syntax === 'scss' ? parseScss(source) : parseCss(source);
  } catch (error) {
    // Checked by name, not instanceof: postcss-scss may load its own copy
    // of postcss, whose error class is a different object.
    if (error instanceof Error && error.name === 'CssSyntaxError') {
      const syntax = error as CssSyntaxError;
      return {
        occurrences: [],
        error: `could not parse: ${syntax.reason} (line ${syntax.line ?? '?'})`,
      };
    }
    throw error;
  }

  const lineStarts = [0];
  for (const match of source.matchAll(/\n/g)) lineStarts.push(match.index + 1);
  const lineOffset = options.lineOffset ?? 0;
  const columnOffset = options.columnOffset ?? 0;

  /** Turns an absolute offset in `source` into a 1-based line and column in the file. */
  const position = (offset: number): { line: number; column: number } => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    const column = offset - (lineStarts[low] ?? 0) + 1;
    return { line: low + 1 + lineOffset, column: low === 0 ? column + columnOffset : column };
  };

  const occurrences: Occurrence[] = [];

  root.walkDecls((decl: Declaration) => {
    const property = decl.prop.toLowerCase();
    if (isReference(property)) return;
    // @font-face defines a font; it does not use one (found in G3-11).
    const parent = decl.parent;
    if (
      parent?.type === 'atrule' &&
      (parent as { name?: string }).name?.toLowerCase() === 'font-face'
    ) {
      return;
    }
    const start = decl.source?.start?.offset;
    if (start === undefined) return;

    const rawValue = decl.raws.value?.raw ?? decl.value;
    const rawProp = (decl.raws as { prop?: { raw?: string } }).prop?.raw ?? decl.prop;
    const valueStart = start + rawProp.length + (decl.raws.between ?? ':').length;
    const nodes = valueParser(rawValue).nodes;

    const add = (category: Category, value: string, sourceIndex: number): void => {
      occurrences.push({ file, ...position(valueStart + sourceIndex), property, value, category });
    };

    if (property === 'font-family') {
      families(nodes, rawValue, add);
    } else if (property === 'font') {
      fontShorthand(nodes, rawValue, add);
    } else if (property === 'font-size') {
      sizes(nodes, 'fontSize', add);
    } else if (RADIUS_PROPERTY.test(property)) {
      sizes(nodes, 'radius', add);
    } else if (SPACING_PROPERTY.test(property)) {
      sizes(nodes, 'spacing', add);
    } else if (COLOR_PROPERTY.test(property)) {
      colors(nodes, add);
    }
  });

  return { occurrences };
}

type Add = (category: Category, value: string, sourceIndex: number) => void;

/** Visits words, and functions other than the skipped ones, depth first. */
function walk(nodes: ValueNode[], visit: (node: ValueNode) => boolean): void {
  for (const node of nodes) {
    if (node.type === 'function') {
      if (SKIP_FUNCTIONS.has(node.value.toLowerCase())) continue;
      if (visit(node)) continue;
      walk(node.nodes, visit);
    } else if (node.type === 'word') {
      visit(node);
    }
  }
}

function colors(nodes: ValueNode[], add: Add): void {
  walk(nodes, (node) => {
    if (node.type === 'function') {
      if (!COLOR_FUNCTIONS.has(node.value.toLowerCase())) return false;
      const text = valueParser.stringify(node);
      if (parseColor(text) !== null) add('color', text, node.sourceIndex);
      return true;
    }
    const word = node.value;
    if (isReference(word) || /^(transparent|currentcolor)$/i.test(word)) return true;
    if (parseColor(word) !== null) add('color', word, node.sourceIndex);
    return true;
  });
}

function sizes(nodes: ValueNode[], category: Category, add: Add): void {
  walk(nodes, (node) => {
    if (node.type === 'word' && !isReference(node.value) && isCheckableLength(node.value)) {
      add(category, node.value, node.sourceIndex);
    }
    return false;
  });
}

/** Splits a font stack on top-level commas and reports each family. */
function families(nodes: ValueNode[], raw: string, add: Add): void {
  let group: ValueNode[] = [];
  const flush = (): void => {
    const parts = group.filter((n) => n.type !== 'space' && n.type !== 'comment');
    group = [];
    const first = parts[0];
    const last = parts.at(-1);
    if (first === undefined || last === undefined) return;
    if (parts.some((n) => n.type === 'function' || (n.type === 'word' && isReference(n.value)))) {
      return;
    }
    add('fontFamily', raw.slice(first.sourceIndex, last.sourceEndIndex), first.sourceIndex);
  };
  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') flush();
    else group.push(node);
  }
  flush();
}

/** `font: [style] [weight] <size>[/<line-height>] <family>, ...` */
function fontShorthand(nodes: ValueNode[], raw: string, add: Add): void {
  const parts = nodes.filter((n) => n.type !== 'space' && n.type !== 'comment');
  const only = parts[0];
  if (
    parts.length === 1 &&
    only?.type === 'word' &&
    FONT_SYSTEM_KEYWORDS.has(only.value.toLowerCase())
  ) {
    return;
  }
  const sizeIndex = parts.findIndex(
    (n) =>
      n.type === 'word' && (isAnyLength(n.value) || FONT_SIZE_KEYWORDS.has(n.value.toLowerCase())),
  );
  const size = parts[sizeIndex];
  if (size === undefined) return;
  if (isCheckableLength(size.value)) add('fontSize', size.value, size.sourceIndex);

  // Skip "/ line-height" after the size; the rest is the font stack.
  let rest = sizeIndex + 1;
  if (parts[rest]?.type === 'div' && parts[rest]?.value === '/') rest += 2;
  const familyStart = parts[rest];
  if (familyStart === undefined) return;
  const stackNodes = nodes.filter((n) => n.sourceIndex >= familyStart.sourceIndex);
  families(stackNodes, raw, add);
}
