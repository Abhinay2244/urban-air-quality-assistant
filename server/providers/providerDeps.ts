/**
 * @module server/providers/providerDeps
 * Responsibility: Define injectable fetch and clock dependencies for server providers and middleware.
 * Must not hold global mutable state or Express request/response objects.
 */

/** Clock callback returning current epoch milliseconds. */
export type ClockFn = () => number;

/** Fetch function signature injected into upstream HTTP providers. */
export type FetchFn = typeof fetch;

/** Injectable runtime dependencies for server providers and handlers. */
export interface ProviderDeps {
  fetch: FetchFn;
  now: ClockFn;
}

/** Default production dependencies backed by Node.js runtime globals. */
export const DEFAULT_PROVIDER_DEPS: ProviderDeps = {
  fetch: globalThis.fetch,
  now: (): number => Date.now(),
};
