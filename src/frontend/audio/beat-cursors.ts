function alignBeatCameraCursorToTime(time: number): void {
  if (!currentBeatMap) return;
  var beats = currentBeatMap.cameraBeats || currentBeatMap.beats || currentBeatMap.kicks || [];
  beatCam.nextIdx = 0;
  while (beatCam.nextIdx < beats.length) {
    var beat = beats[beatCam.nextIdx];
    if (beat === undefined || beatEventTime(beat) >= time + beatCam.lookahead) break;
    beatCam.nextIdx++;
  }
}

function syncBeatMapPlaybackCursor(time: number, preserveVisualState = false): void {
  if (djMode.active) {
    syncPodcastDjMapCursor(time, preserveVisualState);
    return;
  }
  var safeTime = isFinite(time) ? time : 0;
  beatMapNextIdx = 0;
  var pulseEvents = currentBeatMap && (currentBeatMap.pulseBeats || currentBeatMap.kicks);
  if (pulseEvents) {
    while (beatMapNextIdx < pulseEvents.length) {
      var beat = pulseEvents[beatMapNextIdx];
      if (beat === undefined || beatEventTime(beat) >= safeTime) break;
      beatMapNextIdx++;
    }
  }
  if (preserveVisualState) alignBeatCameraCursorToTime(safeTime);
  else syncBeatCameraToTime(safeTime);
}

function syncPodcastDjMapCursor(time: number, preserveVisualState = false): void {
  var safeTime = isFinite(time) ? time : 0;
  djBeatMapNextIdx = 0;
  djBeatPulseNextIdx = 0;
  if (currentDjBeatMap) {
    var cameraEvents = currentDjBeatMap.cameraBeats || currentDjBeatMap.beats || currentDjBeatMap.kicks || [];
    var cameraTime = Math.max(0, safeTime - 0.025);
    while (djBeatMapNextIdx < cameraEvents.length) {
      var cameraBeat = cameraEvents[djBeatMapNextIdx];
      if (cameraBeat === undefined || beatEventTime(cameraBeat) >= cameraTime) break;
      djBeatMapNextIdx++;
    }
    var pulseEvents = currentDjBeatMap.pulseBeats || currentDjBeatMap.kicks || [];
    var pulseTime = Math.max(0, safeTime - 0.035);
    while (djBeatPulseNextIdx < pulseEvents.length) {
      var pulseBeat = pulseEvents[djBeatPulseNextIdx];
      if (pulseBeat === undefined || beatEventTime(pulseBeat) >= pulseTime) break;
      djBeatPulseNextIdx++;
    }
  }
  if (!preserveVisualState) resetBeatCameraSync(safeTime);
}
