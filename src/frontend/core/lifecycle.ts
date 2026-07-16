// Application-owned DOM listeners share one abortable lifecycle.
var mineradioLifecycleController: AbortController | null = null;

export function beginMineradioLifecycle(): AbortSignal {
  mineradioLifecycleController?.abort();
  mineradioLifecycleController = new AbortController();
  return mineradioLifecycleController.signal;
}

export function mineradioEventOptions(options?: boolean | AddEventListenerOptions): boolean | AddEventListenerOptions {
  if (typeof options === 'boolean') return options;
  if (!mineradioLifecycleController) beginMineradioLifecycle();
  return { ...options, signal: mineradioLifecycleController!.signal };
}

export function disposeMineradioLifecycle(): void {
  mineradioLifecycleController?.abort();
  mineradioLifecycleController = null;
}
