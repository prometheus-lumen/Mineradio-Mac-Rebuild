'use strict';

// Mineradio classic module: core/visual-state.
var beatAnalyser, lastShelfSelectSfxAt, beatFrequencyData, beatTimeDomainData, bass, treble, beatPulse, lyricSunEnergy;

var lyricSunTarget, lyricSunHold, lyricSunAvg, lyricSunPeak, smoothBass, bassPeak, treblePeak, beatOnsetFlag;

var lyricsLines, lyricsVisible, lyricsHasNativeKaraoke, lyricsTimingSource, playlistCoverCache, customCoverMap, customLyricMap, customLyricPrefs;

var localBeatMapCache, localBeatMapPrefs, coverCropState, coverCropBound, lyricSourceMode, originalLyricsState, localBeatAnalysis, visualGuideActive;

var visualGuideStep, visualGuideResizeBound, visualGuideState, homeDiscoverState, homeDiscoverToken, homeVisualPresetActive, homeVisualPrevPreset, coverProcessToken;

var coverDepthCache, coverDepthCacheKeys, beatMapCache, currentBeatMap, beatMapNextIdx, beatMapBusy, beatMapToken, beatAnalysisTimer;

var beatAnalysisStartedAt, beatPrefetchTimer, beatPrefetchBusy, beatPrefetchToken, beatPrefetchLastKey, beatDiskCacheStatus, beatDiskCacheNoticeLogged, djBeatMapCache;

var currentDjBeatMap, djBeatMapNextIdx, djBeatPulseNextIdx, djBeatMapBusy, djBeatMapToken, djBeatAnalysisTimer, beatAnalysisConfig, beatCam;

var liveCamAvg, liveCamPeak, liveCamLastRaw, cinemaDynamics, cinemaTrackProfile, rtBeat, djMode, fxDefaults;

var playbackVisualPreset, startupVisualPreviewActive, fx, legacyBackgroundMediaForMigration, presetTransition, controlsAutoHide, controlsHovering, controlsHideTimer;

var controlsHandleDimTimer, controlsLastMoveAt, controlsShelfSuppressUntil, cursorHideTimer, fxPanelPinned, fxPanelClickHoldUntil, playlistPanelPinned, playlistPanelOpenGuardUntil;

var userCapsuleAutoHide, fxFabAutoHide, fxFabAutoHideRevealArmed, hotkeySettings, immersiveMode, immersiveState, pointerParallax, pointerTarget;

var headParallax, headNeutral, desktopRuntimeState, renderPowerState, backgroundCacheTrimTimer, runtimePerfState, scene, camera;

var renderInteractionBoostUntil, renderInteractionReason, renderer, orbit, camPunch, cinemaT, freeCamera, freeCameraPointer;

var freeCameraDeferredSaveTimer, focusHover, lastCamPunchAt, mouseWorld, mouseActive, mouseDownAt, particlePointerSpin, particlePointerRay;

var particlePointerNdc, particlePointerPlane, particlePointerPlanePoint, particlePointerPlaneNormal, particlePointerWorldHit, particlePointerLocalHit, particlePointerQuat, particlePointerFrame;

var dotTexture, laserDotTexture, particleClockTex, positions, uvs, aRand, coverResolutionReloadTimer, currentCoverSource;

var coverPickerCanvas, geo, rippleData, rippleTex, ripples, ri, coverTex, coverEdgeTex;

var prevCoverTex, uniforms, vs, fs, material, bloomVs, bloomFs, bloomMaterial;

var bloomParticles, particles, laserBeamGroup, laserBeamOpacity, laserBeamGeometry, laserBeamPositions, laserBeamColors, laserBeamPalette;

var laserBeamDefs, lbi, baseAngle, clusterBend, angleJitter, strength, laserBeamMaterial, laserBeamMesh;

var laserCoreGeometry, laserCorePositions, laserCoreColors, lci, lcDef, lca, lcc, lcDirX;

var lcDirY, lcInner, lcOuter, lcBase, laserCoreMaterial, laserCoreLines, laserSparkGeometry, laserSparkPositions;

var laserSparkColors, laserSparkData, lsi, beamIndex, sparkIndex, sparkDef, sparkColor, sp;

var sd, laserSparkMaterial, laserSparkParticles, laserBallGeometry, laserBallPositions, laserBallColors, laserBallData, laserBallColorA;

var laserBallColorB, laserBallColorC, lpi, y, r, theta, facetSeed, tileBand;

var tileShard, mirror, radius, p, rim, glint, col, laserBallMaterial;

var laserBallPoints, hexagramGroup, hexagramOpacity, hexagramGold, hexagramGoldHot, hexagramCyan, hexagramCyanHot, hexagramLineGeometry;

var hexagramLinePositions, hexagramLineColors, hexagramLineData, hexagramSparkPositions, hexagramSparkColors, hexagramSparkData, floatGroup, floatPositionsArr;

var floatBaseArr, floatPhaseArr, floatColorArr, skullAmpPulse, skullBeatFlash, skullJawOpen, skullCameraBlend, skullWheelZoom;

var skullWheelZoomTarget, skullCameraTargetPos, skullCameraTargetLook, skullCameraBasePos, skullCameraBaseLook, skullCameraShelfPos, skullCameraShelfLook, skullCameraMixedLook;

var skullShelfCameraMix, skullLyricMouthLocal, skullLyricMouthTarget, skullLyricMouthForward, skullLyricMouthQuat, skullLyricReadableQuat, skullParticleGroup, skullParticleOpacity;

var skullParticleAsset, skullBaseColors, skullTintScratch, backCoverGroup, backCoverColorArr, stageLyrics, lyricSunColor, lyricSunHotColor;

var lyricCameraDir, lyricCameraRight, lyricCameraUp, lyricCameraTarget, lyricLayoutBase, lyricLayoutTarget, lyricCoverWorldPos, lyricCoverWorldQuat;

var lyricBaseEuler, lyricTiltEuler, lyricBaseQuat, lyricTiltQuat, lyricTargetQuat, lyricViewportCorner, lyricViewportCenter, lyricViewportBasisX;

var lyricViewportBasisY, lyricViewportOffsetX, lyricViewportOffsetY, lyricsParticles, lyricsGeo, lyricsAttrTargetA, lyricsAttrTargetB, lyricsAttrSeed;

var customBgObjectUrl, customBgApplyToken, colorLabState, lyricSunBloomTexture, rippleIdx, lastRippleAt, lastBassRising, regions;

var ry, rx, colorMixTween, alphaTween, floatAlphaTween, loadingTween, loadingShownAt, loadingHideTimer;

var coverDepthTween, musicTempoLoadPromise, musicTempoWorkerUrl, scheduledBeatPulse, scheduledBeatFlag, shelfPinnedOpen, shelfManager, shelfOpenAnimAt;

var shelfHoverCue, shelfVisibility, deferredShelfRebuild, wheelOverShelf, shelfWheelState, homeNowCoverState, lyricColorPresets, coverColorPickerState;

var idleGuideParticles, visualGuideSteps, visualGuideStepsDiy, gestureCamera, particleSpin, splashGlUniforms, customLyricInput;
