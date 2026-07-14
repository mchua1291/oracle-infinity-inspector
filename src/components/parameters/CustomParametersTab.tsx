import type { DiagnosticSession } from '../../features/models';
import { Notice } from '../ui/Notice';
import { ParameterTable } from './ParameterTable';
import { UnknownParametersPanel } from './UnknownParametersPanel';

export function CustomParametersTab({ session }: { session: DiagnosticSession }) {
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
          Custom classification means this parameter was not found in the bundled Oracle
          documentation catalog and follows an implementation-defined naming pattern.
        </Notice>
        <ParameterTable
          parameters={session.parameters.filter((item) => item.classification === 'custom')}
          emptyTitle="No custom parameters observed"
        />
      </section>
      <UnknownParametersPanel
        parameters={session.parameters.filter((item) => item.classification === 'unknown')}
      />
    </div>
  );
}
