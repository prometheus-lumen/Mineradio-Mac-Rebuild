interface ParticleClockTextureState {
  canvas: HTMLCanvasElement;
  lastText: string;
  lastSecond: number;
}

interface ParticleClockTexture extends THREE.CanvasTexture {
  userData: ParticleClockTextureState;
}

declare let hexagramGroup: THREE.Group;
declare let hexagramOpacity: number;
declare let hexagramGold: THREE.Color;
declare let hexagramGoldHot: THREE.Color;
declare let hexagramCyan: THREE.Color;
declare let hexagramCyanHot: THREE.Color;
declare let hexagramLineGeometry: THREE.BufferGeometry;
declare let floatPositionsArr: Float32Array | null;
declare let floatBaseArr: Float32Array | null;
declare let floatPhaseArr: Float32Array | null;
