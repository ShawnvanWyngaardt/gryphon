import { describe, expect, it } from 'vitest';

import { SPEC_VERSION } from './index.js';

describe('core entry point', () => {
  it('targets the alpha DESIGN.md spec', () => {
    expect(SPEC_VERSION).toBe('alpha');
  });
});
