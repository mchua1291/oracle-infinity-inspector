import { classifyScriptLoadMode } from '../../src/features/dom/scriptLoadModeClassifier';

const base = {
  async: false,
  defer: false,
  inHead: true,
  dynamicallyInserted: false,
  parserInsertedInference: true,
  inlineLoaderEvidence: false,
  tagManagerContainer: false,
};
describe('script load-mode inference', () => {
  it('infers synchronous head insertion', () =>
    expect(classifyScriptLoadMode(base).loadMode).toBe('synchronous'));
  it('uses direct async evidence', () =>
    expect(
      classifyScriptLoadMode({ ...base, async: true, parserInsertedInference: false }).loadMode,
    ).toBe('asynchronous'));
  it('uses direct defer evidence', () =>
    expect(
      classifyScriptLoadMode({ ...base, defer: true, parserInsertedInference: false }).loadMode,
    ).toBe('deferred'));
  it('uses mutation evidence', () =>
    expect(
      classifyScriptLoadMode({
        ...base,
        inHead: false,
        dynamicallyInserted: true,
        parserInsertedInference: false,
      }).loadMode,
    ).toBe('dynamically-inserted'));
  it('reports conflicting evidence as unknown', () =>
    expect(
      classifyScriptLoadMode({ ...base, async: true, defer: true, parserInsertedInference: false })
        .loadMode,
    ).toBe('unknown'));
});
