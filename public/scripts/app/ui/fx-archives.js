'use strict';

// Mineradio classic module: ui/fx-archives.
function defaultUserFxArchiveName(index) {
  return '存档 ' + (index + 1);
}

function normalizeUserFxArchiveName(name, index) {
  name = String(name || '').replace(/\s+/g, ' ').trim();
  if (!name) name = defaultUserFxArchiveName(index);
  return name.slice(0, 18);
}

function archiveNumber(raw, key, fallback, min, max) {
  var value = raw && raw[key] != null ? Number(raw[key]) : fallback;
  if (!isFinite(value)) value = fallback;
  return clampRange(value, min, max);
}

function archiveMode(raw, key, pattern, fallback) {
  var value = String(raw && raw[key] != null ? raw[key] : fallback);
  return pattern.test(value) ? value : fallback;
}

function normalizeFxArchiveSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var savedPreset = clampRange(Number(raw.preset) || 0, 0, presetMeta.length - 1);
  if (savedPreset === 3 && raw.visualPresetSchema !== VISUAL_PRESET_SCHEMA) savedPreset = 5;
  return {
    visualPresetSchema: VISUAL_PRESET_SCHEMA,
    preset: savedPreset,
    intensity: archiveNumber(raw, 'intensity', fxDefaults.intensity, 0.2, 1.6),
    cinemaShake: archiveNumber(raw, 'cinemaShake', fxDefaults.cinemaShake, 0, 1.8),
    depth: archiveNumber(raw, 'depth', fxDefaults.depth, 0.2, 1.8),
    coverResolution: normalizeCoverResolution(raw.coverResolution),
    point: archiveNumber(raw, 'point', fxDefaults.point, 0.5, 2.2),
    speed: archiveNumber(raw, 'speed', fxDefaults.speed, 0.2, 2.5),
    twist: archiveNumber(raw, 'twist', fxDefaults.twist, 0, 0.6),
    color: archiveNumber(raw, 'color', fxDefaults.color, 0.5, 2.0),
    scatter: archiveNumber(raw, 'scatter', fxDefaults.scatter, 0, 0.5),
    bgFade: archiveNumber(raw, 'bgFade', fxDefaults.bgFade, 0, 1.2),
    bloomStrength: archiveNumber(raw, 'bloomStrength', fxDefaults.bloomStrength, 0, 1.6),
    lyricGlowStrength: archiveNumber(raw, 'lyricGlowStrength', fxDefaults.lyricGlowStrength, 0, 0.85),
    lyricScale: archiveNumber(raw, 'lyricScale', fxDefaults.lyricScale, 0.35, 1.65),
    lyricOffsetX: archiveNumber(raw, 'lyricOffsetX', fxDefaults.lyricOffsetX, -2.0, 2.0),
    lyricOffsetY: archiveNumber(raw, 'lyricOffsetY', fxDefaults.lyricOffsetY, -1.2, 1.35),
    lyricOffsetZ: archiveNumber(raw, 'lyricOffsetZ', fxDefaults.lyricOffsetZ, -1.6, 1.6),
    lyricTiltX: archiveNumber(raw, 'lyricTiltX', fxDefaults.lyricTiltX, -42, 42),
    lyricTiltY: archiveNumber(raw, 'lyricTiltY', fxDefaults.lyricTiltY, -42, 42),
    lyricCameraLock: !!raw.lyricCameraLock,
    lyricColorMode: raw.lyricColorMode === 'custom' ? 'custom' : 'auto',
    lyricColor: normalizeHexColor(raw.lyricColor || fxDefaults.lyricColor),
    lyricHighlightMode: raw.lyricHighlightMode === 'custom' ? 'custom' : 'auto',
    lyricHighlightColor: normalizeHexColor(raw.lyricHighlightColor || fxDefaults.lyricHighlightColor),
    lyricGlowLinked: raw.lyricGlowLinked !== false,
    lyricGlowColor: normalizeHexColor(raw.lyricGlowColor || fxDefaults.lyricGlowColor),
    lyricFont: normalizeLyricFontKey(raw.lyricFont),
    lyricLetterSpacing: archiveNumber(raw, 'lyricLetterSpacing', fxDefaults.lyricLetterSpacing, -0.04, 0.18),
    lyricLineHeight: archiveNumber(raw, 'lyricLineHeight', fxDefaults.lyricLineHeight, 0.86, 1.35),
    lyricWeight: archiveNumber(raw, 'lyricWeight', fxDefaults.lyricWeight, 500, 900),
    lyricFlowMode: normalizeLyricFlowMode(raw.lyricFlowMode || fxDefaults.lyricFlowMode),
    visualTintMode: raw.visualTintMode === 'custom' ? 'custom' : 'auto',
    visualTintColor: normalizeHexColor(raw.visualTintColor || fxDefaults.visualTintColor),
    uiAccentColor: normalizeHexColor(raw.uiAccentColor || fxDefaults.uiAccentColor, fxDefaults.uiAccentColor),
    homeAccentColor: normalizeHexColor(raw.homeAccentColor || fxDefaults.homeAccentColor, fxDefaults.homeAccentColor),
    homeIconColor: normalizeHexColor(raw.homeIconColor || fxDefaults.homeIconColor, fxDefaults.homeIconColor),
    visualIconColor: normalizeHexColor(raw.visualIconColor || fxDefaults.visualIconColor, fxDefaults.visualIconColor),
    backgroundColorMode: raw.backgroundColorMode === 'custom' || raw.backgroundColorCustom ? 'custom' : 'cover',
    backgroundColor: normalizeHexColor(raw.backgroundColor || fxDefaults.backgroundColor, fxDefaults.backgroundColor),
    backgroundOpacity: archiveNumber(raw, 'backgroundOpacity', fxDefaults.backgroundOpacity, 0, 1),
    controlGlassChromaticOffset: archiveNumber(raw, 'controlGlassChromaticOffset', fxDefaults.controlGlassChromaticOffset, 0, 140),
    backgroundColorCustom: raw.backgroundColorMode === 'custom' || !!raw.backgroundColorCustom,
    strobeCustomBackground: raw.strobeCustomBackground === true,
    strobeCustomBackgroundOpacity: archiveNumber(raw, 'strobeCustomBackgroundOpacity', fxDefaults.strobeCustomBackgroundOpacity, 0, 1),
    floatLayer: !!raw.floatLayer,
    cinema: raw.cinema !== false,
    edge: !!raw.edge,
    aiDepth: !!raw.aiDepth,
    bloom: !!raw.bloom,
    lyricGlow: raw.lyricGlow !== false,
    lyricGlowBeat: raw.lyricGlowBeat !== false,
    lyricGlowParticles: !!raw.lyricGlowParticles,
    desktopLyrics: !!raw.desktopLyrics,
    desktopLyricsSize: archiveNumber(raw, 'desktopLyricsSize', fxDefaults.desktopLyricsSize, 0.72, 1.55),
    desktopLyricsOpacity: archiveNumber(raw, 'desktopLyricsOpacity', fxDefaults.desktopLyricsOpacity, 0.28, 1),
    desktopLyricsY: archiveNumber(raw, 'desktopLyricsY', fxDefaults.desktopLyricsY, 0.08, 0.92),
    desktopLyricsClickThrough: raw.desktopLyricsClickThrough === true,
    desktopLyricsCinema: raw.desktopLyricsCinema !== false,
    desktopLyricsHighlight: raw.desktopLyricsHighlight === true,
    desktopLyricsFps: normalizeDesktopLyricsFps(Object.prototype.hasOwnProperty.call(raw, 'desktopLyricsFps') ? raw.desktopLyricsFps : fxDefaults.desktopLyricsFps),
    performanceBackground: normalizePerformanceBackgroundMode(raw.performanceBackground, raw.liveBackgroundKeep === true),
    performanceQuality: normalizePerformanceQuality(raw.performanceQuality),
    liveBackgroundKeep: normalizePerformanceBackgroundMode(raw.performanceBackground, raw.liveBackgroundKeep === true) === 'keep',
    particleLyrics: raw.particleLyrics !== false,
    backCover: !!raw.backCover,
    shelf: archiveMode(raw, 'shelf', /^(off|side|stage)$/, fxDefaults.shelf),
    shelfCameraMode: archiveMode(raw, 'shelfCameraMode', /^(dynamic|static)$/, fxDefaults.shelfCameraMode),
    shelfPresence: archiveMode(raw, 'shelfPresence', /^(auto|always)$/, fxDefaults.shelfPresence),
    shelfShowPodcasts: raw.shelfShowPodcasts !== false,
    shelfMergeCollections: raw.shelfMergeCollections === true,
    shelfSize: archiveNumber(raw, 'shelfSize', fxDefaults.shelfSize, 0.65, 1.45),
    shelfOffsetX: archiveNumber(raw, 'shelfOffsetX', fxDefaults.shelfOffsetX, -1.2, 1.2),
    shelfOffsetY: archiveNumber(raw, 'shelfOffsetY', fxDefaults.shelfOffsetY, -0.9, 0.9),
    shelfOffsetZ: archiveNumber(raw, 'shelfOffsetZ', fxDefaults.shelfOffsetZ, -0.9, 0.9),
    shelfAngleY: archiveNumber(raw, 'shelfAngleY', fxDefaults.shelfAngleY, -30, 30),
    shelfAngleYManual: raw.shelfAngleYManual === true,
    shelfOpacity: archiveNumber(raw, 'shelfOpacity', fxDefaults.shelfOpacity, 0.25, 1),
    shelfBgOpacity: archiveNumber(raw, 'shelfBgOpacity', fxDefaults.shelfBgOpacity, 0.25, 0.98),
    shelfAccentColor: normalizeHexColor(raw.shelfAccentColor || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor),
    cam: 'off'
  };
}

