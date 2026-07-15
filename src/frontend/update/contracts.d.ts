type UpdateTimer = ReturnType<typeof setInterval>;

interface UpdatePreviewState {
  visible: boolean;
  open: boolean;
  status: string;
  progress: number;
  timer: UpdateTimer | null;
  pollTimer: UpdateTimer | null;
  downloadJobId: string;
  patchJobId: string;
  mode: string;
  installerPath: string;
  installerOpened: boolean;
  cached: boolean;
  currentVersion: string;
  version: string;
  configured: boolean;
  preview: boolean;
  updateAvailable: boolean;
  releaseUrl: string;
  downloadUrl: string;
  patchAvailable: boolean;
  patchUrl: string;
  received: number;
  total: number;
  speedBps: number;
  etaSeconds: number;
  sourceLabel: string;
  attempt: number;
  attempts: number;
  errorReason: string;
  errorDetail: string;
  failedAttempts: unknown[];
  message: string;
  restartRequired: boolean;
  restartStarted: boolean;
  patchFallbackTried: boolean;
  hero: string;
  notes: string[];
}

interface UpdateReleaseInfo {
  version?: string;
  htmlUrl?: string;
  downloadUrl?: string;
  patchAvailable?: boolean;
  patch?: { downloadUrl?: string };
  summary?: string;
  notes?: unknown;
}

interface LatestUpdateInfo {
  currentVersion?: string;
  latestVersion?: string;
  configured?: boolean;
  preview?: boolean;
  updateAvailable?: boolean;
  htmlUrl?: string;
  downloadUrl?: string;
  notes?: unknown;
  error?: string;
  release?: UpdateReleaseInfo;
}

interface UpdateDownloadJob {
  ok?: boolean;
  id?: string;
  status?: string;
  mode?: string;
  progress?: number;
  received?: number;
  total?: number;
  speedBps?: number;
  etaSeconds?: number;
  sourceLabel?: string;
  attempt?: number;
  attempts?: number;
  error?: string;
  errorReason?: string;
  errorDetail?: string;
  failedAttempts?: unknown[];
  message?: string;
  restartRequired?: boolean;
  cached?: boolean;
  filePath?: string;
}

interface MineradioDesktopApi {
  onCheckForUpdates?: (callback: () => void) => void;
  restartApp?: () => Promise<unknown>;
  openUpdateInstaller?: (filePath: string) => Promise<{ ok?: boolean; error?: string } | null>;
}

declare let updatePreviewState: UpdatePreviewState;
declare function formatUpdateBytes(value: unknown): string;
declare function formatUpdateSpeed(value: unknown): string;
