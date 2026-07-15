import { afterEach } from 'vitest';
import { buildDiscoveryPageProbeExpression } from '../../src/features/discovery/pageProbe';

afterEach(() => {
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'utag_data');
  document.head.innerHTML = '';
});

it('executes as a self-contained read-only inspected-page expression', () => {
  let getterCalls = 0;
  const ecommerce = { items: [{ item_id: 'SKU-1' }] };
  Object.defineProperty(ecommerce, 'computedSecret', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'must-not-be-read';
    },
  });
  Object.defineProperty(window, 'dataLayer', {
    configurable: true,
    value: [
      {
        event: 'view_item',
        ecommerce,
      },
    ],
  });
  Object.defineProperty(window, 'utag_data', {
    configurable: true,
    value: { page_name: 'Product detail' },
  });
  document.head.innerHTML =
    '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-EXAMPLE"></script>';

  const result = window.eval(buildDiscoveryPageProbeExpression()) as {
    layers: Array<{ objectName: string; fields: Array<{ path: string; value: unknown }> }>;
  };

  expect(result.layers.map((layer) => layer.objectName)).toEqual(['dataLayer', 'utag_data']);
  expect(result.layers[0].fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: 'dataLayer[0].event', value: 'view_item' }),
      expect.objectContaining({ path: 'dataLayer[0].ecommerce.items[0].item_id', value: 'SKU-1' }),
      expect.objectContaining({
        path: 'dataLayer[0].ecommerce.computedSecret',
        value: '[Getter]',
        state: 'unsupported',
      }),
    ]),
  );
  expect(getterCalls).toBe(0);
  expect(Reflect.get(window, 'dataLayer')).toHaveLength(1);
});
