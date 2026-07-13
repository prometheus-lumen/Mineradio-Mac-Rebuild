interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function apiJson<T = any>(url: string, opts: ApiRequestOptions = {}): Promise<T> {
  const timeoutMs = Number(opts.timeoutMs) || 0;
  const fetchOpts: ApiRequestOptions = { ...opts };
  delete fetchOpts.timeoutMs;
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs && window.AbortController && !fetchOpts.signal) {
    const controller = new AbortController();
    fetchOpts.signal = controller.signal;
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(url, fetchOpts);
    return await response.json() as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
