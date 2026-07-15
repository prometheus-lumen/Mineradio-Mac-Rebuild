interface RippleState {
  x: number;
  y: number;
  age: number;
  str: number;
}

declare let floatGroup: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
declare let floatColorArr: Float32Array | null;
declare let ripples: RippleState[];
declare let rippleIdx: number;
declare let rippleData: Float32Array;
declare let rippleTex: THREE.DataTexture;
declare let lastBassRising: boolean;
declare let lastRippleAt: number;
declare let regions: Point2D[];
declare var RIPPLE_MAX: number;
declare var PLANE_SIZE: number;
