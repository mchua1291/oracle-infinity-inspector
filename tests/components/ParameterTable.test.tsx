import { render, screen } from '@testing-library/react';
import { ParameterTable } from '../../src/components/parameters/ParameterTable';
import type { ObservedParameter } from '../../src/features/models';

const parameter: ObservedParameter = {
  id: 'p',
  name: 'wt.ti',
  value: 'Example title',
  sourceType: 'cx-tag-network',
  eventTimestamp: '2026-01-01T00:00:00Z',
  eventId: 'event',
  origin: 'query-string',
  classification: 'standard',
  sensitivity: 'none',
  catalogDescription: 'HTML page title.',
};

it('shows catalog descriptions for standard parameters', () => {
  render(<ParameterTable parameters={[parameter]} emptyTitle="Empty" />);
  expect(screen.getByText('HTML page title.')).toBeInTheDocument();
  expect(screen.getByText('wt.ti')).toBeInTheDocument();
});
