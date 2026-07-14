import type { DiagnosticSession } from '../../features/models';
import { ParameterTable } from './ParameterTable';

export function StandardParametersTab({ session }: { session: DiagnosticSession }) {
  return (
    <ParameterTable
      parameters={session.parameters.filter((item) => item.classification === 'standard')}
      emptyTitle="No observed standard parameters"
    />
  );
}
