import { render, screen } from '@testing-library/react';
import { DiscoveryTab } from '../../src/components/discovery/DiscoveryTab';
import {
  discoveryFieldFixture,
  discoverySnapshotFixture,
  discoveryStateFixture,
  sessionFixture,
} from '../helpers';

it('surfaces detected technology and conservative Infinity reuse candidates', () => {
  const snapshot = discoverySnapshotFixture([
    discoveryFieldFixture({ path: 'dataLayer[0].product.sku', value: 'SKU-1' }),
    discoveryFieldFixture({
      id: 'email',
      path: 'dataLayer[0].customer_email',
      value: 'person@example.test',
      sensitivity: 'email',
      sensitivityReasons: ['Value resembles a raw email address.'],
    }),
  ]);
  render(
    <DiscoveryTab
      session={sessionFixture()}
      discovery={discoveryStateFixture(snapshot)}
      onCapture={vi.fn().mockResolvedValue(snapshot)}
      onSetBaseline={vi.fn()}
      onClearSnapshots={vi.fn()}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'Technology and reusable data workspace' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Google Tag Manager')).toBeInTheDocument();
  expect(screen.getAllByText('candidate to map')).toHaveLength(2);
  expect(screen.getByText('email')).toBeInTheDocument();
});
