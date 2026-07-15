function applyStageLyricLayoutOffset(
  target: THREE.Vector3,
  x: number,
  y: number,
  z: number
): THREE.Vector3 {
  return target
    .addScaledVector(lyricCameraRight, x || 0)
    .addScaledVector(lyricCameraUp, y || 0)
    .addScaledVector(lyricCameraDir, z || 0);
}
