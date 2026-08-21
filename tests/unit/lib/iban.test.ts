import { describe, it, expect } from 'vitest';
import { validateIban } from '../../../src/lib/iban.js';

describe('validateIban', () => {
  it('accepts a valid German IBAN', () => {
    expect(validateIban('DE89370400440532013000')).toEqual({
      valid: true,
      country: 'DE',
    });
  });

  it('accepts a valid UK IBAN', () => {
    expect(validateIban('GB29NWBK60161331926819')).toEqual({
      valid: true,
      country: 'GB',
    });
  });

  it('accepts a valid Belgian IBAN', () => {
    expect(validateIban('BE68539007547034')).toEqual({
      valid: true,
      country: 'BE',
    });
  });

  it('normalizes spaces and lowercase letters', () => {
    expect(validateIban('de89 3704 0044 0532 0130 00')).toEqual({
      valid: true,
      country: 'DE',
    });
  });

  it('rejects a bad checksum', () => {
    expect(validateIban('DE89370400440532013001')).toEqual({
      valid: false,
      country: 'DE',
    });
  });

  it('rejects the wrong length for a known country', () => {
    expect(validateIban('DE8937040044053201300')).toEqual({
      valid: false,
      country: 'DE',
    });
  });

  it('rejects an unknown country code', () => {
    expect(validateIban('ZZ89370400440532013000')).toEqual({
      valid: false,
      country: 'ZZ',
    });
  });

  it('rejects a string that does not match the IBAN format', () => {
    expect(validateIban('1234')).toEqual({ valid: false });
  });

  it('rejects an empty string', () => {
    expect(validateIban('')).toEqual({ valid: false });
  });
});
