"use strict";
async function apiJson(url, opts = {}) {
    const timeoutMs = Number(opts.timeoutMs) || 0;
    const fetchOpts = { ...opts };
    delete fetchOpts.timeoutMs;
    let timer = null;
    if (timeoutMs && window.AbortController && !fetchOpts.signal) {
        const controller = new AbortController();
        fetchOpts.signal = controller.signal;
        timer = setTimeout(() => controller.abort(), timeoutMs);
    }
    try {
        const response = await fetch(url, fetchOpts);
        return await response.json();
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
//# sourceMappingURL=api-client.js.map