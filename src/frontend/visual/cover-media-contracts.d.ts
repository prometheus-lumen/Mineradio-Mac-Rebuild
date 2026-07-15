interface CoverCropRect {
  sx: number;
  sy: number;
  sSize: number;
}

interface CoverCropState {
  img: HTMLImageElement;
  dataUrl: string;
  naturalW: number;
  naturalH: number;
  stageSize: number;
  baseScale: number;
  scaleFactor: number;
  x: number;
  y: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
}

interface CoverParticleResolutionOptions {
  reload?: boolean;
}

declare let coverCropState: CoverCropState | null;
declare let coverCropBound: boolean;
declare let customCoverMap: Record<string, string>;
declare let dropOv: HTMLElement | null;
declare let dragCount: number;
declare let homeCardDragActive: boolean;

declare function isHomeCardInternalDrag(event: DragEvent): boolean;
declare function startColorMixTween(durationMs: number): void;
