import { scanSensitiveValue } from '../../src/features/infinity/sensitiveValueScanner';

describe('sensitive-value scanner', () => {
  it('flags raw email-like values', () =>
    expect(scanSensitiveValue('contact', 'person@example.test')).toMatchObject({
      sensitivity: 'email',
    }));
  it('flags long token-like values', () =>
    expect(scanSensitiveValue('auth', 'abcDEF0123456789abcDEF0123456789')).toMatchObject({
      sensitivity: 'token-or-secret',
    }));
  it('leaves ordinary values unflagged', () =>
    expect(scanSensitiveValue('section', 'products')).toMatchObject({
      sensitivity: 'none',
    }));
  it('treats a plausible dcsdat millisecond timestamp as generated data', () =>
    expect(scanSensitiveValue('dcsdat', '1783982327833')).toMatchObject({
      sensitivity: 'none',
    }));
  it('does not exempt a phone-shaped malformed dcsdat value', () =>
    expect(scanSensitiveValue('dcsdat', '2125550199')).toMatchObject({
      sensitivity: 'phone',
    }));
  it('still flags a raw email passed as dcsdat', () =>
    expect(scanSensitiveValue('dcsdat', 'person@example.test')).toMatchObject({
      sensitivity: 'email',
    }));
  it.each(['ora.eloqua', 'ora.c_id', 'ora.elq.vid'])(
    'treats intentional cross-product identifier %s as an identifier, not a secret',
    (name) =>
      expect(scanSensitiveValue(name, 'abcDEF0123456789abcDEF0123456789')).toMatchObject({
        sensitivity: 'identifier',
      }),
  );
  it('still flags a raw email even when it appears in an intentional identifier field', () =>
    expect(scanSensitiveValue('ora.eloqua', 'person@example.test')).toMatchObject({
      sensitivity: 'email',
    }));
});
