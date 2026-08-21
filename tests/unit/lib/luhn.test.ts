import { describe, it, expect } from 'vitest';
import { isValidLuhn } from '../../../src/lib/luhn.js';

describe('isValidLuhn', () => {
  it('accepts a known-valid Visa test number', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
  });

  it('accepts a known-valid Mastercard test number', () => {
    expect(isValidLuhn('5500000000000004')).toBe(true);
  });

  it('rejects a number with an incorrect check digit', () => {
    expect(isValidLuhn('4111111111111112')).toBe(false);
  });

  it('accepts a single valid digit (0)', () => {
    expect(isValidLuhn('0')).toBe(true);
  });

  it('rejects a single invalid digit', () => {
    expect(isValidLuhn('1')).toBe(false);
  });

  it('handles doubled digits that need the -9 correction', () => {
    // second-from-right digit 9 doubles to 18 -> 9 after correction
    expect(isValidLuhn('79927398713')).toBe(true);
  });
});
