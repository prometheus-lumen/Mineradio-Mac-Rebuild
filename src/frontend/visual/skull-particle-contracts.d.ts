interface SkullVisualTint {
  color: string;
  strength: number;
  custom: boolean;
}

interface SkullParticleAssetState {
  data: Float32Array | null;
  promise: Promise<Float32Array | null> | null;
  failed: boolean;
}

interface SkullColorSet {
  boneA: THREE.Color;
  boneB: THREE.Color;
  shadow: THREE.Color;
  light: THREE.Color;
  neutralBoneA: THREE.Color;
  neutralBoneB: THREE.Color;
  neutralShadow: THREE.Color;
  neutralLight: THREE.Color;
}

interface SkullTintScratch {
  tint: THREE.Color;
  soft: THREE.Color;
  bright: THREE.Color;
  dark: THREE.Color;
  boneA: THREE.Color;
  boneB: THREE.Color;
  shadow: THREE.Color;
  light: THREE.Color;
}

interface SkullViewResetOptions {
  smooth?: boolean;
  keepLyricLock?: boolean;
}

declare let skullParticleAsset: SkullParticleAssetState;
declare let skullBaseColors: SkullColorSet;
declare let skullTintScratch: SkullTintScratch;
declare let skullParticleOpacity: number;
declare let skullAmpPulse: number;
declare let skullBeatFlash: number;
declare let skullJawOpen: number;
declare let skullCameraBlend: number;
declare let skullWheelZoom: number;
declare let skullShelfCameraMix: number;
declare let skullCameraTargetPos: THREE.Vector3;
declare let skullCameraTargetLook: THREE.Vector3;
declare let skullCameraBasePos: THREE.Vector3;
declare let skullCameraBaseLook: THREE.Vector3;
declare let skullCameraShelfPos: THREE.Vector3;
declare let skullCameraShelfLook: THREE.Vector3;
declare let skullCameraMixedLook: THREE.Vector3;
declare let skullLyricMouthLocal: THREE.Vector3;
declare let skullLyricMouthTarget: THREE.Vector3;
declare let skullLyricMouthForward: THREE.Vector3;
declare let skullLyricMouthQuat: THREE.Quaternion;
declare let skullLyricReadableQuat: THREE.Quaternion;
declare let backCoverColorArr: Float32Array | null;
