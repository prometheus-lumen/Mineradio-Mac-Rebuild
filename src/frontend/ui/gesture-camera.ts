async function startGestureControl(): Promise<boolean> {
  if (gestureActive) return true;
  if (gestureStartPromise) return gestureStartPromise;
  var startToken = ++gestureStartToken;
  gestureStartPromise = initializeGestureControl(startToken).finally(function(): void {
    gestureStartPromise = null;
  });
  return gestureStartPromise;
}

async function initializeGestureControl(startToken: number): Promise<boolean> {
  showToast('正在加载手势识别…');
  try {
    forceReleaseGestureResources();
    await sleepGesture(180);
    var access = await requestGestureCameraAccess();
    if (!access.ok) throw cameraAccessError(access.status);
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
    if (startToken !== gestureStartToken) return false;
    var HandsApi = Hands;
    if (typeof HandsApi !== 'function') throw new Error('MediaPipe 手势库未加载完成');
    var video = createGestureVideo();
    gestureVideo = video;
    gestureStream = await acquireGestureMediaStream();
    if (startToken !== gestureStartToken) {
      stopGestureControl();
      return false;
    }
    video.srcObject = gestureStream;
    await waitForGestureVideoReady(video);
    var hands = new HandsApi({ locateFile: function(file): string {
      return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
    }});
    gestureHands = hands;
    hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.48, minTrackingConfidence: 0.48 });
    hands.onResults(handleGestureHandsResult);
    gestureActive = true;
    startGestureFrameLoop();
    if (startToken !== gestureStartToken) {
      stopGestureControl();
      return false;
    }
    prepareHandCanvas();
    showToast('手势已开启: 手掌推开 · 捏合旋转 · 握拳收束');
    showGestureHUD('识别中', 0.18, '摄像头已开启，正在寻找手掌');
    return true;
  } catch (error) {
    console.warn('Gesture failed:', error);
    showToast(gestureStartFailureMessage(error));
    stopGestureControl();
    fx.cam = 'off';
    document.querySelectorAll<HTMLElement>('#cam-seg button').forEach(function(button): void {
      button.classList.toggle('active', button.dataset.cam === 'off');
    });
    return false;
  }
}

function cameraAccessError(status: string): Error {
  var denied = status === 'denied' || status === 'restricted';
  var error = new Error(denied ? '摄像头权限被系统拒绝' : '摄像头权限申请失败');
  error.name = denied ? 'NotAllowedError' : 'CameraAccessError';
  return error;
}

function gestureStartFailureMessage(error: unknown): string {
  var record = error instanceof Error ? error : new Error(String(error));
  var text = record.name + ' ' + record.message;
  if (/NotReadableError|Could not start video source|TrackStartError/i.test(text)) return '手势启动失败: 摄像头正被占用';
  if (/permission|denied|notallowed|NotAllowedError/i.test(text)) return '手势启动失败: 请在系统设置允许摄像头';
  return '手势启动失败: 手势库或摄像头不可用';
}

function createGestureVideo(): HTMLVideoElement {
  var video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  video.style.display = 'none';
  document.body.appendChild(video);
  return video;
}

function handleGestureHandsResult(result: GestureHandsResult): void {
  if (!gestureActive) return;
  var landmarks = result.multiHandLandmarks?.[0];
  if (landmarks) processHandFrame(landmarks);
  else onHandLost();
}

function prepareHandCanvas(): void {
  handCanvas = document.querySelector<HTMLCanvasElement>('#hand-canvas');
  if (!handCanvas) return;
  handCanvasCtx = handCanvas.getContext('2d');
  resizeHandCanvas();
  handCanvas.classList.add('show');
}

function sleepGesture(durationMs: number): Promise<void> {
  return new Promise(function(resolve): void { setTimeout(resolve, durationMs); });
}

