export function evaluateInspectedValue<T>(expression: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) =>
      resolve(exceptionInfo?.isException ? undefined : (result as T)),
    );
  });
}

export async function detectInspectedExpression(expression: string): Promise<boolean | undefined> {
  const result = await evaluateInspectedValue<unknown>(expression);
  return result === undefined ? undefined : result === true;
}

export function getInspectedPageUrl(): Promise<string | undefined> {
  return evaluateInspectedValue<unknown>('location.href').then((result) =>
    typeof result === 'string' ? result : undefined,
  );
}

export function reloadInspectedWindow(): void {
  chrome.devtools.inspectedWindow.reload({ ignoreCache: false });
}
