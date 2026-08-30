const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SD: 18,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
};

/** Which check an IBAN failed, when `valid` is `false`. */
export type IbanFailureReason = 'format' | 'country' | 'length' | 'checksum';

export interface IbanValidation {
  valid: boolean;
  /** ISO 3166-1 alpha-2 country code — absent only for a malformed prefix. */
  country?: string;
  /** The normalised IBAN grouped into blocks of four for display. */
  ibanFormatted?: string;
  failureReason?: IbanFailureReason;
}

/** Group an IBAN into space-separated blocks of four: `DE89 3704 0044 …`. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function validateIban(rawIban: string): IbanValidation {
  const iban = rawIban.replace(/\s+/g, '').toUpperCase();

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    // Not IBAN-shaped — echo the normalised input as-is rather than forcing it
    // into four-character groups.
    return { valid: false, ibanFormatted: iban, failureReason: 'format' };
  }

  const country = iban.slice(0, 2);
  const ibanFormatted = formatIban(iban);
  const expectedLength = IBAN_LENGTHS[country];
  if (!expectedLength) {
    return { valid: false, country, ibanFormatted, failureReason: 'country' };
  }
  if (iban.length !== expectedLength) {
    return { valid: false, country, ibanFormatted, failureReason: 'length' };
  }

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = [...rearranged]
    .map((ch) =>
      ch >= '0' && ch <= '9' ? ch : (ch.charCodeAt(0) - 55).toString(),
    )
    .join('');

  if (BigInt(numeric) % 97n !== 1n) {
    return { valid: false, country, ibanFormatted, failureReason: 'checksum' };
  }

  return { valid: true, country, ibanFormatted };
}
