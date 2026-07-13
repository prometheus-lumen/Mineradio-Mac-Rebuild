interface MineradioDesktopWindow extends Window {
  desktopWindow?: { isDesktop?: boolean };
}

function getDesktopWindowApi(): any {
  const api = (window as MineradioDesktopWindow).desktopWindow;
  return api && api.isDesktop ? api : null;
}
