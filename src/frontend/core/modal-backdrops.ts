function bindModalBackdropClose(): void {
  const bindings: Array<[string, () => void]> = [
    ['track-detail-modal', closeTrackDetailModal],
    ['login-modal', closeLoginModal],
    ['user-modal', closeUserModal],
    ['custom-lyric-modal', closeCustomLyricModal],
  ];
  bindings.forEach(([id, close]) => bindBackdropClose(id, close));
}
