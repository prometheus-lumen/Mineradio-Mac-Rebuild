// Update download, patch, and installer workflow.
async function startRealUpdateDownload() {
  if (updatePreviewState.status === 'downloading' || updatePreviewState.status === 'opening') return;
  if (updatePreviewState.status === 'ready' && updatePreviewState.installerPath) {
    openDownloadedUpdateInstaller(updatePreviewState.installerPath);
    return;
  }
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
  updatePreviewState.status = 'downloading';
  updatePreviewState.progress = 0;
  updatePreviewState.mode = 'installer';
  updatePreviewState.downloadJobId = '';
  updatePreviewState.installerPath = '';
  updatePreviewState.installerOpened = false;
  updatePreviewState.cached = false;
  updatePreviewState.received = 0;
  updatePreviewState.total = 0;
  updatePreviewState.speedBps = 0;
  updatePreviewState.etaSeconds = 0;
  updatePreviewState.sourceLabel = '';
  updatePreviewState.attempt = 0;
  updatePreviewState.attempts = 0;
  updatePreviewState.errorReason = '';
  updatePreviewState.errorDetail = '';
  updatePreviewState.failedAttempts = [];
  updatePreviewState.message = '正在下载完整安装包';
  updateUpdatePreviewProgress(0);
  try {
    var job = await apiJson<UpdateDownloadJob>('/api/update/download', { method: 'POST' });
    if (!job || job.ok === false || !job.id) throw new Error((job && job.error) || 'UPDATE_DOWNLOAD_START_FAILED');
    var jobId = job.id;
    updatePreviewState.downloadJobId = jobId;
    applyUpdateDownloadJob(job);
    updatePreviewState.pollTimer = setInterval(function(){
      pollUpdateDownloadJob(jobId);
    }, 360);
  } catch (e) {
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = updateErrorMessage(e, '更新下载启动失败');
    updatePreviewState.errorDetail = updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(0);
    showToast('更新下载启动失败：' + updatePreviewState.errorReason);
  }
}
async function startRealUpdatePatch() {
  if (updatePreviewState.status === 'downloading' || updatePreviewState.status === 'opening') return;
  if (updatePreviewState.status === 'ready' && updatePreviewState.mode === 'patch') {
    restartForAppliedPatch();
    return;
  }
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
  updatePreviewState.status = 'downloading';
  updatePreviewState.mode = 'patch';
  updatePreviewState.progress = 0;
  updatePreviewState.patchJobId = '';
  updatePreviewState.installerPath = '';
  updatePreviewState.installerOpened = false;
  updatePreviewState.cached = false;
  updatePreviewState.received = 0;
  updatePreviewState.total = 0;
  updatePreviewState.speedBps = 0;
  updatePreviewState.etaSeconds = 0;
  updatePreviewState.sourceLabel = '';
  updatePreviewState.attempt = 0;
  updatePreviewState.attempts = 0;
  updatePreviewState.errorReason = '';
  updatePreviewState.errorDetail = '';
  updatePreviewState.failedAttempts = [];
  updatePreviewState.patchFallbackTried = false;
  updatePreviewState.restartStarted = false;
  updatePreviewState.message = '正在下载快速补丁';
  updateUpdatePreviewProgress(0);
  try {
    var job = await apiJson<UpdateDownloadJob>('/api/update/patch', { method: 'POST' });
    if (!job || job.ok === false || !job.id) throw new Error((job && job.error) || 'UPDATE_PATCH_START_FAILED');
    var jobId = job.id;
    updatePreviewState.patchJobId = jobId;
    applyUpdateDownloadJob(job);
    updatePreviewState.pollTimer = setInterval(function(){
      pollUpdatePatchJob(jobId);
    }, 320);
  } catch (e) {
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = updateErrorMessage(e, '快速补丁不可用');
    updatePreviewState.errorDetail = updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updatePreviewState.patchFallbackTried = true;
    showToast('快速补丁不可用，正在切换完整安装包');
    setTimeout(startRealUpdateDownload, 350);
  }
}

