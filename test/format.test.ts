import { describe, expect, it } from 'vitest';
import { compactUsd, slugify, shortWallet } from '../src/shared/format.js';

describe('format helpers', () => {
  it('creates compact USD labels', () => {
    expect(compactUsd(125000)).toBe('$125K');
    expect(compactUsd(1250000)).toBe('$1.25M');
  });

  it('slugifies article text', () => {
    expect(slugify('0xa2cd loses $250K on May 10, 2026!')).toBe('0xa2cd-loses-250k-on-may-10-2026');
  });

  it('shortens wallets for readable slugs', () => {
    expect(shortWallet('0x1234567890abcdef')).toBe('0x1234-cdef');
  });
});

