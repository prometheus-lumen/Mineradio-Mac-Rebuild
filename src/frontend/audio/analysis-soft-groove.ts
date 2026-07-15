interface SoftGrooveAnalysisProfile {
  id?: string; introPattern?: boolean; localRefine?: boolean; sparseCamera?: boolean;
}
interface SoftGrooveFramePoint { frame?: number; time: number; score: number; base: number; }
interface SoftGrooveRow { beat: BeatEvent; score: number; }
interface SoftGroovePattern { anchor: number; gaps: number[]; refScore: number; introHitCount: number; introTimes: number[]; }
interface SoftGrooveContext {
  analysisProfile: SoftGrooveAnalysisProfile; nFrames: number;
  energy: Float32Array; bodyEnergy: Float32Array; snapEnergy: Float32Array;
  lowRef: number; bodyRef: number; snapRef: number;
  bandAt: (values: Float32Array, frame: number) => number;
  bestSoftGrooveFrameNear: (time: number, radiusSec: number) => SoftGrooveFramePoint;
}

function thinSoftGrooveCameraBeats(events: BeatEvent[], step: number, duration: number, context: SoftGrooveContext): BeatEvent[] {
  var analysisProfile = context.analysisProfile;
  var nFrames = context.nFrames, energy = context.energy, bodyEnergy = context.bodyEnergy, snapEnergy = context.snapEnergy;
  var lowRef = context.lowRef, bodyRef = context.bodyRef, snapRef = context.snapRef;
  var bandAt = context.bandAt, bestSoftGrooveFrameNear = context.bestSoftGrooveFrameNear;
  if (!analysisProfile.sparseCamera || !events || events.length < 6) return events || [];
  step = Math.max(0.001, step || medianGap(events.map(function(b){ return b.time; }), 0.30, 1.20) || 0.82);
  function moodScore(b: BeatEvent | null | undefined): number {
    if (!b) return 0;
    return (b.grooveEvidence || 0) * 0.56 + (b.impact || 0) * 0.34 + (b.strength || 0) * 0.18 + (b.low || 0) * 0.10 + (b.body || 0) * 0.08;
  }
  function eventPercentile(rows: SoftGrooveRow[], p: number): number {
    var vals = rows.map(function(row){ return row.score; }).sort(function(a,b){ return a-b; });
    return vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * p))] : 0;
  }
  function medianNumber(vals: number[]): number {
    vals = vals.filter(function(v){ return isFinite(v); }).sort(function(a,b){ return a-b; });
    return vals.length ? vals[Math.floor(vals.length * 0.5)] : 0;
  }
  function cloneSparseBeat(b: BeatEvent, score: number, accent: boolean, tag: string): BeatEvent {
    var out = Object.assign({}, b);
    out.primary = true;
    out.camera = true;
    out.pulse = true;
    out.sparse = true;
    out.tone = tag || 'sunset-groove';
    out.impact = clampRange((out.impact || out.strength || 0.30) * (accent ? 0.76 : 0.66) + score * 0.07, 0.18, accent ? 0.58 : 0.50);
    out.strength = clampRange((out.strength || 0.34) * (accent ? 0.76 : 0.68) + score * 0.055, 0.30, accent ? 0.64 : 0.56);
    out.mass = clampRange((out.mass || 0.48) * 0.78, 0.28, 0.60);
    out.sharpness = clampRange((out.sharpness || 0.10) * 0.66, 0.05, 0.32);
    out._sparseScore = score;
    return out;
  }
  function findBestEventNear(time: number, radius = 0.20): SoftGrooveRow | null {
    var best: BeatEvent | null = null;
    var bestScore = -1;
    for (var i = 0; i < events.length; i++) {
      var b = events[i];
      if (!b || !isFinite(b.time)) continue;
      var dist = Math.abs(b.time - time);
      if (dist > radius) continue;
      var score = moodScore(b) * (1 - dist / radius * 0.18);
      if (score > bestScore) {
        best = b;
        bestScore = score;
      }
    }
    return best ? { beat: best, score: Math.max(0, bestScore) } : null;
  }
  function buildBeatFromFrame(time: number, score: number, tag: string): BeatEvent {
    var f = Math.max(0, Math.min(nFrames - 1, Math.round(time / 0.010)));
    var lowTone = Math.min(2.0, bandAt(energy, f) / lowRef);
    var bodyTone = Math.min(2.0, bandAt(bodyEnergy, f) / bodyRef);
    var snapTone = Math.min(2.0, bandAt(snapEnergy, f) / snapRef);
    var toneTotal = Math.max(0.001, lowTone + bodyTone * 0.72 + snapTone * 0.58);
    var lowMix = lowTone / toneTotal;
    var bodyMix = (bodyTone * 0.72) / toneTotal;
    var snapMix = (snapTone * 0.58) / toneTotal;
    return {
      time: time,
      strength: clampRange(0.30 + score * 0.055, 0.30, 0.52),
      confidence: clampRange(0.46 + score * 0.08, 0.46, 0.66),
      primary: true,
      camera: true,
      pulse: true,
      sparse: true,
      tone: tag || 'sunset-pattern',
      impact: clampRange(0.18 + score * 0.060, 0.18, 0.48),
      low: Math.max(0.22, Math.min(0.74, lowMix)),
      body: bodyMix,
      snap: snapMix,
      mass: Math.max(0.30, Math.min(0.58, lowMix * 0.58 + bodyMix * 0.20)),
      sharpness: Math.max(0.05, Math.min(0.28, snapMix * 0.72))
    };
  }
  function learnIntroPattern(): SoftGroovePattern | null {
    if (!analysisProfile.introPattern) return null;
    var introEnd = Math.min(duration || 34, 34);
    var rows = events.filter(function(b){ return b && isFinite(b.time) && b.time >= 1.2 && b.time <= introEnd; })
      .map(function(b){ return { beat: b, score: moodScore(b) }; });
    if (rows.length < 6) return null;
    var scoreFloor = Math.max(0.34, eventPercentile(rows, 0.58));
    var hits: SoftGrooveRow[] = [];
    var minIntroGap = 1.08;
    rows.forEach(function(row){
      if (row.score < scoreFloor && !(row.beat && (row.beat.low || 0) > 0.42 && row.score > scoreFloor * 0.78)) return;
      var last = hits[hits.length - 1];
      if (last && row.beat.time - last.beat.time < minIntroGap) {
        if (row.score > last.score) hits[hits.length - 1] = row;
      } else {
        hits.push(row);
      }
    });
    if (hits.length < 5) return null;
    var gaps: number[] = [];
    for (var hi = 1; hi < hits.length; hi++) {
      var gap = hits[hi].beat.time - hits[hi - 1].beat.time;
      if (gap >= 1.18 && gap <= 2.45) gaps.push(gap);
    }
    if (gaps.length < 4) return null;
    var firstGaps = gaps.slice(0, Math.min(8, gaps.length));
    var evenGaps: number[] = [];
    var oddGaps: number[] = [];
    for (var gi = 0; gi < firstGaps.length; gi++) {
      (gi % 2 === 0 ? evenGaps : oddGaps).push(firstGaps[gi]);
    }
    var evenGap = medianNumber(evenGaps);
    var oddGap = medianNumber(oddGaps);
    var patternGaps: number[];
    if (evenGap && oddGap && Math.abs(evenGap - oddGap) > 0.16) {
      patternGaps = [evenGap, oddGap].map(function(v){ return clampRange(v, 1.30, 2.22); });
    } else {
      patternGaps = [clampRange(medianNumber(firstGaps), 1.42, 2.12)];
    }
    var refScore = Math.max(0.35, eventPercentile(hits, 0.50));
    return {
      anchor: hits[0].beat.time,
      gaps: patternGaps,
      refScore: refScore,
      introHitCount: hits.length,
      introTimes: hits.slice(0, 10).map(function(row){ return row.beat.time; })
    };
  }
  function buildIntroPatternBeats(): BeatEvent[] | null {
    var pattern = learnIntroPattern();
    if (!pattern) return null;
    var selected: BeatEvent[] = [];
    var t = pattern.anchor;
    var gi = 0;
    var avgGap = pattern.gaps.reduce(function(a,b){ return a + b; }, 0) / Math.max(1, pattern.gaps.length);
    var refineRadius = Math.min(0.22, Math.max(0.14, avgGap * 0.10));
    var findRadius = Math.min(0.26, Math.max(0.18, avgGap * 0.13));
    while (t < (duration || 0) - 0.55) {
      var point = bestSoftGrooveFrameNear(t, refineRadius);
      var refinedTime = Math.abs(point.time - t) <= refineRadius ? point.time : t;
      var match = findBestEventNear(refinedTime, findRadius) || findBestEventNear(t, findRadius);
      var score = match ? match.score : Math.max(0.26, (point.score || 0) / Math.max(1.0, pattern.refScore * 2.2));
      var accent = (gi % pattern.gaps.length) === 0;
      var beat = match ? cloneSparseBeat(match.beat, score, accent, 'sunset-intro-pattern') : buildBeatFromFrame(refinedTime, score, 'sunset-intro-pattern');
      beat.time = refinedTime;
      beat.index = gi;
      beat.combo = accent ? 'downbeat' : 'rebound';
      beat.introPattern = true;
      selected.push(beat);
      t += pattern.gaps[gi % pattern.gaps.length];
      gi++;
      if (gi > 800) break;
    }
    for (var si = 0; si < selected.length; si++) delete selected[si]._sparseScore;
    console.log('soft-groove intro pattern camera:', selected.length, 'gaps:', pattern.gaps.map(function(v){ return v.toFixed(2); }).join('/'), 'anchor:', pattern.anchor.toFixed(2), 'introHits:', pattern.introHitCount);
    return selected.length >= 8 ? selected : null;
  }
  var introPatternBeats = buildIntroPatternBeats();
  if (introPatternBeats && introPatternBeats.length >= 8) return introPatternBeats;

  var railStep = step;
  while (railStep < 1.35) railStep *= 2;
  railStep = clampRange(railStep, 1.42, 2.12);
  var railMultiple = Math.max(1, Math.round(railStep / step));
  if (railMultiple < 2 && step < 1.20) railMultiple = 2;
  var phaseScores = new Array(railMultiple);
  for (var pi = 0; pi < phaseScores.length; pi++) phaseScores[pi] = 0;
  for (var ei = 0; ei < events.length; ei++) {
    var ev = events[ei];
    if (!ev || !isFinite(ev.time)) continue;
    if (ev.time < 1.0 || (duration && ev.time > duration - 0.65)) continue;
    var phase = Math.abs((ev.index == null ? ei : ev.index) % railMultiple);
    var earlyWeight = ev.time < 70 ? 1.18 : (ev.time < 205 ? 1.0 : 0.94);
    phaseScores[phase] += moodScore(ev) * earlyWeight;
  }
  var bestPhase = 0;
  for (var ps = 1; ps < phaseScores.length; ps++) {
    if (phaseScores[ps] > phaseScores[bestPhase]) bestPhase = ps;
  }
  var selected: BeatEvent[] = [];
  var minGap = Math.max(1.12, railStep * 0.68);
  function pushSparse(b: BeatEvent | null | undefined, score: number, accent: boolean): void {
    if (!b || score < 0.28) return;
    var copy = cloneSparseBeat(b, score, accent, 'sunset-groove');
    copy.combo = selected.length % 2 === 0 ? 'downbeat' : 'rebound';
    var last = selected[selected.length - 1];
    if (last && copy.time - last.time < minGap) {
      if (score > (last._sparseScore || 0) + 0.05) selected[selected.length - 1] = copy;
      return;
    }
    selected.push(copy);
  }
  for (var si = 0; si < events.length; si++) {
    var b = events[si];
    if (!b || !isFinite(b.time)) continue;
    var idx = b.index == null ? si : b.index;
    var score = moodScore(b);
    var onRail = Math.abs(idx % railMultiple) === bestPhase;
    if (onRail) {
      pushSparse(b, score, false);
    } else if (score >= 0.82 && (!selected.length || b.time - selected[selected.length - 1].time >= minGap * 1.18)) {
      pushSparse(b, score, true);
    }
  }
  for (var ci = 0; ci < selected.length; ci++) {
    delete selected[ci]._sparseScore;
  }
  var minExpected = duration ? Math.max(16, Math.floor(duration / 3.2)) : 16;
  if (selected.length < minExpected) {
    var fallback = events.filter(function(b){ return b && b.camera !== false && b.pulse !== false; });
    selected = [];
    for (var fi = 0; fi < fallback.length; fi++) pushSparse(fallback[fi], moodScore(fallback[fi]), false);
    for (var di = 0; di < selected.length; di++) delete selected[di]._sparseScore;
  }
  console.log('soft-groove sparse camera:', selected.length, 'of', events.length, 'railStep:', railStep.toFixed(2), 'phase:', bestPhase + '/' + railMultiple);
  return selected.length >= 4 ? selected : events.filter(function(b){ return b && b.camera !== false; });
}