function readUserFxArchives() {
  var raw = [];
  try {
    raw = JSON.parse(localStorage.getItem(USER_FX_ARCHIVE_STORE_KEY) || '[]') || [];
  } catch (e) {
    raw = [];
  }
  if (!Array.isArray(raw)) raw = [];
  return raw.map(function(slot, index){
    slot = slot && typeof slot === 'object' ? slot : {};
    var snapshot = normalizeFxArchiveSnapshot(slot.snapshot);
    return {
      name: normalizeUserFxArchiveName(slot.name, index),
      createdAt: Number(slot.createdAt) || (snapshot ? (Number(slot.savedAt) || Date.now()) : 0),
      savedAt: snapshot ? (Number(slot.savedAt) || Date.now()) : 0,
      snapshot: snapshot
    };
  }).filter(function(slot){
    return !!(slot.snapshot || slot.savedAt || slot.createdAt);
  });
}

function saveUserFxArchives() {
  try {
    localStorage.setItem(USER_FX_ARCHIVE_STORE_KEY, JSON.stringify(userFxArchives));
  } catch (e) {
    showToast('用户存档保存失败，本地存储空间可能不足');
  }
}

function hasStoredUserFxArchives() {
  try {
    return localStorage.getItem(USER_FX_ARCHIVE_STORE_KEY) != null;
  } catch (e) {
    return true;
  }
}

