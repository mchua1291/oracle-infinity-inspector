export function detectInspectedExpression(expression: string): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) =>
      resolve(exceptionInfo?.isException ? undefined : result === true),
    );
  });
}

export function getInspectedPageUrl(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval('location.href', (result, exceptionInfo) => {
      resolve(exceptionInfo?.isException || typeof result !== 'string' ? undefined : result);
    });
  });
}

export function reloadInspectedWindow(): void {
  chrome.devtools.inspectedWindow.reload({ ignoreCache: false });
}
