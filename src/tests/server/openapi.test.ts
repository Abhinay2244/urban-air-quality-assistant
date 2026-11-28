import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { ERROR_CODES } from '@shared/constants/http.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import { createTestApp } from '../fixtures/testApp.ts';

const HTTP_METHODS: readonly string[] = ['get', 'post', 'put', 'patch', 'delete'];

function addRouteMethods(
  routePath: string,
  methods: Record<string, unknown>,
  out: Set<string>,
): void {
  if (Object.keys(methods).length > HTTP_METHODS.length) return;
  for (const method of HTTP_METHODS) {
    if (methods[method] === true) out.add(`${method.toUpperCase()} ${routePath}`);
  }
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function readRouterStack(target: unknown): readonly unknown[] {
  if (!isObjectLike(target)) return [];
  const stack: unknown = Reflect.get(target, 'stack');
  return Array.isArray(stack) ? stack : [];
}

function collectLayerRoute(layer: Record<string, unknown>, out: Set<string>): void {
  const route = isRecord(layer.route) ? layer.route : undefined;
  if (route && typeof route.path === 'string' && route.path.startsWith('/api/')) {
    const methods = isRecord(route.methods) ? route.methods : {};
    addRouteMethods(route.path, methods, out);
  }
  const nestedStack = readRouterStack(layer.handle);
  if (nestedStack.length > 0) {
    collectExpressApiRoutes(nestedStack, out);
  }
}

function collectExpressApiRoutes(stack: readonly unknown[], out: Set<string>): void {
  for (const layer of stack) {
    if (isRecord(layer)) collectLayerRoute(layer, out);
  }
}

function collectOpenApiRoutes(spec: Record<string, unknown>): Set<string> {
  const routes = new Set<string>();
  const paths = isRecord(spec.paths) ? spec.paths : {};
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      if (isRecord(pathItem[method])) routes.add(`${method.toUpperCase()} ${routePath}`);
    }
  }
  return routes;
}

const sortRoutes = (routes: Set<string>): string[] =>
  [...routes].sort((a, b) => a.localeCompare(b));

describe('docs/openapi.yaml contract', () => {
  it('matches every Express /api route 1-to-1 and defines { code, message } error contract', async () => {
    const rawYaml = fs.readFileSync(path.resolve(process.cwd(), 'docs/openapi.yaml'), 'utf8');
    const parsed: unknown = parse(rawYaml);
    expect(isRecord(parsed)).toBe(true);
    if (!isRecord(parsed)) return;

    expect(parsed.openapi).toBe('3.1.0');
    const app = await createTestApp();
    const routerStack = readRouterStack(Reflect.get(app, '_router'));
    const expressRoutes = new Set<string>();
    collectExpressApiRoutes(routerStack, expressRoutes);
    const specRoutes = collectOpenApiRoutes(parsed);

    expect(sortRoutes(expressRoutes)).toEqual(sortRoutes(specRoutes));

    const components = isRecord(parsed.components) ? parsed.components : {};
    const schemas = isRecord(components.schemas) ? components.schemas : {};
    const errorCodeSchema = isRecord(schemas.ErrorCode) ? schemas.ErrorCode : {};
    expect(errorCodeSchema.enum).toEqual(Object.values(ERROR_CODES));
    const errorResponseSchema = isRecord(schemas.ErrorResponse) ? schemas.ErrorResponse : {};
    expect(errorResponseSchema.required).toEqual(['code', 'message']);
  });
});
