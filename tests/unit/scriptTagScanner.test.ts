import { scanDocumentForCxTags, scanScriptTag } from '../../src/features/dom/scriptTagScanner';
import { scanDocumentForTagManagers } from '../../src/features/dom/tagManagerScanner';

describe('DOM CX Tag scanner', () => {
  it('detects a synchronous loader in head', () => {
    document.documentElement.innerHTML =
      '<head><script src="//d.oracleinfinity.io/infy/acs/account/example/js/site/odc.js?_ora.config=analytics:test"></script></head><body></body>';
    expect(scanDocumentForCxTags()[0]).toMatchObject({
      loadMode: 'synchronous',
      parserInsertedInference: true,
    });
  });

  it('detects async and dynamically inserted evidence', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    const script = document.createElement('script');
    script.src = 'https://d.oracleinfinity.io/infy/acs/account/example/js/site/odc.js';
    script.async = true;
    document.body.append(script);
    expect(scanScriptTag(script, true)).toMatchObject({
      loadMode: 'dynamically-inserted',
      async: true,
      dynamicallyInserted: true,
    });
  });

  it('detects inline loader construction without executing it', () => {
    document.documentElement.innerHTML = `<head><script>var sc=document.createElement('script'); sc.async=true; sc.src='//d.oracleinfinity.io/infy/acs/account/example/js/site/odc.js';</script></head>`;
    expect(scanDocumentForCxTags()[0]).toMatchObject({
      inlineLoaderEvidence: true,
      loadMode: 'asynchronous',
    });
  });
});

describe('DOM tag-manager scanner', () => {
  it.each([
    [
      '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC123"></script>',
      'google-tag-manager',
      'GTM-ABC123',
    ],
    [
      '<script src="https://tags.tiqcdn.com/utag/example/main/prod/utag.js"></script>',
      'tealium-iq',
      'example/main',
    ],
    [
      '<script src="https://assets.adobedtm.com/launch-EN123-development.min.js"></script>',
      'adobe-tags',
      'launch-EN123-development.min.js',
    ],
  ])('detects standard vendor evidence for %s', (markup, type, containerId) => {
    document.documentElement.innerHTML = `<head>${markup}</head><body></body>`;
    expect(scanDocumentForTagManagers()[0]).toMatchObject({ type, containerId });
  });

  it('does not treat the Google measurement tag as Google Tag Manager', () => {
    document.documentElement.innerHTML =
      '<head><script src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script></head>';
    expect(scanDocumentForTagManagers()).toEqual([]);
  });
});
