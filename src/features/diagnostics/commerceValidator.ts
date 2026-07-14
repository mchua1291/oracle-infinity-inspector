import type {
  DiagnosticSeverity,
  DiagnosticWarning,
  ObservedParameter,
  OracleNetworkObservation,
} from '../models';
import { COMMERCE_GUIDE_URL } from '../infinity/infinityDocumentation';

export interface CommerceEventDefinition {
  eventValue: string;
  label: string;
  transactionCode?: string;
  transactionCodeRequired?: boolean;
  companionParameter?: string;
}

export const COMMERCE_EVENT_DEFINITIONS: CommerceEventDefinition[] = [
  {
    eventValue: '$ViewProduct',
    label: 'View Product',
    transactionCode: 'v',
    transactionCodeRequired: true,
    companionParameter: 'wt.pn_sku',
  },
  { eventValue: '$ViewCategory', label: 'View Category', transactionCode: 'c' },
  {
    eventValue: '$AddProductToCart',
    label: 'Add Product to Cart',
    transactionCode: 'a',
    transactionCodeRequired: true,
    companionParameter: 'wt.pn_sku',
  },
  {
    eventValue: '$RemoveProductFromCart',
    label: 'Remove Product from Cart',
    transactionCode: 'r',
    transactionCodeRequired: true,
    companionParameter: 'wt.pn_sku',
  },
  {
    eventValue: '$ViewShoppingCartItems',
    label: 'View Shopping Cart Items',
    transactionCode: 'vc',
    companionParameter: 'wt.tx_cartid',
  },
  { eventValue: '$Checkout', label: 'Checkout', transactionCode: 'co' },
  {
    eventValue: '$Purchase',
    label: 'Purchase Product',
    transactionCode: 'p',
    transactionCodeRequired: true,
    companionParameter: 'wt.pn_sku',
  },
  {
    eventValue: '$ViewOrderStatus',
    label: 'View Order Status',
    companionParameter: 'wt.tx_i',
  },
  {
    eventValue: '$AddProductToWishlist',
    label: 'Add Product to Wishlist',
    companionParameter: 'wt.pn_sku',
  },
  {
    eventValue: '$AddProductToFavorites',
    label: 'Add Product to Favorites',
    companionParameter: 'wt.pn_sku',
  },
  { eventValue: '$RateProduct', label: 'Rate Product', companionParameter: 'wt.pn_sku' },
  { eventValue: '$CompareProduct', label: 'Compare Product', companionParameter: 'wt.pn_sku' },
];

const definitions = new Map(
  COMMERCE_EVENT_DEFINITIONS.map((definition) => [definition.eventValue.toLowerCase(), definition]),
);
const transactionCodes = new Map(
  COMMERCE_EVENT_DEFINITIONS.filter((definition) => definition.transactionCode).map(
    (definition) => [definition.transactionCode!, definition],
  ),
);
const lineItemNames = [
  'wt.pn_sku',
  'wt.pn_id',
  'wt.product_name',
  'wt.product_price',
  'wt.tx_u',
  'wt.tx_s',
  'wt.cg_n',
  'wt.cg_s',
  'wt.product_discount',
  'wt.pn_ma',
  'wt.product_variant',
];
const moneyNames = [
  'wt.product_price',
  'wt.tx_s',
  'wt.product_discount',
  'wt.cart_subtotal',
  'wt.cart_total',
  'wt.cart_tax',
  'wt.cart_shipping',
  'wt.cart_discount',
];
const commerceSignalNames = new Set([
  ...lineItemNames,
  ...moneyNames,
  'wt.currency',
  'wt.tx_cartid',
  'wt.cart_coupon',
  'wt.tx_i',
  'wt.tx_id',
  'wt.tx_it',
  'wt.email_sha256',
]);

function parameterMap(event: OracleNetworkObservation) {
  return new Map(event.parameters.map((parameter) => [parameter.name.toLowerCase(), parameter]));
}

function stringValue(parameter: ObservedParameter | undefined): string | undefined {
  return typeof parameter?.value === 'string' && parameter.value !== ''
    ? parameter.value.trim()
    : undefined;
}

function parts(parameter: ObservedParameter): string[] {
  return typeof parameter.value === 'string' ? parameter.value.split(';') : [];
}

export function commerceEventDefinition(
  event: OracleNetworkObservation,
): CommerceEventDefinition | undefined {
  const eventValue = stringValue(
    event.parameters.find((parameter) => parameter.name.toLowerCase() === 'wt.ev'),
  );
  return eventValue ? definitions.get(eventValue.toLowerCase()) : undefined;
}

export function buildCommerceDiagnostics(events: OracleNetworkObservation[]): DiagnosticWarning[] {
  return events.flatMap(validateCommerceEvent);
}