async function requestGestureCameraAccess(): Promise<CameraAccessResult> {
  var request = window.desktopWindow?.requestCameraAccess;
  if (!request) return { ok: true, status: 'browser' };
  try {
    return await request();
  } catch (error) {
    return { ok: false, status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}

function gestureVideoConstraints(): MediaStreamConstraints {
  return { audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } };
}

async function acquireGestureMediaStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前环境不支持摄像头访问');
  var sinceStop = performance.now() - gestureLastStopAt;
  if (gestureLastStopAt && sinceStop < 250) await sleepGesture(250 - sinceStop);
  try {
    return await navigator.mediaDevices.getUserMedia(gestureVideoConstraints());
  } catch (error) {
    var message = error instanceof Error ? error.name + ' ' + error.message : String(error);
    if (!/NotReadableError|Could not start video source|TrackStartError/i.test(message)) throw error;
    await sleepGesture(650);
    return navigator.mediaDevices.getUserMedia(gestureVideoConstraints());
  }
}

function forceReleaseGestureResources(): void {
  if (gestureFrameRaf) cancelAnimationFrame(gestureFrameRaf);
  gestureFrameRaf = 0;
  gestureFrameBusy = false;
  try { gestureCamera?.stop(); } catch (error) {}
  try { gestureStream?.getTracks().forEach(function(track): void { track.stop(); }); } catch (error) {}
  try {
    if (gestureVideo?.srcObject instanceof MediaStream) {
      gestureVideo.srcObject.getTracks().forEach(function(track): void { track.stop(); });
    }
    if (gestureVideo) {
      gestureVideo.pause();
      gestureVideo.srcObject = null;
      gestureVideo.load();
      gestureVideo.remove();
    }
  } catch (error) {}
  try { gestureHands?.close(); } catch (error) {}
  gestureVideo = null;
  gestureHands = null;
  gestureCamera = null;
  gestureStream = null;
  gestureActive = false;
  gestureLastStopAt = performance.now();
}

function waitForGestureVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise(function(resolve, reject): void {
    var settled = false;
    var timer = setTimeout(function(): void {
      if (settled) return;
      settled = true;
      reject(new Error('摄像头画面启动超时'));
    }, 4500);
    function finish(): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    }
    function fail(error: unknown): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error('摄像头画面无法播放'));
    }
    video.onloadedmetadata = function(): void { void video.play().then(finish).catch(fail); };
    if (video.readyState >= 2) void video.play().then(finish).catch(fail);
  });
}

function startGestureFrameLoop(): void {
  gestureFrameCount = 0;
  gestureFrameBusy = false;
  if (gestureFrameRaf) cancelAnimationFrame(gestureFrameRaf);
  function tick(): void {
    var video = gestureVideo;
    var hands = gestureHands;
    if (!gestureActive || !video || !hands) return;
    if (!gestureFrameBusy && video.readyState >= 2) {
      gestureFrameBusy = true;
      gestureFrameCount++;
      void hands.send({ image: video }).catch(handleGestureFrameError).finally(function(): void {
        gestureFrameBusy = false;
      });
    }
    gestureFrameRaf = requestAnimationFrame(tick);
  }
  gestureFrameRaf = requestAnimationFrame(tick);
}

function handleGestureFrameError(error: unknown): void {
  var now = performance.now();
  if (now - gestureLastFrameErrorAt <= 1200) return;
  gestureLastFrameErrorAt = now;
  console.warn('Gesture frame failed:', error);
  showGestureHUD('识别初始化中', 0.12, '手势模型还在准备，稍等一下');
}

function stopGestureControl(): void {
  gestureStartPromise = null;
  if (!gestureActive && !gestureVideo && !gestureCamera && !gestureHands && !handCanvas && !gestureStream) return;
  forceReleaseGestureResources();
  pinchState.active = false;
  handLmSmooth = null;
  uniforms.uHandActive.value = 0;
  if (uniforms.uGestureGrip) uniforms.uGestureGrip.value = 0;
  gestureGrip.value = 0;
  gestureGrip.target = 0;
  gestureGrip.openness = 1;
  document.getElementById('gesture-hud')?.classList.remove('show');
  if (handCanvas) {
    handCanvas.classList.remove('show');
    handCanvasCtx?.clearRect(0, 0, handCanvas.width, handCanvas.height);
  }
}
