interface VisualGuideStep {
  target?: string;
  selector?: string;
  kicker: string;
  title: string;
  body: string;
}

interface VisualGuideOptions {
  source?: string;
  manual?: boolean;
}

interface VisualGuideState {
  bottomWasVisible: boolean;
  searchWasPeek: boolean;
  fxWasPeek?: boolean;
  plWasPeek?: boolean;
  mode?: 'diy' | 'simple';
  manual: boolean;
}

declare let visualGuideActive: boolean;
declare let visualGuideStep: number;
declare let visualGuideResizeBound: boolean;
declare let visualGuideState: VisualGuideState;
declare let visualGuideSteps: VisualGuideStep[];
declare let visualGuideStepsDiy: VisualGuideStep[];

declare function setShelfGuideCueActive(enabled: boolean): void;
declare function closeMiniQueue(): void;
declare function closeUploadTip(remember: boolean): void;
declare function revealBottomControls(durationMs: number): void;
declare function guideTargetRect(step: VisualGuideStep | null): ShelfCueRect | DOMRect;
declare function handleVisualGuideSurfaceClick(event: MouseEvent): void;
declare function setLyricGlowLinked(linked: boolean, openPicker?: boolean): void;
declare function isTypingTarget(target: EventTarget | null): boolean;
declare function toggleFxPanel(force?: boolean): void;
declare function togglePlaylistPanel(force?: boolean): void;
declare function isFxPanelClickHoldActive(): boolean;

interface DiyModeOptions {
  save?: boolean;
  toast?: boolean;
  animate?: boolean;
}

interface FullscreenDiyRect extends ShelfCueRect {}
type PeekPanelKey = 'search' | 'fx' | 'pl';
declare let peekTimers: Record<PeekPanelKey, ReturnType<typeof setTimeout> | null>;
declare let uploadTipTimer: ReturnType<typeof setTimeout> | null;
declare let uploadTipAttempts: number;
declare let queueViewTab: string;
declare function guardPlaylistPanelOpen(durationMs: number): void;
declare function scrollPlaylistPanelToCurrent(): void;
declare function flushDeferredQueuePanel(reason: string): void;

interface SecondaryPlaylistEdgeGuard {
  enteredAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  x: number;
  y: number;
  H: number;
}

interface DesktopDisplayState {
  isPrimaryDisplay?: boolean;
  hasDisplayOnLeft?: boolean;
}

declare let secondaryPlaylistEdgeGuard: SecondaryPlaylistEdgeGuard;
declare function shouldSuppressDefaultConfiguredHotkey(event: KeyboardEvent): boolean;
declare function goHome(): void;
declare function toggleLyricsPanel(): void;
declare function safeShelfCloseContent(reason: string): void;
declare function scheduleMainRendererViewportRefresh(reason: string): void;
declare function updateShelfCardHoverSelection(event: MouseEvent | null): void;
declare function shouldClosePlaylistPanelFromPointer(open: boolean, x: number, rect: DOMRect): boolean;
declare function isSideShelfFocusHit(event: MouseEvent): boolean;
declare let reduceSplashMotion: boolean;
declare let loginGuideAnimating: boolean;
declare let loginGuideRaf: number | null;
declare let startupLoginGuideShown: boolean;
declare let loginStatusChecked: boolean;
declare let loginStatusCheckFailed: boolean;
declare let audioGesturePrimeActive: boolean;
declare function isBottomControlsSuppressedForShelf(): boolean;
declare function closeUserModal(): void;
declare function closeCollectModal(): void;
declare function closeCoverCropModal(): void;
declare function closeCustomLyricModal(): void;
declare function closeLocalBeatModal(): void;
declare function setShelfPinnedOpen(pinned: boolean, immediate: boolean): void;


declare function shouldSuppressFullscreenDiyPeek(): boolean;
declare function layoutFullscreenDiyZone(): FullscreenDiyRect;
