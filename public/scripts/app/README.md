# Classic responsibility modules

This directory is the behavior-preserving classic-script split of the former
`public/scripts/app.js` monolith. Files are organized by responsibility; they
are not ES modules yet so existing inline handlers and desktop integration keep
their global API.

All files declare state, functions, or ordered initializer functions. Runtime
initialization is orchestrated only by `bootstrap.js` and invoked by the small
compatibility entry at `../app.js`. Keep the order in `load-order.json` and
`public/index.html` unchanged until the global compatibility layer is removed.
