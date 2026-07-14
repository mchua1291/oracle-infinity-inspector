import '@testing-library/jest-dom/vitest';

let testRandomId = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => `sanitized-test-random-id-${++testRandomId}` },
  configurable: true,
});
