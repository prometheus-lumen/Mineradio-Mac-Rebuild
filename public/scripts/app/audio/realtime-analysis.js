'use strict';

// Mineradio classic module: audio/realtime-analysis.
function resetRealtimeBeatEngine() {
  rtBeat.subFast = rtBeat.subSlow = rtBeat.lowFast = rtBeat.lowSlow = 0;
  rtBeat.bodyFast = rtBeat.bodySlow = rtBeat.vocalFast = rtBeat.vocalSlow = rtBeat.snapFast = rtBeat.snapSlow = 0;
  rtBeat.prevSub = rtBeat.prevLow = rtBeat.prevBody = rtBeat.prevVocal = rtBeat.prevSnap = rtBeat.prevRms = 0;
  rtBeat.onsetAvg = 0.012;
  rtBeat.onsetPeak = 0.060;
  rtBeat.subPeak = 0.14;
  rtBeat.lowPeak = 0.18;
  rtBeat.bodyPeak = 0.16;
  rtBeat.vocalPeak = 0.16;
  rtBeat.snapPeak = 0.14;
  rtBeat.lastHitAt = -10;
  rtBeat.tempoGap = 0;
  rtBeat.tempoConfidence = 0;
  rtBeat.beatCount = 0;
  rtBeat.primedFrames = 0;
  rtBeat.warmupUntil = (audio && isFinite(audio.currentTime) ? audio.currentTime : 0) + (djMode.active ? 0.34 : 1.15);
  rtBeat.pulse = 0;
  rtBeat.score = 0;
  rtBeat.stats.hits = 0;
  rtBeat.stats.blocked = 0;
  rtBeat.stats.assisted = 0;
  rtBeat.stats.strong = 0;
  rtBeat.stats.rejected = 0;
}

function beatEventTime(ev) {
  return typeof ev === 'number' ? ev : (ev && isFinite(ev.time) ? ev.time : Infinity);
}

function __mineradioInitAudioRealtimeAnalysis23() {
  // v7.2: 离线节拍预解析
  //   每次切歌, fetch 完整音频 → OfflineAudioContext 分析 → 标出真鼓点
  //   缓存按 song.id 存, 避免重复
  beatMapCache = {};

  // { songId: { kicks: [t1, t2, ...], duration: ... } }
  currentBeatMap = null;

  // 当前播放的歌的 beatMap
  beatMapNextIdx = 0;

  // 下一个待触发的 kick index
  beatMapBusy = false;

  // 正在分析中
  beatMapToken = 0;

  // 取消旧分析
  beatAnalysisTimer = null;

  beatAnalysisStartedAt = 0;

  beatPrefetchTimer = null;

  beatPrefetchBusy = false;

  beatPrefetchToken = 0;

  beatPrefetchLastKey = '';

  BEAT_PREFETCH_LIMIT = 2;

  beatDiskCacheStatus = { checked:false, enabled:false, mode:'unknown', reason:'' };

  beatDiskCacheNoticeLogged = false;

  djBeatMapCache = {};

  currentDjBeatMap = null;

  djBeatMapNextIdx = 0;

  djBeatPulseNextIdx = 0;

  djBeatMapBusy = false;

  djBeatMapToken = 0;

  djBeatAnalysisTimer = null;

  beatAnalysisConfig = {
    delayMs: 1600,
    minPlaybackSec: 1.2,
    idleTimeout: 1400,
    skipMusicTempoWhilePlaying: false
  };

  beatCam = {
    nextIdx: 0,
    events: [],
    punch: 0,
    lookahead: 0.075,
    lastTriggerAt: -10,
    lastRealtimeAt: -10,
    minInterval: 0.500,
    fallbackMinInterval: 0.320,
    realtimeMinInterval: 0.460,
    realtimeMergeWindow: 0.135,
    attack: 0.028,
    hold: 0.030,
    release: 0.185,
    thetaKick: 0,
    phiKick: 0,
    radiusKick: 0,
    rollKick: 0,
    prevAudioTime: -1,
    stats: { map: 0, live: 0, merged: 0, liveBlocked: 0 }
  };

  liveCamAvg = 0, liveCamPeak = 0.28, liveCamLastRaw = 0;

  cinemaDynamics = { avg: 0, lowAvg: 0, peak: 0.30, scale: 0.82 };

  cinemaTrackProfile = {
    scale: 1.0,
    target: 1.0,
    nameHint: 1.0,
    frames: 0,
    energyAvg: 0,
    lowAvg: 0,
    vocalAvg: 0,
    melodyAvg: 0,
    punchPeak: 0.10,
    density: 0
  };

  rtBeat = {
    subFast: 0, subSlow: 0, lowFast: 0, lowSlow: 0,
    bodyFast: 0, bodySlow: 0, vocalFast: 0, vocalSlow: 0, snapFast: 0, snapSlow: 0,
    prevSub: 0, prevLow: 0, prevBody: 0, prevVocal: 0, prevSnap: 0, prevRms: 0,
    onsetAvg: 0.012, onsetPeak: 0.060,
    subPeak: 0.14, lowPeak: 0.18, bodyPeak: 0.16, vocalPeak: 0.16, snapPeak: 0.14,
    lastHitAt: -10,
    tempoGap: 0,
    tempoConfidence: 0,
    beatCount: 0,
    primedFrames: 0,
    warmupUntil: 0,
    pulse: 0,
    score: 0,
    stats: { hits: 0, blocked: 0, assisted: 0, strong: 0, rejected: 0 }
  };

  djMode = {
    active: false,
    songKey: '',
    startedAt: 0,
    lastNoticeAt: -100000,
    tempoGap: 0,
    tempoConfidence: 0,
    sectionEnergy: 0,
    sectionLow: 0,
    sectionChange: 0,
    visualPulse: 0,
    lastBeatAt: -10
  };
}
