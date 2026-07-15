function initHomeCardCustomization(): void {
  const grid = document.getElementById('home-card-grid');
  if (!grid || grid._homeCustomizeBound) return;
  const homeGrid = grid;
  grid._homeCustomizeBound = true;
  var dragged: HTMLElement | null = null;
  var dragMoved = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var dragOriginRect: DOMRect | null = null;
  var dragPlaceholder: HTMLElement | null = null;
  var dragOriginalParent: Node | null = null;
  var dragOriginalNext: ChildNode | null = null;
  var activePointerId: number | null = null;
  function moveDraggedHomeCard(x: number, y: number): void {
    if (!dragged) return;
    dragged.style.left = (x - dragOffsetX) + 'px';
    dragged.style.top = (y - dragOffsetY) + 'px';
  }
  function finishHomePointerDrag(save: boolean): void {
    if (dragged) {
      dragged.classList.remove('home-card-dragging');
      dragged.style.transform = '';
      dragged.style.width = '';
      dragged.style.height = '';
      dragged.style.left = '';
      dragged.style.top = '';
      dragged.style.position = '';
      if (activePointerId != null) try { dragged.releasePointerCapture(activePointerId); } catch (err) {}
    }
    if (dragPlaceholder && dragPlaceholder.parentNode) {
      if (dragged) {
        if (save) dragPlaceholder.parentNode.insertBefore(dragged, dragPlaceholder);
        else if (dragOriginalParent) dragOriginalParent.insertBefore(dragged, dragOriginalNext);
      }
      dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    }
    clearHomeDragTargets(grid);
    activePointerId = null;
    homeCardDragActive = false;
    if (save && dragMoved) {
      setHomeCardOrderFromDom();
      homeGrid._homeDragSuppressClick = true;
      setTimeout(function(): void { homeGrid._homeDragSuppressClick = false; }, 140);
    }
    dragged = null;
    dragMoved = false;
    dragOriginRect = null;
    dragPlaceholder = null;
    dragOriginalParent = null;
    dragOriginalNext = null;
  }
  grid.addEventListener('pointerdown', function(e){
    if (e.button != null && e.button !== 0) return;
    var card = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('.home-card[data-home-card]') : null;
    if (!card || card.classList.contains('home-card-hidden')) return;
    closeHomeCardMenu();
    closeHomeRestoreMenu();
    dragged = card;
    dragMoved = false;
    dragOriginalParent = card.parentNode;
    dragOriginalNext = card.nextSibling;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginRect = card.getBoundingClientRect();
    dragOffsetX = e.clientX - dragOriginRect.left;
    dragOffsetY = e.clientY - dragOriginRect.top;
    activePointerId = e.pointerId;
    homeCardDragActive = true;
    try { card.setPointerCapture(activePointerId); } catch (err) {}
  });
  window.addEventListener('pointermove', function(e){
    if (!dragged) return;
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    if (!dragMoved && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 8) return;
    if (!dragMoved) {
      dragPlaceholder = document.createElement('div');
      dragPlaceholder.className = 'home-card-placeholder';
      if (!dragOriginRect || !dragOriginalParent) return;
      dragPlaceholder.style.width = dragOriginRect.width + 'px';
      dragPlaceholder.style.height = dragOriginRect.height + 'px';
      dragOriginalParent.insertBefore(dragPlaceholder, dragged.nextSibling);
      dragged.classList.add('home-card-dragging');
      dragged.style.width = dragOriginRect.width + 'px';
      dragged.style.height = dragOriginRect.height + 'px';
      dragged.style.left = dragOriginRect.left + 'px';
      dragged.style.top = dragOriginRect.top + 'px';
      document.body.appendChild(dragged);
      if (activePointerId != null) try { dragged.setPointerCapture(activePointerId); } catch (err) {}
      dragMoved = true;
    }
    e.preventDefault();
    moveDraggedHomeCard(e.clientX, e.clientY);
    if (!dragPlaceholder) return;
    var activePlaceholder = dragPlaceholder;
    var before = homePlaceholderInsertBefore(grid, e.clientX, e.clientY, activePlaceholder);
    if (before !== activePlaceholder && before !== activePlaceholder.nextSibling) {
      animateHomeCardFlip(grid, function(): void { grid.insertBefore(activePlaceholder, before); }, dragged);
    } else if (!before && activePlaceholder.nextSibling) {
      animateHomeCardFlip(grid, function(): void { grid.appendChild(activePlaceholder); }, dragged);
    }
  });
  window.addEventListener('pointerup', function(e){
    if (!dragged) return;
    if (dragMoved) e.preventDefault();
    finishHomePointerDrag(true);
  });
  window.addEventListener('pointercancel', function(){
    finishHomePointerDrag(false);
  });
  window.addEventListener('blur', function(){
    if (dragged) finishHomePointerDrag(false);
  });
  grid.addEventListener('click', function(e){
    if (!grid._homeDragSuppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  grid.addEventListener('mouseleave', function(){
    if (dragged && dragMoved) clearHomeDragTargets(grid);
  });
  grid.addEventListener('contextmenu', function(e){
    var card = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('.home-card[data-home-card]') : null;
    if (!card || !grid.contains(card)) return;
    e.preventDefault();
    showHomeCardMenu(card, e.clientX, e.clientY);
  });
  var hero = document.querySelector<HTMLElement>('.home-hero[data-home-card="weather"]');
  if (hero && !hero._homeCardMenuBound) {
    hero._homeCardMenuBound = true;
    var homeHero = hero;
    hero.addEventListener('contextmenu', function(e: MouseEvent): void {
      e.preventDefault();
      showHomeCardMenu(homeHero, e.clientX, e.clientY);
    });
  }
  const menu = document.getElementById('home-card-menu');
  if (menu && !menu._homeCardMenuBound) {
    menu._homeCardMenuBound = true;
    menu.addEventListener('click', function(e){
      var del = e.target instanceof Element ? e.target.closest('[data-home-card-delete]') : null;
      if (!del) return;
      e.preventDefault();
      e.stopPropagation();
      hideHomeCardById(menu.getAttribute('data-card-id'));
    });
  }
  const pop = document.getElementById('home-restore-pop');
  if (pop && !pop._homeRestoreBound) {
    pop._homeRestoreBound = true;
    pop.addEventListener('click', function(e){
      var restore = e.target instanceof Element ? e.target.closest('[data-home-restore-id]') : null;
      var all = e.target instanceof Element ? e.target.closest('[data-home-restore-all]') : null;
      if (!restore && !all) return;
      e.preventDefault();
      e.stopPropagation();
      if (all) restoreHomeCards();
      else if (restore) restoreHomeCard(restore.getAttribute('data-home-restore-id'));
    });
  }
  var settingsPop = document.getElementById('home-settings-pop');
  if (settingsPop && !settingsPop._homeSettingsBound) {
    settingsPop._homeSettingsBound = true;
    settingsPop.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    settingsPop.addEventListener('click', function(e){ e.stopPropagation(); });
  }
  const heightEl = document.querySelector<HTMLInputElement>('#home-height-range');
  if (heightEl && !heightEl._homeSettingsBound) {
    heightEl._homeSettingsBound = true;
    heightEl.addEventListener('input', function(){
      var state = readHomeCardSettings();
      state.height = Math.max(60, Math.min(96, Math.round(Number(heightEl.value) || 84)));
      saveHomeCardSettings();
      applyHomeCardSettings();
    });
  }
  const opacityEl = document.querySelector<HTMLInputElement>('#home-opacity-range');
  if (opacityEl && !opacityEl._homeSettingsBound) {
    opacityEl._homeSettingsBound = true;
    opacityEl.addEventListener('input', function(){
      var state = readHomeCardSettings();
      state.opacity = Math.max(0, Math.min(100, Math.round(Number(opacityEl.value) || 0)));
      saveHomeCardSettings();
      applyHomeCardSettings();
    });
  }
  const calendarEl = document.querySelector<HTMLInputElement>('#home-calendar-visible');
  if (calendarEl && !calendarEl._homeSettingsBound) {
    calendarEl._homeSettingsBound = true;
    calendarEl.addEventListener('change', function(){
      var state = readHomeCardSettings();
      state.showCalendar = !!calendarEl.checked;
      saveHomeCardSettings();
      applyHomeCardSettings();
      showToast(state.showCalendar ? '时间模块已恢复' : '时间模块已隐藏');
    });
  }
  const bgInput = document.querySelector<HTMLInputElement>('#home-hero-bg-input');
  if (bgInput && !bgInput._homeSettingsBound) {
    bgInput._homeSettingsBound = true;
    bgInput.addEventListener('change', async function(){
      var file = bgInput.files && bgInput.files[0];
      bgInput.value = '';
      if (!file) return;
      var validation = validateHomeHeroMediaFile(file);
      if (!validation.ok) {
        showToast(validation.error || '不支持的背景文件');
        return;
      }
      if (!validation.type) return;
      try {
        await writeHomeHeroMediaRecord({
          blob: file,
          type: validation.type,
          name: String(file.name || ''),
          size: Number(file.size || 0),
          updatedAt: Date.now()
        });
        var state = readHomeCardSettings();
        state.heroBg = '';
        state.heroMediaType = validation.type;
        state.heroMediaName = String(file.name || '');
        homeHeroMediaReady = false;
        saveHomeCardSettings();
        applyHomeCardSettings();
        showToast(validation.type === 'video' ? '大卡片视频背景已更新' : '大卡片图片背景已更新');
      } catch (err) {
        showToast('背景保存失败，请检查磁盘空间');
      }
    });
  }
  document.addEventListener('click', function(){
    closeHomeCardMenu();
    closeHomeRestoreMenu();
    closeHomeSettingsMenu();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      closeHomeCardMenu();
      closeHomeRestoreMenu();
      closeHomeSettingsMenu();
    }
  });
  applyHomeCardLayout();
}
