type ExtensionOperation = () => void | PromiseLike<unknown>;
type UnexpectedErrorHandler = (error: unknown) => void;

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('extension context invalidated');
}

function reportUnexpectedExtensionError(error: unknown): void {
  console.error('Oracle Infinity Inspector extension operation failed.', error);
}

export function runExtensionOperation(
  operation: ExtensionOperation,
  onUnexpectedError: UnexpectedErrorHandler = reportUnexpectedExtensionError,
  onContextInvalidated?: () => void,
): void {
  const handleError = (error: unknown) => {
    if (isExtensionContextInvalidatedError(error)) {
      onContextInvalidated?.();
      return;
    }
    onUnexpectedError(error);
  };

  try {
    void Promise.resolve(operation()).catch(handleError);
  } catch (error) {
    handleError(error);
  }
}
