import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkEventsTab } from '../../src/components/network/NetworkEventsTab';
import { networkFixture, sessionFixture } from '../helpers';

it('filters CX Tag versus DC API observations', async () => {
  const user = userEvent.setup();
  const cx = networkFixture();
  const api = networkFixture({
    id: 'api',
    requestUrl: 'https://dc.oracleinfinity.io/v3/example',
    sourceType: 'dcapi-browser-visible',
    eventKind: 'dcapi-batch',
    requestMethod: 'POST',
  });
  render(<NetworkEventsTab session={sessionFixture({ networkObservations: [cx, api] })} />);
  expect(screen.getByRole('cell', { name: 'cx-tag-network' })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Source filter'), 'dcapi-browser-visible');
  expect(screen.queryByRole('cell', { name: 'cx-tag-network' })).not.toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'dcapi-browser-visible' })).toBeInTheDocument();
});

it('shows standard, custom, and null values in one selected event view', () => {
  const parameters = [
    {
      id: 'standard',
      name: 'wt.ti',
      value: 'Example',
      sourceType: 'cx-tag-network' as const,
      eventTimestamp: '2026-01-01T00:00:01.000Z',
      eventId: 'event-1',
      origin: 'query-string' as const,
      classification: 'standard' as const,
      sensitivity: 'none' as const,
      catalogDisplayName: 'Page Title',
      catalogDescription: 'HTML page title.',
      catalogSourceUrl:
        'https://docs.oracle.com/en/cloud/saas/marketing/infinity-develop/docs/parameters/web-client.htm#wt.ti',
    },
    {
      id: 'custom',
      name: 'site.section',
      value: null,
      sourceType: 'cx-tag-network' as const,
      eventTimestamp: '2026-01-01T00:00:01.000Z',
      eventId: 'event-1',
      origin: 'query-string' as const,
      classification: 'custom' as const,
      sensitivity: 'none' as const,
      namingPattern: 'implementation-defined parameter',
    },
  ];
  const event = networkFixture({ parameterCount: 2, parameters });
  render(<NetworkEventsTab session={sessionFixture({ networkObservations: [event] })} />);
  expect(screen.getByText('Out-of-the-box parameters')).toBeInTheDocument();
  expect(screen.getByText('Custom parameters')).toBeInTheDocument();
  expect(screen.getByText(/Page Title:/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Oracle documentation' })).toHaveAttribute(
    'href',
    expect.stringContaining('docs.oracle.com'),
  );
  expect(screen.getByText('null')).toBeInTheDocument();
  expect(screen.getByText(/potential empty-value issue/)).toBeInTheDocument();
});

it('shows event-scoped commerce QA findings and Oracle guidance', () => {
  const event = networkFixture();
  const warning = {
    id: 'commerce:event-1',
    code: 'commerce-test',
    severity: 'high' as const,
    title: 'Commerce payload mismatch',
    message: 'The transaction code does not match.',
    recommendation: 'Align the documented values.',
    evidenceIds: ['event-1'],
    sourceUrl:
      'https://docs.oracle.com/en/cloud/saas/marketing/infinity-quickstart/Data-Collection/Parameter-Reference/Commerce/',
  };
  render(
    <NetworkEventsTab
      session={sessionFixture({ networkObservations: [event], warnings: [warning] })}
    />,
  );
  expect(screen.getByText('Commerce payload mismatch')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Oracle commerce guidance' })).toHaveAttribute(
    'href',
    expect.stringContaining('/Commerce/'),
  );
});

it('does not list Infinity libraries as captured data collection events', () => {
  const event = networkFixture();
  const library = networkFixture({
    id: 'library',
    requestUrl: 'https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js',
    sourceType: 'infinity-library',
    eventKind: 'library',
    libraryName: 'ubi.js',
    libraryType: 'javascript',
    statusCode: 304,
  });
  render(<NetworkEventsTab session={sessionFixture({ networkObservations: [event, library] })} />);
  expect(screen.getByText('1 complete events')).toBeInTheDocument();
  expect(screen.queryByText('ubi.js')).not.toBeInTheDocument();
});

it('keeps long event journeys in a bounded scroll region with sticky headers', () => {
  render(
    <NetworkEventsTab session={sessionFixture({ networkObservations: [networkFixture()] })} />,
  );

  expect(screen.getByRole('region', { name: 'Captured event list' })).toHaveClass(
    'max-h-[70vh]',
    'overflow-auto',
  );
  expect(screen.getByText('# / time').closest('thead')).toHaveClass('sticky', 'top-0');
  expect(screen.getByRole('region', { name: 'Event 1 payload details' })).toHaveClass(
    'max-h-[70vh]',
    'overflow-y-auto',
  );
});
