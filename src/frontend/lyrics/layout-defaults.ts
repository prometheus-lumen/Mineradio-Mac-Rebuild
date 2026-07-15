function packagedDefaultLyricLayoutRaw(): Partial<FxSettings> {
  return Object.assign({ desktopLyricsSchema: 'desktop-lyrics-v3' }, clonePackagedDefaultFxSnapshot());
}
