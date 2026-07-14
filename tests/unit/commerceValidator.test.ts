import { buildCommerceDiagnostics } from '../../src/features/diagnostics/commerceValidator';
import type { ObservedParameter } from '../../src/features/models';
import { networkFixture } from '../helpers';

function parameter(name: string, value: string | null): ObservedParameter {
  return {
    id: `event-1:${name}`,
    name,
    value,
    sourceType: 'cx-tag-network',
    eventTimestamp: '2026-01-01T00:00:01.000Z',
    eventId: 'event-1',
    origin: 'query-string',
    classification: 'standard',
    sensitivity: 'none',
  };
}

function findings(values: Record<string, string | null>) {
  const parameters = Object.entries(values).map(([name, value]) => parameter(name, value));
  return buildCommerceDiagnostics([
    networkFixture({ parameterCount: parameters.length, parameters }),
  ]);
}

describe('Oracle commerce diagnostics', () => {
  it('accepts an aligned add-to-cart payload', () => {
    expect(
      findings({
        'wt.ev': '$AddProductToCart',
        'wt.tx_e': 'a',
        'wt.pn_sku': 'SKU-1;SKU-2',
        'wt.tx_u': '2;1',
        'wt.product_price': '10.00;5.00',
        'wt.tx_s': '20.00;5.00',
        'wt.currency': 'GBP',
      }),
    ).toEqual([]);
  });

  it('flags a transaction code that conflicts with the reserved commerce event', () => {
    expect(findings({ 'wt.ev': '$Purchase', 'wt.tx_e': 'a', 'wt.pn_sku': 'SKU-1' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'commerce-transaction-code-mismatch',
          severity: 'high',
        }),
      ]),
    );
  });

  it('flags misaligned line-item lists and incorrect line subtotals', () => {
    const result = findings({
      'wt.ev': '$Purchase',
      'wt.tx_e': 'p',
      'wt.pn_sku': 'SKU-1;SKU-2',
      'wt.tx_u': '2;1',
      'wt.product_price': '10.00;5.00',
      'wt.tx_s': '19.00',
    });
    expect(result.some((finding) => finding.code === 'commerce-line-item-count-mismatch')).toBe(
      true,
    );

    const subtotalResult = findings({
      'wt.ev': '$Purchase',
      'wt.tx_e': 'p',
      'wt.pn_sku': 'SKU-1',
      'wt.tx_u': '2',
      'wt.product_price': '10.00',
      'wt.tx_s': '19.00',
    });
    expect(
      subtotalResult.some((finding) => finding.code === 'commerce-line-subtotal-mismatch'),
    ).toBe(true);
  });

  it('flags documented money, currency, invoice, and hashed-email formats', () => {
    const result = findings({
      'wt.ev': '$Purchase',
      'wt.tx_e': 'p',
      'wt.pn_sku': 'SKU-1',
      'wt.tx_u': '1',
      'wt.product_price': '10',
      'wt.tx_s': '10.00',
      'wt.currency': 'usd',
      'wt.tx_id': '2026-01-01',
      'wt.tx_it': '8:15 PM',
      'wt.email_sha256': 'not-a-sha256-hash',
    });
    expect(new Set(result.map((finding) => finding.code))).toEqual(
      expect.objectContaining(
        new Set([
          'commerce-money-format',
          'commerce-currency-format',
          'commerce-invoice-date-format',
          'commerce-invoice-time-format',
          'commerce-email-hash-format',
        ]),
      ),
    );
  });

  it('treats missing wt.ev and companion identifiers as advisory findings', () => {
    expect(findings({ 'wt.tx_e': 'a', 'wt.product_name': 'Example' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'commerce-event-type-missing', severity: 'low' }),
      ]),
    );
    expect(findings({ 'wt.ev': '$ViewProduct', 'wt.tx_e': 'v' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'commerce-companion-parameter-missing',
          severity: 'low',
        }),
      ]),
    );
  });

  it('does not treat View Order Status order identifiers as purchase dates', () => {
    const result = findings({ 'wt.ev': '$ViewOrderStatus', 'wt.tx_id': 'ORDER-123' });
    expect(result.some((finding) => finding.code === 'commerce-invoice-date-format')).toBe(false);
  });
});
