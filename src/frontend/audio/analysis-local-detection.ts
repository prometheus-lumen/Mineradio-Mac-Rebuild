interface LocalBeatDetectionResult { beats: BeatEvent[]; cameraBeats: BeatEvent[]; gridStep: number; }

async function detectLocalBeatCandidates(prepared: OfflineBeatAnalysisContext, token: number, job: BeatAnalysisJob): Promise<LocalBeatDetectionResult | null> {
  var buffer = prepared.buffer, nFrames = prepared.nFrames;
  var energy = prepared.energy, bodyEnergy = prepared.bodyEnergy, vocalEnergy = prepared.vocalEnergy, snapEnergy = prepared.snapEnergy;
  var onset = prepared.onset, lowRef = prepared.lowRef, bodyRef = prepared.bodyRef, vocalRef = prepared.vocalRef, snapRef = prepared.snapRef;
  var bandAt = prepared.bandAt;
  // 自适应阈值: 滑动均值 + 标准差, 输出带强度的 beat 事件.
  var winN = 50;  // 0.5 秒
  var candidates: OfflineBeatCandidate[] = [];
  var lastKickFrame = -winN;
  var minIntervalFrames = 12;  // 120ms, 粒子可响应较密集的低频瞬态.
  for (var f = winN; f < nFrames - 5; f++) {
    var sum = 0, sqSum = 0;
    for (var k = f - winN; k < f; k++) { sum += onset[k]; sqSum += onset[k] * onset[k]; }
    var mean = sum / winN;
    var std = Math.sqrt(Math.max(0, sqSum / winN - mean * mean));
    var thresh = mean + std * 2.35 + 0.0045;
    if (onset[f] > thresh && onset[f] > onset[f-1] && onset[f] >= onset[f+1]) {
      if (f - lastKickFrame >= minIntervalFrames) {
        var localScore = (onset[f] - thresh) / Math.max(0.006, std + mean * 0.35);
        candidates.push({
          frame: f,
          time: f * 0.010,
          raw: onset[f],
          score: localScore,
          lowTone: Math.min(2.0, bandAt(energy, f) / lowRef),
          bodyTone: Math.min(2.0, bandAt(bodyEnergy, f) / bodyRef),
          vocalTone: Math.min(2.0, bandAt(vocalEnergy, f) / vocalRef),
          snapTone: Math.min(2.0, bandAt(snapEnergy, f) / snapRef)
        });
        lastKickFrame = f;
      }
    }
    if (f > winN && f % 900 === 0) {
      await yieldToPaint();
      if (isBeatAnalysisCancelled(token, job)) { hideBeatChip(); return null; }
    }
  }

  var scores = candidates.map(function(b){ return b.score; }).sort(function(a,b){ return a-b; });
  var p75 = scores.length ? scores[Math.floor(scores.length * 0.75)] : 1;
  var p92 = scores.length ? scores[Math.floor(scores.length * 0.92)] : Math.max(1, p75);
  var strongTimes: number[] = [];
  var beats: BeatEvent[] = candidates.map(function(b, i){
    var strength = Math.max(0.18, Math.min(1, (b.score - p75 * 0.36) / Math.max(0.001, p92 - p75 * 0.36)));
    var lowDominance = b.lowTone / Math.max(0.001, b.vocalTone * 0.84 + b.bodyTone * 0.36 + b.snapTone * 0.10);
    var toneTotal = Math.max(0.001, b.lowTone + b.bodyTone * 0.72 + b.snapTone * 0.58);
    var lowMix = b.lowTone / toneTotal;
    var bodyMix = (b.bodyTone * 0.72) / toneTotal;
    var snapMix = (b.snapTone * 0.58) / toneTotal;
    var drumLike = b.lowTone > 0.38 && (lowMix > 0.42 || lowDominance > 0.72);
    if (strength > 0.55 && drumLike) strongTimes.push(b.time);
    var sharpness = Math.max(0.08, Math.min(1, snapMix * 1.55 + strength * 0.10));
    var mass = Math.max(0.25, Math.min(1, lowMix * 0.72 + bodyMix * 0.36 + strength * 0.20));
    var tone = snapMix > 0.34 && b.snapTone > 0.55 ? 'snap' : (bodyMix > 0.36 && b.bodyTone > 0.55 ? 'body' : (lowMix > 0.55 ? 'deep' : 'mixed'));
    return {
      time: b.time,
      strength: strength,
      confidence: Math.max(0.22, Math.min(1, b.score / Math.max(0.001, p92))),
      primary: drumLike && strength >= 0.50,
      camera: drumLike && strength >= 0.42,
      tone: tone,
      low: lowMix,
      body: bodyMix,
      snap: snapMix,
      mass: mass,
      sharpness: sharpness,
      index: i
    };
  });

  var gaps = [];
  for (var gi = 1; gi < strongTimes.length; gi++) {
    var gap = strongTimes[gi] - strongTimes[gi - 1];
    if (gap >= 0.26 && gap <= 0.86) gaps.push(gap);
  }
  gaps.sort(function(a,b){ return a-b; });
  var gridStep = gaps.length ? gaps[Math.floor(gaps.length * 0.5)] : 0;
  var cameraBeats = beats.filter(function(b){ return b.camera; });
  if (gridStep > 0) {
    for (var bi = 0; bi < beats.length; bi++) {
      var prevGap = bi > 0 ? beats[bi].time - beats[bi - 1].time : gridStep;
      var nextGap = bi < beats.length - 1 ? beats[bi + 1].time - beats[bi].time : gridStep;
      var gridLike = Math.abs(prevGap - gridStep) < gridStep * 0.32 || Math.abs(nextGap - gridStep) < gridStep * 0.32;
      beats[bi].primary = !!beats[bi].camera && (beats[bi].strength || 0) >= (gridLike ? 0.42 : 0.58);
    }
    if (gridStep >= 0.38 && gridStep <= 0.88 && strongTimes.length >= 4) {
      var anchor = strongTimes[0];
      while (anchor - gridStep > 0.20) anchor -= gridStep;
      var gridBeats: BeatEvent[] = [];
      var windowSec = Math.min(0.18, gridStep * 0.30);
      for (var gt = anchor; gt < buffer.duration - 0.05; gt += gridStep) {
          var best: BeatEvent | null = null;
        var bestDist = windowSec;
        for (var ci = 0; ci < beats.length; ci++) {
          var dist = Math.abs(beats[ci].time - gt);
          if (dist < bestDist) {
            best = beats[ci];
            bestDist = dist;
          }
        }
        if (best && best.camera) {
          best.primary = true;
          best.strength = Math.max(best.strength || 0, 0.54);
          best.confidence = Math.max(best.confidence || 0, 0.58);
          gridBeats.push(best);
        } else {
          var gf = Math.max(0, Math.min(nFrames - 1, Math.round(gt / 0.010)));
          var lowTone = Math.min(2.0, bandAt(energy, gf) / lowRef);
          var bodyTone = Math.min(2.0, bandAt(bodyEnergy, gf) / bodyRef);
          var vocalTone = Math.min(2.0, bandAt(vocalEnergy, gf) / vocalRef);
          var snapTone = Math.min(2.0, bandAt(snapEnergy, gf) / snapRef);
          var lowDominance = lowTone / Math.max(0.001, vocalTone * 0.84 + bodyTone * 0.36 + snapTone * 0.10);
          var toneTotal = Math.max(0.001, lowTone + bodyTone * 0.72 + snapTone * 0.58);
          var lowMix = lowTone / toneTotal;
          var bodyMix = (bodyTone * 0.72) / toneTotal;
          var snapMix = (snapTone * 0.58) / toneTotal;
          if (lowTone <= 0.38 || (lowMix <= 0.42 && lowDominance <= 0.72)) continue;
          gridBeats.push({
            time: gt,
            strength: 0.53,
            confidence: 0.60,
            primary: true,
            ghost: true,
            tone: 'grid',
            low: lowMix,
            body: bodyMix,
            snap: snapMix,
            mass: Math.max(0.35, Math.min(0.82, lowMix * 0.72 + bodyMix * 0.36 + 0.16)),
            sharpness: Math.max(0.08, Math.min(0.65, snapMix * 1.25)),
            index: gridBeats.length
          });
        }
      }
      cameraBeats = gridBeats;
    }
  }

  return { beats: beats, cameraBeats: cameraBeats, gridStep: gridStep };
}
