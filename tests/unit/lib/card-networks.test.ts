import { describe, it, expect } from 'vitest';
import { detectCardType } from '../../../src/lib/card-networks.js';

describe('detectCardType', () => {
  it('detects Visa (prefix 4)', () => {
    expect(detectCardType('4000000000000000')).toBe('Visa');
  });

  it('detects Mastercard at the low end of the 51-55 range', () => {
    expect(detectCardType('5100000000000000')).toBe('Mastercard');
  });

  it('detects Mastercard at the high end of the 51-55 range', () => {
    expect(detectCardType('5500000000000000')).toBe('Mastercard');
  });

  it('detects Mastercard at the low end of the 2221-2720 range', () => {
    expect(detectCardType('2221000000000000')).toBe('Mastercard');
  });

  it('detects Mastercard at the high end of the 2221-2720 range', () => {
    expect(detectCardType('2720000000000000')).toBe('Mastercard');
  });

  it('does not detect Mastercard just below the 2221-2720 range', () => {
    expect(detectCardType('2220000000000000')).toBe('unknown');
  });

  it('does not detect Mastercard just above the 2221-2720 range', () => {
    expect(detectCardType('2721000000000000')).toBe('unknown');
  });

  it('detects American Express (34)', () => {
    expect(detectCardType('340000000000000')).toBe('American Express');
  });

  it('detects American Express (37)', () => {
    expect(detectCardType('370000000000000')).toBe('American Express');
  });

  it('detects Discover (6011)', () => {
    expect(detectCardType('6011000000000000')).toBe('Discover');
  });

  it('detects Discover (644-649)', () => {
    expect(detectCardType('6444000000000000')).toBe('Discover');
  });

  it('detects Discover (65)', () => {
    expect(detectCardType('6500000000000000')).toBe('Discover');
  });

  it('detects Diners Club (300-305)', () => {
    expect(detectCardType('3000000000000000')).toBe('Diners Club');
  });

  it('does not detect Diners Club just above the 300-305 range', () => {
    expect(detectCardType('3060000000000000')).toBe('unknown');
  });

  it('detects Diners Club (36)', () => {
    expect(detectCardType('3600000000000000')).toBe('Diners Club');
  });

  it('detects Diners Club (38)', () => {
    expect(detectCardType('3800000000000000')).toBe('Diners Club');
  });

  it('detects JCB at the low end of the 3528-3589 range', () => {
    expect(detectCardType('3528000000000000')).toBe('JCB');
  });

  it('detects JCB at the high end of the 3528-3589 range', () => {
    expect(detectCardType('3589000000000000')).toBe('JCB');
  });

  it('returns unknown for an unrecognized prefix', () => {
    expect(detectCardType('9999999999999999')).toBe('unknown');
  });
});
