// Home card action helpers migrated from the classic discovery controller.
interface HomeCardRowEntry { card: HTMLElement; rect: DOMRect; }
interface HomeCardActionRow { top: number; bottom: number; cards: HomeCardRowEntry[]; }

function homeCardLabel(id: string): string {
  return HOME_CARD_LABELS[id] || id;
}

function setHomeCardOrderFromDom(): void {
  var grid = document.getElementById('home-card-grid');
  if (!grid) return;
  var state = readHomeCardLayout();
  state.order = Array.from(grid.querySelectorAll<HTMLElement>('.home-card[data-home-card]'))
    .map(function(card): string { return card.dataset.homeCard || ''; })
    .filter(function(id): boolean { return HOME_CARD_DEFAULT_ORDER.includes(id); });
  HOME_CARD_DEFAULT_ORDER.forEach(function(id){ if (state.order.indexOf(id) < 0) state.order.push(id); });
  saveHomeCardLayout();
  applyHomeCardLayout();
}

function closeHomeCardMenu(): void {
  var menu = document.getElementById('home-card-menu');
  if (menu) {
    menu.classList.remove('show');
    menu.removeAttribute('data-card-id');
  }
}

function showHomeCardMenu(card: HTMLElement, x: number, y: number): void {
  var id = card && card.getAttribute && card.getAttribute('data-home-card');
  if (!id) return;
  closeHomeRestoreMenu();
  closeHomeSettingsMenu();
  var menu = document.getElementById('home-card-menu');
  if (!menu) return;
  menu.setAttribute('data-card-id', id);
  menu.innerHTML = '<button class="danger" type="button" data-home-card-delete="1">删除</button>';
  placeFloatingPanel(menu, x, y);
}

function toggleHomeHeroSide(): void {
  var state = readHomeCardLayout();
  state.heroSide = 'left';
  saveHomeCardLayout();
  applyHomeCardLayout();
  closeHomeCardMenu();
}

function homeCardRows(grid: HTMLElement, dragged: HTMLElement | null): HomeCardActionRow[] {
  var cards = Array.from(grid.querySelectorAll<HTMLElement>('.home-card[data-home-card]:not(.home-card-hidden)')).filter(function(card){
    return card !== dragged;
  }).map(function(card){
    var rect = card.getBoundingClientRect();
    return { card: card, rect: rect };
  }).sort(function(a, b){
    return Math.abs(a.rect.top - b.rect.top) > 8 ? a.rect.top - b.rect.top : a.rect.left - b.rect.left;
  });
  var rows: HomeCardActionRow[] = [];
  cards.forEach(function(item){
    var row = rows[rows.length - 1];
    if (!row || Math.abs(row.top - item.rect.top) > 8) {
      row = { top: item.rect.top, bottom: item.rect.bottom, cards: [] };
      rows.push(row);
    }
    row.bottom = Math.max(row.bottom, item.rect.bottom);
    row.cards.push(item);
  });
  return rows;
}

function homeCardInsertBefore(grid: HTMLElement, x: number, y: number, dragged: HTMLElement | null): HTMLElement | null {
  var rows = homeCardRows(grid, dragged);
  if (!rows.length) return null;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (y <= row.bottom) {
      for (var i = 0; i < row.cards.length; i++) {
        var item = row.cards[i];
        if (x < item.rect.left + item.rect.width / 2) return item.card;
      }
      return rows[r + 1] && rows[r + 1].cards[0] ? rows[r + 1].cards[0].card : null;
    }
  }
  return null;
}
