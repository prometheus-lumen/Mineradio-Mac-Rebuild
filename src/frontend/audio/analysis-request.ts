function scheduleBeatAnalysis(songId: string | number, audioUrl: string, token: number, song: PlaylistSong): void {
  if (!songId || !audioUrl) return;
  var cacheKey = String(songId);
  if (djMode.active) {
    cancelBeatAnalysisTimer();
    beatAnalysisStartedAt = 0;
    hideBeatChip();
    return;
  }
  cancelBeatAnalysisTimer();
  beatAnalysisStartedAt = 0;
  hideBeatChip();
  beatAnalysisTimer = setTimeout(function waitForQuietStart(){
    beatAnalysisTimer = null;
    if (token !== beatMapToken || !audio || audio.paused) return;
    var current = audio.currentTime || 0;
    if (current < beatAnalysisConfig.minPlaybackSec) {
      beatAnalysisTimer = setTimeout(waitForQuietStart, Math.max(500, (beatAnalysisConfig.minPlaybackSec - current) * 1000));
      return;
    }
    var startAnalysis = async function(){
      if (token !== beatMapToken || !audio || audio.paused || beatMapCache[cacheKey]) return;
      var diskMap = await readBeatDiskCache(cacheKey);
      if (diskMap) {
        applyBeatMapCacheForCurrent(cacheKey, diskMap, token, '磁盘节拍缓存命中:');
        return;
      }
      if (token !== beatMapToken || !audio || audio.paused || beatMapCache[cacheKey]) return;
      if (beatMapBusy) {
        beatAnalysisTimer = setTimeout(function(){
          beatAnalysisTimer = null;
          scheduleAnalysisTask(startAnalysis, 260);
        }, 420);
        return;
      }
      beatAnalysisStartedAt = performance.now();
      analyzeAudioBeats(audioUrl, null, token, {
        skipMusicTempo: beatAnalysisConfig.skipMusicTempoWhilePlaying && !audio.paused,
        background: true,
        song: song || null
      }).then(function(map){
        if (token !== beatMapToken || !map) return;
        smoothBeatMapHandoff(cacheKey, map, token, song || null);
      }).catch(function(err){
        console.warn('scheduled beat analysis failed:', err);
        hideBeatChip();
      });
    };
    scheduleAnalysisTask(startAnalysis, beatAnalysisConfig.idleTimeout);
  }, beatAnalysisConfig.delayMs);
}
