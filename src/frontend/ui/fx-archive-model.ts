function archiveNumber(raw: Record<string, unknown>, key: string, fallback: number, min: number, max: number): number {
  var value = raw && raw[key] != null ? Number(raw[key]) : fallback;
  if (!isFinite(value)) value = fallback;
  return clampRange(value, min, max);
}

function archiveMode(raw: Record<string, unknown>, key: string, pattern: RegExp, fallback: string): string {
  var value = String(raw && raw[key] != null ? raw[key] : fallback);
  return pattern.test(value) ? value : fallback;
}

function normalizeFxArchiveSnapshot(raw: unknown): FxArchiveSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  var record = raw as Record<string, unknown>;
  var savedPreset = clampRange(Number(record.preset) || 0, 0, presetMeta.length - 1);
  if (savedPreset === 3 && record.visualPresetSchema !== VISUAL_PRESET_SCHEMA) savedPreset = 5;
  return {
    visualPresetSchema: VISUAL_PRESET_SCHEMA,
    preset: savedPreset,
    intensity: archiveNumber(record, 'intensity', fxDefaults.intensity, 0.2, 1.6),
    cinemaShake: archiveNumber(record, 'cinemaShake', fxDefaults.cinemaShake, 0, 1.8),
    depth: archiveNumber(record, 'depth', fxDefaults.depth, 0.2, 1.8),
    coverResolution: normalizeCoverResolution(Number(record.coverResolution)),
    point: archiveNumber(record, 'point', fxDefaults.point, 0.5, 2.2),
    speed: archiveNumber(record, 'speed', fxDefaults.speed, 0.2, 2.5),
    twist: archiveNumber(record, 'twist', fxDefaults.twist, 0, 0.6),
    color: archiveNumber(record, 'color', fxDefaults.color, 0.5, 2.0),
    scatter: archiveNumber(record, 'scatter', fxDefaults.scatter, 0, 0.5),
    bgFade: archiveNumber(record, 'bgFade', fxDefaults.bgFade, 0, 1.2),
    bloomStrength: archiveNumber(record, 'bloomStrength', fxDefaults.bloomStrength, 0, 1.6),
    lyricGlowStrength: archiveNumber(record, 'lyricGlowStrength', fxDefaults.lyricGlowStrength, 0, 0.85),
    lyricScale: archiveNumber(record, 'lyricScale', fxDefaults.lyricScale, 0.35, 1.65),
    lyricOffsetX: archiveNumber(record, 'lyricOffsetX', fxDefaults.lyricOffsetX, -2.0, 2.0),
    lyricOffsetY: archiveNumber(record, 'lyricOffsetY', fxDefaults.lyricOffsetY, -1.2, 1.35),
    lyricOffsetZ: archiveNumber(record, 'lyricOffsetZ', fxDefaults.lyricOffsetZ, -1.6, 1.6),
    lyricTiltX: archiveNumber(record, 'lyricTiltX', fxDefaults.lyricTiltX, -42, 42),
    lyricTiltY: archiveNumber(record, 'lyricTiltY', fxDefaults.lyricTiltY, -42, 42),
    lyricCameraLock: !!record.lyricCameraLock,
    lyricColorMode: record.lyricColorMode === 'custom' ? 'custom' : 'auto',
    lyricColor: normalizeHexColor(record.lyricColor || fxDefaults.lyricColor),
    lyricHighlightMode: record.lyricHighlightMode === 'custom' ? 'custom' : 'auto',
    lyricHighlightColor: normalizeHexColor(record.lyricHighlightColor || fxDefaults.lyricHighlightColor),
    lyricGlowLinked: record.lyricGlowLinked !== false,
    lyricGlowColor: normalizeHexColor(record.lyricGlowColor || fxDefaults.lyricGlowColor),
    lyricFont: normalizeLyricFontKey(record.lyricFont),
    lyricLetterSpacing: archiveNumber(record, 'lyricLetterSpacing', fxDefaults.lyricLetterSpacing, -0.04, 0.18),
    lyricLineHeight: archiveNumber(record, 'lyricLineHeight', fxDefaults.lyricLineHeight, 0.86, 1.35),
    lyricWeight: archiveNumber(record, 'lyricWeight', fxDefaults.lyricWeight, 500, 900),
    lyricFlowMode: normalizeLyricFlowMode(record.lyricFlowMode || fxDefaults.lyricFlowMode),
    visualTintMode: record.visualTintMode === 'custom' ? 'custom' : 'auto',
    visualTintColor: normalizeHexColor(record.visualTintColor || fxDefaults.visualTintColor),
    uiAccentColor: normalizeHexColor(record.uiAccentColor || fxDefaults.uiAccentColor, fxDefaults.uiAccentColor),
    homeAccentColor: normalizeHexColor(record.homeAccentColor || fxDefaults.homeAccentColor, fxDefaults.homeAccentColor),
    homeIconColor: normalizeHexColor(record.homeIconColor || fxDefaults.homeIconColor, fxDefaults.homeIconColor),
    visualIconColor: normalizeHexColor(record.visualIconColor || fxDefaults.visualIconColor, fxDefaults.visualIconColor),
    backgroundColorMode: record.backgroundColorMode === 'custom' || record.backgroundColorCustom ? 'custom' : 'cover',
    backgroundColor: normalizeHexColor(record.backgroundColor || fxDefaults.backgroundColor, fxDefaults.backgroundColor),
    backgroundOpacity: archiveNumber(record, 'backgroundOpacity', fxDefaults.backgroundOpacity, 0, 1),
    controlGlassChromaticOffset: archiveNumber(record, 'controlGlassChromaticOffset', fxDefaults.controlGlassChromaticOffset, 0, 140),
    backgroundColorCustom: record.backgroundColorMode === 'custom' || !!record.backgroundColorCustom,
    strobeCustomBackground: record.strobeCustomBackground === true,
    strobeCustomBackgroundOpacity: archiveNumber(record, 'strobeCustomBackgroundOpacity', fxDefaults.strobeCustomBackgroundOpacity, 0, 1),
    floatLayer: !!record.floatLayer,
    cinema: record.cinema !== false,
    edge: !!record.edge,
    aiDepth: !!record.aiDepth,
    bloom: !!record.bloom,
    lyricGlow: record.lyricGlow !== false,
    lyricGlowBeat: record.lyricGlowBeat !== false,
    lyricGlowParticles: !!record.lyricGlowParticles,
    desktopLyrics: !!record.desktopLyrics,
    desktopLyricsSize: archiveNumber(record, 'desktopLyricsSize', fxDefaults.desktopLyricsSize, 0.72, 1.55),
    desktopLyricsOpacity: archiveNumber(record, 'desktopLyricsOpacity', fxDefaults.desktopLyricsOpacity, 0.28, 1),
    desktopLyricsY: archiveNumber(record, 'desktopLyricsY', fxDefaults.desktopLyricsY, 0.08, 0.92),
    desktopLyricsClickThrough: record.desktopLyricsClickThrough === true,
    desktopLyricsCinema: record.desktopLyricsCinema !== false,
    desktopLyricsHighlight: record.desktopLyricsHighlight === true,
    desktopLyricsFps: normalizeDesktopLyricsFps(Object.prototype.hasOwnProperty.call(record, 'desktopLyricsFps') ? record.desktopLyricsFps : fxDefaults.desktopLyricsFps),
    performanceBackground: normalizePerformanceBackgroundMode(record.performanceBackground, record.liveBackgroundKeep === true),
    performanceQuality: normalizePerformanceQuality(record.performanceQuality),
    liveBackgroundKeep: normalizePerformanceBackgroundMode(record.performanceBackground, record.liveBackgroundKeep === true) === 'keep',
    particleLyrics: record.particleLyrics !== false,
    backCover: !!record.backCover,
    shelf: archiveMode(record, 'shelf', /^(off|side|stage)$/, fxDefaults.shelf),
    shelfCameraMode: archiveMode(record, 'shelfCameraMode', /^(dynamic|static)$/, fxDefaults.shelfCameraMode),
    shelfPresence: archiveMode(record, 'shelfPresence', /^(auto|always)$/, fxDefaults.shelfPresence),
    shelfShowPodcasts: record.shelfShowPodcasts !== false,
    shelfMergeCollections: record.shelfMergeCollections === true,
    shelfSize: archiveNumber(record, 'shelfSize', fxDefaults.shelfSize, 0.65, 1.45),
    shelfOffsetX: archiveNumber(record, 'shelfOffsetX', fxDefaults.shelfOffsetX, -1.2, 1.2),
    shelfOffsetY: archiveNumber(record, 'shelfOffsetY', fxDefaults.shelfOffsetY, -0.9, 0.9),
    shelfOffsetZ: archiveNumber(record, 'shelfOffsetZ', fxDefaults.shelfOffsetZ, -0.9, 0.9),
    shelfAngleY: archiveNumber(record, 'shelfAngleY', fxDefaults.shelfAngleY, -30, 30),
    shelfAngleYManual: record.shelfAngleYManual === true,
    shelfOpacity: archiveNumber(record, 'shelfOpacity', fxDefaults.shelfOpacity, 0.25, 1),
    shelfBgOpacity: archiveNumber(record, 'shelfBgOpacity', fxDefaults.shelfBgOpacity, 0.25, 0.98),
    shelfAccentColor: normalizeHexColor(record.shelfAccentColor || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor),
    cam: 'off'
  };
}

