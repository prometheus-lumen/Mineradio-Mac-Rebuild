interface ShelfSettings {
  x: number;
  y: number;
  z: number;
  size: number;
  angle: number;
  opacity: number;
  bgOpacity: number;
  accent: string;
}

interface ShelfCardItem {
  type?: string;
  cover?: string;
  title?: string;
  sub?: string;
  tag?: string;
  playlistId?: string;
  podcastKey?: string;
  queueIndex?: number;
  provider?: string;
  itemType?: string;
}

interface ShelfCard {
  index: number;
  item: ShelfCardItem;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  isCenter: boolean;
  selected: boolean;
  floatMix: number;
  fxPulse: number;
  dofBlur: number;
  dofBucket: number;
  drawKey: string;
}

interface ShelfCardHit {
  card: ShelfCard;
  uv?: Point2D;
  screenPick?: boolean;
}

interface ShelfStageExtras {
  connectorParticles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  floorMirror: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

interface ShelfContentPanel {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

interface ShelfContentPanelModel {
  title: string;
  tracks: PlaylistSong[];
  kind: string;
  sourceCard: ShelfCard | null;
}

interface ShelfContentRow {
  index: number;
  song?: PlaylistSong;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  fxPulse: number;
  lastCenter?: boolean;
}

interface ShelfRowHit {
  row: ShelfContentRow;
  uv?: Point2D;
  screenPick?: boolean;
}

type ShelfRowAction = 'like' | 'collect' | 'next' | 'play';

interface ShelfContentList {
  isOpen(): boolean;
  close(): void;
  open(playlistId: string, title?: string, card?: ShelfCard): void;
  update(dt: number): void;
  refreshTheme(): void;
  raycastRows(raycaster: THREE.Raycaster): ShelfRowHit | null;
  pickRowAtScreen?(x: number, y: number): ShelfRowHit | null;
  raycastPanel?(raycaster: THREE.Raycaster): unknown;
  screenContainsPanel?(x: number, y: number): boolean;
  pulseRow?(row: ShelfContentRow, strength: number): void;
  rowActionAtScreen?(row: ShelfContentRow, x: number, y: number): ShelfRowAction | null;
  getCenterIdx(): number;
  playRow(row: ShelfContentRow): void;
  scrollBy(delta: number): void;
  next(): void;
  prev(): void;
  getRows(): ShelfContentRow[];
}

interface ShelfContentResponse {
  items?: PlaylistSong[];
  tracks?: PlaylistSong[];
}

interface ShelfAction {
  kind: 'loadPlaylist' | 'playQueue' | 'empty';
  playlistId?: string;
  title?: string;
  index?: number;
}

interface ShelfWheelState {
  shelfAcc: number;
  detailAcc: number;
  shelfStepAt: number;
  detailStepAt: number;
  lastAt: number;
}

interface ShelfPointerPosition {
  clientX: number;
  clientY: number;
}

interface ShelfHoverCue {
  target: number;
  value: number;
  x: number;
  y: number;
  lastAt: number;
  enteredAt: number;
  zoneActive: boolean;
  guide: boolean;
}

interface ShelfManager {
  setSelected?(index: number): void;
  onCoverChange?: (src: string) => void;
  update?: (dt: number) => void;
  raycastCards?: (raycaster: THREE.Raycaster) => ShelfCardHit | null;
  getCards?: () => Array<{ item?: { cover?: string } }>;
  setMode?: (mode: string) => void;
  refreshTheme?: () => void;
  rebuild?: (asyncCards?: boolean) => void;
  closeContent?: () => void;
  hasOpenContent?: () => boolean;
  getMode?: () => string;
  clearSelected?: () => void;
  canInteract?: () => boolean;
  pickCardAtScreen?: (x: number, y: number, padding?: number) => ShelfCardHit | null;
  getContentList?: () => ShelfContentList | null;
  scrollBy?: (delta: number) => void;
  getCenterIdx?: () => number;
  openContent?: (index: number) => void;
  playPlaylistAt?: (index: number) => boolean;
  next?: () => void;
  prev?: () => void;
  getCardAt?: (index: number) => ShelfCard | undefined;
  triggerAction?: (action: ShelfAction) => void;
  getOpenContentIndex?: () => number;
}

declare let shelfWheelState: ShelfWheelState;
declare let lastShelfSelectSfxAt: number;
declare let wheelOverShelf: boolean;

interface DeferredShelfRebuild {
  raf: number;
  reason: string;
  asyncCards: boolean;
  token: number;
}

interface ShelfCueRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface Point3D extends Point2D {
  z: number;
}

declare let shelfPinnedOpen: boolean;
declare let shelfManager: ShelfManager | null;
declare let shelfOpenAnimAt: number;
declare let shelfHoverCue: ShelfHoverCue;
declare let shelfVisibility: number;
declare let deferredShelfRebuild: DeferredShelfRebuild;

declare function isPortraitShelfViewport(): boolean;
declare function shouldUseSkullSafeShelfCamera(): boolean;
declare function shelfSettings(): ShelfSettings;
declare function suppressBottomControlsForShelf(durationMs: number): void;
declare function setPeek(element: HTMLElement | null, visible: boolean, key: PeekPanelKey): void;
declare function setFocusZone(zone: string | null, immediate?: boolean): void;
declare function updateShelfHoverCueFromPointer(event: MouseEvent | null): void;
declare function setShelfHoverTabVisible(visible: boolean): void;
declare function scheduleUiWarmTask(task: () => void, delayMs: number): void;
declare function switchPlaylistTab(tab: string): void;
declare function makeShelfManager(): ShelfManager;
declare function makeContentListManager(): ShelfContentList;
