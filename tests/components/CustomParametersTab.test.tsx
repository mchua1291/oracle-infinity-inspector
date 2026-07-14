import { render, screen } from '@testing-library/react';
import { CustomParametersTab } from '../../src/components/parameters/CustomParametersTab';
import type { ObservedParameter } from '../../src/features/models';
import { sessionFixture } from '../helpers';

it('includes the custom-classification disclaimer', () => {
  const parameter: ObservedParameter = {
    id: 'p',
    name: 'site.section',
    value: 'home',
    sourceType: 'cx-tag-network',
    eventTimestamp: '2026-01-01T00:00:00Z',
    eventId: 'event',
    origin: 'query-string',
    classification: 'custom',
    sensitivity: 'none',
  };
  render(<CustomParametersTab session={sessionFixture({ parameters: [parameter] })} />);
  expect(
    screen.getByText(/Custom classification means this parameter was not found/),
  ).toBeInTheDocument();
});
