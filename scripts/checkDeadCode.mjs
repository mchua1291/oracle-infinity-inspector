import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const entryPoints = [
  'src/background/serviceWorker.ts',
  'src/content/domScannerContentScript.ts',
  'src/devtools/devtools.ts',
  'src/devtools/panel.tsx',
  'src/popup/popup.tsx',
].map((file) => join(root, file));
const productionExtensions = new Set(['.ts', '.tsx']);
const resolvableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css'];

function normalized(file) {
  return resolve(file).replaceAll('\\', '/').toLowerCase();
}

function repositoryPath(file) {
  return relative(root, file).replaceAll('\\', '/');
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  });
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return undefined;
  const base = resolve(dirname(fromFile), specifier);
  const suppliedExtension = extname(base);
  const extensionlessBase = ['.js', '.jsx'].includes(suppliedExtension)
    ? base.slice(0, -suppliedExtension.length)
    : base;
  const candidates = [
    base,
    ...resolvableExtensions.map((extension) => `${extensionlessBase}${extension}`),
    ...resolvableExtensions.map((extension) => join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function importedLocalFiles(file) {
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(extname(file))) return [];
  const source = readFileSync(file, 'utf8');
  const imports = ts.preProcessFile(source, true, true).importedFiles;
  return imports.flatMap((item) => {
    const resolved = resolveLocalImport(file, item.fileName);
    return resolved ? [resolved] : [];
  });
}

function collectReachableFiles() {
  const reachable = new Set();
  const queue = [...entryPoints];
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || reachable.has(normalized(file))) continue;
    reachable.add(normalized(file));
    queue.push(...importedLocalFiles(file));
  }
  return reachable;
}

function canonicalSymbol(checker, node) {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol;
}

function exportedDeclarationNames(statement) {
  const exported = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
  if (!exported) return [];
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name] : [],
    );
  }
  return [];
}

const reachable = collectReachableFiles();
const testRoot = `${normalized(join(sourceRoot, 'test'))}/`;
const productionFiles = listFiles(sourceRoot).filter(
  (file) => productionExtensions.has(extname(file)) && !normalized(file).startsWith(testRoot),
);
const unreachableFiles = productionFiles.filter((file) => !reachable.has(normalized(file)));

const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('tsconfig.json was not found.');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
}
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const checker = program.getTypeChecker();
const reachableSourceFiles = program
  .getSourceFiles()
  .filter(
    (file) =>
      reachable.has(normalized(file.fileName)) && productionExtensions.has(extname(file.fileName)),
  );

const referenceCounts = new Map();
for (const sourceFile of reachableSourceFiles) {
  function visit(node) {
    if (ts.isIdentifier(node)) {
      const symbol = canonicalSymbol(checker, node);
      if (symbol) referenceCounts.set(symbol, (referenceCounts.get(symbol) ?? 0) + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const unusedExports = [];
for (const sourceFile of reachableSourceFiles) {
  for (const statement of sourceFile.statements) {
    for (const name of exportedDeclarationNames(statement)) {
      const symbol = canonicalSymbol(checker, name);
      const referenceCount = symbol ? (referenceCounts.get(symbol) ?? 0) - 1 : 0;
      if (referenceCount !== 0) continue;
      const line = sourceFile.getLineAndCharacterOfPosition(name.getStart()).line + 1;
      unusedExports.push(`${repositoryPath(sourceFile.fileName)}:${line} ${name.text}`);
    }
  }
}

if (unreachableFiles.length > 0 || unusedExports.length > 0) {
  console.error('Dead-code audit failed.');
  if (unreachableFiles.length > 0) {
    console.error('\nUnreachable production source files:');
    for (const file of unreachableFiles) console.error(`- ${repositoryPath(file)}`);
  }
  if (unusedExports.length > 0) {
    console.error('\nExported declarations without production references:');
    for (const item of unusedExports) console.error(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Dead-code audit passed: ${productionFiles.length} production source files are reachable and all exports have production references.`,
  );
}
