function __mineradioInitAudioOfflineAnalysis35() {
  musicTempoLoadPromise = null;

  musicTempoWorkerUrl = null;

  beatAnalysisActiveJob = null;

  beatAnalysisQueueTail = Promise.resolve();

  window.__mineradioBeatAnalysis = function(){
    return {
      busy: !!beatMapBusy,
      active: !!beatAnalysisActiveJob,
      token: beatAnalysisActiveJob ? beatAnalysisActiveJob.token : beatMapToken,
      aborted: !!(beatAnalysisActiveJob && beatAnalysisActiveJob.controller && beatAnalysisActiveJob.controller.signal.aborted),
      worker: !!(beatAnalysisActiveJob && beatAnalysisActiveJob.worker)
    };
  };

  scheduledBeatPulse = 0;

  scheduledBeatFlag = false;
}
