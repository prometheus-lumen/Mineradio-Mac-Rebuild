function makeContentListManager(): ShelfContentList {
  var group: THREE.Group | null = null;
  var rows: ShelfContentRow[] = [];           // 每行一张卡 (歌曲)
  var panel: ShelfContentPanel | null = null;
  var allTracks: PlaylistSong[] = [];
  var renderedStart = -1;
  var CONTENT_VISIBLE_RADIUS = 5;
  var CONTENT_MAX_RENDER = CONTENT_VISIBLE_RADIUS * 2 + 1;
  var open = false;
  var centerTarget = 0, centerSmooth = 0;
  var playlistTitle = '';
  var contentKind = 'playlist';
  var sourceCard: ShelfCard | null = null;
  var requestToken = 0;
  var openAnimAt = -10;
  var rowAnimAt = -10;
  var panelDirty = true, rowsDirty = true;
  var panelDrawAt = -10, rowDrawAt = -10;
  var LOADING_ANIM_INTERVAL = 1 / 30;
  function drawPanel(): void {
    if (!panel && group) panel = buildShelfContentPanel(group);
    if (!panel) return;
    drawShelfContentPanel(panel, {
      title: playlistTitle,
      tracks: allTracks,
      kind: contentKind,
      sourceCard: sourceCard
    }, drawPanel);
  }

  function disposePanel(): void {
    disposeShelfContentPanel(panel);
    panel = null;
  }

  function isLoadingContent(): boolean {
    return allTracks.length === 1 && isShelfLoadingLabel(allTracks[0] && allTracks[0].name);
  }

  function drawPanelIfNeeded(force: boolean, nowT?: number): void {
    nowT = nowT == null ? (uniforms.uTime.value || 0) : nowT;
    if (!force && !panelDirty && (!isLoadingContent() || nowT - panelDrawAt < LOADING_ANIM_INTERVAL)) return;
    drawPanel();
    panelDirty = false;
    panelDrawAt = nowT;
  }

  function disposeRows(): void {
    disposeShelfContentRows(rows);
    renderedStart = -1;
  }

  function startRowsLoadedIntro(): void {
    rowAnimAt = uniforms.uTime.value;
    panelDirty = true;
    rowsDirty = true;
    if (!group || !group.userData) return;
    group.userData.rowSettle = 1;
    if (window.gsap) {
      window.gsap.killTweensOf(group.userData, 'rowSettle');
      window.gsap.to(group.userData, { rowSettle: 0, duration: 0.76, ease: 'expo.out' });
    } else {
      group.userData.rowSettle = 0;
    }
  }

  function syncRenderedRows(force: boolean): void {
    if (!group) return;
    var nowT = uniforms.uTime.value || 0;
    var refreshLoading = isLoadingContent() && nowT - rowDrawAt >= LOADING_ANIM_INTERVAL;
    drawPanelIfNeeded(force || refreshLoading, nowT);
    var total = allTracks.length;
    if (!total) { disposeRows(); return; }
    var center = Math.round(centerTarget);
    var start = Math.max(0, center - CONTENT_VISIBLE_RADIUS);
    var end = Math.min(total - 1, start + CONTENT_MAX_RENDER - 1);
    start = Math.max(0, end - CONTENT_MAX_RENDER + 1);
    if (!force && start === renderedStart && rows.length === (end - start + 1)) {
      rows.forEach(function(row) { row.song = allTracks[row.index] || row.song; });
      if (rowsDirty || refreshLoading) {
        rows.forEach(function(row) {
          var isCenter = Math.abs(row.index - centerSmooth) < 0.5;
          drawShelfContentRow(row, row.song, isCenter);
          row.lastCenter = isCenter;
        });
        rowsDirty = false;
        rowDrawAt = nowT;
      }
      return;
    }
    disposeRows();
    renderedStart = start;
    for (var idx = start; idx <= end; idx++) {
      var row = buildShelfContentRow(allTracks[idx], idx, group);
      rows.push(row);
      drawShelfContentRow(row, row.song, idx === Math.round(centerSmooth));
      row.lastCenter = idx === Math.round(centerSmooth);
    }
    rowsDirty = false;
    rowDrawAt = nowT;
  }

  return {
    isOpen: function() { return open; },
    refreshTheme: function() {
      panelDirty = true;
      rowsDirty = true;
      if (!open || !group) return;
      drawPanelIfNeeded(true);
      syncRenderedRows(true);
    },
    open: async function(playlistId, title, fromCard) {
      open = true;
      playlistTitle = title || '';
      sourceCard = fromCard || null;
      var token = ++requestToken;
      openAnimAt = uniforms.uTime.value;
      rowAnimAt = openAnimAt;
      centerTarget = 0;
      centerSmooth = 0;
      panelDirty = true;
      rowsDirty = true;
      panelDrawAt = -10;
      rowDrawAt = -10;
      if (!group) {
        group = new THREE.Group();
        scene.add(group);
      }
      initializeShelfContentGroup(group);
      try {
        drawPanelIfNeeded(true);
        // 清旧
        disposeRows();
        // loading 行
        allTracks = [{ name: '加载中…', artist: '' }];
        panelDirty = true;
        rowsDirty = true;
        syncRenderedRows(true);
      } catch (renderLoadingErr) {
        console.warn('[ShelfContentLoadingRender]', playlistId, renderLoadingErr);
      }
      var podcastCollectionKey = String(playlistId || '').indexOf('podcast:') === 0 ? String(playlistId).slice(8) : '';
      var qqPlaylistId = String(playlistId || '').indexOf('qq:') === 0 ? String(playlistId).slice(3) : '';
      contentKind = podcastCollectionKey ? 'podcast' : 'playlist';
      // 拉取歌单/播客集合
      var response: ShelfContentResponse;
      try {
        response = podcastCollectionKey
          ? await apiJson<ShelfContentResponse>('/api/podcast/my/items?key=' + encodeURIComponent(podcastCollectionKey) + '&limit=36')
          : (qqPlaylistId
            ? await apiJson<ShelfContentResponse>('/api/qq/playlist/tracks?id=' + encodeURIComponent(qqPlaylistId))
            : await apiJson<ShelfContentResponse>('/api/playlist/tracks?id=' + encodeURIComponent(playlistId)));
      } catch (e) {
        if (!open || token !== requestToken) return;
        console.warn('[ShelfContentLoadApi]', playlistId, e);
        try {
          allTracks = [{ name: '歌单加载失败', artist: '' }];
          panelDirty = true;
          rowsDirty = true;
          startRowsLoadedIntro();
          syncRenderedRows(true);
        } catch (renderErrorErr) {
          console.warn('[ShelfContentErrorRender]', playlistId, renderErrorErr);
        }
        showToast('歌单加载失败');
        return;
      }
      if (!open || token !== requestToken) return;
      try {
        // 清 loading
        disposeRows();
        var tracks = podcastCollectionKey ? (response.items || []) : (response.tracks || []);
        if (!tracks.length) {
          allTracks = [{ name: podcastCollectionKey ? '播客为空' : '歌单为空', artist: '' }];
          panelDirty = true;
          rowsDirty = true;
          startRowsLoadedIntro();
          syncRenderedRows(true);
          return;
        }
        allTracks = tracks;
        centerTarget = 0; centerSmooth = 0;
        panelDirty = true;
        rowsDirty = true;
        startRowsLoadedIntro();
        syncRenderedRows(true);
      } catch (renderReadyErr) {
        console.warn('[ShelfContentReadyRender]', playlistId, renderReadyErr);
        showToast('歌单已载入，3D列表刷新失败');
      }
    },
    close: function() {
      open = false;
      requestToken++;
      var targetGroup = group;
      var targetRows = rows.slice();
      var targetPanel = panel;
      group = null;
      rows = [];
      panel = null;
      renderedStart = -1;
      allTracks = [];
      contentKind = 'playlist';
      sourceCard = null;
      panelDirty = true;
      rowsDirty = true;
      panelDrawAt = -10;
      rowDrawAt = -10;
      if (!targetGroup) return;
      closeShelfContentGroup(targetGroup, targetRows, targetPanel);
    },
    update: function(dt) {
      if (!group || !open) return;
      updateShelfContentGroup(group);
      centerSmooth += (centerTarget - centerSmooth) * 0.18;
      if (Math.abs(centerSmooth - centerTarget) < 0.001) centerSmooth = centerTarget;
      syncRenderedRows(false);
      if (panel && panel.mesh) {
        var pr = Math.max(0, Math.min(1, (uniforms.uTime.value - openAnimAt) / 0.72));
        pr = pr * pr * (3 - 2 * pr);
        panel.mesh.material.opacity = 0.86 * pr * shelfSettings().opacity;
      }
      for (var i = 0; i < rows.length; i++) {
        placeShelfContentRow(
          rows[i], centerSmooth, CONTENT_VISIBLE_RADIUS, rowAnimAt,
          group && group.userData ? (group.userData.rowSettle || 0) : 0
        );
        var isC = Math.abs(rows[i].index - centerSmooth) < 0.5;
        if (rows[i].lastCenter !== isC) {
          rows[i].lastCenter = isC;
          drawShelfContentRow(rows[i], rows[i].song, isC);
        }
      }
    },
    next: function() {
      if (allTracks.length) {
        var prevTarget = Math.round(centerTarget);
        centerTarget = Math.min(allTracks.length - 1, centerTarget + 1);
        var nextTarget = Math.round(centerTarget);
        syncRenderedRows(false);
        if (nextTarget !== prevTarget) playShelfSelectTick(1, 'row');
        pulseShelfContentRow(rows.find(function(r){ return r.index === nextTarget; }), 0.48);
      }
    },
    prev: function() {
      if (allTracks.length) {
        var prevTarget = Math.round(centerTarget);
        centerTarget = Math.max(0, centerTarget - 1);
        var nextTarget = Math.round(centerTarget);
        syncRenderedRows(false);
        if (nextTarget !== prevTarget) playShelfSelectTick(-1, 'row');
        pulseShelfContentRow(rows.find(function(r){ return r.index === nextTarget; }), 0.48);
      }
    },
    scrollBy: function(d) {
      if (allTracks.length) {
        var prevTarget = Math.round(centerTarget);
        centerTarget = Math.max(0, Math.min(allTracks.length - 1, centerTarget + d));
        var nextTarget = Math.round(centerTarget);
        syncRenderedRows(false);
        if (nextTarget !== prevTarget) playShelfSelectTick(d, 'row');
        pulseShelfContentRow(rows.find(function(r){ return r.index === nextTarget; }), 0.48);
      }
    },
    getRows: function() { return rows; },
    getCenterIdx: function() { return Math.round(centerSmooth); },
    pulseRow: function(row, amount) {
      if (!row) return;
      pulseShelfContentRow(row, amount || 1, 0.42);
    },
    raycastRows: function(raycaster) {
      return raycastShelfContentRows(rows, raycaster);
    },
    pickRowAtScreen: function(sx, sy) {
      return pickShelfContentRowAtScreen(rows, open, sx, sy);
    },
    raycastPanel: function(raycaster) {
      return raycastShelfContentPanel(panel, raycaster);
    },
    screenContainsPanel: function(sx, sy) {
      return screenContainsShelfContentPanel(panel, open, sx, sy);
    },
    rowActionAtScreen: function(row, sx, sy) {
      return shelfContentRowActionAtScreen(row, centerSmooth, sx, sy);
    },
    playRow: function(row) {
      playShelfContentRow(row, allTracks, playlistTitle);
    }
  };

}