function validateCommerceEvent(event: OracleNetworkObservation): DiagnosticWarning[] {
  if (event.eventKind === 'loader') return [];
  const parameters = parameterMap(event);
  const eventValue = stringValue(parameters.get('wt.ev'));
  const transactionCode = stringValue(parameters.get('wt.tx_e'))?.toLowerCase();
  const definition = eventValue ? definitions.get(eventValue.toLowerCase()) : undefined;
  const hasCommerceData =
    Boolean(definition) ||
    Boolean(transactionCode && transactionCodes.has(transactionCode)) ||
    [...parameters.keys()].some((name) => commerceSignalNames.has(name));
  if (!hasCommerceData) return [];

  const findings: DiagnosticWarning[] = [];
  const evidence = (...names: string[]) => [
    event.id,
    ...names.map((name) => parameters.get(name)?.id).filter((id): id is string => Boolean(id)),
  ];
  const add = (
    code: string,
    severity: DiagnosticSeverity,
    title: string,
    message: string,
    recommendation: string,
    names: string[] = [],
  ) =>
    findings.push({
      id: `${code}:${event.id}:${names.join(',') || 'event'}`,
      code,
      severity,
      title,
      message,
      recommendation,
      evidenceIds: evidence(...names),
      sourceUrl: COMMERCE_GUIDE_URL,
    });

  if (!eventValue) {
    const inferred = transactionCode ? transactionCodes.get(transactionCode) : undefined;
    add(
      'commerce-event-type-missing',
      'low',
      'Commerce event type is missing',
      `Commerce parameters were observed without wt.ev${inferred ? `; wt.tx_e=${transactionCode} resembles ${inferred.label}` : ''}.`,
      'Confirm the intended commerce event. Oracle’s tables list a reserved $-prefixed wt.ev value, although some examples omit it.',
      ['wt.tx_e'],
    );
  }

  if (definition?.transactionCode) {
    if (!transactionCode) {
      add(
        'commerce-transaction-code-missing',
        definition.transactionCodeRequired ? 'medium' : 'low',
        'Commerce transaction code is missing',
        `${definition.label} is documented with wt.tx_e=${definition.transactionCode}.`,
        'Add the documented transaction code when the corresponding Oracle behavior or report depends on it.',
        ['wt.ev'],
      );
    } else if (transactionCode !== definition.transactionCode) {
      add(
        'commerce-transaction-code-mismatch',
        definition.transactionCodeRequired ? 'high' : 'medium',
        'Commerce transaction code does not match the event',
        `${definition.label} uses wt.ev=${definition.eventValue}, but wt.tx_e=${transactionCode}; Oracle documents wt.tx_e=${definition.transactionCode}.`,
        'Align wt.tx_e with the documented commerce event mapping.',
        ['wt.ev', 'wt.tx_e'],
      );
    }
  }

  if (definition?.companionParameter) {
    const alternativeOrderId =
      definition.eventValue === '$ViewOrderStatus' && stringValue(parameters.get('wt.tx_id'));
    if (!stringValue(parameters.get(definition.companionParameter)) && !alternativeOrderId) {
      add(
        'commerce-companion-parameter-missing',
        'low',
        'Documented commerce companion data is missing',
        `${definition.label} is documented with ${definition.companionParameter}${definition.eventValue === '$ViewOrderStatus' ? ' (the Oracle DC API example alternatively shows wt.tx_id)' : ''}.`,
        'Confirm which identifier is required by the Oracle Behaviors, Recommendations, or reporting configuration in use.',
        ['wt.ev'],
      );
    }
  }

  validateLineItems(parameters, add);
  validateCommerceFormats(parameters, definition, add);
  return findings;
}

