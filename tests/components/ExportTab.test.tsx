import { render, screen } from '@testing-library/react';
import { ExportTab } from '../../src/components/export/ExportTab';
import { networkFixture, sessionFixture } from '../helpers';

it('exports complete raw QA reports without redaction controls', () => {
  render(<ExportTab session={sessionFixture({ networkObservations: [networkFixture()] })} />);
  expect(screen.getByRole('button', { name: 'Export complete QA report (JSON)' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Export readable QA report (Markdown)' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('checkbox', { name: /I understand this report contains raw client data/i }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Redaction controls/)).not.toBeInTheDocument();
});
