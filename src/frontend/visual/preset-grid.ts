function buildPresetGrid(): void {
  var grid = document.querySelector<PresetGridElement>('#preset-grid');
  if (!grid) return;
  var strobeSettings = document.getElementById('strobe-settings');
  var topographySettings = document.getElementById('topography-settings');
  // buildPresetGrid may run more than once; detach the persistent settings node
  // before replacing the generated cards so its controls and listeners survive.
  if (strobeSettings && strobeSettings.parentNode === grid) {
    grid.parentNode?.insertBefore(strobeSettings, grid.nextSibling);
  }
  if (topographySettings && topographySettings.parentNode === grid) {
    grid.parentNode?.insertBefore(topographySettings, grid.nextSibling);
  }
  var seen: Record<number, boolean> = {};
  var order = presetDisplayOrder.filter(function(id){
    var ok = id >= 0 && id < presetMeta.length && !seen[id];
    seen[id] = true;
    return ok;
  });
  // 未写入 presetDisplayOrder 的预设保持隐藏；六芒星（索引 7）仅注释入口，底层实现保留。
  // presetMeta.forEach(function(_, id){
  //   if (!seen[id]) order.push(id);
  // });
  grid.innerHTML = order.map(function(i){
    var p = presetMeta[i];
    var desc = p.descHtml || p.desc;
    var configType = i === STROBE_PRESET_INDEX ? 'strobe' : (i === TOPOGRAPHY_PRESET_INDEX ? 'topography' : '');
    var configTitle = configType === 'strobe' ? '配置闪光灯' : '配置音域回响';
    var config = configType
      ? '<button class="preset-config-btn" data-config="' + configType + '" type="button" title="' + configTitle + '" aria-label="' + configTitle + '" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5"/></svg></button>'
      : '';
    return '<div class="preset-card" data-preset="' + i + '" data-action="setPreset" data-index="' + i + '">' +
      config +
      '<div class="pc-icon">' + presetIcons[i] + '</div>' +
      '<div class="pc-name">' + p.name + '</div>' +
      '<div class="pc-desc">' + desc + '</div>' +
    '</div>';
  }).join('');
  var configButton = grid.querySelector('.preset-config-btn[data-config="strobe"]');
  if (configButton) {
    configButton.addEventListener('pointerdown', function(event){ event.stopPropagation(); }, true);
    configButton.addEventListener('click', toggleStrobeSettings, true);
  }
  var topographyButton = grid.querySelector('.preset-config-btn[data-config="topography"]');
  if (topographyButton) {
    topographyButton.addEventListener('pointerdown', function(event){ event.stopPropagation(); }, true);
    topographyButton.addEventListener('click', toggleSonicTopographySettings, true);
  }
  placePresetSettingsPanels();
  if (!grid._presetSettingsResizeBound) {
    grid._presetSettingsResizeBound = true;
    window.addEventListener('resize', placePresetSettingsPanels);
  }
  refreshPresetGrid();
}

function placeStrobeSettingsPanel(): void {
  placePresetSettingsPanel('strobe-settings', STROBE_PRESET_INDEX);
}

function placePresetSettingsPanels(): void {
  placePresetSettingsPanel('topography-settings', TOPOGRAPHY_PRESET_INDEX);
  placeStrobeSettingsPanel();
}

function placePresetSettingsPanel(panelId: string, presetIndex: number): void {
  var grid = document.getElementById('preset-grid');
  var panel = document.getElementById(panelId);
  if (!grid || !panel) return;
  var cards = Array.from(grid.querySelectorAll<HTMLElement>('.preset-card'));
  var cardIndex = cards.findIndex(function(card){ return Number(card.dataset.preset) === presetIndex; });
  if (cardIndex < 0) return;
  var columns = window.matchMedia && window.matchMedia('(max-width: 520px)').matches ? 1 : 2;
  var rowEnd = Math.min(cards.length - 1, cardIndex + columns - (cardIndex % columns) - 1);
  grid.insertBefore(panel, cards[rowEnd].nextSibling);
}

function refreshPresetGrid(): void {
  document.querySelectorAll<HTMLElement>('.preset-card').forEach(function(el) {
    el.classList.toggle('active', Number(el.dataset.preset) === fx.preset);
  });
}
