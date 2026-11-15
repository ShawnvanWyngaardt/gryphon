import { isMap, isScalar, LineCounter, parseDocument, type Node, type YAMLMap } from 'yaml';

import type { Category, SourcePosition, Token, TokenSet } from '../types.js';

/** A `##` section of the Markdown body. */
export interface Section {
  heading: string;
  /** 1-based line of the heading in the file. */
  line: number;
}

export type ParseErrorCode =
  | 'no-tokens'
  | 'unclosed-front-matter'
  | 'invalid-yaml'
  | 'invalid-front-matter'
  | 'duplicate-section';

/** A problem that stops the run (the CLI exits with code 2). */
export interface ParseError {
  code: ParseErrorCode;
  message: string;
  position?: SourcePosition;
}

export type ParseWarningCode =
  'unknown-group' | 'unknown-component-property' | 'invalid-value' | 'not-a-dimension' | 'too-deep';

/** A problem worth telling the user about that does not stop the run. */
export interface ParseWarning {
  code: ParseWarningCode;
  message: string;
  /** Token path, for example `colors.broken`. */
  path: string;
  position: SourcePosition;
}

export interface ParseSuccess {
  ok: true;
  tokens: TokenSet;
  sections: Section[];
  warnings: ParseWarning[];
}

export interface ParseFailure {
  ok: false;
  error: ParseError;
}

export type ParseResult = ParseSuccess | ParseFailure;

const KNOWN_GROUPS = new Set([
  'version',
  'name',
  'description',
  'omitted',
  'colors',
  'typography',
  'rounded',
  'spacing',
  'components',
]);

const TYPOGRAPHY_PROPERTIES = new Set([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'fontFeature',
  'fontVariation',
]);

/**
 * Component properties from the spec. The value is the category we
 * check, or `null` for properties that are valid but not checked in v1.
 */
const COMPONENT_PROPERTIES: Record<string, Category | null> = {
  backgroundColor: 'color',
  textColor: 'color',
  rounded: 'radius',
  padding: 'spacing',
  typography: null,
  size: null,
  height: null,
  width: null,
};

/** Same limit as Google's linter (`max_token_nesting_depth`). */
const MAX_DEPTH = 20;

const DIMENSION = /^(-?(\d+\.?\d*|\.\d+)(px|em|rem)|0)$/;
const REFERENCE = /^\{.+\}$/;

const NO_TOKENS = 'No design tokens found in DESIGN.md';

/** Splits text into lines, keeping each line's start offset. Handles `\r\n`. */
function splitLines(text: string): { text: string; start: number }[] {
  const lines: { text: string; start: number }[] = [];
  let start = 0;
  for (const match of text.matchAll(/\r?\n/g)) {
    lines.push({ text: text.slice(start, match.index), start });
    start = match.index + match[0].length;
  }
  lines.push({ text: text.slice(start), start });
  return lines;
}

/**
 * Parses a DESIGN.md (spec version alpha) into a token set.
 *
 * Front matter is read with `yaml`; the Markdown body is only split
 * into `##` sections, because we enforce tokens, not prose (ADR 0003).
 * References such as `{colors.primary}` are not resolved here (G3-05),
 * and values are not converted yet (G3-07).
 */
