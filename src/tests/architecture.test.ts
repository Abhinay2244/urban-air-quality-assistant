import fs from 'fs';
import path from 'path';
import { preProcessFile } from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const SOURCE_EXT = /\.(ts|tsx)$/;

const toPosix = (filePath: string): string => filePath.split(path.sep).join('/');

function collectTsFiles(relDir: string, skipTests = false): string[] {
  const absDir = path.resolve(ROOT_DIR, relDir);
  const out: string[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const relPath = toPosix(path.join(relDir, entry.name));
    if (entry.isDirectory()) {
      if (skipTests && relPath === 'src/tests') continue;
      out.push(...collectTsFiles(relPath, skipTests));
    } else if (SOURCE_EXT.test(entry.name)) {
      out.push(relPath);
    }
  }
  return out;
}

function resolveImportTarget(fromRelFile: string, specifier: string): string | null {
  let rawPath: string | null = null;
  if (specifier.startsWith('@shared/')) {
    rawPath = path.resolve(ROOT_DIR, 'shared', specifier.slice('@shared/'.length));
  } else if (specifier.startsWith('@/')) {
    rawPath = path.resolve(ROOT_DIR, specifier.slice('@/'.length));
  } else if (specifier.startsWith('.')) {
    rawPath = path.resolve(path.dirname(path.resolve(ROOT_DIR, fromRelFile)), specifier);
  }
  if (!rawPath) return null;
  const rel = toPosix(path.relative(ROOT_DIR, rawPath));
  return fs.existsSync(rawPath) && fs.statSync(rawPath).isFile() ? rel : null;
}

function buildDependencyGraph(): Map<string, string[]> {
  const files = [
    ...collectTsFiles('shared'),
    ...collectTsFiles('src', true),
    ...collectTsFiles('server'),
    'server.ts',
  ];
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const content = fs.readFileSync(path.resolve(ROOT_DIR, file), 'utf8');
    const info = preProcessFile(content, true, true);
    const deps = info.importedFiles
      .map((item) => resolveImportTarget(file, item.fileName))
      .filter((dep): dep is string => dep !== null);
    graph.set(file, deps);
  }
  return graph;
}

function findViolations(
  graph: ReadonlyMap<string, string[]>,
  sourcePrefix: string,
  forbiddenPrefixes: readonly string[],
): string[] {
  const violations: string[] = [];
  for (const [file, deps] of graph.entries()) {
    if (!file.startsWith(sourcePrefix)) continue;
    for (const dep of deps) {
      if (forbiddenPrefixes.some((prefix) => dep.startsWith(prefix))) {
        violations.push(`${file} -> ${dep}`);
      }
    }
  }
  return violations;
}

function findCycles(graph: ReadonlyMap<string, string[]>): string[] {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const cycles: string[] = [];

  const visit = (node: string): void => {
    state.set(node, 'visiting');
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      const depState = state.get(dep);
      if (depState === 'visiting') {
        cycles.push([...stack.slice(stack.indexOf(dep)), dep].join(' -> '));
      } else if (!depState) {
        visit(dep);
      }
    }
    stack.pop();
    state.set(node, 'done');
  };

  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

describe('architecture layer boundaries', () => {
  const graph = buildDependencyGraph();

  it('keeps shared/ independent of src/ and server/', () => {
    expect(findViolations(graph, 'shared/', ['src/', 'server/', 'server.ts'])).toEqual([]);
  });

  it('prevents server/ from importing src/ and prevents src/ from importing server/', () => {
    expect(findViolations(graph, 'server/', ['src/'])).toEqual([]);
    expect(findViolations(graph, 'server.ts', ['src/'])).toEqual([]);
    expect(findViolations(graph, 'src/', ['server/', 'server.ts'])).toEqual([]);
  });

  it('enforces UI/components -> hooks -> services directional layering', () => {
    expect(
      findViolations(graph, 'src/components/', ['src/hooks/', 'src/features/', 'src/services/']),
    ).toEqual([]);
    expect(findViolations(graph, 'src/features/', ['src/services/'])).toEqual([]);
    expect(findViolations(graph, 'src/hooks/', ['src/components/', 'src/features/'])).toEqual([]);
    expect(
      findViolations(graph, 'src/services/', ['src/hooks/', 'src/components/', 'src/features/']),
    ).toEqual([]);
  });

  it('contains zero circular dependencies across shared, src, and server', () => {
    expect(findCycles(graph)).toEqual([]);
  });
});
