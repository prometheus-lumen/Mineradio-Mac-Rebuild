function pushHexLinePoint(x: number, y: number, z: number, color: THREE.Color, phase: number, drift: number, pulse: number): void {
  hexagramLinePositions.push(x, y, z);
  hexagramLineColors.push(color.r, color.g, color.b);
  hexagramLineData.push(phase, drift, pulse);
}

function pushHexSegment(ax: number, ay: number, bx: number, by: number, colorA: THREE.Color, colorB: THREE.Color, phase: number, drift: number, pulse: number): void {
  pushHexLinePoint(ax, ay, 0.18, colorA, phase, drift, pulse);
  pushHexLinePoint(bx, by, 0.18, colorB, phase + 0.37, drift, pulse);
}

function pushHexPolyline(points: Point2D[], colorA: THREE.Color, colorB: THREE.Color, phase: number, drift: number, pulse: number): void {
  for (var i = 0; i < points.length - 1; i++) {
    var mixT = i / Math.max(1, points.length - 2);
    var ca = colorA.clone().lerp(colorB, mixT);
    var cb = colorA.clone().lerp(colorB, Math.min(1, mixT + 1 / Math.max(1, points.length - 2)));
    pushHexSegment(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, ca, cb, phase + i * 0.19, drift, pulse);
  }
}

function pushHexSpark(x: number, y: number, z: number, color: THREE.Color, phase: number, radius: number, kind: number): void {
  hexagramSparkPositions.push(x, y, z);
  hexagramSparkColors.push(color.r, color.g, color.b);
  hexagramSparkData.push(phase, radius, kind);
}
