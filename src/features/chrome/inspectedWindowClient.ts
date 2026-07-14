export function detectOraGlobal(): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(
      "typeof window.ORA !== 'undefined'",
      (result, exceptionInfo) => resolve(exceptionInfo?.isException ? undefined : result === true),
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

export async function copyOracleDebugUrl(pageUrl: string): Promise<void> {
  const url = new URL(pageUrl);
  url.searchParams.set('_ora.debug', 'vvvv');
  await navigator.clipboard.writeText(url.toString());
}