export function parseDesignMd(input: string): ParseResult {
  const text = input.startsWith('﻿') ? input.slice(1) : input;
  const lines = splitLines(text);

  if (lines[0]?.text !== '---') {
    return fail('no-tokens', NO_TOKENS);
  }
  const closeIndex = lines.findIndex((line, i) => i > 0 && line.text === '---');
  if (closeIndex === -1) {
    return fail(
      'unclosed-front-matter',
      'The front matter starts with --- on line 1 but never closes.',
    );
  }
  const opening = lines[1];
  const closing = lines[closeIndex];
  if (opening === undefined || closing === undefined) {
    return fail(
      'unclosed-front-matter',
      'The front matter starts with --- on line 1 but never closes.',
    );
  }

  const yamlText = text.slice(opening.start, closing.start);
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlText, { lineCounter, uniqueKeys: true, prettyErrors: true });

  // The YAML starts on line 2 of the file.
  const toFilePosition = (offset: number): SourcePosition => {
    const pos = lineCounter.linePos(offset);
    return { line: pos.line + 1, column: pos.col };
  };

  const yamlError = doc.errors[0];
  if (yamlError !== undefined) {
    return fail(
      'invalid-yaml',
      yamlError.message.split('\n')[0] ?? 'Invalid YAML',
      toFilePosition(yamlError.pos[0]),
    );
  }
  if (doc.contents !== null && !isMap(doc.contents)) {
    return fail('invalid-front-matter', 'The front matter must be a map of keys and values.', {
      line: 2,
      column: 1,
    });
  }

  const tokens: Token[] = [];
  const warnings: ParseWarning[] = [];
  const position = (node: Node | null | undefined): SourcePosition =>
    toFilePosition(node?.range?.[0] ?? 0);
  const warn = (
    code: ParseWarningCode,
    path: string,
    node: Node | null | undefined,
    message: string,
  ): void => {
    warnings.push({ code, message, path, position: position(node) });
  };
  const addToken = (path: string, category: Category, node: Node): void => {
    tokens.push({
      path,
      category,
      value: isScalar(node) ? String(node.value) : '',
      position: position(node),
    });
  };

  /** Adds a colour token, or warns. Unquoted hex like #fff is a YAML comment, so it arrives as null. */
  const colorValue = (path: string, node: Node | null): void => {
    if (isScalar(node) && typeof node.value === 'string' && node.value !== '') {
      addToken(path, 'color', node);
    } else {
      warn(
        'invalid-value',
        path,
        node,
        `${path} is not a colour string. Hex colours must be quoted in YAML ("#1A1C1E").`,
      );
    }
  };

  /** Adds a dimension token (px, em, rem, or 0), or warns. */
  const dimensionValue = (path: string, category: Category, node: Node | null): void => {
    if (isScalar(node) && DIMENSION.test(String(node.value))) {
      addToken(path, category, node);
    } else {
      warn(
        'not-a-dimension',
        path,
        node,
        `${path} is not a px, em or rem value, so it is not used for matching.`,
      );
    }
  };

  /** Walks a group of tokens, flattening nested groups such as `colors.dark.primary`. */
  const walk = (
    map: YAMLMap,
    path: string,
    depth: number,
    leaf: (path: string, node: Node | null) => void,
    isLeafMap: (node: YAMLMap) => boolean = () => false,
  ): void => {
    for (const pair of map.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : '';
      const childPath = `${path}.${key}`;
      const value = (pair.value ?? null) as Node | null;
      if (isMap(value) && !isLeafMap(value)) {
        if (depth >= MAX_DEPTH) {
          warn(
            'too-deep',
            childPath,
            value,
            `${childPath} is nested more than ${MAX_DEPTH} levels deep and was skipped.`,
          );
        } else {
          walk(value, childPath, depth + 1, leaf, isLeafMap);
        }
      } else {
        leaf(childPath, value);
      }
    }
  };

  const isTypographyLevel = (map: YAMLMap): boolean =>
    map.items.some(
      (pair) => isScalar(pair.key) && TYPOGRAPHY_PROPERTIES.has(String(pair.key.value)),
    );

  const typographyLevel = (path: string, node: Node | null): void => {
    if (!isMap(node)) {
      warn(
        'invalid-value',
        path,
        node,
        `${path} must be a map with fontFamily, fontSize and similar keys.`,
      );
      return;
    }
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : '';
      const value = (pair.value ?? null) as Node | null;
      if (key === 'fontFamily') {
        if (isScalar(value) && typeof value.value === 'string' && value.value !== '') {
          addToken(`${path}.fontFamily`, 'fontFamily', value);
        } else {
          warn(
            'invalid-value',
            `${path}.fontFamily`,
            value,
            `${path}.fontFamily must be a font name.`,
          );
        }
      } else if (key === 'fontSize') {
        dimensionValue(`${path}.fontSize`, 'fontSize', value);
      }
    }
  };

  const component = (path: string, node: Node | null): void => {
    if (!isMap(node)) {
      warn('invalid-value', path, node, `${path} must be a map of component properties.`);
      return;
    }
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : '';
      const propPath = `${path}.${key}`;
      const value = (pair.value ?? null) as Node | null;
      if (!(key in COMPONENT_PROPERTIES)) {
        warn(
          'unknown-component-property',
          propPath,
          value,
          `${key} is not a component property in the DESIGN.md spec. It is accepted but not checked.`,
        );
        continue;
      }
      const category = COMPONENT_PROPERTIES[key];
      // References point at tokens we already have (resolved in G3-05).
      if (category === null || category === undefined) continue;
      if (isScalar(value) && REFERENCE.test(String(value.value))) continue;
      if (category === 'color') colorValue(propPath, value);
      else dimensionValue(propPath, category, value);
    }
  };

  let specVersion: string | undefined;
  let name: string | undefined;
  for (const pair of doc.contents?.items ?? []) {
    const key = isScalar(pair.key) ? String(pair.key.value) : '';
    const value = (pair.value ?? null) as Node | null;
    if (key === 'version' && isScalar(value)) specVersion = String(value.value);
    else if (key === 'name' && isScalar(value)) name = String(value.value);
    else if (!KNOWN_GROUPS.has(key)) {
      warn(
        'unknown-group',
        key,
        pair.key as Node,
        `"${key}" is not a token group in the DESIGN.md spec. It is ignored.`,
      );
    } else if (isMap(value)) {
      if (key === 'colors') walk(value, key, 1, colorValue);
      else if (key === 'typography') walk(value, key, 1, typographyLevel, isTypographyLevel);
      else if (key === 'rounded') walk(value, key, 1, (p, n) => dimensionValue(p, 'radius', n));
      else if (key === 'spacing') walk(value, key, 1, (p, n) => dimensionValue(p, 'spacing', n));
      else if (key === 'components') walk(value, key, 1, component, () => true);
    }
  }

  const sections = parseSections(lines.slice(closeIndex + 1), closeIndex + 2);
  if (!sections.ok) return sections;

  if (tokens.length === 0) {
    return fail('no-tokens', NO_TOKENS);
  }

  return { ok: true, tokens: { specVersion, name, tokens }, sections: sections.sections, warnings };
}

/** Finds `##` headings outside fenced code blocks. Rejects duplicates, as the spec says. */
function parseSections(
  lines: { text: string }[],
  firstLine: number,
): { ok: true; sections: Section[] } | ParseFailure {
  const sections: Section[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;

  for (const [i, { text }] of lines.entries()) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(text);
    if (fenceMatch?.[1] !== undefined) {
      const marker = fenceMatch[1];
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const heading = /^ {0,3}## +(.+?)(?: +#+)? *$/.exec(text)?.[1];
    if (heading === undefined) continue;
    const line = firstLine + i;
    const key = heading.toLowerCase();
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      return fail(
        'duplicate-section',
        `The section "## ${heading}" appears twice (lines ${earlier} and ${line}). The spec does not allow that.`,
        { line, column: 1 },
      );
    }
    seen.set(key, line);
    sections.push({ heading, line });
  }
  return { ok: true, sections };
}

function fail(code: ParseErrorCode, message: string, position?: SourcePosition): ParseFailure {
  return {
    ok: false,
    error: position === undefined ? { code, message } : { code, message, position },
  };
}
