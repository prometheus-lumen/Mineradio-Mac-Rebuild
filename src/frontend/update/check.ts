// Update discovery and availability checks.
function updateErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
function updateProgressDetailText() {
  var parts = [];
  if (updatePreviewState.attempts > 1 && updatePreviewState.attempt > 0) {
    parts.push('线路 ' + updatePreviewState.attempt + '/' + updatePreviewState.attempts);
  }
  if (updatePreviewState.sourceLabel) parts.push(updatePreviewState.sourceLabel);
  if (updatePreviewState.received > 0) {
    parts.push(updatePreviewState.total > 0
      ? (formatUpdateBytes(updatePreviewState.received) + ' / ' + formatUpdateBytes(updatePreviewState.total))
      : ('已下载 ' + formatUpdateBytes(updatePreviewState.received)));
  }
  var speed = formatUpdateSpeed(updatePreviewState.speedBps);
  if (speed) parts.push(speed);
  if (updatePreviewState.etaSeconds > 0 && updatePreviewState.etaSeconds < 3600) parts.push('约 ' + updatePreviewState.etaSeconds + ' 秒');
  return parts.join(' · ');
}
function initUpdatePreview() {
  renderUpdatePreviewPanel();
  setUpdatePreviewVisible(false);
  checkLatestUpdate();
}

if (window.desktopWindow && typeof window.desktopWindow.onCheckForUpdates === 'function') {
  window.desktopWindow.onCheckForUpdates(manualCheckForUpdates);
}
setTimeout(initUpdatePreview, 9000);

function setUpdatePreviewVisible(visible: boolean) {
  updatePreviewState.visible = !!visible;
  var entry = document.getElementById('update-entry');
  if (!entry) return;
  entry.classList.toggle('available', updatePreviewState.visible);
  if (!updatePreviewState.visible && window.gsap) {
    window.gsap.killTweensOf(entry);
    window.gsap.set(entry, { autoAlpha: 0, y: 0, clearProps: 'boxShadow,filter,scale' });
    return;
  }
  if (updatePreviewState.visible && window.gsap) {
    window.gsap.fromTo(entry,
      { autoAlpha: 0, y: -6, scale: 0.92, filter: 'blur(6px)' },
      { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.62, delay: 0.18, ease: 'expo.out', overwrite: true }
    );
  }
}

async function checkLatestUpdate(options: { manual?: boolean } = {}) {
  try {
    var data = await apiJson<LatestUpdateInfo>('/api/update/latest?t=' + Date.now());
    applyLatestUpdateInfo(data);
    if (options.manual) {
      if (data && data.updateAvailable) {
        setUpdatePreviewVisible(true);
        openUpdatePanel();
        showToast('发现新版本 v' + updatePreviewState.version);
      } else {
        closeUpdatePanel();
        setUpdatePreviewVisible(false);
        showToast(data && data.error ? '检查更新失败：' + data.error : '当前已是最新版本');
      }
    }
  } catch (e) {
    updatePreviewState.preview = true;
    updatePreviewState.updateAvailable = false;
    updatePreviewState.hero = '当前版本，更新检测已就绪。';
    renderUpdatePreviewPanel();
    setUpdatePreviewVisible(false);
    if (options.manual) {
      closeUpdatePanel();
      showToast('检查更新失败，请稍后重试');
    }
  }
}

function manualCheckForUpdates() {
  showToast('正在检查更新…');
  checkLatestUpdate({ manual: true });
}

function applyLatestUpdateInfo(data: LatestUpdateInfo = {}) {
  var release = data.release || {};
  updatePreviewState.currentVersion = data.currentVersion || updatePreviewState.currentVersion;
  updatePreviewState.version = data.latestVersion || release.version || updatePreviewState.currentVersion;
  updatePreviewState.configured = !!data.configured;
  updatePreviewState.preview = !!data.preview;
  updatePreviewState.updateAvailable = !!data.updateAvailable;
  updatePreviewState.releaseUrl = release.htmlUrl || data.htmlUrl || '';
  updatePreviewState.downloadUrl = release.downloadUrl || data.downloadUrl || '';
  updatePreviewState.patchAvailable = !!(release.patchAvailable && release.patch && release.patch.downloadUrl);
  updatePreviewState.patchUrl = updatePreviewState.patchAvailable ? (release.patch?.downloadUrl || '') : '';
  updatePreviewState.patchFallbackTried = false;
  updatePreviewState.hero = release.summary || (updatePreviewState.updateAvailable ? '发现新版本，建议更新。' : '当前版本，更新检测已就绪。');
  var releaseNotes = Object.prototype.hasOwnProperty.call(release, 'notes') ? release.notes : data.notes;
  updatePreviewState.notes = Array.isArray(releaseNotes)
    ? releaseNotes.filter(function(note){ return typeof note === 'string' && note.trim(); })
    : [];
  renderUpdatePreviewPanel();
  setUpdatePreviewVisible(updatePreviewState.updateAvailable);
  if (updatePreviewState.updateAvailable) startUpdateIconBreathing();
}

function startUpdateIconBreathing() {
  var entry = document.getElementById('update-entry');
  if (!entry || !window.gsap) return;
  var ring = entry.querySelector('.update-ring');
  window.gsap.killTweensOf(entry, 'y,boxShadow');
  window.gsap.set(entry, { autoAlpha: 1 });
  if (ring) window.gsap.killTweensOf(ring);
  window.gsap.to(entry, {
    y: -1.4,
    boxShadow: '0 16px 44px rgba(0,0,0,.32),0 0 24px rgba(244,210,138,.18),0 0 13px rgba(157,184,207,.06),inset 0 1px 0 rgba(255,255,255,.11)',
    duration: 2.6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
  if (ring) {
    window.gsap.to(ring, {
      rotate: 18,
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: '50% 50%'
    });
  }
}

