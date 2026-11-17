import {
  NodeTypes,
  parse,
  type AttributeNode,
  type ElementNode,
  type RootNode,
  type TemplateChildNode,
} from '@vue/compiler-dom';

import type { Occurrence } from '../types.js';
import { scanCss, type ScanResult } from './css.js';

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
export function scanVue(source: string, file: string): ScanResult {
  let root: RootNode;
  let parseError: string | undefined;
  try {
    root = parse(source, {
      parseMode: 'sfc',
      onError: (error) => {
        parseError ??= `could not parse: ${error.message}${error.loc ? ` (line ${error.loc.start.line})` : ''}`;
      },
    });
  } catch (error) {
    return { occurrences: [], error: `could not parse: ${(error as Error).message}` };
  }
  if (parseError !== undefined) return { occurrences: [], error: parseError };

  const occurrences: Occurrence[] = [];
  const blocks = root.children.filter((n): n is ElementNode => n.type === NodeTypes.ELEMENT);

  for (const block of blocks) {
    if (block.tag === 'style') {
      const result = scanStyleBlock(source, file, block);
      if (result.error !== undefined) return { occurrences: [], error: result.error };
      occurrences.push(...result.occurrences);
    } else if (block.tag === 'template') {
      for (const attr of styleAttributes(block.children)) {
        const result = scanStyleAttribute(file, attr);
        if (result.error !== undefined) return { occurrences: [], error: result.error };
        occurrences.push(...result.occurrences);
      }
    }
  }
  return { occurrences };
}

function attribute(element: ElementNode, name: string): AttributeNode | undefined {
  return element.props.find(
    (p): p is AttributeNode => p.type === NodeTypes.ATTRIBUTE && p.name === name,
  );
}

function scanStyleBlock(source: string, file: string, block: ElementNode): ScanResult {
  if (attribute(block, 'src') !== undefined) return { occurrences: [] };
  const lang = (attribute(block, 'lang')?.value?.content ?? '').toLowerCase();
  const syntax = STYLE_LANGS[lang];
  if (syntax === undefined) return { occurrences: [] };

  const content = block.children[0];
  if (content === undefined) return { occurrences: [] };
  const start = content.loc.start;
  const end = block.children.at(-1)?.loc.end ?? content.loc.end;
  return scanCss(source.slice(start.offset, end.offset), file, {
    syntax,
    lineOffset: start.line - 1,
    columnOffset: start.column - 1,
  });
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
  if (value === undefined) return { occurrences: [] };
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
