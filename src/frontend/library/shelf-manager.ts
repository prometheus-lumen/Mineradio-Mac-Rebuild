function makeShelfManager(): ShelfManager {
  var group: THREE.Group | null = null;
  var cardWindow = new ShelfCardWindow(5);
  var cards = cardWindow.cards;
  var allItems = cardWindow.items;
  var SHELF_VISIBLE_RADIUS = cardWindow.visibleRadius;
  var shelfPane: 'mine' | 'fav' = 'mine';       // mine | fav
  var collectionReveal = 0;     // 滚轮阻尼累积，用于打开/返回收藏歌单
  var paneMemory: Record<'mine' | 'fav', number> = { mine:0, fav:0 };
  var paneSwitchAt = -10;
  var paneSwitchDir = 1;
  var mode = 'side';
  var lastSig = '';
  var lastUpdate = 0;
  var lastCardRedrawAt = -10;
  var lastCardPulseBucket = -1;
  var selectedIdx = -1;

  // v7.2 PSP 风格状态
  var centerIdx = 0;          // 当前居中卡片 index (在 items 数组中的位置)
  var centerTarget = 0;       // 目标 centerIdx (插值)
  var centerSmooth = 0;       // 当前实际 centerIdx 平滑值
  var openCardIdx = -1;       // 已打开内容框的卡片 (-1 表示无)
  var contentList: ShelfContentList | null = null;     // 二级 PSP 滚动列表 manager
  var connectorParticles: ShelfStageExtras['connectorParticles'] | null = null;
  var floorMirror: ShelfStageExtras['floorMirror'] | null = null;

  function rebuild(asyncCards?: boolean): void {
    if (!group) return;
    cardWindow.dispose();
    disposeShelfStageExtras(connectorParticles, floorMirror);
    connectorParticles = null;
    floorMirror = null;
    cardWindow.setItems(currentShelfItems(shelfPane));
    lastSig = shelfItemsSignature(allItems, shelfPane);
    lastCardRedrawAt = -10;
    lastCardPulseBucket = -1;
    // center 起始 = currentIdx (如果是 queue), 否则 0
    if (allItems.length && allItems[0].type === 'queue' && currentIdx >= 0) {
      centerTarget = Math.min(allItems.length - 1, currentIdx);
      centerSmooth = centerTarget;
      centerIdx = centerTarget;
    } else if (centerTarget >= allItems.length) {
      centerTarget = Math.max(0, allItems.length - 1);
      centerSmooth = centerTarget;
    }
    if (selectedIdx >= allItems.length) selectedIdx = -1;
    cardWindow.sync(centerTarget, selectedIdx, true, !!asyncCards);
    if (mode === 'stage') {
      var extras = createShelfStageExtras(group);
      connectorParticles = extras.connectorParticles;
      floorMirror = extras.floorMirror;
    }
  }

  // ====================================================
  //  PSP 弧形布局: 以 centerSmooth 为基准, 卡片绕弧排列
  //  i 距离 center 越远 → 越靠后, 越小, 越淡
  // ====================================================
  function playPlaylistCard(card: ShelfCard | undefined): boolean {
    if (!activateShelfPlaylistCard(card, contentList)) return false;
    openCardIdx = -1;
    return true;
  }

  function switchPane(nextPane: 'mine' | 'fav'): boolean {
    if (shelfMergesCollections()) return false;
    if (nextPane === shelfPane) return false;
    paneMemory[shelfPane] = Math.max(0, Math.round(centerTarget));
    shelfPane = nextPane;
    collectionReveal = 0;
    var targetList = activeShelfPlaylists(shelfPane);
    var remembered = paneMemory[nextPane] || 0;
    centerTarget = Math.max(0, Math.min(Math.max(0, targetList.length - 1), remembered));
    centerSmooth = centerTarget + (nextPane === 'fav' ? 1.85 : -1.85);
    centerIdx = centerTarget;
    paneSwitchAt = uniforms.uTime.value;
    paneSwitchDir = nextPane === 'fav' ? 1 : -1;
    shelfOpenAnimAt = uniforms.uTime.value;
    if (contentList) contentList.close();
    selectedIdx = Math.round(centerTarget);
    playShelfSelectTick(paneSwitchDir, 'card');
    rebuild();
    showToast(nextPane === 'fav' ? '收藏歌单' : '我的歌单');
    return true;
  }

  function applySelectedIndex(idx: number | null | undefined): void {
    selectedIdx = applyShelfCardSelection(cards, idx);
  }

  function step(direction: number): void {
    if (!allItems.length) return;
    var panes = splitShelfPlaylists();
    var atEnd = centerTarget >= allItems.length - 1 && direction > 0;
    var atStart = centerTarget <= 0 && direction < 0;
    if (!shelfMergesCollections()) {
      if (hasAnyPlatformLogin() && userPlaylists.length && shelfPane === 'mine' && atEnd && panes.fav.length) {
        collectionReveal += Math.min(1.5, Math.abs(direction));
        if (collectionReveal >= 3) switchPane('fav');
        return;
      }
      if (hasAnyPlatformLogin() && userPlaylists.length && shelfPane === 'fav' && atStart && panes.mine.length) {
        collectionReveal += Math.min(1.5, Math.abs(direction));
        if (collectionReveal >= 3) switchPane('mine');
        return;
      }
    }
    collectionReveal = 0;
    var prevTarget = Math.round(centerTarget);
    centerTarget = Math.max(0, Math.min(allItems.length - 1, centerTarget + direction));
    var nextTarget = Math.round(centerTarget);
    paneMemory[shelfPane] = Math.max(0, Math.round(centerTarget));
    cardWindow.sync(centerTarget, selectedIdx);
    applySelectedIndex(nextTarget);
    if (nextTarget !== prevTarget) playShelfSelectTick(direction, 'card');
    pulseShelfCard(cards.find(function(c){ return c.index === nextTarget; }), 0.55);
  }

  return {
    setMode: function(m) {
      if (m === mode && group) return;
      mode = m;
      if (m === 'off') {
        cardWindow.dispose();
        if (group) scene.remove(group);
        disposeShelfStageExtras(connectorParticles, floorMirror);
        connectorParticles = null;
        floorMirror = null;
        group = null;
        cardWindow.setGroup(null);
        if (contentList) contentList.close();
        return;
      }
      if (!group) {
        group = new THREE.Group();
        group.renderOrder = 50;
        scene.add(group);
        cardWindow.setGroup(group);
      }
      var asyncCards = mode === 'side' && document.body.classList.contains('splash-active');
      rebuild(asyncCards);
    },
    getMode: function(){ return mode; },
    update: function(dt) {
      if (!group) return;
      // PSP 滚动平滑
      centerSmooth += (centerTarget - centerSmooth) * 0.16;
      if (Math.abs(centerSmooth - centerTarget) < 0.001) centerSmooth = centerTarget;
      var contentOpen = !!(contentList && contentList.isOpen());
      updateShelfGroupLayout(
        group, cards, mode, allItems.length, contentOpen, dt,
        connectorParticles, floorMirror
      );
      for (var i = 0; i < cards.length; i++) {
        placeShelfCard(cards[i], mode, {
          centerSmooth: centerSmooth,
          visibleRadius: SHELF_VISIBLE_RADIUS,
          contentOpen: contentOpen,
          paneSwitchAt: paneSwitchAt,
          paneSwitchDir: paneSwitchDir,
          openCardIdx: openCardIdx
        });
      }
      // 内容更新 (节流)
      if (uniforms.uTime.value - lastUpdate > 0.8) {
        lastUpdate = uniforms.uTime.value;
        var nextSig = shelfItemsSignature(currentShelfItems(shelfPane), shelfPane);
        if (nextSig !== lastSig) rebuild();
        else {
          var pulseBucket = Math.round((bass + beatPulse * 0.85) * 10);
          var redrawInterval = playing ? 1.35 : 4.0;
          if (pulseBucket !== lastCardPulseBucket || uniforms.uTime.value - lastCardRedrawAt > redrawInterval) {
            lastCardPulseBucket = pulseBucket;
            lastCardRedrawAt = uniforms.uTime.value;
            cards.forEach(function(c){
              c.item = allItems[c.index] || c.item;
              c.isCenter = Math.abs(c.index - centerSmooth) < 0.5;
              if (c.isCenter || c.dofBucket <= 1 || c.index === currentIdx) drawCard(c, c.item);
            });
          }
        }
      }
      // 二级内容框 update
      if (contentList) contentList.update(dt);
    },
    onCoverChange: function() {
      if (group && mode !== 'off' && uniforms.uTime.value - lastUpdate > 0.2) {
        lastUpdate = uniforms.uTime.value;
        rebuild();
      }
    },
    rebuild: rebuild,
    refreshTheme: function() {
      cards.forEach(function(c) {
        c.drawKey = '';
        drawCard(c, c.item);
      });
      if (contentList && contentList.refreshTheme) contentList.refreshTheme();
    },
    raycastCards: function(raycaster) {
      return raycastShelfCards(cards, group, raycaster);
    },
    pickCardAtScreen: function(sx, sy, pad) {
      return pickShelfCardAtScreen(cards, group, sx, sy, pad);
    },
    // PSP 步进
    next: function() { step(1); },
    prev: function() { step(-1); },
    scrollBy: function(d) { step(d); },
    getCenterIdx: function() { return Math.round(centerSmooth); },
    getCardAt: function(idx) { return cards.find(function(c){ return c.index === idx; }); },
    getCards: function() { return cards; },
    playPlaylistAt: function(idx) {
      return playPlaylistCard(cards.find(function(c){ return c.index === idx; }));
    },
    clearSelected: function() {
      applySelectedIndex(-1);
    },
    setSelected: function(idx) {
      applySelectedIndex(idx);
    },
    triggerAction: function(action) {
      if (!action) return;
      var card = cards.find(function(c) { return c.mesh.userData.action === action; });
      pulseShelfCard(card, action.kind === 'loadPlaylist' ? 1.0 : 0.70);
      if (action.kind === 'playQueue' && action.index != null) {
        playQueueAt(action.index);
      } else if (action.kind === 'loadPlaylist' && action.playlistId) {
        var list = contentList || makeContentListManager();
        contentList = list;
        openCardIdx = card ? card.index : -1;
        list.open(action.playlistId, action.title || card?.item.title, card);
        setShelfPinnedOpen(true, true);
        if (typeof updateEmptyHomeVisibility === 'function') updateEmptyHomeVisibility({ forceLoad: false });
        if (typeof setFocusZone === 'function') setFocusZone('shelf-detail', true);
      } else if (action.kind === 'empty') {
        togglePlaylistPanel(true);
      }
    },
    // 二级内容框 open/close
    openContent: function(cardIdx) {
      var card = cards.find(function(c){ return c.index === cardIdx; });
      if (!card) return;
      var action = card.mesh.userData.action as ShelfAction | undefined;
      if (!action) return;
      pulseShelfCard(card, 1.0);
      // queue 类型 → 直接播放, 不需要内容框
      if (action.kind === 'playQueue' && action.index != null) {
        playQueueAt(action.index);
        return;
      }
      if (action.kind === 'loadPlaylist' && action.playlistId) {
        var list = contentList || makeContentListManager();
        contentList = list;
        openCardIdx = card.index;
        list.open(action.playlistId, action.title || card.item.title, card);
        setShelfPinnedOpen(true, true);
        if (typeof updateEmptyHomeVisibility === 'function') updateEmptyHomeVisibility({ forceLoad: false });
        if (typeof setFocusZone === 'function') setFocusZone('shelf-detail', true);
      }
      if (action.kind === 'empty') togglePlaylistPanel(true);
    },
    closeContent: function() {
      openCardIdx = -1;
      if (contentList) contentList.close();
      var hint = document.getElementById('hint');
      if (hint) hint.classList.toggle('shelf-hidden', shelfPinnedOpen);
      if (typeof setFocusZone === 'function') setFocusZone(shelfPinnedOpen ? 'shelf-side' : null, true);
      if (typeof updateEmptyHomeVisibility === 'function') updateEmptyHomeVisibility({ forceLoad: false });
    },
    hasOpenContent: function() { return Boolean(contentList?.isOpen()); },
    getContentList: function() { return contentList; },
    getOpenContentIndex: function() { return openCardIdx; },
    canInteract: function() { return mode !== 'off' && allItems.length > 0; }
  };
}
