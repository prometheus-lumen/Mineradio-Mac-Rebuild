function setHomeArt(id: string, url: string, size?: number): void {
  var el = document.getElementById(id);
  if (!el) return;
  var src = url ? coverUrlWithSize(url, size || 260) : '';
  el.style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
  el.classList.toggle('has-cover', !!src);
  el.classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
}

function pickHomeHeroBackground(e?: Event): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  var input = document.querySelector<HTMLInputElement>('#home-hero-bg-input');
  if (input) input.click();
}

async function clearHomeHeroBackground(e?: Event): Promise<void> {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  var state = readHomeCardSettings();
  state.heroBg = '';
  state.heroMediaType = '';
  state.heroMediaName = '';
  try { await deleteHomeHeroMediaRecord(); } catch (err) {}
  homeHeroMediaReady = false;
  saveHomeCardSettings();
  applyHomeCardSettings();
  showToast('大卡片背景已清除');
}
