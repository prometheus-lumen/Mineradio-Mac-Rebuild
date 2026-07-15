function normalizeHomeCardSettings(raw: unknown): HomeCardSettings {
  const value = raw && typeof raw === 'object' ? raw as Partial<HomeCardSettings> : {};
  return {
    height: Math.max(60, Math.min(96, Math.round(Number(value.height) || 84))),
    opacity: Math.max(0, Math.min(100, Math.round(value.opacity == null ? 54 : Number(value.opacity) || 0))),
    showCalendar: value.showCalendar !== false,
    heroBg: String(value.heroBg || ''),
    heroMediaType: value.heroMediaType === 'video' ? 'video' : value.heroMediaType === 'image' ? 'image' : '',
    heroMediaName: String(value.heroMediaName || '')
  };
}

function readHomeCardSettings(): HomeCardSettings {
  if (homeCardSettingsState) return homeCardSettingsState;
  try {
    homeCardSettingsState = normalizeHomeCardSettings(JSON.parse(localStorage.getItem(HOME_CARD_SETTINGS_KEY) || '{}'));
  } catch (error) {
    homeCardSettingsState = normalizeHomeCardSettings(null);
  }
  return homeCardSettingsState;
}

function saveHomeCardSettings(): void {
  try {
    localStorage.setItem(HOME_CARD_SETTINGS_KEY, JSON.stringify(readHomeCardSettings()));
  } catch (error) {}
}

function applyHomeCardSettings(): void {
  const state = readHomeCardSettings();
  const root = document.documentElement;
  const emptyHome = document.getElementById('empty-home');
  const hero = document.querySelector<HTMLElement>('.home-hero');
  const calendar = document.getElementById('home-calendar-card');
  const height = Math.max(60, Math.min(96, state.height || 84));
  const bottom = Math.max(18, Math.round(58 + (84 - height) * 4.2));
  root.style.setProperty('--home-custom-bottom', `${bottom}px`);
  root.classList.toggle('home-height-compact', height <= 70);
  const transparency = Math.max(0, Math.min(100, state.opacity));
  const mediaOpacity = ((100 - transparency) / 100).toFixed(2);
  root.style.setProperty('--home-panel-alpha', mediaOpacity);
  root.style.setProperty('--home-hero-media-opacity', mediaOpacity);
  root.classList.toggle('home-panel-transparent', transparency >= 100);
  const heroVideo = document.querySelector<HTMLVideoElement>('#home-hero-media-video');
  if (heroVideo?.getAttribute('src')) {
    if (transparency >= 100) heroVideo.pause();
    else void heroVideo.play().catch(() => undefined);
  }
  emptyHome?.classList.toggle('home-calendar-hidden', !state.showCalendar);
  calendar?.classList.toggle('home-card-hidden', !state.showCalendar);
  if (hero && !homeHeroMediaReady && !homeHeroMediaLoading) void applyHomeHeroMedia();
  syncHomeSettingsControls();
}

function syncHomeSettingsControls(): void {
  const state = readHomeCardSettings();
  const heightInput = document.querySelector<HTMLInputElement>('#home-height-range');
  const heightValue = document.getElementById('home-height-value');
  const opacityInput = document.querySelector<HTMLInputElement>('#home-opacity-range');
  const opacityValue = document.getElementById('home-opacity-value');
  const calendarInput = document.querySelector<HTMLInputElement>('#home-calendar-visible');
  if (heightInput && document.activeElement !== heightInput) heightInput.value = String(state.height);
  if (heightValue) heightValue.textContent = `${state.height}%`;
  if (opacityInput && document.activeElement !== opacityInput) opacityInput.value = String(state.opacity);
  if (opacityValue) opacityValue.textContent = `${state.opacity}%`;
  if (calendarInput) calendarInput.checked = state.showCalendar;
}
