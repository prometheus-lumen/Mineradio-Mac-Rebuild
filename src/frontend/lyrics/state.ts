// Mineradio classic module: lyrics/lyric-state.
function constrainCurrentLyricToViewport(mesh: THREE.Object3D): void {
  if (!mesh || !camera || !stageLyrics.group || !mesh.userData || !mesh.userData.lyric) return;
  var data = mesh.userData.lyric;
  var halfW = Math.max(0.2, (data.textWorldW || data.worldW || 5.4) * 0.5);
  var halfH = Math.max(0.08, (data.textWorldH || data.worldH || 0.8) * 0.58);
  stageLyrics.group.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (var ix = -1; ix <= 1; ix += 2) {
    for (var iy = -1; iy <= 1; iy += 2) {
      lyricViewportCorner.set(ix * halfW, iy * halfH, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      if (!isFinite(lyricViewportCorner.x) || !isFinite(lyricViewportCorner.y)) return;
      minX = Math.min(minX, lyricViewportCorner.x);
      maxX = Math.max(maxX, lyricViewportCorner.x);
      minY = Math.min(minY, lyricViewportCorner.y);
      maxY = Math.max(maxY, lyricViewportCorner.y);
    }
  }
  var spanX = maxX - minX;
  var spanY = maxY - minY;
  var fit = Math.min(1, 1.84 / Math.max(0.001, spanX), 1.76 / Math.max(0.001, spanY));
  if (fit < 0.999) {
    mesh.scale.multiplyScalar(Math.max(0.82, fit));
    var centerX = (minX + maxX) * 0.5;
    var centerY = (minY + maxY) * 0.5;
    var appliedFit = Math.max(0.82, fit);
    minX = centerX - spanX * appliedFit * 0.5;
    maxX = centerX + spanX * appliedFit * 0.5;
    minY = centerY - spanY * appliedFit * 0.5;
    maxY = centerY + spanY * appliedFit * 0.5;
  }
  var correctX = minX < -0.92 ? (-0.92 - minX) : (maxX > 0.92 ? (0.92 - maxX) : 0);
  var correctY = minY < -0.88 ? (-0.88 - minY) : (maxY > 0.88 ? (0.88 - maxY) : 0);
  if (!correctX && !correctY) return;
  lyricViewportCenter.copy(mesh.position).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  lyricViewportBasisX.copy(mesh.position).add(lyricViewportOffsetX).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  lyricViewportBasisY.copy(mesh.position).add(lyricViewportOffsetY).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  var ax = lyricViewportBasisX.x - lyricViewportCenter.x;
  var ay = lyricViewportBasisX.y - lyricViewportCenter.y;
  var bx = lyricViewportBasisY.x - lyricViewportCenter.x;
  var by = lyricViewportBasisY.y - lyricViewportCenter.y;
  var det = ax * by - ay * bx;
  if (Math.abs(det) < 0.00001) return;
  var localX = (correctX * by - correctY * bx) / det;
  var localY = (ax * correctY - ay * correctX) / det;
  mesh.position.x += clampRange(localX, -0.72, 0.72);
  mesh.position.y += clampRange(localY, -0.72, 0.72);
}

function refreshCurrentLyricStyle(): void {
  if (!stageLyrics || !stageLyrics.currentText || !stageLyrics.current) return;
  var progress = stageLyrics.current.userData ? (stageLyrics.current.userData.lastLyricProgress || 0) : 0;
  showStageLine(stageLyrics.currentText, true);
  updateLyricMeshProgress(stageLyrics.current, progress);
  if (stageLyrics.current && stageLyrics.current.userData) stageLyrics.current.userData.age = 0.48;
}

function getLyricLineProgress(line: LyricLine | null | undefined, nextLine: LyricLine | null | undefined, now: number): number {
  if (!line) return 0;
  now += line.words && line.words.length ? 0.030 : 0.020;
  if (line.words && line.words.length && (line.charCount || 0) > 0) {
    var charCount = Math.max(1, line.charCount || line.text.length);
    var lastP = 0;
    for (var i = 0; i < line.words.length; i++) {
      var w = line.words[i];
      var ws = w.t;
      var we = w.t + Math.max(0.08, w.d || 0.24);
      if (now < ws) return lastP;
      var local = now >= we ? 1 : (now - ws) / Math.max(0.08, we - ws);
      local = Math.max(0, Math.min(1, local));
      var p = (w.c0 + (w.c1 - w.c0) * local) / charCount;
      lastP = Math.max(lastP, p);
      if (now < we) return lastP;
    }
    return 1;
  }
  var nextT = nextLine && nextLine.t > line.t ? nextLine.t : Math.min((audio && audio.duration) || now + 4, line.t + (line.duration || 4.8));
  var span = Math.max(0.75, nextT - line.t);
  var prog = Math.max(0, Math.min(1, (now - line.t) / span));
  return prog * prog * (3 - 2 * prog);
}

function currentLyricSong(): PlaylistSong | null {
  if (currentIdx >= 0 && playQueue[currentIdx]) return playQueue[currentIdx];
  return currentLocalSong || null;
}

function cloneLyricLine(line: LyricLine): LyricLine {
  var copy = Object.assign({}, line || {});
  if (line && Array.isArray(line.words)) copy.words = line.words.map(function(w){ return Object.assign({}, w); });
  return copy;
}

function cloneLyricLines(lines: LyricLine[]): LyricLine[] {
  return (Array.isArray(lines) ? lines : []).map(cloneLyricLine);
}

function setOriginalLyricsState(lines: LyricLine[], hasNativeKaraoke: boolean, timingSource: string): void {
  originalLyricsState = {
    lines: cloneLyricLines(lines || []),
    hasNativeKaraoke: !!hasNativeKaraoke,
    timingSource: timingSource || 'fallback'
  };
}

function applyLyricsState(lines: LyricLine[], hasNativeKaraoke: boolean, timingSource: string): void {
  lyricsHasNativeKaraoke = !!hasNativeKaraoke;
  lyricsTimingSource = timingSource || 'fallback';
  lyricsLines = cloneLyricLines(lines || []);
  if (!lyricsLines.length) lyricsLines = withLyricFallback([]);
  if (lyricsLines.length && lyricsLines[0].fallback) lyricsTimingSource = 'fallback';
  renderLyrics();
  updateCustomLyricControls();
}

// ============================================================
//  歌词
// ============================================================
async function fetchLyric(songOrId: PlaylistSong | string | number, token: number): Promise<void> {
  try {
    var song = (songOrId && typeof songOrId === 'object') ? songOrId : null;
    var provider = songProviderKey(song);
    var endpoint;
    if (provider === 'qq' && song) {
      var mid = song.mid || song.songmid || song.id || '';
      var qqId = song.qqId || (/^\d+$/.test(String(song.id || '')) ? song.id : '');
      endpoint = '/api/qq/lyric?mid=' + encodeURIComponent(mid) + '&id=' + encodeURIComponent(String(qqId));
    } else if (provider === 'kugou' && song) {
      var duration = Math.max(0, Number(song.duration) || 0);
      endpoint = '/api/kugou/lyric?hash=' + encodeURIComponent(song.hash || song.id || '') + '&duration=' + encodeURIComponent(duration);
    } else {
      var songId = song ? song.id : songOrId;
      endpoint = '/api/lyric?id=' + encodeURIComponent(String(songId ?? ''));
    }
    var r = await apiJson<LyricApiResponse>(endpoint);
    if (token !== trackSwitchToken) return;
    var nativeLines = parseYrcText(r.yrc || '');
    var lrcLines = parseLyricText(r.lyric || '');
    var hasNativeKaraoke = nativeLines.some(function(line){ return line.words && line.words.length; });
    var timingSource = hasNativeKaraoke ? 'yrc-word' : (nativeLines.length ? 'yrc-line' : (lrcLines.length ? 'lrc-line' : 'fallback'));
    var lines = withLyricFallback(nativeLines.length ? nativeLines : lrcLines);
    if (lines.length && lines[0].fallback) timingSource = 'fallback';
    setOriginalLyricsState(lines, hasNativeKaraoke, timingSource);
    applyPreferredLyricsForCurrent(true);
  } catch (e) {
    if (token !== trackSwitchToken) return;
    var fallbackLines = withLyricFallback([]);
    setOriginalLyricsState(fallbackLines, false, 'fallback');
    applyPreferredLyricsForCurrent(true);
  }
}

function currentLyricFallbackText(): string {
  var song = currentLyricSong() || {};
  var titleEl = document.getElementById('thumb-title');
  var title = (song.name || (titleEl && titleEl.textContent) || '').trim();
  var artistEl = document.getElementById('thumb-artist');
  var artist = (song.artist || (artistEl && artistEl.textContent) || '').trim();
  if (!title) return '';
  return artist ? title + ' - ' + artist : title;
}

function withLyricFallback(lines: LyricLine[]): LyricLine[] {
  lines = Array.isArray(lines) ? lines.filter(function(line){ return line && String(line.text || '').trim(); }) : [];
  if (lines.length && !lines.every(function(line){ return isNoLyricText(line.text); })) return lines;
  var text = currentLyricFallbackText();
  return text ? [{ t:0, text:text, duration:9999, charCount:Math.max(1, text.length), fallback:true }] : [];
}

function renderLyrics(): void {
  // v8: 歌词渲染由 stageLyrics 在每帧 tickLyricsParticles 里推动
  clearStageLyrics();
}

function toggleLyricsPanel(force?: boolean): void {
  if (force === false) fx.particleLyrics = false;
  else if (force === true) fx.particleLyrics = true;
  else fx.particleLyrics = !fx.particleLyrics;
  if (fx.particleLyrics) {
    createLyricsParticles();
    showToast('歌词已开启');
  } else {
    clearStageLyrics();
    showToast('歌词已关闭');
  }
  lyricsVisible = fx.particleLyrics;
}

function updateLyricsHighlight(): void { /* v8: 由 tickLyricsParticles 接管 */ }
