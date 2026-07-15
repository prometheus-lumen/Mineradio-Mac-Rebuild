function laserBeamRand(seed: number): number {
  const value = Math.sin(seed * 127.1 + 41.7) * 43758.5453123;
  return value - Math.floor(value);
}

function updateLaserBeamLayer(_deltaTime: number): void {
  // The legacy laser preset is retired; keep the frame hook stable for callers.
}
