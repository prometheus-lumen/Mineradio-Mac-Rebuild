function buildPresetGrid(): void {
  var grid = document.querySelector<PresetGridElement>('#preset-grid');
  if (!grid) return;
  var strobeSettings = document.getElementById('strobe-settings');
  // buildPresetGrid may run more than once; detach the persistent settings node
  // before replacing the generated cards so its controls and listeners survive.
  if (strobeSettings && strobeSettings.parentNode === grid) {
    grid.parentNode?.insertBefore(strobeSettings, grid.nextSibling);
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
    var config = i === STROBE_PRESET_INDEX
      ? '<button class="preset-config-btn" data-config="strobe" type="button" title="配置闪光灯" aria-label="配置闪光灯" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5"/></svg></button>'
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
  placeStrobeSettingsPanel();
  if (!grid._strobeSettingsResizeBound) {
    grid._strobeSettingsResizeBound = true;
    window.addEventListener('resize', placeStrobeSettingsPanel);
  }
  refreshPresetGrid();
}

function placeStrobeSettingsPanel(): void {
  var grid = document.getElementById('preset-grid');
  var panel = document.getElementById('strobe-settings');
  if (!grid || !panel) return;
  var cards = Array.from(grid.querySelectorAll<HTMLElement>('.preset-card'));
  var strobeIndex = cards.findIndex(function(card){ return Number(card.dataset.preset) === STROBE_PRESET_INDEX; });
  if (strobeIndex < 0) return;
  var columns = window.matchMedia && window.matchMedia('(max-width: 520px)').matches ? 1 : 2;
  var rowEnd = Math.min(cards.length - 1, strobeIndex + columns - (strobeIndex % columns) - 1);
  grid.insertBefore(panel, cards[rowEnd].nextSibling);
}

function refreshPresetGrid(): void {
  document.querySelectorAll<HTMLElement>('.preset-card').forEach(function(el) {
    el.classList.toggle('active', Number(el.dataset.preset) === fx.preset);
  });
}
