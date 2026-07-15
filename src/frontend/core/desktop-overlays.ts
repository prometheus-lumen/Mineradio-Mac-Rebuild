var desktopOverlayPushState = {
  lyricsAt: 0,
  wallpaperAt: 0,
  touchBarAt: 0,
  lastLyricsKey: '',
  lastLyricsBeatKey: '',
  lastWallpaperKey: '',
  lastTouchBarKey: ''
};
var desktopOverlayIpcState: DesktopOverlayIpcState = {
  touchBar: { inFlight:false, pending:null, sent:0, completed:0, coalesced:0 },
  lyrics: { inFlight:false, pending:null, sent:0, completed:0, coalesced:0 },
  wallpaper: { inFlight:false, pending:null, sent:0, completed:0, coalesced:0 }
};
window.__mineradioDesktopIpc = desktopOverlayIpcState;
function queueDesktopOverlayIpc(
  channel: DesktopOverlayChannel,
  payload: DesktopOverlayPayload,
  send: (payload: DesktopOverlayPayload) => unknown,
  prepare: ((payload: DesktopOverlayPayload) => void) | null,
  errorLabel: string
): void {
  var state = desktopOverlayIpcState[channel];
  if (!state) return;
  if (state.inFlight) {
    if (channel === 'lyrics' && state.pending && state.pending.beatMap && !payload.beatMap && state.pending.beatMapKey === payload.beatMapKey) {
      payload.beatMap = state.pending.beatMap;
    }
    state.pending = payload;
    state.coalesced++;
    return;
  }
  state.inFlight = true;
  state.sent++;
  try {
    if (prepare) prepare(payload);
  } catch (e) {
    state.inFlight = false;
    console.warn(errorLabel, e);
    return;
  }
  Promise.resolve()
    .then(function(){ return send(payload); })
    .catch(function(e){ console.warn(errorLabel, e); })
    .finally(function(){
      state.completed++;
      state.inFlight = false;
      var next = state.pending;
      state.pending = null;
      if (next) queueDesktopOverlayIpc(channel, next, send, prepare, errorLabel);
    });
}
function currentDesktopSongMeta(): DesktopSongMeta {
  var song = playQueue && currentIdx >= 0 ? playQueue[currentIdx] : null;
  song = song || currentLyricSong && currentLyricSong() || {};
  return {
    title: song.name || song.title || 'Mineradio',
    artist: String(song.artist || song.ar || song.author || ''),
    cover: (typeof songCoverSrc === 'function' && song) ? (songCoverSrc(song, 360) || song.cover || '') : (song.cover || '')
  };
}
function normalizeDesktopLyricText(text: unknown): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
function findLyricLineIndexAt(lines: LyricLine[], time: number, hintIndex: number): number {
  if (!Array.isArray(lines) || !lines.length) return -1;
  var target = (Number(time) || 0) + 0.05;
  var idx = isFinite(hintIndex) ? Math.floor(hintIndex) : -1;
  if (idx < 0) idx = 0;
  if (idx >= lines.length) idx = lines.length - 1;
  while (idx + 1 < lines.length && lines[idx + 1].t <= target) idx++;
  while (idx >= 0 && lines[idx].t > target) idx--;
  return idx >= 0 && lines[idx] && lines[idx].t <= target ? idx : -1;
}
var desktopLyricLookupState = { idx: -1 };
function currentDesktopLyricSnapshot(): DesktopLyricSnapshot {
  var t = audio && isFinite(audio.currentTime) ? Number(audio.currentTime) : 0;
  var lines = Array.isArray(lyricsLines) ? lyricsLines : [];
  if (playing && audio && lines.length) {
    var idx = findLyricLineIndexAt(lines, t, desktopLyricLookupState.idx);
    desktopLyricLookupState.idx = idx;
    if (idx >= 0) {
      var curLine = lines[idx] || { t:t, text:'' };
      var nextLine = lines[idx + 1];
      var nextT = nextLine && nextLine.t > curLine.t ? nextLine.t : Math.min((audio && audio.duration) || t + 4, curLine.t + (curLine.duration || 4.8));
      var span = Math.max(0.75, nextT - curLine.t);
      return {
        text: normalizeDesktopLyricText(curLine.text || currentLyricFallbackText()),
        progress: getLyricLineProgress(curLine, nextLine, t),
        progressSpan: span
      };
    }
    var introText = normalizeDesktopLyricText(currentLyricFallbackText());
    if (introText) {
      var firstLine = lines[0];
      var introEnd = firstLine && firstLine.t > 0 ? firstLine.t : Math.min((audio && audio.duration) || 4.8, 4.8);
      return {
        text: introText,
        progress: getLyricLineProgress({ t:0, text:introText, duration:Math.max(0.8, introEnd), charCount:Math.max(1, introText.length), fallback:true }, null, t),
        progressSpan: Math.max(0.8, introEnd)
      };
    }
  }
  if (stageLyrics && stageLyrics.currentText) {
    return {
      text: normalizeDesktopLyricText(stageLyrics.currentText),
      progress: stageLyrics.current && stageLyrics.current.userData ? clampRange(Number(stageLyrics.current.userData.lastLyricProgress) || 0, 0, 1) : 0,
      progressSpan: 4.8
    };
  }
  return { text: normalizeDesktopLyricText(currentDesktopSongMeta().title || 'Mineradio'), progress: 0, progressSpan: 4.8 };
}
function desktopOverlayColorValue(value: unknown, fallback: string): string {
  var raw = String(value || '').trim();
  fallback = String(fallback || '#d6f8ff').trim();
  if (/^#[0-9a-f]{3}$/i.test(raw) || /^#[0-9a-f]{6}$/i.test(raw)) return normalizeHexColor(raw, fallback);
  if (/^rgba?\(/i.test(raw) || /^hsla?\(/i.test(raw)) return raw;
  return normalizeHexColor(raw, fallback);
}
function desktopOverlayColors(): Record<string, string> {
  var pal = stageLyrics && stageLyrics.palette || {};
  return {
    primary: desktopOverlayColorValue(pal.primary || fx.lyricColor || '#d6f8ff', '#d6f8ff'),
    secondary: desktopOverlayColorValue(pal.secondary || fx.visualTintColor || '#9cffdf', '#9cffdf'),
    highlight: desktopOverlayColorValue(pal.highlight || fx.lyricHighlightColor || '#fff0b8', '#fff0b8'),
    glow: desktopOverlayColorValue(pal.glowColor || pal.secondary || pal.primary || fx.lyricGlowColor || '#9cffdf', '#9cffdf')
  };
}
function desktopLyricsMotionPayload(): DesktopOverlayPayload {
  return {
    lyricGlow: !!fx.lyricGlow,
    lyricGlowBeat: !!fx.lyricGlowBeat,
    lyricGlowStrength: fx.lyricGlow ? clampRange(Number(fx.lyricGlowStrength) || 0, 0, 0.85) : 0,
    highBloom: stageLyrics && isFinite(stageLyrics.highBloom || 0) ? clampRange(stageLyrics.highBloom || 0, 0, 1.45) : 0,
    beatGlow: stageLyrics && isFinite(stageLyrics.beatGlow || 0) ? clampRange(stageLyrics.beatGlow || 0, 0, 1.7) : 0,
    beatPulse: isFinite(beatPulse) ? clampRange(beatPulse, 0, 1.4) : 0,
    bass: isFinite(bass) ? clampRange(bass, 0, 1.2) : 0
  };
}
function desktopLyricsPlaybackPayload(): DesktopOverlayPayload {
  var time = audio && isFinite(audio.currentTime) ? Number(audio.currentTime) : 0;
  var duration = audio && isFinite(audio.duration) ? Number(audio.duration) : 0;
  var rate = audio && isFinite(audio.playbackRate) && audio.playbackRate > 0 ? Number(audio.playbackRate) : 1;
  return {
    time: Math.max(0, time),
    duration: Math.max(0, duration),
    rate: clampRange(rate, 0.25, 4)
  };
}
function desktopLyricsActiveBeatMap(): { source: string; map: BeatMap | null } {
  var useDj = !!(djMode && djMode.active && currentDjBeatMap);
  return {
    source: useDj ? 'dj' : 'mr',
    map: useDj ? currentDjBeatMap : currentBeatMap
  };
}
function desktopLyricsBeatMapPayload(force: boolean): DesktopOverlayPayload {
  var selected = desktopLyricsActiveBeatMap();
  var map = selected && selected.map;
  var source = selected && selected.source || 'mr';
  var cameraCount = map ? ((map.cameraBeats && map.cameraBeats.length) || (map.beats && map.beats.length) || (map.kicks && map.kicks.length) || 0) : 0;
  var pulseCount = map ? ((map.pulseBeats && map.pulseBeats.length) || (map.kicks && map.kicks.length) || 0) : 0;
  var duration = map && isFinite(map.duration || 0) ? Number(map.duration) : 0;
  var partialUntil = map && isFinite(map.partialUntilSec || 0) ? Number(map.partialUntilSec) : 0;
  var key = map
    ? [source, map.analyzedAt || 0, cameraCount, pulseCount, Math.round(duration * 10), Math.round(partialUntil * 10), map.tempoSource || 'local'].join('|')
    : 'none';
  var shouldSendMap = !!force || key !== desktopOverlayPushState.lastLyricsBeatKey;
  desktopOverlayPushState.lastLyricsBeatKey = key;
  var payload: DesktopOverlayPayload = { beatMapKey: key };
  if (shouldSendMap) payload.beatMap = map ? packLocalBeatMap(map) : null;
  return payload;
}
function notifyDesktopLyricsBeatMapReady(): void {
  try {
    if (fx && fx.desktopLyrics) pushDesktopLyricsState(true);
  } catch (e) {}
}
function desktopLyricsPushInterval(): number {
  var fps = normalizeDesktopLyricsFps(fx && fx.desktopLyricsFps);
  if (!fps) return 8;
  return Math.max(8, Math.min(42, 1000 / fps));
}
function desktopLyricsPayload(forceBeatMap: boolean): DesktopOverlayPayload {
  var meta = currentDesktopSongMeta();
  var lyric = currentDesktopLyricSnapshot();
  var beatPayload = desktopLyricsBeatMapPayload(!!forceBeatMap);
  var payload: DesktopOverlayPayload = {
    enabled: !!fx.desktopLyrics && !isDevelopmentLockedFx('desktopLyrics'),
    text: lyric.text,
    progress: lyric.progress,
    progressSpan: lyric.progressSpan,
    title: meta.title,
    artist: meta.artist,
    playing: !!playing,
    size: clampRange(Number(fx.desktopLyricsSize) || fxDefaults.desktopLyricsSize, 0.72, 1.55),
    opacity: clampRange(fx.desktopLyricsOpacity == null ? fxDefaults.desktopLyricsOpacity : Number(fx.desktopLyricsOpacity), 0.28, 1),
    y: clampRange(fx.desktopLyricsY == null ? fxDefaults.desktopLyricsY : Number(fx.desktopLyricsY), 0.08, 0.92),
    clickThrough: isDevelopmentLockedFx('desktopLyricsClickThrough') ? true : fx.desktopLyricsClickThrough !== false,
    lyricGlowParticles: !!fx.lyricGlowParticles,
    cinema: fx.desktopLyricsCinema !== false,
    highlightFollow: fx.desktopLyricsHighlight === true,
    frameRate: normalizeDesktopLyricsFps(fx.desktopLyricsFps),
    fontFamily: lyricFontStackForKey(fx.lyricFont),
    fontWeight: lyricFontWeightValue(),
    letterSpacing: clampRange(Number(fx.lyricLetterSpacing) || 0, -0.04, 0.18),
    lineHeight: lyricLineHeightFactor(),
    lyricScale: clampRange(Number(fx.lyricScale) || 1, 0.35, 1.65),
    feather: lyricsHasNativeKaraoke ? 0.030 : 0.055,
    motion: desktopLyricsMotionPayload(),
    playback: desktopLyricsPlaybackPayload(),
    beatMapKey: beatPayload.beatMapKey,
    colors: desktopOverlayColors()
  };
  if (Object.prototype.hasOwnProperty.call(beatPayload, 'beatMap')) payload.beatMap = beatPayload.beatMap;
  return payload;
}
function wallpaperPayload(): DesktopOverlayPayload {
  var meta = currentDesktopSongMeta();
  return {
    enabled: !!fx.wallpaperMode && !isDevelopmentLockedFx('wallpaperMode'),
    title: meta.title,
    artist: meta.artist,
    cover: meta.cover,
    playing: !!playing,
    preset: fx.preset,
    opacity: clampRange(fx.wallpaperOpacity == null ? fxDefaults.wallpaperOpacity : Number(fx.wallpaperOpacity), 0.35, 1),
    colors: desktopOverlayColors()
  };
}
function touchBarLyricsPayload(): TouchBarLyricsPayload {
  var meta = currentDesktopSongMeta();
  var lyric = currentDesktopLyricSnapshot();
  var colors = desktopOverlayColors();
  var song = currentCoverSong();
  return {
    text: lyric.text,
    title: meta.title,
    playing: !!playing,
    liked: isSongLiked(song),
    progress: clampRange(Number(lyric.progress) || 0, 0, 1),
    progressSpan: lyric.progressSpan || 4.8,
    colors: {
      primary: colors.primary || '#d6f8ff',
      secondary: colors.secondary || '#9cffdf',
      highlight: colors.highlight || '#fff0b8'
    }
  };
}
