import { describe, it, expect } from 'vitest';
import { cardNumberSchema } from '../../../src/lib/schemas.js';

describe('cardNumberSchema', () => {
  it('accepts the minimum valid length (8 digits)', () => {
    expect(cardNumberSchema.safeParse('12345678').success).toBe(true);
  });

  it('accepts the maximum valid length (19 digits)', () => {
    expect(cardNumberSchema.safeParse('1234567890123456789').success).toBe(
      true,
    );
  });

  it('rejects a string shorter than 8 digits', () => {
    expect(cardNumberSchema.safeParse('1234567').success).toBe(false);
  });

  it('rejects a string longer than 19 digits', () => {
    expect(cardNumberSchema.safeParse('12345678901234567890').success).toBe(
      false,
    );
  });

  it('rejects separators like spaces and dashes', () => {
    expect(cardNumberSchema.safeParse('4111 1111 1111 1111').success).toBe(
      false,
    );
    expect(cardNumberSchema.safeParse('4111-1111-1111-1111').success).toBe(
      false,
    );
  });

  it('rejects non-digit characters', () => {
    expect(cardNumberSchema.safeParse('4111111111111abc').success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(cardNumberSchema.safeParse('').success).toBe(false);
  });
});
