# Oracle Infinity Detection

Last verified against official Oracle documentation: 2026-07-13.

## CX Tag loader

The documented loader pattern is:

```text
//d.oracleinfinity.io/infy/acs/account/{Account GUID}/js/{Tag ID}/odc.js?_ora.config={config}
```

The scanner accepts protocol-relative or HTTPS URLs, requires the documented host and path shape, and extracts the account GUID, tag ID, and `_ora.config`. It also scans inline script text for narrow evidence of code that creates a script and assigns an `odc.js` URL. Inline code is read as text and is never executed by the extension.

Source: [Oracle CX Tag Tracking Reference](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/data_collection/cx_tag_tracking_reference.htm).

## Sync/async inference

- `async` or `defer` attributes are direct DOM evidence.
- A head script with neither attribute, present during parser-time scanning, is inferred synchronous.
- A script observed after document parsing by `MutationObserver` is classified dynamically inserted.
- Tag-manager-like ancestor identifiers plus mutation evidence produce an inferred tag-manager classification.
- Conflicting evidence produces `unknown` with low confidence.

These results are sync/async inference, not a guaranteed execution trace. The DOM does not preserve every fact about how a tag manager created a node, and parser insertions observed while the document is loading can be ambiguous.

## CX Tag network collection

Requests must be Oracle Infinity-hosted and end in `dcs.gif`. All observed query parameters are preserved, including repeated values. Oracle documents `wt.dl=0` as a view call and `wt.dl=1` as a click call. Other values are reported as event-code-specific without assigning undocumented meaning.

Source: [Oracle CX Tag Tracking Reference](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/data_collection/cx_tag_tracking_reference.htm).

## Infinity libraries

JavaScript, stylesheet, source-map, and WebAssembly resources on Oracle Infinity hosts are classified as static libraries rather than collection events. The `odc.js` loader, `dcs.gif`, and DC API retain their more specific classifications. HTTP 304 is reported as **cached / not modified**, which indicates successful browser cache validation rather than a failed or duplicate collection call. Libraries are grouped by origin and pathname so cache-busting query strings do not produce repetitive QA-report entries.

Oracle documents that the files making up an Infinity tag are deployed to a CDN cache: [Oracle Infinity data collection](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/data_collection.htm).

## Tag-manager evidence

The DOM scanner independently recognizes standard vendor snippets for:

- Google Tag Manager `googletagmanager.com/gtm.js` and its `GTM-*` container ID.
- Tealium iQ `tags.tiqcdn.com/utag/{account}/{profile}/{environment}/utag.js`.
- Adobe Experience Platform Tags `assets.adobedtm.com` launch libraries.

External script or iframe URLs are direct evidence that the manager is present. Standard inline bootstrap snippets are inferred evidence. If Infinity collection calls exist without a DOM-visible CX loader, a detected manager is presented as a plausible implementation path—not proof that the manager deployed Infinity.

Sources: [Google Tag Manager web container installation](https://support.google.com/tagmanager/answer/14847097), [Tealium website quick start](https://docs.tealium.com/platforms/getting-started-web/quick-start/), and [Adobe Tags embed code](https://experienceleague.adobe.com/en/docs/platform-learn/implement-in-websites/configure-tags/add-embed-code).

## Browser-visible DC API

The parser recognizes HTTPS POST-like requests to:

```text
https://dc.oracleinfinity.io/v3/{accountGuid}
```

When HAR exposes a JSON body, the parser validates an optional `static` object and a required non-empty `events` array. String and explicit null values are retained, and each valid event is flattened with static values inherited; event values override static values. Unavailable, compressed, malformed, or unsupported object, array, number, and boolean values produce safe failed or partial results.

Only browser-visible DC API requests can be observed. Backend DC API traffic is outside a browser extension's visibility.

Source: [Oracle Infinity Data Collection API](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/data_collection/dcapi.htm).

## Parameter classification

The bundled static catalog is generated from Oracle's Full Parameter Reference and supplemented with system names found in other official Oracle Infinity pages. It stores a catalog version, verification date, parameter-specific documentation links, Oracle display names and descriptions, sensitivity labels, and collection/reporting-name notes. Any documentation match is `standard` (shown as out-of-the-box); a conventional implementation-defined name is `custom`; and an unmatched reserved or malformed name is `unknown`.

The catalog sync script is a development tool only. The extension never contacts Oracle documentation at runtime.

An unknown or custom classification does not make a parameter invalid. Teams can import verified local catalog entries in Settings.

Sources: [Oracle Parameter Reference](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/data_collection/parameter_reference.htm) and [Full Parameter Reference](https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/parameters/reference.htm).

## Commerce payload validation

The inspector recognizes Oracle's reserved commerce `wt.ev` values, including product/category views, cart changes, checkout, purchase, order status, wishlist/favorites, rating, and comparison events. It compares documented `wt.tx_e` mappings, checks documented companion identifiers, and validates correlated semicolon-delimited line-item lists.

Deterministic format checks cover line subtotal (`wt.tx_s = wt.tx_u × wt.product_price`), two-decimal monetary values, positive quantities, three-letter uppercase currency, purchase invoice date/time syntax, and SHA-256 email hashes. Findings retain event and parameter evidence and link back to Oracle's guide.

Some Oracle tables and examples disagree about `wt.ev`, `$ViewCategory`, and the order-status identifier. Rules affected by those discrepancies are advisory; the inspector does not treat the examples as stronger than the parameter tables.

Source: [Oracle Infinity commerce parameter reference](https://docs.oracle.com/en/cloud/saas/marketing/infinity-quickstart/Data-Collection/Parameter-Reference/Commerce/).

## Source labels

- `cx-tag-loader`: documented `odc.js` network request.
- `cx-tag-network`: Oracle Infinity `dcs.gif` collection request.
- `dcapi-browser-visible`: visible DC API v3 request.
- `unknown-infinity-network`: an Oracle Infinity-hosted request that does not match a verified pattern.

The panel reports observed parameters only and never implies that an absent parameter was not collected elsewhere.
