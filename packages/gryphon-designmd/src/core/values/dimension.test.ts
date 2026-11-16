import { describe, expect, it } from 'vitest';

import { parseDimension } from './dimension.js';

describe('parseDimension (AC1.6)', () => {
  it.each([
    ['16px', 16],
    ['0', 0],
    ['0px', 0],
    ['1rem', 16],
    ['0.75rem', 12],
    ['.5rem', 8],
    ['1.5em', 24],
    ['-8px', -8],
    ['-0.5rem', -8],
    ['1.1rem', 17.6],
    ['16PX', 16],
    ['  24px ', 24],
  ] as const)('%s is %s px', (input, px) => {
    expect(parseDimension(input)).toBe(px);
  });

  it('uses the configured root size for rem and em', () => {
    expect(parseDimension('1rem', 10)).toBe(10);
    expect(parseDimension('2em', 10)).toBe(20);
    expect(parseDimension('16px', 10)).toBe(16);
  });

  it('returns null for units and values it cannot convert', () => {
    for (const input of [
      '',
      '16',
      '50%',
      '10vw',
      '12pt',
      'auto',
      'calc(1px + 2px)',
      '1e2px',
      'px',
      '1.2.3px',
    ]) {
      expect(parseDimension(input)).toBeNull();
    }
  });
});
