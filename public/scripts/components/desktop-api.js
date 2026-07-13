"use strict";
function getDesktopWindowApi() {
    const api = window.desktopWindow;
    return api && api.isDesktop ? api : null;
}
//# sourceMappingURL=desktop-api.js.map