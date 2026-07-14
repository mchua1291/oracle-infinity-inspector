import {
  isExtensionContextInvalidatedError,
  runExtensionOperation,
} from '../../src/features/chrome/extensionLifecycle';

describe('extension lifecycle operations', () => {
  it('recognizes Edge extension-context invalidation errors', () => {
    expect(isExtensionContextInvalidatedError(new Error('Extension context invalidated.'))).toBe(
      true,
    );
    expect(isExtensionContextInvalidatedError(new Error('Unexpected message failure'))).toBe(false);
  });

  it.each([
    [
      'synchronous',
      () => {
        throw new Error('Extension context invalidated.');
      },
    ],
    ['asynchronous', () => Promise.reject(new Error('Extension context invalidated.'))],
  ])('quietly settles a %s invalidation', async (_label, operation) => {
    const onUnexpectedError = vi.fn();
    const onContextInvalidated = vi.fn();

    runExtensionOperation(operation, onUnexpectedError, onContextInvalidated);
    await Promise.resolve();

    expect(onUnexpectedError).not.toHaveBeenCalled();
    expect(onContextInvalidated).toHaveBeenCalledOnce();
  });

  it('reports unrelated asynchronous errors', async () => {
    const error = new Error('Unexpected message failure');
    const onUnexpectedError = vi.fn();

    runExtensionOperation(() => Promise.reject(error), onUnexpectedError);
    await Promise.resolve();

    expect(onUnexpectedError).toHaveBeenCalledWith(error);
  });
});