function createPackagedDefaultUserFxArchiveSlot() {
  return {
    name: normalizeUserFxArchiveName(PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME, 0),
    createdAt: PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT,
    savedAt: PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT,
    snapshot: normalizeFxArchiveSnapshot(clonePackagedDefaultFxSnapshot())
  };
}

function captureFxArchiveSnapshot() {
  return normalizeFxArchiveSnapshot(Object.assign({ visualPresetSchema: VISUAL_PRESET_SCHEMA }, fx));
}

function applyFxArchiveSnapshot(snapshot) {
  var data = normalizeFxArchiveSnapshot(snapshot);
  if (!data) return false;
  var targetPreset = data.preset;
  Object.keys(data).forEach(function(key){
    if (key === 'visualPresetSchema' || key === 'preset') return;
    fx[key] = data[key];
  });
  normalizeDevelopmentLockedFxState();
  setPreset(targetPreset, { silent: true, preserveCamera: false, skipTransition: false, noSave: true, commitPlaybackPreset: true });
  applyCoverParticleResolution(fx.coverResolution, { reload: true });
  if (fx.floatLayer) createFloatLayer(); else destroyFloatLayer();
  setParticleLyricsSilently(fx.particleLyrics);
  if (fx.backCover) createBackCoverLayer(); else destroyBackCoverLayer();
  if (fx.aiDepth) {
    aiDepthFailUntil = 0;
    queueAIDepthForCurrentCover(true);
  }
  setShelfMode(fx.shelf);
  if (shelfManager && shelfManager.rebuild) shelfManager.rebuild(true);
  if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  setCamMode(fx.cam);
  updateFxInputs();
  applySavedLyricPaletteState();
  refreshCurrentLyricStyle();
  applyDesktopLyricsState(true);
  applyWallpaperModeState(true);
  updateRenderPowerClasses();
  applyRendererPowerMode();
  saveLyricLayout();
  return true;
}