function readUserFxArchives(): UserFxArchiveSlot[] {
  var raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(USER_FX_ARCHIVE_STORE_KEY) || '[]') || [];
  } catch (e) {
    raw = [];
  }
  var rows: unknown[] = Array.isArray(raw) ? raw : [];
  return rows.map(function(slotValue: unknown, index: number): UserFxArchiveSlot {
    var slot = slotValue && typeof slotValue === 'object' ? slotValue as Record<string, unknown> : {};
    var snapshot = normalizeFxArchiveSnapshot(slot.snapshot);
    return {
      name: normalizeUserFxArchiveName(slot.name, index),
      createdAt: Number(slot.createdAt) || (snapshot ? (Number(slot.savedAt) || Date.now()) : 0),
      savedAt: snapshot ? (Number(slot.savedAt) || Date.now()) : 0,
      snapshot: snapshot
    };
  }).filter(function(slot: UserFxArchiveSlot): boolean {
    return !!(slot.snapshot || slot.savedAt || slot.createdAt);
  });
}

function saveUserFxArchives(): void {
  try {
    localStorage.setItem(USER_FX_ARCHIVE_STORE_KEY, JSON.stringify(userFxArchives));
  } catch (e) {
    showToast('用户存档保存失败，本地存储空间可能不足');
  }
}

function hasStoredUserFxArchives(): boolean {
  try {
    return localStorage.getItem(USER_FX_ARCHIVE_STORE_KEY) != null;
  } catch (e) {
    return true;
  }
}

function createPackagedDefaultUserFxArchiveSlot(): UserFxArchiveSlot {
  return {
    name: normalizeUserFxArchiveName(PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME, 0),
    createdAt: PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT,
    savedAt: PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT,
    snapshot: normalizeFxArchiveSnapshot(clonePackagedDefaultFxSnapshot())
  };
}

function captureFxArchiveSnapshot(): FxArchiveSnapshot | null {
  return normalizeFxArchiveSnapshot(Object.assign({ visualPresetSchema: VISUAL_PRESET_SCHEMA }, fx));
}

function applyFxArchiveSnapshot(snapshot: unknown): boolean {
  var data = normalizeFxArchiveSnapshot(snapshot);
  if (!data) return false;
  var targetPreset = data.preset;
  var settings = Object.assign({}, data) as Record<string, unknown>;
  delete settings.visualPresetSchema;
  delete settings.preset;
  Object.assign(fx, settings);
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
