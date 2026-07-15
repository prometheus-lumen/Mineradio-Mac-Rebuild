interface QrCheckResponse extends PlatformStatus {
  code?: number;
  message?: string;
}

declare let podcastListEl: HTMLElement | null;
declare let baseCheckQr: () => Promise<void>;
declare let loginProvider: MusicProvider;
declare let qrKey: string | null;
declare let qqManualCookieOpen: boolean;

declare function renderMyPodcastCollections(options?: { animate?: boolean }): void;
declare function openMyPodcastCollection(key: string, title: string): Promise<void>;
declare function stopQrPoll(): void;
declare function normalizeQQLoginStatus(response: QrCheckResponse): PlatformStatus;
declare function normalizeKugouLoginStatus(response: QrCheckResponse): PlatformStatus;
declare function renderUserBtn(): void;
