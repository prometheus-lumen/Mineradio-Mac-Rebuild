function localBeatRound(value: unknown, scale = 1000): number {
  var number = Number(value);
  return isFinite(number) ? Math.round(number * scale) / scale : 0;
}

function packLocalBeatEvent(event: BeatEventLike): PackedBeatEvent {
  if (typeof event === 'number') return [localBeatRound(event), 0.42, 0.72, 0.42, 0.62, 0.22, 0.16, 0, 7, 0.62, 0.12, 0];
  var comboIndex = Math.max(0, LOCAL_BEAT_COMBOS.indexOf(event.combo || ''));
  var flags = 0;
  if (event.primary !== false) flags |= 1;
  if (event.camera !== false) flags |= 2;
  if (event.pulse !== false) flags |= 4;
  if (event.dj) flags |= 8;
  if (event.grid) flags |= 16;
  if (event.kickOnly) flags |= 32;
  return [
    localBeatRound(event.time), localBeatRound(event.strength ?? 0.42), localBeatRound(event.confidence ?? 0.72),
    localBeatRound(event.impact ?? event.strength ?? 0.42), localBeatRound(event.low ?? 0.62),
    localBeatRound(event.body ?? 0.22), localBeatRound(event.snap ?? 0.16), comboIndex, flags,
    localBeatRound(event.mass ?? 0.62), localBeatRound(event.sharpness ?? 0.12), localBeatRound(event.step || 0)
  ];
}

function unpackLocalBeatEvent(row: unknown): BeatEventLike | null {
  if (typeof row === 'number') return row;
  if (!Array.isArray(row)) return null;
  var values = row.map(Number);
  var flags = values[8] || 0;
  return {
    time: values[0] || 0,
    strength: values[1] ?? 0.42,
    confidence: values[2] ?? 0.72,
    impact: values[3] ?? values[1] ?? 0.42,
    low: values[4] ?? 0.62,
    body: values[5] ?? 0.22,
    snap: values[6] ?? 0.16,
    combo: LOCAL_BEAT_COMBOS[values[7] || 0],
    primary: !!(flags & 1), camera: !!(flags & 2), pulse: !!(flags & 4),
    dj: !!(flags & 8), grid: !!(flags & 16), kickOnly: !!(flags & 32),
    mass: values[9] ?? 0.62, sharpness: values[10] ?? 0.12, step: values[11] || 0
  };
}

function packLocalBeatMap(map: BeatMap): PackedLocalBeatMap | null {
  if (!map) return null;
  var camera = (map.cameraBeats || map.beats || map.kicks || []).map(packLocalBeatEvent);
  var pulse = (map.pulseBeats || map.kicks || []).map(packLocalBeatEvent);
  return {
    v: 1, duration: localBeatRound(map.duration || 0), gridStep: localBeatRound(map.gridStep || 0),
    sectionSteps: (map.sectionSteps || []).map(function(value): number { return localBeatRound(value); }),
    tempoSource: map.tempoSource || 'local', visualBeatCount: map.visualBeatCount || camera.length,
    analyzedAt: map.analyzedAt || Date.now(), partial: !!map.partial, partialUntilSec: map.partialUntilSec || 0,
    cameraBeats: camera, pulseBeats: pulse
  };
}

function unpackLocalBeatMap(stored: unknown): BeatMap | null {
  if (!stored || typeof stored !== 'object') return null;
  var record = stored as Record<string, unknown>;
  var version = Number(record.v);
  if (version && version !== 1 && version !== 2) return null;
  var camera = unpackBeatEventArray(record.cameraBeats);
  var pulse = unpackBeatEventArray(record.pulseBeats);
  return {
    kicks: camera.map(beatEventTime), beats: camera, pulseBeats: pulse, cameraBeats: camera,
    gridStep: Number(record.gridStep) || 0,
    sectionSteps: Array.isArray(record.sectionSteps) ? record.sectionSteps.map(Number).filter(Number.isFinite) : [],
    tempoSource: typeof record.tempoSource === 'string' ? record.tempoSource : 'local',
    duration: Number(record.duration) || 0, visualBeatCount: Number(record.visualBeatCount) || camera.length,
    analyzedAt: Number(record.analyzedAt) || Date.now(), partial: !!record.partial,
    partialUntilSec: Number(record.partialUntilSec) || 0
  };
}

function unpackBeatEventArray(raw: unknown): BeatEventLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(unpackLocalBeatEvent).filter(function(event): event is BeatEventLike { return event !== null; });
}

function readLocalBeatPrefs(): Record<string, LocalBeatMode> {
  try {
    var raw: unknown = JSON.parse(localStorage.getItem(LOCAL_BEAT_PREF_STORE_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return {};
    var result: Record<string, LocalBeatMode> = {};
    Object.entries(raw as Record<string, unknown>).forEach(function(entry): void {
      result[entry[0]] = entry[1] === 'dj' ? 'dj' : 'mr';
    });
    return result;
  } catch (error) { return {}; }
}

function saveLocalBeatPrefs(): void {
  try { localStorage.setItem(LOCAL_BEAT_PREF_STORE_KEY, JSON.stringify(localBeatMapPrefs)); }
  catch (error) {}
}

function readLocalBeatMapCache(): Record<string, LocalBeatCacheEntry> {
  try {
    var raw: unknown = JSON.parse(localStorage.getItem(LOCAL_BEATMAP_STORE_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return {};
    var result: Record<string, LocalBeatCacheEntry> = {};
    Object.entries(raw as Record<string, unknown>).forEach(function(pair): void {
      if (!pair[1] || typeof pair[1] !== 'object') return;
      var stored = pair[1] as Record<string, unknown>;
      var entry: LocalBeatCacheEntry = { updatedAt: Number(stored.updatedAt) || 0 };
      var mr = unpackLocalBeatMap(stored.mr);
      var dj = unpackLocalBeatMap(stored.dj);
      if (mr) entry.mr = mr;
      if (dj) entry.dj = dj;
      result[pair[0]] = entry;
    });
    return result;
  } catch (error) { return {}; }
}

function packLocalBeatCache(maxEntries?: number): Record<string, { updatedAt: number; mr?: PackedLocalBeatMap; dj?: PackedLocalBeatMap }> {
  var entries = Object.entries(localBeatMapCache).sort(function(a, b): number { return b[1].updatedAt - a[1].updatedAt; });
  if (maxEntries) entries = entries.slice(0, maxEntries);
  var packed: Record<string, { updatedAt: number; mr?: PackedLocalBeatMap; dj?: PackedLocalBeatMap }> = {};
  entries.forEach(function(pair): void {
    var output: { updatedAt: number; mr?: PackedLocalBeatMap; dj?: PackedLocalBeatMap } = { updatedAt: pair[1].updatedAt || Date.now() };
    var mr = pair[1].mr && packLocalBeatMap(pair[1].mr);
    var dj = pair[1].dj && packLocalBeatMap(pair[1].dj);
    if (mr) output.mr = mr;
    if (dj) output.dj = dj;
    packed[pair[0]] = output;
  });
  return packed;
}

function saveLocalBeatMapCache(): boolean {
  for (var limit of [12, 8, 5, 3]) {
    try {
      localStorage.setItem(LOCAL_BEATMAP_STORE_KEY, JSON.stringify(packLocalBeatCache(limit)));
      return true;
    } catch (error) {}
  }
  return false;
}
