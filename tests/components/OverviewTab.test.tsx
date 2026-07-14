import { render, screen } from '@testing-library/react';
import { OverviewTab } from '../../src/components/overview/OverviewTab';
import { buildDiagnostics, buildSummary } from '../../src/features/diagnostics/diagnosticEngine';
import { DEFAULT_SETTINGS } from '../../src/features/models';
import { loaderFixture, sessionFixture } from '../helpers';

describe('Overview tab', () => {
  it('renders the no-data state', () => {
    const baseSession = sessionFixture();
    const session = { ...baseSession, warnings: buildDiagnostics(baseSession) };
    render(
      <OverviewTab session={session} summary={buildSummary(session)} settings={DEFAULT_SETTINGS} />,
    );
    expect(screen.getByText('No Oracle Infinity activity observed yet')).toBeInTheDocument();
  });
  it('renders detected status', () => {
    const baseSession = sessionFixture({ loaders: [loaderFixture()] });
    const session = { ...baseSession, warnings: buildDiagnostics(baseSession) };
    render(
      <OverviewTab session={session} summary={buildSummary(session)} settings={DEFAULT_SETTINGS} />,
    );
    expect(screen.getByText('detected')).toBeInTheDocument();
  });
});
