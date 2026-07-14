# Security Policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting or a private security advisory for vulnerabilities that could expose inspected-page data, execute untrusted code, broaden permissions, alter page behavior, or compromise exported reports.

Do not disclose a vulnerability publicly until a fix is available. Do not include real client payloads, account GUIDs, credentials, private URLs, or exported QA reports in a public issue.

For ordinary bugs without sensitive evidence, open a GitHub issue with the extension version, Edge or Chrome version, operating system, reproduction steps, and sanitized sample data.

## Supported versions

Security fixes target the latest tagged release and the latest commit on the default branch. Unpacked installations do not update automatically; users must replace or rebuild the package and reload the extension.

## Security boundaries

Oracle Infinity Inspector is a local diagnostic tool. It has no backend or telemetry and does not mutate inspected pages or requests. Exported reports intentionally preserve observed browser-visible values and must be handled as client QA evidence.
