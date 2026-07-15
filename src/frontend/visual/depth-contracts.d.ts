interface CoverDepthCacheEntry {
  canvas: HTMLCanvasElement;
  ai: boolean;
  at: number;
}

interface AnimationFrameTween {
  raf: number;
}

interface DepthResult {
  depth?: DepthCanvasResult;
  predicted_depth?: DepthCanvasResult;
  toCanvas?: () => Promise<HTMLCanvasElement>;
}

interface DepthCanvasResult {
  toCanvas?: () => Promise<HTMLCanvasElement>;
}

type DepthPipeline = (input: string | HTMLCanvasElement) => Promise<DepthResult>;

interface TransformersModule {
  env: {
    allowLocalModels: boolean;
    backends?: { onnx?: { wasm?: { numThreads: number } } };
  };
  pipeline: (task: string, model: string) => Promise<DepthPipeline>;
}

declare let aiDepthReady: boolean;
declare let aiDepthPipeline: DepthPipeline | null;
declare let aiDepthBusy: boolean;
declare let aiDepthFailUntil: number;
declare let aiDepthLastRunAt: number;
declare let aiDepthMinGapMs: number;
declare let coverProcessToken: number;
declare let coverEdgeTex: THREE.Texture;
declare function coverApplyStillCurrent(options: CoverLoadOptions): boolean;
declare function yieldToIdle(timeoutMs: number): Promise<void>;
declare let floatAlphaTween: AnimationFrameTween | null;
declare let loadingTween: AnimationFrameTween | null;
declare let loadingShownAt: number;
declare let loadingHideTimer: ReturnType<typeof setTimeout> | null;
declare let coverDepthTween: AnimationFrameTween | null;
declare let colorMixTween: AnimationFrameTween | null;
declare let alphaTween: AnimationFrameTween | null;
