import type { ObservedParameter } from '../../features/models';
import { Notice } from '../ui/Notice';
import { ParameterTable } from './ParameterTable';

export function UnknownParametersPanel({ parameters }: { parameters: ObservedParameter[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Unknown / Needs Review</h2>
        <p className="mt-1 text-sm text-stone-500">
          These observed parameters were not forced into standard or custom classification.
        </p>
      </div>
      <Notice>
        An unknown parameter may still be valid implementation data; verify it against your local
        implementation catalog.
      </Notice>
      <ParameterTable parameters={parameters} emptyTitle="No unknown parameters observed" />
    </section>
  );
}