async function pollUpdateDownloadJob(id: string) {
  if (!id) return;
  try {
    var job = await apiJson<UpdateDownloadJob>('/api/update/download/status?id=' + encodeURIComponent(id) + '&t=' + Date.now());
    applyUpdateDownloadJob(job);
  } catch (e) {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = '更新下载状态读取失败';
    updatePreviewState.errorDetail = updateErrorMessage(e, updatePreviewState.errorReason);
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(updatePreviewState.progress || 0);
    showToast('更新下载状态读取失败');
  }
}
async function pollUpdatePatchJob(id: string) {
  if (!id) return;
  try {
    var job = await apiJson<UpdateDownloadJob>('/api/update/patch/status?id=' + encodeURIComponent(id) + '&t=' + Date.now());
    applyUpdateDownloadJob(job);
  } catch (e) {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = '快速补丁状态读取失败';
    updatePreviewState.errorDetail = updateErrorMessage(e, updatePreviewState.errorReason);
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(updatePreviewState.progress || 0);
    showToast('快速补丁状态读取失败');
  }
}

function applyUpdateDownloadJob(job: UpdateDownloadJob | null | undefined) {
  if (!job || job.ok === false || job.status === 'error') {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.mode = (job && job.mode) || updatePreviewState.mode || 'installer';
    updatePreviewState.received = Number(job && job.received || 0);
    updatePreviewState.total = Number(job && job.total || 0);
    updatePreviewState.speedBps = Number(job && job.speedBps || 0);
    updatePreviewState.etaSeconds = Number(job && job.etaSeconds || 0);
    updatePreviewState.sourceLabel = (job && job.sourceLabel) || updatePreviewState.sourceLabel || '';
    updatePreviewState.attempt = Number(job && job.attempt || 0);
    updatePreviewState.attempts = Number(job && job.attempts || 0);
    updatePreviewState.errorReason = (job && (job.errorReason || job.message || job.error)) || '请稍后重试';
    updatePreviewState.errorDetail = (job && job.errorDetail) || '';
    updatePreviewState.failedAttempts = job && Array.isArray(job.failedAttempts) ? job.failedAttempts : [];
    updatePreviewState.message = (job && job.message) || updatePreviewState.errorReason;
    updatePreviewState.status = 'error';
    updateUpdatePreviewProgress(job && job.progress || updatePreviewState.progress || 0);
    if (updatePreviewState.mode === 'patch' && updatePreviewState.downloadUrl && !updatePreviewState.patchFallbackTried) {
      updatePreviewState.patchFallbackTried = true;
      showToast('快速补丁失败，正在切换完整安装包');
      setTimeout(startRealUpdateDownload, 350);
      return;
    }
    showToast('更新下载失败：' + updatePreviewState.errorReason);
    return;
  }
  if (job.id) updatePreviewState.downloadJobId = job.id;
  updatePreviewState.mode = job.mode || updatePreviewState.mode || 'installer';
  if (updatePreviewState.mode === 'patch') updatePreviewState.patchJobId = job.id || updatePreviewState.patchJobId;
  updatePreviewState.received = Number(job.received || 0);
  updatePreviewState.total = Number(job.total || 0);
  updatePreviewState.speedBps = Number(job.speedBps || 0);
  updatePreviewState.etaSeconds = Number(job.etaSeconds || 0);
  updatePreviewState.sourceLabel = job.sourceLabel || '';
  updatePreviewState.attempt = Number(job.attempt || 0);
  updatePreviewState.attempts = Number(job.attempts || 0);
  updatePreviewState.errorReason = job.errorReason || '';
  updatePreviewState.errorDetail = job.errorDetail || '';
  updatePreviewState.failedAttempts = Array.isArray(job.failedAttempts) ? job.failedAttempts : [];
  updatePreviewState.message = job.message || '';
  updatePreviewState.restartRequired = !!job.restartRequired;
  updatePreviewState.cached = !!job.cached;
  if (job.status === 'downloading' || job.status === 'queued') {
    updatePreviewState.status = 'downloading';
    updateUpdatePreviewProgress(job.progress || 0);
    return;
  }
  if (job.status === 'ready') {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'ready';
    updatePreviewState.installerPath = job.filePath || '';
    updateUpdatePreviewProgress(100);
    pulseUpdateReady();
    if (updatePreviewState.mode === 'patch') {
      if (updatePreviewState.restartRequired) {
        showToast('快速补丁已应用，正在自动重启');
        setTimeout(restartForAppliedPatch, 500);
      } else {
        showToast('快速补丁已应用');
      }
    } else if (updatePreviewState.installerPath) {
      showToast(updatePreviewState.cached ? '已复用上次下载的安装包，正在打开' : '安装包已下载并校验，正在打开');
      setTimeout(function(){ openDownloadedUpdateInstaller(updatePreviewState.installerPath); }, 350);
    }
  }
}
async function restartForAppliedPatch() {
  if (!updatePreviewState.restartRequired || updatePreviewState.restartStarted) return;
  updatePreviewState.restartStarted = true;
  syncUpdatePreviewStateClass();
  try {
    if (window.desktopWindow && typeof window.desktopWindow.restartApp === 'function') {
      await window.desktopWindow.restartApp();
      return;
    }
  } catch (e) {}
  updatePreviewState.restartStarted = false;
  syncUpdatePreviewStateClass();
  showToast('请手动重启 Mineradio 让补丁生效');
}

