type DomAction = (event: MouseEvent, target: HTMLElement) => void;

const noValueDomActions: Record<string, () => void> = {
  cancelLocalBeatAnalysis,
  clearCustomBackgroundImage,
  clearCustomCoverForCurrent,
  clearGlobalBackgroundMedia,
  clearQueue,
  closeCollectModal,
  closeColorLab,
  closeCoverColorPicker,
  closeCoverCropModal,
  closeCustomLyricModal,
  closeLocalBeatModal,
  closeLoginModal,
  closeMiniQueue,
  closeSourceFallbackNotice,
  closeTrackDetailModal,
  closeUserModal,
  commitCoverCrop,
  confirmAndClearMusicCache,
  createUserFxArchive,
  createPlaylistFromCollect,
  cyclePlayMode,
  deleteCustomLyricForCurrent,
  enableDualAccountView,
  goHome,
  logoutActiveAccount,
  nextTrack,
  nextVisualGuideStep,
  onUserBtnClick,
  openCollectModalForCurrent,
  openHomeInsight,
  openHomeLibrary,
  openMusicCacheDirectory,
  openProviderWebLogin,
  playHomeRecent,
  prevTrack,
  refreshQr,
  requestDualLoginMode,
  resetCustomBackgroundColor,
  resetFx,
  resetHomeAccentColor,
  resetHomeIconColor,
  resetShelfAccentColor,
  resetUiAccentColor,
  resetVisualIconColor,
  resetVisualTintColor,
  importUserFxArchiveFromDialog,
  cancelUserFxArchiveRename,
  saveCustomLyricForCurrent,
  setLyricColorAuto,
  setLyricHighlightAuto,
  showLoginModal,
  shuffleQueue,
  skipLoginAndFocusSearch,
  startLocalBeatAnalysis,
  submitQQCookieLogin,
  toggleControlsAutoHide,
  toggleDiyMode,
  toggleFullscreen,
  toggleImmersiveMode,
  toggleLikeCurrent,
  toggleLyricsPanel,
  togglePlay,
  togglePlaylistPanelPinned,
  toggleQQCookiePanel,
  toggleStrobeCustomBackground,
};

const valueDomActions: Record<string, (value: string) => void> = {
  applyCoverPickerColor,
  openCoverColorPicker,
  openProviderLogin: (value) => openProviderLogin(value as MusicProvider),
  openTrackDetailModal: (value) => openTrackDetailModal(value as 'artist' | 'song'),
  selectLocalBeatMode,
  setActiveAccountProvider: (value) => setActiveAccountProvider(value as MusicProvider),
  setLoginProvider: (value) => setLoginProvider(value as MusicProvider),
  setLyricFont,
  setLyricSourceMode: (value) => setLyricSourceMode(value as LyricSourceMode),
  setPlaybackQuality: (value) => setPlaybackQuality(value as PlaybackQuality),
  setSearchMode,
  setPlaylistSourceFilter,
  switchPlaylistTab,
  toggleFx,
};

const indexDomActions: Record<string, (index: number) => void> = {
  applyUserFxArchive,
  collectArtistDetailSong,
  collectQueueIndex,
  collectSearchResult,
  commitUserFxArchiveRename,
  exportUserFxArchive,
  handleHomeTileClick,
  openPodcastPrograms,
  openQueueArtist,
  openSearchResultArtist,
  playArtistDetailSong,
  playPodcastProgram,
  queueArtistDetailSongNext,
  queueIndexNext,
  queuePodcastProgram,
  queueSearchResult,
  removeFromQueue,
  removeUserFxArchive,
  renameUserFxArchive,
  saveUserFxArchive,
  setLyricColorPreset,
  setPreset,
  toggleLikeQueueIndex,
  toggleLikeSearchResult,
};

