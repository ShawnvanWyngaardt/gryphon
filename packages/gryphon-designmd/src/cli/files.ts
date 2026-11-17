import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/** Folders never scanned, with or without git (AC2.9). */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
/** File types the CLI checks in v0. Vue follows in G4-01. */
export const EXTENSIONS = ['.css', '.scss'];

const toPosix = (path: string): string => path.split(sep).join('/');
const wanted = (path: string): boolean =>
  EXTENSIONS.some((ext) => path.endsWith(ext)) &&
  !path.split('/').some((part) => SKIP_DIRS.has(part));

/**
 * Lists files to check, relative to `cwd`, sorted. Inside a git
 * repository, git decides what is ignored, so `.gitignore` is followed
 * exactly. Otherwise, or if git is missing or refuses, we walk the
 * folders ourselves and skip only the default folders.
 */
export function findFiles(cwd: string, paths: readonly string[]): string[] {
  const targets = paths.length > 0 ? paths : ['.'];
  const fromGit = gitFiles(cwd, targets);
  // resolve, not join: an absolute target must stay absolute.
  const files = fromGit ?? targets.flatMap((target) => walk(cwd, resolve(cwd, target)));
  return [...new Set(files.map(toPosix).filter(wanted))].sort();
}

function gitFiles(cwd: string, targets: readonly string[]): string[] | null {
  try {
    // core.fsmonitor=false: a repository's own git config must never make
    // us run a program (NFR-S4). ls-files only reads the index.
    const output = execFileSync(
      'git',
      [
        '-c',
        'core.fsmonitor=false',
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        '--',
        ...targets,
      ],
      { cwd, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 },
    ).toString('utf8');
    // Deleted files can still be in the index.
    return output.split('\0').filter((path) => path !== '' && existsSync(join(cwd, path)));
  } catch {
    return null;
  }
}

function walk(cwd: string, path: string): string[] {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return [];
  }
  if (stats.isFile()) return [relative(cwd, path)];
  if (!stats.isDirectory()) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return [];
    return walk(cwd, join(path, entry.name));
  });
}
