import '@testing-library/jest-dom/vitest';

Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'sanitized-test-random-id' },
  configurable: true,
});
