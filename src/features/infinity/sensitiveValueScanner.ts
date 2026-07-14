import type { ParameterSensitivity } from '../models';

export interface SensitiveScanResult {
  sensitivity: ParameterSensitivity;
  reasons: string[];
}

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:^|\s)(?:\+?\d[\d .()-]{7,}\d)(?:$|\s)/;
const tokenPattern = /(?:^|[^a-z0-9])(?:[a-z0-9_-]{28,}|[a-f0-9]{32,})(?:$|[^a-z0-9])/i;
const earliestSupportedDcsdat = Date.UTC(2000, 0, 1);
const latestSupportedDcsdat = Date.UTC(2100, 0, 1);

export function isExpectedDcsdatTimestamp(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const timestamp = Number(value);
  return timestamp >= earliestSupportedDcsdat && timestamp < latestSupportedDcsdat;
}

function nameIndicatesIdentifier(name: string): boolean {
  return (
    /^ora\.(?:eloqua|elq(?:\.|$))/i.test(name) ||
    /(?:^|[._-])(?:(?:visitor|customer|account|order|cart|user|contact|cookie|client|session)[._-]?)?(?:id|vid)(?:$|[._-])/i.test(
      name,
    )
  );
}

function passesLuhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (alternate) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function scanSensitiveValue(name: string, value: string | null): SensitiveScanResult {
  if (value === null) return { sensitivity: 'none', reasons: [] };
  if (emailPattern.test(value)) {
    return {
      sensitivity: 'email',
      reasons: ['Value resembles a raw email address.'],
    };
  }
  if (name.toLowerCase() === 'dcsdat' && isExpectedDcsdatTimestamp(value)) {
    return { sensitivity: 'none', reasons: [] };
  }
  const digits = value.replace(/[^0-9]/g, '');
  if (passesLuhn(digits)) {
    return {
      sensitivity: 'payment-card',
      reasons: ['Value passes a payment-card checksum.'],
    };
  }
  if (phonePattern.test(value)) {
    return {
      sensitivity: 'phone',
      reasons: ['Value resembles a phone number.'],
    };
  }
  if (nameIndicatesIdentifier(name)) {
    return {
      sensitivity: 'identifier',
      reasons: ['Parameter name indicates an identifier.'],
    };
  }
  if (tokenPattern.test(` ${value} `)) {
    return {
      sensitivity: 'token-or-secret',
      reasons: ['Value resembles a long token or secret.'],
    };
  }
  return { sensitivity: 'none', reasons: [] };
}
