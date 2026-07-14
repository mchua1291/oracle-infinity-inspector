import { render, screen } from '@testing-library/react';
import { TagLoaderTab } from '../../src/components/tag-loader/TagLoaderTab';
import { loaderFixture, sessionFixture } from '../helpers';

it('shows loader DOM path and load mode', () => {
  render(<TagLoaderTab session={sessionFixture({ loaders: [loaderFixture()] })} />);
  expect(screen.getByText('synchronous')).toBeInTheDocument();
  expect(screen.getByText('html > head > script')).toBeInTheDocument();
});

it('summarizes cached Infinity libraries and tag-manager evidence', () => {
  const library = {
    id: 'library',
    timestamp: '2026-01-01T00:00:01.000Z',
    requestUrl: 'https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js?v=1',
    requestMethod: 'GET',
    statusCode: 304,
    sourceType: 'infinity-library' as const,
    libraryName: 'ubi.js',
    libraryType: 'javascript' as const,
    eventKind: 'library' as const,
    parameterCount: 0,
    requestBodyParseStatus: 'success' as const,
    responseStatus: '304 Not Modified',
    warnings: [],
    parameters: [],
  };
  const manager = {
    id: 'tag-manager',
    type: 'google-tag-manager' as const,
    label: 'Google Tag Manager',
    containerId: 'GTM-ABC123',
    sourceUrl: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123',
    location: {
      path: 'html > head > script',
      parentElement: 'head',
      scriptIndex: 0,
      inHead: true,
    },
    confidence: 'direct' as const,
    evidence: 'A standard Google Tag Manager URL was observed.',
    detectedAt: '2026-01-01T00:00:00.000Z',
  };
  render(
    <TagLoaderTab
      session={sessionFixture({ networkObservations: [library], tagManagers: [manager] })}
    />,
  );
  expect(screen.getByText('Google Tag Manager')).toBeInTheDocument();
  expect(screen.getByText('cached / not modified')).toBeInTheDocument();
});
