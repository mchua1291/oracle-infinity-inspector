import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevtoolsShell } from '../../src/components/layout/DevtoolsShell';
import { buildSummary } from '../../src/features/diagnostics/diagnosticEngine';
import { ORACLE_INFINITY_IDENTITY } from '../../src/features/infinity/infinityPlatformIdentity';
import { sessionFixture } from '../helpers';

function renderShell(recording: boolean, onToggleRecording = vi.fn(), onClearEvents = vi.fn()) {
  render(
    <DevtoolsShell
      summary={buildSummary(sessionFixture())}
      nav={<div>Navigation</div>}
      inspectedTabActive
      tabId={7}
      platform={ORACLE_INFINITY_IDENTITY}
      recording={recording}
      hasRecordedEvents
      onToggleRecording={onToggleRecording}
      onClearEvents={onClearEvents}
    >
      <div>Panel content</div>
    </DevtoolsShell>,
  );
  return { onToggleRecording, onClearEvents };
}

describe('DevTools shell capture controls', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes the current recording state and pause action', async () => {
    const user = userEvent.setup();
    const { onToggleRecording } = renderShell(true);

    expect(screen.getByText('recording')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause events' }));

    expect(onToggleRecording).toHaveBeenCalledOnce();
  });

  it('confirms before clearing live event history', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onClearEvents } = renderShell(false);

    expect(screen.getByText('paused')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear events' }));

    expect(onClearEvents).toHaveBeenCalledOnce();
  });
});
