type DesktopOverlayChannel = 'touchBar' | 'lyrics' | 'wallpaper';

interface DesktopOverlayPayload {
  [key: string]: unknown;
  beatMap?: PackedLocalBeatMap | null;
  beatMapKey?: string;
  colors?: Record<string, string>;
  imageData?: string;
  progress?: number;
  text?: string;
  title?: string;
}

interface DesktopOverlayQueueState {
  coalesced: number;
  completed: number;
  inFlight: boolean;
  pending: DesktopOverlayPayload | null;
  sent: number;
}

type DesktopOverlayIpcState = Record<DesktopOverlayChannel, DesktopOverlayQueueState>;

interface DesktopWindowState extends DesktopDisplayState {
  isFullScreen?: boolean;
  isHtmlFullScreen?: boolean;
  isMaximized?: boolean;
  isNativeFullScreen?: boolean;
  isWindowFullScreen?: boolean;
}

interface DesktopSongMeta { title: string; artist: string; cover: string; }
interface DesktopLyricSnapshot { text: string; progress: number; progressSpan: number; }
interface TouchBarLyricsPayload extends DesktopOverlayPayload {
  colors: Record<string, string>;
  liked: boolean;
  playing: boolean;
  progress: number;
  progressSpan: number;
  text: string;
  title: string;
}