const eventDomActions: Record<string, (event: MouseEvent) => void> = {
  clearHomeHeroBackground,
  handleLyricGlowRowClick,
  openFxPanelFromFab,
  pickCoverColorFromArt,
  pickHomeHeroBackground,
  toggleFxFabAutoHide,
  toggleHomeRestoreMenu,
  toggleHomeSettingsMenu,
  toggleHomeSleepPopover,
  toggleLyricGlowLink,
  toggleMiniQueue,
  toggleQualityPanel,
  toggleUserCapsuleAutoHide,
  toggleVolumePanel,
};

const specialDomActions: Record<string, DomAction> = {
  clickTarget: (_event, target) => document.getElementById(target.dataset.targetId || '')?.click(),
  removeClass: (_event, target) => document.getElementById(target.dataset.targetId || '')?.classList.remove(target.dataset.className || ''),
  stopPropagation: (event) => event.stopPropagation(),
  toggleClass: (_event, target) => document.getElementById(target.dataset.targetId || '')?.classList.toggle(target.dataset.className || ''),
};

function runDomAction(event: MouseEvent, target: HTMLElement): void {
  const action = target.dataset.action;
  if (!action) return;
  if (target.dataset.stopPropagation === 'true') event.stopPropagation();
  if (noValueDomActions[action]) noValueDomActions[action]();
  else if (valueDomActions[action]) valueDomActions[action](target.dataset.value || '');
  else if (indexDomActions[action]) indexDomActions[action](Number(target.dataset.index || 0));
  else if (eventDomActions[action]) eventDomActions[action](event);
  else if (action === 'addCollectTargetToPlaylist') addCollectTargetToPlaylist(target.dataset.collectPid || '');
  else if (action === 'playQueueAt') void playQueueAt(Number(target.dataset.index || 0), { manual: true });
  else if (action === 'renderPodcastRadios') renderPodcastRadios(podcastResults);
  else if (action === 'playHomeSong') playHomeSong(Number(target.dataset.index || 0));
  else if (action === 'closeUploadTip') closeUploadTip(target.dataset.boolean === 'true');
  else if (action === 'closeVisualGuide') closeVisualGuide(target.dataset.boolean === 'true');
  else if (action === 'refreshUserPlaylists') refreshUserPlaylists(target.dataset.boolean === 'true');
  else if (action === 'startVisualGuide') startVisualGuide({ manual: target.dataset.manual === 'true' });
  else specialDomActions[action]?.(event, target);
}

function bindDomActionTarget(target: HTMLElement): void {
  if (target.dataset.action && !target.dataset.clickActionBound) {
    target.dataset.clickActionBound = 'true';
    target.addEventListener('click', (event) => runDomAction(event, target), mineradioEventOptions());
  }
  if (target.dataset.keydownAction === 'handleUserFxArchiveRenameKey' && !target.dataset.keyActionBound) {
    target.dataset.keyActionBound = 'true';
    target.addEventListener('keydown', (event) => {
      handleUserFxArchiveRenameKey(event, Number(target.dataset.index || 0));
    }, mineradioEventOptions());
  }
  if (target.dataset.fadeOnError && !target.dataset.errorActionBound) {
    target.dataset.errorActionBound = 'true';
    target.addEventListener('error', () => {
      target.style.opacity = target.dataset.fadeOnError || '';
    }, mineradioEventOptions());
  }
}

function bindDomActionTree(root: ParentNode): void {
  if (root instanceof HTMLElement) bindDomActionTarget(root);
  root.querySelectorAll<HTMLElement>('[data-action],[data-keydown-action],[data-fade-on-error]')
    .forEach(bindDomActionTarget);
}

function bindDomActions(): void {
  bindDomActionTree(document);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) bindDomActionTree(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const lifecycleOptions = mineradioEventOptions() as AddEventListenerOptions;
  lifecycleOptions.signal?.addEventListener('abort', () => observer.disconnect(), { once: true });

  const coverArt = document.getElementById('cover-color-art');
  coverArt?.addEventListener('mousemove', moveCoverColorLoupe, mineradioEventOptions());
  coverArt?.addEventListener('mouseleave', hideCoverColorLoupe, mineradioEventOptions());
}
