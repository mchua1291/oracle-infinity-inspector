import { render, screen } from '@testing-library/react';
import { WarningsTab } from '../../src/components/warnings/WarningsTab';
import { sessionFixture } from '../helpers';

it('groups warnings by severity', () => {
  const warnings = [
    {
      id: 'high',
      code: 'failed',
      severity: 'high' as const,
      title: 'Failed request',
      message: 'Request failed.',
      recommendation: 'Inspect it.',
      evidenceIds: [],
      sourceUrl:
        'https://docs.oracle.com/en/cloud/saas/marketing/infinity-quickstart/Data-Collection/Parameter-Reference/Commerce/',
    },
    {
      id: 'info',
      code: 'scope',
      severity: 'info' as const,
      title: 'Browser scope',
      message: 'Backend not visible.',
      recommendation: 'Use logs.',
      evidenceIds: [],
    },
  ];
  render(<WarningsTab session={sessionFixture({ warnings })} />);
  expect(screen.getByText('high')).toBeInTheDocument();
  expect(screen.getByText('info')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Oracle guidance' })).toHaveAttribute(
    'href',
    expect.stringContaining('/Commerce/'),
  );
});
