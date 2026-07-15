'use strict';

// Mineradio classic module: audio/offline-analysis.
function optionalIdleCallback(): typeof requestIdleCallback | null {
  var candidate = (window as unknown as Record<string, unknown>).requestIdleCallback;
  return typeof candidate === 'function' ? candidate as typeof requestIdleCallback : null;
}

function yieldToPaint(): Promise<void> {
  return new Promise<void>(function(resolve) {
    if (isHiddenForBackgroundOptimization() || typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0);
    } else {
      requestAnimationFrame(function(){ setTimeout(resolve, 0); });
    }
  });
}

function yieldToIdle(timeout = 1200): Promise<void> {
  return new Promise<void>(function(resolve) {
    if (isHiddenForBackgroundOptimization()) {
      setTimeout(resolve, Math.min(timeout || 80, 80));
      return;
    }
    var idle = optionalIdleCallback();
    if (idle) {
      idle(function(){ resolve(); }, { timeout: timeout || 1200 });
    } else {
      setTimeout(resolve, timeout ? Math.min(timeout, 600) : 160);
    }
  });
}

function scheduleAnalysisTask(fn: () => void, timeout = 900): void {
  if (isHiddenForBackgroundOptimization()) {
    setTimeout(fn, 0);
    return;
  }
  var idle = optionalIdleCallback();
  if (idle) {
    idle(fn, { timeout: timeout || 900 });
  } else {
    setTimeout(fn, Math.min(timeout || 420, 420));
  }
}

function scheduleVisualApply(fn: () => void, delay = 0, timeout = 360): void {
  setTimeout(function(){
    if (isHiddenForBackgroundOptimization() || typeof requestAnimationFrame !== 'function') {
      fn();
      return;
    }
    var run = function(){ requestAnimationFrame(fn); };
    var idle = optionalIdleCallback();
    if (idle) idle(run, { timeout: timeout || 360 });
    else run();
  }, delay || 0);
}

function scheduleUiWarmTask(fn: () => void, timeout = 220): void {
  var run = function(){ requestAnimationFrame(fn); };
  if (isHiddenForBackgroundOptimization() || typeof requestAnimationFrame !== 'function') {
    setTimeout(fn, 0);
  } else if (optionalIdleCallback()) {
    optionalIdleCallback()!(run, { timeout: timeout || 220 });
  } else {
    requestAnimationFrame(fn);
  }
}

function cancelBeatAnalysisTimer(): void {
  if (beatAnalysisTimer) {
    clearTimeout(beatAnalysisTimer);
    beatAnalysisTimer = null;
  }
  cancelActiveBeatAnalysis();
}

function cancelActiveBeatAnalysis(): void {
  var job = beatAnalysisActiveJob;
  if (!job) return;
  if (job.controller) {
    try { job.controller.abort(); } catch (e) {}
  }
  if (job.worker) {
    try { job.worker.terminate(); } catch (e) {}
    job.worker = null;
  }
}

function isBeatAnalysisCancelled(token: number, job: BeatAnalysisJob | null): boolean {
  return token !== beatMapToken || !job || job !== beatAnalysisActiveJob || !!(job.controller && job.controller.signal.aborted);
}

function beatAnalysisYieldMs(options: BeatAnalysisOptions = {}, currentMs?: number, prefetchMs?: number): number {
  options = options || {};
  if (options.prefetch) return prefetchMs == null ? 620 : prefetchMs;
  if (options.background) return currentMs == null ? 120 : currentMs;
  return Math.min(currentMs == null ? 120 : currentMs, 160);
}

function beatBandRms(data: Uint8Array, sampleRate: number, fftSize: number, hz0: number, hz1: number): number {
  var binHz = sampleRate / fftSize;
  var a = Math.max(1, Math.floor(hz0 / binHz));
  var b = Math.min(data.length - 1, Math.ceil(hz1 / binHz));
  var sum = 0, count = 0;
  for (var i = a; i <= b; i++) {
    var v = data[i] / 255;
    sum += v * v;
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

// ============================================================
//  离线节拍预解析 (v7.2)
//    流程: fetch 完整音频 → OfflineAudioContext.decodeAudioData
//          → 低通滤波 (只保留 60-150Hz, 即 kick 频段)
//          → 短时能量曲线 → 自适应阈值检测峰值
//          → 输出 kick 时间戳数组 (单位: 秒)
//    优点: 完全规避人声干扰; 预先准备好节奏表
//    缺点: 每首歌首次要 1-3 秒
// ============================================================
