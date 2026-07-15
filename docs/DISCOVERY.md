# Existing Technology and Reusable Data Discovery

Discovery helps an authorized Infinity sales or solutions engineer inventory supported client-side analytics tooling and identify browser-visible data that may be reusable in an Oracle Infinity implementation. It is evidence collection, not automatic implementation design.

## Supported providers

### Google

- Google Tag Manager container libraries and IDs from standard DOM or network evidence.
- Google tag and Google Analytics measurement identifiers from recognizable library or collection requests.
- First-party collect-shaped requests with a Google measurement identifier are retained as inferred evidence rather than being presented as a confirmed Google endpoint.
- Standard `window.dataLayer` and custom Google data-layer names discoverable from standard GTM bootstrap arguments or the `l` request parameter.

Google documents `dataLayer` as the object used by Tag Manager and `gtag.js` to pass events and variables to tags: <https://developers.google.com/tag-platform/tag-manager/datalayer>.

### Adobe

- Adobe Experience Platform Tags libraries and standard environments.
- Adobe Analytics AppMeasurement `/b/ss/{report-suite}` requests.
- Adobe Experience Platform Web SDK / Edge Network evidence on recognizable Adobe domains. Edge evidence does not prove which downstream Adobe applications received the data.
- `window.adobeDataLayer` and `digitalData` when an Adobe runtime is also present.

Adobe documents the Client Data Layer push model and computed state here: <https://experienceleague.adobe.com/en/docs/experience-platform/tags/extensions/client/client-data-layer/overview>. The inspector does not call the computed-state API; it reads the bounded queue only. Adobe documents AppMeasurement report-suite identification in `/b/ss/` requests here: <https://experienceleague.adobe.com/en/docs/analytics-learn/tutorials/implementation/implementation-basics/how-to-identify-your-analytics-tracking-server-and-report-suites>.

### Tealium

- Tealium iQ account/profile/environment evidence from standard `utag.js` paths.
- Recognizable Tealium Collect endpoints.
- `window.utag_data`, the client-authored Universal Data Object.
- `window.utag.data`, the Tealium-enriched runtime object, kept separate from `utag_data` because it can contain additional generated data.

Tealium documents `utag_data` as the Universal Data Object exposed by the page: <https://docs.tealium.com/platforms/javascript/universal-data-object/>.

## Capture workflow

1. Open DevTools before reloading so technology network evidence is available.
2. Select **Capture baseline** immediately before an approved interaction.
3. Perform one interaction.
4. Select **Capture comparison**.
5. Review **Changes**, then review **Infinity reuse**.
6. Select a later snapshot to make it the new baseline when evaluating another interaction.
7. Select **Clear snapshots** when the values are no longer needed.

The active panel retains at most 10 snapshots. A snapshot contains the page URL, capture time, supported data-object summaries, and safely flattened fields. It does not contain arbitrary browser globals, cookies, local storage, session storage, or DOM text.

## Reuse assessments

- **Already collected:** an observed Infinity parameter has the same normalized name and value.
- **Candidate to map:** a populated source is visible but no observed Infinity parameter has the same name.
- **Different value:** Infinity uses the same name but its observed value differs.
- **Empty / null:** the source exists but has an empty string, null, empty array, or empty object.

These classifications do not establish semantic equivalence. A client must confirm the field's definition, ownership, lifecycle, consent treatment, expected format, and intended Infinity parameter name before implementation.

## Safety and bounds

Capture is explicit and read-only. The probe enumerates own property descriptors and reports getters without invoking them. It does not replace `push`, wrap vendor methods, call tracking APIs, patch `fetch`/XHR, or modify the page.

Per supported object, capture is limited to the latest 100 queue entries, 500 flattened fields, six levels of depth, and 2,000 characters per scalar value. Unsupported functions, symbols, DOM nodes, cyclic references, unreadable proxies, and deeper values receive markers rather than being traversed. Raw email and other sensitive shapes remain visible and are highlighted locally.

JSON exports contain the complete bounded snapshots. Markdown exports contain technology evidence, reuse assessments, and changed fields. Both remain disabled until the raw client-data acknowledgement is selected.
