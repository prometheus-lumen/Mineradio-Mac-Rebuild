interface HomeCardPosition {
  node: HTMLElement;
  rect: DOMRect;
}

interface HomeCardRow {
  top: number;
  bottom: number;
  items: HomeCardPosition[];
}

function homePlaceholderInsertBefore(
  grid: HTMLElement,
  x: number,
  y: number,
  placeholder: HTMLElement
): HTMLElement | null {
  const items = Array.from(grid.children)
    .filter((node): node is HTMLElement => node instanceof HTMLElement
      && node !== placeholder
      && !node.classList.contains('home-card-hidden')
      && (node.classList.contains('home-card') || node.classList.contains('home-card-placeholder')))
    .map((node) => ({ node, rect: node.getBoundingClientRect() }))
    .sort((left, right) => Math.abs(left.rect.top - right.rect.top) > 8
      ? left.rect.top - right.rect.top
      : left.rect.left - right.rect.left);
  if (!items.length) return null;
  const rows: HomeCardRow[] = [];
  items.forEach((item) => {
    let row = rows[rows.length - 1];
    if (!row || Math.abs(row.top - item.rect.top) > 8) {
      row = { top: item.rect.top, bottom: item.rect.bottom, items: [] };
      rows.push(row);
    }
    row.bottom = Math.max(row.bottom, item.rect.bottom);
    row.items.push(item);
  });
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || y > row.bottom) continue;
    for (const item of row.items) {
      if (x < item.rect.left + item.rect.width / 2) return item.node;
    }
    return rows[rowIndex + 1]?.items[0]?.node || null;
  }
  return null;
}

function clearHomeDragTargets(grid?: ParentNode | null): void {
  (grid || document).querySelectorAll('.home-card-drag-target')
    .forEach((card) => card.classList.remove('home-card-drag-target'));
}

function homeVisibleCards(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>('.home-card[data-home-card]:not(.home-card-hidden)'));
}

function animateHomeCardFlip(grid: HTMLElement, mutator: () => void, dragged?: HTMLElement | null): void {
  const first = new Map<HTMLElement, DOMRect>();
  homeVisibleCards(grid).forEach((card) => first.set(card, card.getBoundingClientRect()));
  mutator();
  homeVisibleCards(grid).forEach((card) => {
    if (card === dragged) return;
    const from = first.get(card);
    if (!from) return;
    const to = card.getBoundingClientRect();
    const deltaX = from.left - to.left;
    const deltaY = from.top - to.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;
    card.style.transition = 'none';
    card.style.transform = `translate3d(${deltaX}px,${deltaY}px,0)`;
    card.getBoundingClientRect();
    requestAnimationFrame(() => {
      card.style.transition = 'transform .28s cubic-bezier(.22,1,.36,1), border-color .22s, background .22s, box-shadow .22s';
      card.style.transform = '';
      window.setTimeout(() => { card.style.transition = ''; }, 320);
    });
  });
}
