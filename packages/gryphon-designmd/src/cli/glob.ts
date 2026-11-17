/**
 * A small glob subset for gryphon.config.json: `**` (any folders,
 * including none), `*` (anything except `/`), `?` (one character
 * except `/`). Paths use `/`. No dependency, and easy to test.
 */
function toRegExp(glob: string): RegExp {
  let pattern = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i] ?? '';
    if (ch === '*' && glob[i + 1] === '*') {
      // "**/" matches zero or more folders; a trailing "**" matches the rest.
      if (glob[i + 2] === '/') {
        pattern += '(?:.*/)?';
        i += 2;
      } else {
        pattern += '.*';
        i += 1;
      }
    } else if (ch === '*') {
      pattern += '[^/]*';
    } else if (ch === '?') {
      pattern += '[^/]';
    } else {
      pattern += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${pattern}$`);
}

/** True when the `/`-separated path matches at least one glob. */
export function matchesAny(globs: readonly string[], path: string): boolean {
  return globs.some((glob) => toRegExp(glob).test(path));
}
