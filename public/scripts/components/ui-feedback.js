"use strict";
let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast)
        return;
    toast.textContent = String(message !== null && message !== void 0 ? message : '');
    toast.classList.add('show');
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
//# sourceMappingURL=ui-feedback.js.map