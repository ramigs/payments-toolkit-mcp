import { describe, it, expect } from 'vitest';
import { validateIban, formatIban } from '../../../src/lib/iban.js';

describe('validateIban', () => {
  it('accepts a valid German IBAN', () => {
    expect(validateIban('DE89370400440532013000')).toEqual({
      valid: true,
      country: 'DE',
      ibanFormatted: 'DE89 3704 0044 0532 0130 00',
    });
  });

  it('accepts a valid UK IBAN', () => {
    expect(validateIban('GB29NWBK60161331926819')).toEqual({
      valid: true,
      country: 'GB',
      ibanFormatted: 'GB29 NWBK 6016 1331 9268 19',
    });
  });

  it('accepts a valid Belgian IBAN', () => {
    expect(validateIban('BE68539007547034')).toEqual({
      valid: true,
      country: 'BE',
      ibanFormatted: 'BE68 5390 0754 7034',
    });
  });

  it('normalizes spaces and lowercase letters', () => {
    expect(validateIban('de89 3704 0044 0532 0130 00')).toEqual({
      valid: true,
      country: 'DE',
      ibanFormatted: 'DE89 3704 0044 0532 0130 00',
    });
  });

  it('rejects a bad checksum', () => {
    expect(validateIban('DE89370400440532013001')).toEqual({
      valid: false,
      country: 'DE',
      ibanFormatted: 'DE89 3704 0044 0532 0130 01',
      failureReason: 'checksum',
    });
  });

  it('rejects the wrong length for a known country', () => {
    expect(validateIban('DE8937040044053201300')).toEqual({
      valid: false,
      country: 'DE',
      ibanFormatted: 'DE89 3704 0044 0532 0130 0',
      failureReason: 'length',
    });
  });

  it('rejects an unknown country code', () => {
    expect(validateIban('ZZ89370400440532013000')).toEqual({
      valid: false,
      country: 'ZZ',
      ibanFormatted: 'ZZ89 3704 0044 0532 0130 00',
      failureReason: 'country',
    });
  });

  it('rejects a string that does not match the IBAN format', () => {
    expect(validateIban('1234')).toEqual({
      valid: false,
      ibanFormatted: '1234',
      failureReason: 'format',
    });
  });

  it('rejects an empty string', () => {
    expect(validateIban('')).toEqual({
      valid: false,
      ibanFormatted: '',
      failureReason: 'format',
    });
  });
});

describe('formatIban', () => {
  it('groups into blocks of four with no trailing space', () => {
    expect(formatIban('DE89370400440532013000')).toBe(
      'DE89 3704 0044 0532 0130 00',
    );
  });
});
