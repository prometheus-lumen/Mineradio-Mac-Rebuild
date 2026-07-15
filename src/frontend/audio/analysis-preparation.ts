interface OfflineBeatAnalysisContext {
  buffer: AudioBuffer; musicTempoTask: Promise<MusicTempoResult | null>; nFrames: number;
  energy: Float32Array; bodyEnergy: Float32Array; vocalEnergy: Float32Array; snapEnergy: Float32Array;
  onset: Float32Array; bodyOnset: Float32Array; vocalOnset: Float32Array; snapOnset: Float32Array;
  lowRef: number; bodyRef: number; vocalRef: number; snapRef: number;
  lowOnsetRef: number; bodyOnsetRef: number; vocalOnsetRef: number; snapOnsetRef: number;
  percentile: (values: ArrayLike<number>, p: number) => number;
  bandAt: (values: Float32Array, frame: number) => number;
  bestSoftGrooveFrameNear: (time: number, radiusSec: number) => SoftGrooveFramePoint;
  estimateSoftGrooveTempoOffset: (times: number[], step: number) => number;
  refineSoftGrooveBeatTime: (time: number, step: number) => SoftGrooveFramePoint;
}

async function prepareBeatAnalysisContext(ab: ArrayBuffer, token: number, job: BeatAnalysisJob, options: BeatAnalysisOptions, analysisProfile: SoftGrooveAnalysisProfile, softGrooveAnalysis: boolean): Promise<OfflineBeatAnalysisContext | null> {
  // 用临时 AudioContext 解码 (我们不能复用 audioCtx 因为它可能 closed)
  var TmpCtx = window.OfflineAudioContext;
  if (!TmpCtx) { hideBeatChip(); return null; }
  var DecodeCtx = window.AudioContext || window.webkitAudioContext;
  var dc = new DecodeCtx();
  var buffer: AudioBuffer | null = null;
  try {
    buffer = await new Promise<AudioBuffer>(function(resolve, reject){
      dc.decodeAudioData(ab, resolve, reject);
    });
  } catch (e) {
    if (!isBeatAnalysisCancelled(token, job)) console.warn('decode failed:', e);
  } finally {
    if (dc.close) await dc.close().catch(function(){});
  }
  if (!buffer) { hideBeatChip(); return null; }
  if (isBeatAnalysisCancelled(token, job)) { hideBeatChip(); return null; }
  var decodedBuffer = buffer;

  var musicTempoTask = options.skipMusicTempo ? Promise.resolve(null) : analyzeMusicTempoInWorker(decodedBuffer, token, job);

  // 用 OfflineAudioContext 分离低频重鼓 / 中频鼓身 / 高频敲击感.
  var sr = decodedBuffer.sampleRate;
  var winSize = Math.floor(sr * 0.010);
  async function makeFrameEnergy(pcm: Float32Array): Promise<Float32Array | null> {
    var frames = Math.floor(pcm.length / winSize);
    var out = new Float32Array(frames);
    for (var f = 0; f < frames; f++) {
      var s = 0;
      var off2 = f * winSize;
      for (var i = 0; i < winSize; i++) {
        var v = pcm[off2 + i];
        s += v * v;
      }
      out[f] = Math.sqrt(s / winSize);
      if (f > 0 && f % 520 === 0) {
        await yieldToPaint();
        if (isBeatAnalysisCancelled(token, job)) return null;
      }
    }
    return out;
  }
  async function renderBand(hpFreq: number, lpFreq: number): Promise<Float32Array | null> {
    if (isBeatAnalysisCancelled(token, job)) return null;
    var off = new TmpCtx(1, decodedBuffer.length, sr);
    var src = off.createBufferSource(); src.buffer = decodedBuffer;
    var node: AudioNode = src;
    if (hpFreq) {
      var hp = off.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = Math.min(hpFreq, sr * 0.45);
      hp.Q.value = 0.85;
      node.connect(hp);
      node = hp;
    }
    if (lpFreq) {
      var lp = off.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(lpFreq, sr * 0.45);
      lp.Q.value = 0.9;
      node.connect(lp);
      node = lp;
    }
    node.connect(off.destination);
    src.start(0);
    var renderedBand = await off.startRendering();
    if (isBeatAnalysisCancelled(token, job)) return null;
    await yieldToIdle(beatAnalysisYieldMs(options, 110, 620));
    return renderedBand.getChannelData(0);
  }
  var frameBands: Array<Float32Array | null> = [];
  var bandPcm = await renderBand(38, 155);
  if (!bandPcm) { hideBeatChip(); return null; }
  frameBands.push(await makeFrameEnergy(bandPcm));
  bandPcm = null;
  if (!frameBands[0]) { hideBeatChip(); return null; }
  await yieldToIdle(beatAnalysisYieldMs(options, 90, 520));
  bandPcm = await renderBand(130, 420);
  if (!bandPcm) { hideBeatChip(); return null; }
  frameBands.push(await makeFrameEnergy(bandPcm));
  bandPcm = null;
  if (!frameBands[1]) { hideBeatChip(); return null; }
  await yieldToIdle(beatAnalysisYieldMs(options, 90, 520));
  bandPcm = await renderBand(420, 2600);
  if (!bandPcm) { hideBeatChip(); return null; }
  frameBands.push(await makeFrameEnergy(bandPcm));
  bandPcm = null;
  if (!frameBands[2]) { hideBeatChip(); return null; }
  await yieldToIdle(beatAnalysisYieldMs(options, 90, 520));
  bandPcm = await renderBand(1800, 9000);
  if (!bandPcm) { hideBeatChip(); return null; }
  frameBands.push(await makeFrameEnergy(bandPcm));
  bandPcm = null;
  if (!frameBands[3]) { hideBeatChip(); return null; }
  if (isBeatAnalysisCancelled(token, job) || !frameBands[0] || !frameBands[1] || !frameBands[2] || !frameBands[3]) { hideBeatChip(); return null; }
  var energy = frameBands[0] as Float32Array;
  var bodyEnergy = frameBands[1] as Float32Array;
  var vocalEnergy = frameBands[2] as Float32Array;
  var snapEnergy = frameBands[3] as Float32Array;
  var nFrames = Math.min(energy.length, bodyEnergy.length, vocalEnergy.length, snapEnergy.length);
  function percentile(arr: ArrayLike<number>, p: number): number {
    var copy = Array.prototype.slice.call(arr).sort(function(a,b){ return a-b; });
    return copy.length ? copy[Math.floor(copy.length * p)] : 0.001;
  }
  function bandAt(arr: Float32Array, f: number): number {
    var a = arr[Math.max(0, f - 1)] || 0;
    var b = arr[f] || 0;
    var c = arr[Math.min(nFrames - 1, f + 1)] || 0;
    return (a + b * 2 + c) * 0.25;
  }
  var lowRef = Math.max(0.0008, percentile(energy, 0.86));
  var bodyRef = Math.max(0.0008, percentile(bodyEnergy, 0.86));
  var vocalRef = Math.max(0.0008, percentile(vocalEnergy, 0.86));
  var snapRef = Math.max(0.0008, percentile(snapEnergy, 0.86));

  // 计算 onset (能量正向差分), 然后取峰
  function makeOnset(arr: Float32Array): Float32Array {
    var out = new Float32Array(nFrames);
    for (var oi = 1; oi < nFrames; oi++) {
      out[oi] = Math.max(0, arr[oi] - arr[oi - 1]);
    }
    return out;
  }
  var onset = makeOnset(energy);
  var bodyOnset = makeOnset(bodyEnergy);
  var vocalOnset = makeOnset(vocalEnergy);
  var snapOnset = makeOnset(snapEnergy);
  var lowOnsetRef = Math.max(0.00025, percentile(onset, 0.88));
  var bodyOnsetRef = Math.max(0.00025, percentile(bodyOnset, 0.88));
  var vocalOnsetRef = Math.max(0.00025, percentile(vocalOnset, 0.88));
  var snapOnsetRef = Math.max(0.00025, percentile(snapOnset, 0.88));

  function softGrooveFrameScore(frame: number): number {
    var sf = Math.max(0, Math.min(nFrames - 1, Math.round(frame)));
    var lowTone = Math.min(2.2, bandAt(energy, sf) / lowRef);
    var bodyTone = Math.min(2.2, bandAt(bodyEnergy, sf) / bodyRef);
    var vocalTone = Math.min(2.2, bandAt(vocalEnergy, sf) / vocalRef);
    var snapTone = Math.min(2.2, bandAt(snapEnergy, sf) / snapRef);
    var lowRise = Math.min(2.6, (onset[sf] || 0) / lowOnsetRef);
    var bodyRise = Math.min(2.6, (bodyOnset[sf] || 0) / bodyOnsetRef);
    var vocalRise = Math.min(2.6, (vocalOnset[sf] || 0) / vocalOnsetRef);
    var snapRise = Math.min(2.6, (snapOnset[sf] || 0) / snapOnsetRef);
    var drumRise = lowRise * 0.52 + bodyRise * 0.42 + snapRise * 0.08;
    var drumTone = lowTone * 0.24 + bodyTone * 0.22 + snapTone * 0.05;
    var vocalLeak = Math.max(0, vocalRise + vocalTone * 0.30 - (lowRise + bodyRise) * 0.54 - 0.18);
    return Math.max(0, drumRise + drumTone - vocalLeak * 0.18);
  }

  function bestSoftGrooveFrameNear(time: number, radiusSec: number): SoftGrooveFramePoint {
    var center = Math.max(0, Math.min(nFrames - 1, Math.round(time / 0.010)));
    var radius = Math.max(1, Math.round(Math.max(0.010, radiusSec || 0.040) / 0.010));
    var base = softGrooveFrameScore(center);
    var bestFrame = center;
    var bestScore = base;
    for (var sf = Math.max(0, center - radius); sf <= Math.min(nFrames - 1, center + radius); sf++) {
      var dist = Math.abs(sf - center) / Math.max(1, radius);
      var score = softGrooveFrameScore(sf) * (1 - dist * 0.16);
      if (score > bestScore) {
        bestScore = score;
        bestFrame = sf;
      }
    }
    return { frame: bestFrame, time: bestFrame * 0.010, score: bestScore, base: base };
  }

  function scoreSoftGrooveTempoOffset(times: number[], offset: number, step: number): number {
    if (!times || !times.length) return 0;
    var total = 0;
    var weightTotal = 0;
    var localRadius = Math.min(0.026, Math.max(0.014, (step || 0.55) * 0.045));
    var stride = times.length > 720 ? 2 : 1;
    for (var si = 0; si < times.length; si += stride) {
      var t = times[si] + offset;
      if (!isFinite(t) || t < 1.0 || t > decodedBuffer.duration - 0.40) continue;
      var slot = si % 4;
      var slotWeight = slot === 0 ? 1.22 : (slot === 2 ? 1.06 : 0.88);
      var point = bestSoftGrooveFrameNear(t, localRadius);
      total += point.score * slotWeight;
      weightTotal += slotWeight;
    }
    return weightTotal > 0 ? total / weightTotal : 0;
  }

  function estimateSoftGrooveTempoOffset(times: number[], step: number): number {
    if (!softGrooveAnalysis || !times || times.length < 8 || !step) return 0;
    var maxOffset = Math.min(0.20, Math.max(0.075, step * 0.32));
    var baseScore = scoreSoftGrooveTempoOffset(times, 0, step);
    var bestOffset = 0;
    var bestScore = baseScore;
    for (var off = -maxOffset; off <= maxOffset + 0.0001; off += 0.010) {
      var score = scoreSoftGrooveTempoOffset(times, off, step);
      if (score > bestScore) {
        bestScore = score;
        bestOffset = off;
      }
    }
    if (Math.abs(bestOffset) < 0.014) return 0;
    return bestScore > baseScore * 1.055 ? Math.max(-maxOffset, Math.min(maxOffset, bestOffset)) : 0;
  }

  function refineSoftGrooveBeatTime(time: number, step: number): SoftGrooveFramePoint {
    if (!softGrooveAnalysis || !analysisProfile.localRefine) return { time: time, score: 0, base: 0 };
    var radius = Math.min(0.058, Math.max(0.024, (step || 0.55) * 0.095));
    var point = bestSoftGrooveFrameNear(time, radius);
    if (Math.abs(point.time - time) < 0.011) return { time: time, score: point.score, base: point.base };
    if (point.score < point.base * 1.045) return { time: time, score: point.score, base: point.base };
    return { time: point.time, score: point.score, base: point.base };
  }

  return { buffer: buffer, musicTempoTask: musicTempoTask, nFrames: nFrames, energy: energy, bodyEnergy: bodyEnergy, vocalEnergy: vocalEnergy, snapEnergy: snapEnergy, onset: onset, bodyOnset: bodyOnset, vocalOnset: vocalOnset, snapOnset: snapOnset, lowRef: lowRef, bodyRef: bodyRef, vocalRef: vocalRef, snapRef: snapRef, lowOnsetRef: lowOnsetRef, bodyOnsetRef: bodyOnsetRef, vocalOnsetRef: vocalOnsetRef, snapOnsetRef: snapOnsetRef, percentile: percentile, bandAt: bandAt, bestSoftGrooveFrameNear: bestSoftGrooveFrameNear, estimateSoftGrooveTempoOffset: estimateSoftGrooveTempoOffset, refineSoftGrooveBeatTime: refineSoftGrooveBeatTime };
}
