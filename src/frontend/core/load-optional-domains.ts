function loadUpdateDomain(): void {
  void import('@frontend/update').then(({ bindUpdateEvents }) => bindUpdateEvents());
}

export function loadOptionalDomains(): void {
  const idleCallback = window.requestIdleCallback?.bind(window);
  if (idleCallback) {
    idleCallback(loadUpdateDomain, { timeout: 2_000 });
    return;
  }
  setTimeout(loadUpdateDomain, 1_000);
}
