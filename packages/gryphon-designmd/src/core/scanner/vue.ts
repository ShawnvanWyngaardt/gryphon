import {
  NodeTypes,
  parse,
  type AttributeNode,
  type CommentNode,
  type ElementNode,
  type RootNode,
  type TemplateChildNode,
} from '@vue/compiler-dom';

import type { Occurrence } from '../types.js';
import { scanCss, type ScanResult } from './css.js';
import { NO_IGNORES, parseDirective, sortedLines } from './ignore.js';

/** Style block languages we can read. Others (less, stylus, indented sass) are skipped. */
const STYLE_LANGS: Record<string, 'css' | 'scss'> = { '': 'css', css: 'css', scss: 'scss' };

/**
 * Finds hard-coded values in a Vue single-file component (G4-01):
 * `<style>` and `<style lang="scss">` blocks, and static `style`
 * attributes in `<template>`. Positions are in the `.vue` file.
 *
 * Not read, on purpose: bound `:style` (a JavaScript expression),
 * `<script>`, and `<style src>` (the CSS file is scanned on its own).
 * `class` attributes are read with Tailwind support (G4-02a).
 *
 * Uses Vue's own template parser for parsing only; nothing is
 * compiled or run (ADR 0004).
 */
export interface ScanVueOptions {
  /** Passed to each style block; see ScanCssOptions.tokenSource (D3). */
  tokenSource?: boolean;
}

export function scanVue(source: string, file: string, options: ScanVueOptions = {}): ScanResult {
  let root: RootNode;
  let parseError: string | undefined;
  try {
    root = parse(source, {
      parseMode: 'sfc',
      // Keep HTML comments, for gryphon-ignore comments (G4-03).
      comments: true,
      onError: (error) => {
        parseError ??= `could not parse: ${error.message}${error.loc ? ` (line ${error.loc.start.line})` : ''}`;
      },
    });
  } catch (error) {
    return {
      occurrences: [],
      ignore: NO_IGNORES,
      error: `could not parse: ${(error as Error).message}`,
    };
  }
  if (parseError !== undefined) return { occurrences: [], ignore: NO_IGNORES, error: parseError };

  const occurrences: Occurrence[] = [];
  const blocks = root.children.filter((n): n is ElementNode => n.type === NodeTypes.ELEMENT);

  // Ignore comments (G4-03): HTML comments anywhere, and
  // gryphon-ignore-file as a comment before the first block.
  const ignoredLines: number[] = [];
  const firstNode = root.children.find((n) => n.type !== NodeTypes.TEXT);
  const ignoreFile =
    firstNode?.type === NodeTypes.COMMENT && parseDirective(firstNode.content) === 'file';
  for (const comment of comments(root.children)) {
    if (parseDirective(comment.content) === 'next-line')
      ignoredLines.push(comment.loc.end.line + 1);
  }

  for (const block of blocks) {
    if (block.tag === 'style') {
      const result = scanStyleBlock(source, file, block, options.tokenSource);
      if (result.error !== undefined) {
        return { occurrences: [], ignore: NO_IGNORES, error: result.error };
      }
      occurrences.push(...result.occurrences);
      ignoredLines.push(...result.ignore.lines);
      // gryphon-ignore-file inside a style block ignores that block only.
      if (result.ignore.file) {
        for (let line = block.loc.start.line; line <= block.loc.end.line; line++)
          ignoredLines.push(line);
      }
    } else if (block.tag === 'template') {
      for (const attr of styleAttributes(block.children)) {
        const result = scanStyleAttribute(file, attr);
        if (result.error !== undefined) {
          return { occurrences: [], ignore: NO_IGNORES, error: result.error };
        }
        occurrences.push(...result.occurrences);
      }
    }
  }
  return { occurrences, ignore: { file: ignoreFile, lines: sortedLines(ignoredLines) } };
}

function attribute(element: ElementNode, name: string): AttributeNode | undefined {
  return element.props.find(
    (p): p is AttributeNode => p.type === NodeTypes.ATTRIBUTE && p.name === name,
  );
}

function scanStyleBlock(
  source: string,
  file: string,
  block: ElementNode,
  tokenSource: boolean | undefined,
): ScanResult {
  if (attribute(block, 'src') !== undefined) return { occurrences: [], ignore: NO_IGNORES };
  const lang = (attribute(block, 'lang')?.value?.content ?? '').toLowerCase();
  const syntax = STYLE_LANGS[lang];
  if (syntax === undefined) return { occurrences: [], ignore: NO_IGNORES };

  const content = block.children[0];
  if (content === undefined) return { occurrences: [], ignore: NO_IGNORES };
  const start = content.loc.start;
  const end = block.children.at(-1)?.loc.end ?? content.loc.end;
  return scanCss(source.slice(start.offset, end.offset), file, {
    syntax,
    lineOffset: start.line - 1,
    columnOffset: start.column - 1,
    ...(tokenSource === undefined ? {} : { tokenSource }),
  });
}

/** All comment nodes, depth first. */
function comments(
  children: readonly (TemplateChildNode | RootNode['children'][number])[],
): CommentNode[] {
  const found: CommentNode[] = [];
  for (const child of children) {
    if (child.type === NodeTypes.COMMENT) found.push(child);
    else if (child.type === NodeTypes.ELEMENT) found.push(...comments(child.children));
  }
  return found;
}

/** All static `style` attributes in the template, depth first. */
function styleAttributes(children: TemplateChildNode[]): AttributeNode[] {
  const found: AttributeNode[] = [];
  for (const child of children) {
    if (child.type !== NodeTypes.ELEMENT) continue;
    const style = attribute(child, 'style');
    if (style?.value !== undefined) found.push(style);
    found.push(...styleAttributes(child.children));
  }
  return found;
}

/** A style attribute holds declarations only, so wrap them in a rule for PostCSS. */
function scanStyleAttribute(file: string, attr: AttributeNode): ScanResult {
  const value = attr.value;
  if (value === undefined) return { occurrences: [], ignore: NO_IGNORES };
  const raw = value.loc.source;
  const quoted = raw.startsWith('"') || raw.startsWith("'");
  const text = quoted ? raw.slice(1, -1) : raw;
  const { line, column } = value.loc.start;
  const wrapper = '*{';
  return scanCss(`${wrapper}${text}}`, file, {
    syntax: 'css',
    lineOffset: line - 1,
    // Column of the first character inside the quotes, minus the wrapper.
    columnOffset: column - 1 + (quoted ? 1 : 0) - wrapper.length,
  });
}
