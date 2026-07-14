import type { DiagnosticSession } from '../../features/models';
import { platformAdapterForSession } from '../../features/platform/platformRegistry';
import { Notice } from '../ui/Notice';
import { ParameterTable } from './ParameterTable';
import { UnknownParametersPanel } from './UnknownParametersPanel';

export function CustomParametersTab({ session }: { session: DiagnosticSession }) {
  const adapter = platformAdapterForSession(session);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Custom Parameters</h2>
          <p className="mt-1 text-sm text-stone-500">
            Observed implementation-defined keys and value patterns.
          </p>
        </div>
        <Notice>
          Custom classification means this parameter was not found in the bundled{' '}
          {adapter.identity.documentationLabel} catalog and follows an implementation-defined naming
          pattern.
        </Notice>
        <ParameterTable
          parameters={session.parameters.filter((item) => item.classification === 'custom')}
          emptyTitle="No custom parameters observed"
          documentationLabel={adapter.identity.documentationLabel}
        />
      </section>
      <UnknownParametersPanel
        parameters={session.parameters.filter((item) => item.classification === 'unknown')}
      />
    </div>
  );
}
