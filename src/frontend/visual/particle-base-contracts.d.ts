declare let positions: Float32Array | null;
declare let uvs: Float32Array | null;
declare let aRand: Float32Array | null;
declare let geo: THREE.BufferGeometry;
declare let material: THREE.ShaderMaterial;
declare let bloomMaterial: THREE.ShaderMaterial;
declare let vs: string;
declare let fs: string;
declare let bloomVs: string;
declare let bloomFs: string;
declare let prevCoverTex: THREE.Texture;
declare let coverResolutionReloadTimer: ReturnType<typeof setTimeout> | null;

declare function coverParticleGridForResolution(value: number): number;
declare function buildCoverParticleGeometry(grid: number): THREE.BufferGeometry;