function validateLineItems(
  parameters: Map<string, ObservedParameter>,
  add: (
    code: string,
    severity: DiagnosticSeverity,
    title: string,
    message: string,
    recommendation: string,
    names?: string[],
  ) => void,
) {
  const present = lineItemNames
    .map((name) => [name, parameters.get(name)] as const)
    .filter((entry): entry is readonly [string, ObservedParameter] => Boolean(entry[1]));
  if (!present.length) return;

  for (const [name, parameter] of present) {
    const emptyIndexes = parts(parameter)
      .map((value, index) => (value === '' ? index + 1 : undefined))
      .filter((index): index is number => index !== undefined);
    if (emptyIndexes.length)
      add(
        'commerce-empty-line-item-value',
        'medium',
        'Commerce line item contains an empty value',
        `${name} has an empty value at line-item position ${emptyIndexes.join(', ')}.`,
        'Populate the missing value or deliberately omit the correlated parameter for the entire event.',
        [name],
      );
  }

  const anchor =
    present.find(([name]) => name === 'wt.pn_sku') ??
    present.find(([name]) => name === 'wt.pn_id') ??
    present[0];
  const expectedCount = parts(anchor[1]).length;
  for (const [name, parameter] of present) {
    const count = parts(parameter).length;
    if (count !== expectedCount)
      add(
        'commerce-line-item-count-mismatch',
        'high',
        'Commerce line-item lists are misaligned',
        `${anchor[0]} contains ${expectedCount} line items, but ${name} contains ${count}.`,
        'Use the same semicolon-delimited item count and ordering for every correlated line-item parameter.',
        [anchor[0], name],
      );
  }

  const quantities = parameters.get('wt.tx_u');
  const prices = parameters.get('wt.product_price');
  const subtotals = parameters.get('wt.tx_s');
  if (!quantities || !prices || !subtotals) return;
  const quantityValues = parts(quantities);
  const priceValues = parts(prices);
  const subtotalValues = parts(subtotals);
  if (quantityValues.length !== priceValues.length || priceValues.length !== subtotalValues.length)
    return;
  const mismatches = subtotalValues.flatMap((subtotal, index) => {
    const quantity = Number(quantityValues[index]);
    const price = Number(priceValues[index]);
    const actual = Number(subtotal);
    return Number.isFinite(quantity) &&
      Number.isFinite(price) &&
      Number.isFinite(actual) &&
      Math.abs(quantity * price - actual) > 0.01
      ? [index + 1]
      : [];
  });
  if (mismatches.length)
    add(
      'commerce-line-subtotal-mismatch',
      'high',
      'Commerce line subtotal does not match quantity × price',
      `wt.tx_s differs from wt.tx_u × wt.product_price at line-item position ${mismatches.join(', ')}.`,
      'Correct the line subtotal or the corresponding unit quantity/price values.',
      ['wt.tx_u', 'wt.product_price', 'wt.tx_s'],
    );
}

function validateCommerceFormats(
  parameters: Map<string, ObservedParameter>,
  definition: CommerceEventDefinition | undefined,
  add: (
    code: string,
    severity: DiagnosticSeverity,
    title: string,
    message: string,
    recommendation: string,
    names?: string[],
  ) => void,
) {
  for (const name of moneyNames) {
    const parameter = parameters.get(name);
    if (!parameter) continue;
    const invalid = parts(parameter).filter((value) => !/^-?\d+\.\d{2}$/.test(value));
    if (invalid.length)
      add(
        'commerce-money-format',
        'medium',
        'Commerce monetary value has an unexpected format',
        `${name} should use decimal values in the documented XX.XX form; ${invalid.length} value(s) do not match.`,
        'Send each monetary value with exactly two decimal places and no thousands separator.',
        [name],
      );
  }

  const units = parameters.get('wt.tx_u');
  if (units && parts(units).some((value) => !/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0))
    add(
      'commerce-unit-format',
      'medium',
      'Commerce quantity has an unexpected format',
      'wt.tx_u contains a non-numeric or non-positive quantity.',
      'Send a positive numeric quantity for every line item.',
      ['wt.tx_u'],
    );

  const currency = stringValue(parameters.get('wt.currency'));
  if (currency && !/^[A-Z]{3}$/.test(currency))
    add(
      'commerce-currency-format',
      'low',
      'Commerce currency code has an unexpected format',
      `wt.currency=${currency} does not match the documented three-letter uppercase form such as GBP.`,
      'Confirm the intended currency code and normalize its case and length.',
      ['wt.currency'],
    );

  const invoiceDate =
    definition?.eventValue === '$Purchase' ? stringValue(parameters.get('wt.tx_id')) : undefined;
  if (invoiceDate && !/^(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/\d{4}$/.test(invoiceDate))
    add(
      'commerce-invoice-date-format',
      'medium',
      'Invoice date has an unexpected format',
      `wt.tx_id=${invoiceDate} does not match the documented mm/dd/yyyy syntax.`,
      'Send the invoice date in mm/dd/yyyy format.',
      ['wt.tx_id'],
    );

  const invoiceTime =
    definition?.eventValue === '$Purchase' ? stringValue(parameters.get('wt.tx_it')) : undefined;
  if (invoiceTime && !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(invoiceTime))
    add(
      'commerce-invoice-time-format',
      'medium',
      'Invoice time has an unexpected format',
      `wt.tx_it=${invoiceTime} does not match the documented hh:mm:ss syntax.`,
      'Send the invoice time in 24-hour hh:mm:ss format.',
      ['wt.tx_it'],
    );

  const emailHash = stringValue(parameters.get('wt.email_sha256'));
  if (emailHash && !/^[a-f0-9]{64}$/i.test(emailHash))
    add(
      'commerce-email-hash-format',
      'high',
      'Hashed email is not a SHA-256 value',
      'wt.email_sha256 is present but is not exactly 64 hexadecimal characters.',
      'Hash the normalized email with SHA-256 before collection and verify the resulting hexadecimal encoding.',
      ['wt.email_sha256'],
    );
}
