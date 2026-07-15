function getDesktopWindowApi(): MineradioDesktopApi | null {
  const api = window.desktopWindow;
  return api && api.isDesktop ? api : null;
}
