try {
  var diyMode = localStorage.getItem('mineradio-diy-player-mode-v1') === '1';
  document.documentElement.classList.add(diyMode ? 'diy-mode-preload' : 'simple-mode-preload');
} catch {
  document.documentElement.classList.add('simple-mode-preload');
}