async function openDownloadedUpdateInstaller(filePath: string) {
  if (!filePath) return;
  if (updatePreviewState.installerOpened) return;
  updatePreviewState.status = 'opening';
  syncUpdatePreviewStateClass();
  try {
    if (window.desktopWindow && window.desktopWindow.openUpdateInstaller) {
      var result = await window.desktopWindow.openUpdateInstaller(filePath);
      if (!result || result.ok === false) throw new Error((result && result.error) || 'OPEN_UPDATE_FAILED');
      updatePreviewState.installerOpened = true;
      updatePreviewState.status = 'ready';
      syncUpdatePreviewStateClass();
      showToast('安装包已打开，Mineradio 即将退出');
      return;
    }
    throw new Error('DESKTOP_BRIDGE_MISSING');
  } catch (e) {
    updatePreviewState.status = 'ready';
    syncUpdatePreviewStateClass();
    if (updatePreviewState.releaseUrl) window.open(updatePreviewState.releaseUrl, '_blank');
    showToast('无法自动打开安装包，已尝试打开更新页面');
  }
}

function startUpdatePreviewDownload() {
  var releaseLink = updatePreviewState.downloadUrl || updatePreviewState.releaseUrl;
  if (updatePreviewState.status === 'ready' && updatePreviewState.mode === 'patch') {
    restartForAppliedPatch();
    return;
  }
  if (updatePreviewState.configured && updatePreviewState.updateAvailable) {
    if (updatePreviewState.patchAvailable && updatePreviewState.patchUrl && !updatePreviewState.patchFallbackTried) {
      startRealUpdatePatch();
    } else if (updatePreviewState.downloadUrl) {
      startRealUpdateDownload();
    } else if (releaseLink) {
      window.open(releaseLink, '_blank');
      showToast('已打开更新页面');
    } else {
      showToast('这个版本还没有可用下载链接');
    }
    return;
  }
  if (updatePreviewState.status === 'ready') {
    if (window.gsap) {
      var modal = document.querySelector('#update-modal .update-modal');
      if (modal) window.gsap.fromTo(modal, { boxShadow: '0 30px 100px rgba(0,0,0,.62),0 0 0 1px rgba(244,210,138,.16)' }, { boxShadow: '0 30px 100px rgba(0,0,0,.62),0 0 34px rgba(244,210,138,.18)', duration: 0.52, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    }
    showToast('正式接入后将重启并安装新版');
    return;
  }
  if (updatePreviewState.status === 'downloading') return;
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  updatePreviewState.status = 'downloading';
  updateUpdatePreviewProgress(0);
  var btn = document.getElementById('update-primary-btn');
  if (btn && window.gsap) window.gsap.fromTo(btn, { scale: 0.985 }, { scale: 1, duration: 0.34, ease: 'back.out(1.45)', overwrite: true });
  updatePreviewState.timer = setInterval(function(){
    var next = updatePreviewState.progress + 3.2 + Math.random() * 7.5;
    if (next >= 100) {
      if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
      updatePreviewState.timer = null;
      updatePreviewState.status = 'ready';
      updateUpdatePreviewProgress(100);
      pulseUpdateReady();
    } else {
      updateUpdatePreviewProgress(next);
    }
  }, 260);
}

function pulseUpdateReady() {
  var entry = document.getElementById('update-entry');
  var btn = document.getElementById('update-primary-btn');
  if (!window.gsap) return;
  if (entry) {
    window.gsap.fromTo(entry,
      { scale: 0.96, filter: 'drop-shadow(0 0 0 rgba(244,210,138,0))' },
      { scale: 1.04, filter: 'drop-shadow(0 0 14px rgba(244,210,138,.28))', duration: 0.34, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: 'auto' }
    );
  }
  if (btn) {
    window.gsap.fromTo(btn,
      { boxShadow: '0 0 0 rgba(244,210,138,0), inset 0 1px 0 rgba(255,255,255,.09)' },
      { boxShadow: '0 0 24px rgba(244,210,138,.16), inset 0 1px 0 rgba(255,255,255,.11)', duration: 0.42, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: true }
    );
  }
}

