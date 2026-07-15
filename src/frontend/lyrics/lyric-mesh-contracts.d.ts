interface LyricMask {
  texture: THREE.Texture;
  width: number;
  height: number;
  textWidth: number;
  textHeight: number;
  fontSize: number;
  lineHeight: number;
  lineCount: number;
  lines: string[];
  fitScaleX: number;
  textMin: number;
  textMax: number;
}

interface LyricTextureMetadata {
  width?: number;
  height?: number;
  textWidth?: number;
  mineradioShared?: boolean;
}

interface LyricCanvasTexture extends THREE.Texture {
  userData: LyricTextureMetadata;
}

interface LyricDisposableMaterial extends THREE.Material {
  map?: THREE.Texture | null;
  uniforms?: { uMap?: { value?: THREE.Texture | null } };
}

interface LyricRenderableObject extends THREE.Object3D {
  material?: LyricDisposableMaterial | LyricDisposableMaterial[];
  geometry?: THREE.BufferGeometry;
}

declare let lyricSunBloomTexture: LyricCanvasTexture | null;
