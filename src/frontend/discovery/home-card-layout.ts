function normalizeHomeCardLayout(raw: unknown): HomeCardLayout {
  const value = raw && typeof raw === 'object' ? raw as Partial<HomeCardLayout> : {};
  const order = Array.isArray(value.order)
    ? value.order.filter((id): id is string => typeof id === 'string' && HOME_CARD_DEFAULT_ORDER.includes(id))
    : [];
  HOME_CARD_DEFAULT_ORDER.forEach((id) => { if (!order.includes(id)) order.push(id); });
  const allowedHidden = [...HOME_CARD_DEFAULT_ORDER, 'weather'];
  const hidden = Array.isArray(value.hidden)
    ? value.hidden.filter((id): id is string => typeof id === 'string' && allowedHidden.includes(id))
    : [];
  return { order: order.slice(0, HOME_CARD_DEFAULT_ORDER.length), hidden: [...new Set(hidden)], heroSide: 'left' };
}

function readHomeCardLayout(): HomeCardLayout {
  if (homeCardLayoutState) return homeCardLayoutState;
  try {
    homeCardLayoutState = normalizeHomeCardLayout(JSON.parse(localStorage.getItem(HOME_CARD_LAYOUT_KEY) || '{}'));
  } catch (error) {
    homeCardLayoutState = normalizeHomeCardLayout(null);
  }
  return homeCardLayoutState;
}

function saveHomeCardLayout(): void {
  try { localStorage.setItem(HOME_CARD_LAYOUT_KEY, JSON.stringify(readHomeCardLayout())); } catch (error) {}
}

function applyHomeCardLayout(): void {
  const grid = document.getElementById('home-card-grid');
  if (!grid) return;
  const state = readHomeCardLayout();
  const hero = document.querySelector<HTMLElement>('.home-hero[data-home-card="weather"]');
  const shell = document.querySelector<HTMLElement>('.empty-home-shell');
  const cards: Record<string, HTMLElement> = {};
  grid.querySelectorAll<HTMLElement>('.home-card[data-home-card]').forEach((card) => {
    const id = card.dataset.homeCard;
    if (id) cards[id] = card;
    card.style.left = ''; card.style.top = ''; card.style.width = ''; card.style.height = ''; card.style.position = '';
  });
  state.order.forEach((id) => { const card = cards[id]; if (card) grid.appendChild(card); });
  Object.entries(cards).forEach(([id, card]) => card.classList.toggle('home-card-hidden', state.hidden.includes(id)));
  hero?.classList.toggle('home-card-hidden', state.hidden.includes('weather'));
  shell?.classList.toggle('home-hero-hidden', state.hidden.includes('weather'));
  shell?.classList.remove('home-hero-right');
  const restoreButton = document.getElementById('home-card-restore-btn');
  if (restoreButton) {
    const changedOrder = state.order.join('|') !== HOME_CARD_DEFAULT_ORDER.join('|');
    restoreButton.classList.toggle('show', changedOrder || state.hidden.length > 0);
    restoreButton.textContent = state.hidden.length ? `恢复模块 · ${state.hidden.length}` : '恢复布局';
  }
  renderHomeRestoreMenu();
  applyHomeCardSettings();
}

function closeHomeRestoreMenu(): void { document.getElementById('home-restore-pop')?.classList.remove('show'); }

function hideHomeCardById(id?: string | null): void {
  if (!id) return;
  const state = readHomeCardLayout();
  if (!state.hidden.includes(id)) state.hidden.push(id);
  saveHomeCardLayout(); applyHomeCardLayout(); closeHomeCardMenu();
  showToast('模块已删除，可在恢复模块里找回');
}

function restoreHomeCard(id?: string | null): void {
  if (!id) return;
  const state = readHomeCardLayout();
  state.hidden = state.hidden.filter((item) => item !== id);
  if (!state.order.includes(id)) state.order.push(id);
  saveHomeCardLayout(); applyHomeCardLayout(); showToast(`已恢复：${homeCardLabel(id)}`);
}

function restoreHomeCards(): void {
  homeCardLayoutState = { order: [...HOME_CARD_DEFAULT_ORDER], hidden: [], heroSide: 'left' };
  saveHomeCardLayout(); applyHomeCardLayout(); closeHomeRestoreMenu(); showToast('Home 模块已恢复');
}

function renderHomeRestoreMenu(): void {
  const popover = document.getElementById('home-restore-pop');
  if (!popover) return;
  const allowedHidden = [...HOME_CARD_DEFAULT_ORDER, 'weather'];
  const hidden = readHomeCardLayout().hidden.filter((id) => allowedHidden.includes(id));
  const items = hidden.length
    ? hidden.map((id) => `<button type="button" data-home-restore-id="${escHtml(id)}">${escHtml(homeCardLabel(id))}</button>`).join('')
    : '<div class="home-restore-empty">没有被删除的模块</div>';
  popover.innerHTML = `<div class="home-restore-title">可恢复模块</div>${items}<button type="button" data-home-restore-all="1">全部恢复</button>`;
}

function toggleHomeRestoreMenu(event?: Event): void {
  event?.preventDefault(); event?.stopPropagation(); closeHomeCardMenu(); closeHomeSettingsMenu(); renderHomeRestoreMenu();
  const popover = document.getElementById('home-restore-pop');
  if (!popover || !document.getElementById('home-card-restore-btn')) return;
  if (popover.classList.contains('show')) closeHomeRestoreMenu(); else popover.classList.add('show');
}

function closeHomeSettingsMenu(): void { document.getElementById('home-settings-pop')?.classList.remove('show'); }

function toggleHomeSettingsMenu(event?: Event): void {
  event?.preventDefault(); event?.stopPropagation(); closeHomeCardMenu(); closeHomeRestoreMenu(); syncHomeSettingsControls();
  document.getElementById('home-settings-pop')?.classList.toggle('show');
}