function renderUserFxArchives() {
  var grid = document.getElementById('user-archive-grid');
  if (!grid) return;
  grid.innerHTML = userFxArchives.map(function(slot, index){
    var hasSave = !!slot.snapshot;
    var editing = userFxArchiveEditing === index;
    var nameHtml = editing
      ? '<input class="user-archive-input" id="user-archive-input-' + index + '" type="text" maxlength="18" value="' + escHtml(slot.name) + '" onkeydown="handleUserFxArchiveRenameKey(event,' + index + ')">'
      : '<div class="user-archive-name" title="' + escHtml(slot.name) + '">' + escHtml(slot.name) + '</div>';
    var actionsHtml = editing
      ? '<button type="button" onclick="commitUserFxArchiveRename(' + index + ')">确定</button>' +
        '<button type="button" onclick="cancelUserFxArchiveRename()">取消</button>'
      : '<button type="button" onclick="applyUserFxArchive(' + index + ')"' + (hasSave ? '' : ' disabled') + '>应用</button>' +
        '<button type="button" onclick="saveUserFxArchive(' + index + ')">保存</button>' +
        '<button type="button" onclick="renameUserFxArchive(' + index + ')">命名</button>';
    return '<div class="user-archive-slot' + (hasSave ? ' has-save' : '') + '" data-slot="' + index + '">' +
      nameHtml +
      '<div class="user-archive-meta">' + formatUserArchiveTime(slot.savedAt) + '</div>' +
      '<div class="user-archive-actions">' +
        actionsHtml +
      '</div>' +
    '</div>';
  }).join('');
  if (userFxArchiveEditing >= 0) {
    setTimeout(function(){
      var input = document.getElementById('user-archive-input-' + userFxArchiveEditing);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
}

function saveUserFxArchive(index) {
  index = clampRange(Number(index) || 0, 0, Math.max(0, userFxArchives.length - 1));
  userFxArchives[index].snapshot = captureFxArchiveSnapshot();
  userFxArchives[index].savedAt = Date.now();
  userFxArchives[index].name = normalizeUserFxArchiveName(userFxArchives[index].name, index);
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已保存到 ' + userFxArchives[index].name);
}

function applyUserFxArchive(index) {
  index = clampRange(Number(index) || 0, 0, Math.max(0, userFxArchives.length - 1));
  var slot = userFxArchives[index];
  if (!slot || !slot.snapshot) {
    showToast('这个用户存档还是空的');
    return;
  }
  if (applyFxArchiveSnapshot(slot.snapshot)) {
    showToast('已应用 ' + slot.name);
  }
}

function renameUserFxArchive(index) {
  index = clampRange(Number(index) || 0, 0, Math.max(0, userFxArchives.length - 1));
  userFxArchiveEditing = index;
  renderUserFxArchives();
}

function commitUserFxArchiveRename(index) {
  index = clampRange(Number(index) || 0, 0, Math.max(0, userFxArchives.length - 1));
  var input = document.getElementById('user-archive-input-' + index);
  userFxArchives[index].name = normalizeUserFxArchiveName(input && input.value, index);
  userFxArchiveEditing = -1;
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已命名为 ' + userFxArchives[index].name);
}

function cancelUserFxArchiveRename() {
  userFxArchiveEditing = -1;
  renderUserFxArchives();
}

function defaultUserFxArchiveName(index) {
  return '用户存档 ' + (Number(index) + 1);
}

function normalizeUserFxArchiveName(name, index) {
  name = String(name || '').replace(/\s+/g, ' ').trim();
  if (!name) name = defaultUserFxArchiveName(index);
  return name.slice(0, 28);
}

function userFxArchiveAt(index) {
  index = Number(index);
  if (!isFinite(index)) return null;
  index = Math.floor(index);
  return index >= 0 && index < userFxArchives.length ? userFxArchives[index] : null;
}

function renderUserFxArchives() {
  var grid = document.getElementById('user-archive-grid');
  if (!grid) return;
  var toolbar =
    '<div class="user-archive-toolbar">' +
      '<div class="user-archive-note">空白新建，保存当前视觉参数；支持拖拽 JSON 导入，也可以导出为文件备份。</div>' +
      '<div class="user-archive-tools">' +
        '<button class="fx-mini-btn ghost" type="button" onclick="createUserFxArchive()">新建</button>' +
        '<button class="fx-mini-btn ghost" type="button" onclick="importUserFxArchiveFromDialog()">导入</button>' +
      '</div>' +
    '</div>';
  var cards = userFxArchives.map(function(slot, index){
    var hasSave = !!slot.snapshot;
    var editing = userFxArchiveEditing === index;
    var nameHtml = editing
      ? '<input class="user-archive-input" id="user-archive-input-' + index + '" type="text" maxlength="28" value="' + escHtml(slot.name) + '" onkeydown="handleUserFxArchiveRenameKey(event,' + index + ')">'
      : '<div class="user-archive-name" title="' + escHtml(slot.name) + '">' + escHtml(slot.name) + '</div>';
    var actionsHtml = editing
      ? '<button type="button" onclick="commitUserFxArchiveRename(' + index + ')">确定</button>' +
        '<button type="button" onclick="cancelUserFxArchiveRename()">取消</button>'
      : '<button type="button" onclick="applyUserFxArchive(' + index + ')"' + (hasSave ? '' : ' disabled') + '>应用</button>' +
        '<button type="button" onclick="saveUserFxArchive(' + index + ')">保存</button>' +
        '<button type="button" onclick="renameUserFxArchive(' + index + ')">命名</button>' +
        '<button type="button" onclick="exportUserFxArchive(' + index + ')"' + (hasSave ? '' : ' disabled') + '>导出</button>' +
        '<button type="button" onclick="removeUserFxArchive(' + index + ')">删除</button>';
    return '<div class="user-archive-slot' + (hasSave ? ' has-save' : '') + '" data-slot="' + index + '">' +
      nameHtml +
      '<div class="user-archive-meta">' + (hasSave ? formatUserArchiveTime(slot.savedAt) : '空白存档，点击保存写入当前视觉') + '</div>' +
      '<div class="user-archive-actions">' + actionsHtml + '</div>' +
    '</div>';
  }).join('');
  var addCard = '<button class="user-archive-slot is-new" type="button" onclick="createUserFxArchive()"><strong>＋ 新建空白存档</strong><span class="user-archive-meta">可继续创建，不限制 4 个</span></button>';
  grid.innerHTML = toolbar + cards + addCard;
  bindUserFxArchiveDrop();
  if (userFxArchiveEditing >= 0) {
    setTimeout(function(){
      var input = document.getElementById('user-archive-input-' + userFxArchiveEditing);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
}

function createUserFxArchive() {
  var index = userFxArchives.length;
  userFxArchives.push({
    name: normalizeUserFxArchiveName('', index),
    createdAt: Date.now(),
    savedAt: 0,
    snapshot: null
  });
  userFxArchiveEditing = index;
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已新建空白用户存档');
}

function saveUserFxArchive(index) {
  var slot = userFxArchiveAt(index);
  if (!slot) return;
  slot.snapshot = captureFxArchiveSnapshot();
  slot.savedAt = Date.now();
  slot.createdAt = slot.createdAt || slot.savedAt;
  slot.name = normalizeUserFxArchiveName(slot.name, index);
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已保存到 ' + slot.name);
}

function applyUserFxArchive(index) {
  var slot = userFxArchiveAt(index);
  if (!slot || !slot.snapshot) {
    showToast('这个用户存档还是空白');
    return;
  }
  if (applyFxArchiveSnapshot(slot.snapshot)) showToast('已应用 ' + slot.name);
}

function renameUserFxArchive(index) {
  if (!userFxArchiveAt(index)) return;
  userFxArchiveEditing = Math.floor(Number(index) || 0);
  renderUserFxArchives();
}

function commitUserFxArchiveRename(index) {
  var slot = userFxArchiveAt(index);
  if (!slot) return;
  var input = document.getElementById('user-archive-input-' + index);
  slot.name = normalizeUserFxArchiveName(input && input.value, index);
  slot.createdAt = slot.createdAt || Date.now();
  userFxArchiveEditing = -1;
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已命名为 ' + slot.name);
}

function cancelUserFxArchiveRename() {
  userFxArchiveEditing = -1;
  renderUserFxArchives();
}

function removeUserFxArchive(index) {
  if (!userFxArchiveAt(index)) return;
  userFxArchives.splice(index, 1);
  userFxArchiveEditing = -1;
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已删除用户存档');
}

function userFxArchiveExportPayload(slot) {
  return {
    type: USER_FX_ARCHIVE_EXPORT_TYPE,
    schema: USER_FX_ARCHIVE_SCHEMA,
    exportedAt: Date.now(),
    name: slot.name,
    savedAt: slot.savedAt,
    snapshot: slot.snapshot
  };
}

function safeArchiveFileName(name) {
  return String(name || 'Mineradio 用户存档').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 48) + '.json';
}

function exportUserFxArchive(index) {
  var slot = userFxArchiveAt(index);
  if (!slot || !slot.snapshot) {
    showToast('空白存档不能导出');
    return;
  }
  var payload = userFxArchiveExportPayload(slot);
  var text = JSON.stringify(payload, null, 2);
  var api = getDesktopWindowApi && getDesktopWindowApi();
  if (api && typeof api.exportJsonFile === 'function') {
    api.exportJsonFile({ defaultName: safeArchiveFileName(slot.name), text: text }).then(function(res){
      if (res && res.ok) showToast('用户存档已导出');
      else if (!res || !res.canceled) showToast('用户存档导出失败');
    }).catch(function(){ showToast('用户存档导出失败'); });
    return;
  }
  var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = safeArchiveFileName(slot.name);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function normalizeImportedFxArchivePayload(payload, fileName) {
  if (!payload || typeof payload !== 'object') return null;
  var snapshot = payload.snapshot ? normalizeFxArchiveSnapshot(payload.snapshot) : normalizeFxArchiveSnapshot(payload);
  if (!snapshot) return null;
  var baseName = String(fileName || '').split(/[\\/]/).pop().replace(/\.json$/i, '');
  return {
    name: normalizeUserFxArchiveName(payload.name || baseName, userFxArchives.length),
    createdAt: Date.now(),
    savedAt: Number(payload.savedAt) || Date.now(),
    snapshot: snapshot
  };
}

function importUserFxArchiveText(text, fileName) {
  var payload = null;
  try { payload = JSON.parse(String(text || '')); } catch (e) {}
  var slot = normalizeImportedFxArchivePayload(payload, fileName);
  if (!slot) {
    showToast('导入失败，文件不是有效的用户存档');
    return false;
  }
  userFxArchives.push(slot);
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已导入 ' + slot.name);
  return true;
}

function importUserFxArchiveFromDialog() {
  var api = getDesktopWindowApi && getDesktopWindowApi();
  if (api && typeof api.importJsonFile === 'function') {
    api.importJsonFile().then(function(res){
      if (res && res.ok) importUserFxArchiveText(res.text, res.filePath || '用户存档.json');
      else if (!res || !res.canceled) showToast('导入失败');
    }).catch(function(){ showToast('导入失败'); });
    return;
  }
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(){
    var file = input.files && input.files[0];
    if (file) readUserFxArchiveImportFile(file);
  };
  input.click();
}

function readUserFxArchiveImportFile(file) {
  if (!file || !/\.json$/i.test(file.name || '')) {
    showToast('请导入 JSON 用户存档');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e){ importUserFxArchiveText(e.target && e.target.result, file.name); };
  reader.onerror = function(){ showToast('导入失败'); };
  reader.readAsText(file, 'utf-8');
}

function bindUserFxArchiveDrop() {
  var grid = document.getElementById('user-archive-grid');
  if (!grid || grid._archiveDropBound) return;
  grid._archiveDropBound = true;
  grid.addEventListener('dragover', function(e){
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    grid.classList.add('dragover');
  });
  grid.addEventListener('dragleave', function(e){
    if (!grid.contains(e.relatedTarget)) grid.classList.remove('dragover');
  });
  grid.addEventListener('drop', function(e){
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    grid.classList.remove('dragover');
    Array.prototype.forEach.call(e.dataTransfer.files, readUserFxArchiveImportFile);
  });
}

function __mineradioInitUiFxArchives45() {
  USER_FX_ARCHIVE_STORE_KEY = 'mineradio-user-fx-archives-v1';

  USER_FX_ARCHIVE_EXPORT_TYPE = 'mineradio-user-fx-archive';

  USER_FX_ARCHIVE_SCHEMA = 1;

  hadStoredUserFxArchives = hasStoredUserFxArchives();

  userFxArchives = readUserFxArchives();

  if (!hadStoredUserFxArchives) {
    userFxArchives = [createPackagedDefaultUserFxArchiveSlot()];
    saveUserFxArchives();
  }

  userFxArchiveEditing = -1;
}
