// One caller deadline can span several API requests; each request is also bounded.
export function requestSignal(
  parent?: AbortSignal,
  timeoutMs = 15_000,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}
