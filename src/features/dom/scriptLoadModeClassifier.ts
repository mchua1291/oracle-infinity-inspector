import type { Confidence, ScriptLoadEvidence, ScriptLoadMode } from '../models';

export interface ScriptLoadModeInput {
  async: boolean;
  defer: boolean;
  inHead: boolean;
  dynamicallyInserted: boolean;
  parserInsertedInference: boolean;
  inlineLoaderEvidence: boolean;
  tagManagerContainer: boolean;
}

export interface ScriptLoadModeResult {
  loadMode: ScriptLoadMode;
  confidence: Confidence;
  evidence: ScriptLoadEvidence[];
}

export function classifyScriptLoadMode(input: ScriptLoadModeInput): ScriptLoadModeResult {
  const evidence: ScriptLoadEvidence[] = [];
  if (input.async)
    evidence.push({
      kind: 'async-attribute',
      description: 'The script has an async attribute or direct async property evidence.',
      direct: true,
    });
  if (input.defer)
    evidence.push({
      kind: 'defer-attribute',
      description: 'The script has a defer attribute.',
      direct: true,
    });
  if (input.inHead)
    evidence.push({
      kind: 'head-position',
      description: 'The script is located in the document head.',
      direct: true,
    });
  if (input.parserInsertedInference)
    evidence.push({
      kind: 'parser-inserted',
      description:
        'The script was present during the parser-time scan and has no async/defer attribute.',
      direct: false,
    });
  if (input.dynamicallyInserted)
    evidence.push({
      kind: 'mutation-observed',
      description: 'The script node was observed being added after initial document parsing.',
      direct: true,
    });
  if (input.inlineLoaderEvidence)
    evidence.push({
      kind: 'inline-loader',
      description: 'Inline code contains evidence that it creates or loads odc.js.',
      direct: false,
    });
  if (input.tagManagerContainer)
    evidence.push({
      kind: 'tag-manager-container',
      description: 'An ancestor or script identifier resembles a known tag-manager container.',
      direct: false,
    });

  if (
    (input.async && input.defer) ||
    (input.dynamicallyInserted && input.parserInsertedInference)
  ) {
    evidence.push({
      kind: 'conflict',
      description: 'Load-mode evidence conflicts, so execution mode is not asserted.',
      direct: true,
    });
    return { loadMode: 'unknown', confidence: 'low', evidence };
  }
  if (input.tagManagerContainer && input.dynamicallyInserted)
    return { loadMode: 'tag-manager-injected', confidence: 'inferred', evidence };
  if (input.dynamicallyInserted)
    return { loadMode: 'dynamically-inserted', confidence: 'direct', evidence };
  if (input.defer) return { loadMode: 'deferred', confidence: 'direct', evidence };
  if (input.async) return { loadMode: 'asynchronous', confidence: 'direct', evidence };
  if (input.inHead && input.parserInsertedInference)
    return { loadMode: 'synchronous', confidence: 'inferred', evidence };
  if (input.inlineLoaderEvidence)
    return { loadMode: 'dynamically-inserted', confidence: 'inferred', evidence };
  return { loadMode: 'unknown', confidence: 'low', evidence };
}
