function applyPodcastDjProfileFromMap(map: BeatMap | null): void {
  if (!map || !djMode.active) return;
  var density = (map.cameraBeats || []).length / Math.max(20, map.duration || 20);
  cinemaTrackProfile.density = density;
  var target = 0.82 + clamp01((density - 1.25) / 1.8) * 0.16;
  target = clampRange(target, 0.76, 1.10);
  cinemaTrackProfile.target = target;
  cinemaTrackProfile.scale += (target - cinemaTrackProfile.scale) * 0.34;
}
