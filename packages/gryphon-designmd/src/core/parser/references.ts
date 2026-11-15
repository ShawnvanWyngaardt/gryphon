/** Same limit as Google's linter (`max_reference_depth`). */
export const MAX_REFERENCE_DEPTH = 10;

/** A token reference is a whole value wrapped in braces, for example `{colors.primary}`. */
export const REFERENCE = /^\{(.+)\}$/;

export type ReferenceProblemCode =
  'broken-reference' | 'reference-loop' | 'reference-too-deep' | 'invalid-reference';

/** Thrown while resolving. The parser turns it into a ParseError with a position. */
export class ReferenceProblem extends Error {
  constructor(
    readonly code: ReferenceProblemCode,
    message: string,
  ) {
    super(message);
  }
}

function isGroup(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Looks up a dotted path such as `colors.light.ink` in the front matter data. */
function lookup(data: unknown, path: string): unknown {
  let current: unknown = data;
  for (const key of path.split('.')) {
    if (!isGroup(current) || !Object.hasOwn(current, key)) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Follows a reference until it reaches a value (AC1.2).
 *
 * @param data the whole front matter, as plain data
 * @param fromPath the token that holds the reference, for error messages
 * @param reference the reference text, for example `{colors.primary}`
 * @param allowGroup true inside components, where `{typography.label-md}` is allowed
 * @returns the final value: a string or number, or a group when `allowGroup` is true
 * @throws ReferenceProblem when the reference is broken, loops, is too deep, or points at a group
 */
export function resolveReference(
  data: unknown,
  fromPath: string,
  reference: string,
  allowGroup: boolean,
): unknown {
  const chain = [fromPath];
  let target = REFERENCE.exec(reference)?.[1]?.trim() ?? '';

  for (let hops = 1; ; hops++) {
    if (hops > MAX_REFERENCE_DEPTH) {
      throw new ReferenceProblem(
        'reference-too-deep',
        `${fromPath} follows more than ${MAX_REFERENCE_DEPTH} references in a row. Point it closer to the real value.`,
      );
    }
    if (chain.includes(target)) {
      throw new ReferenceProblem(
        'reference-loop',
        `${fromPath} is part of a reference loop: ${[...chain, target].join(' -> ')}.`,
      );
    }
    const value = lookup(data, target);
    if (value === undefined || value === null) {
      throw new ReferenceProblem(
        'broken-reference',
        `${chain.at(-1) ?? fromPath} refers to {${target}}, which is not defined in DESIGN.md.`,
      );
    }
    chain.push(target);

    const next = typeof value === 'string' ? REFERENCE.exec(value)?.[1] : undefined;
    if (next !== undefined) {
      target = next.trim();
      continue;
    }
    if (isGroup(value) && !allowGroup) {
      throw new ReferenceProblem(
        'invalid-reference',
        `${fromPath} refers to {${target}}, but ${target} is a group, not a single value. Only components may refer to a group.`,
      );
    }
    return value;
  }
}
