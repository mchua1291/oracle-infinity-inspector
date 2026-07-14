import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QaPlanTab } from '../../src/components/qa/QaPlanTab';
import { DEFAULT_SETTINGS } from '../../src/features/models';

describe('QA Plan tab', () => {
  it('creates an editable scenario plan and adds consent checkpoints', async () => {
    const user = userEvent.setup();
    render(
      <QaPlanTab
        settings={DEFAULT_SETTINGS}
        pageUrl="https://www.example.test/product"
        platformId="oracle-infinity"
      />,
    );

    expect(screen.getByText('No QA plans are saved for this platform yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New QA plan' }));

    expect(screen.getByLabelText('Plan name')).toHaveValue('New QA plan');
    expect(screen.getByLabelText('Domain (optional)')).toHaveValue('www.example.test');
    expect(screen.getByText('Expected event 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add consent checkpoint' }));
    expect(screen.getByText('Consent expectations')).toBeInTheDocument();
    expect(screen.getByLabelText('Checkpoint state')).toHaveValue('before-choice');
  });
});
