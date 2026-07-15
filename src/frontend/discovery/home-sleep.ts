// Mineradio classic module: discovery/home-data.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
}

function cssImageUrl(url: unknown): string {
  return String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '%22');
}

function placeFloatingPanel(panel: HTMLElement | null, x: number, y: number): void {
  if (!panel) return;
  var home = document.getElementById('empty-home');
  var hostRect = home ? home.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  panel.style.left = '0px';
  panel.style.top = '0px';
  panel.classList.add('show');
  var rect = panel.getBoundingClientRect();
  var localX = x - hostRect.left;
  var localY = y - hostRect.top;
  var left = Math.min(Math.max(12, localX), Math.max(12, hostRect.width - rect.width - 12));
  var top = Math.min(Math.max(12, localY), Math.max(12, hostRect.height - rect.height - 12));
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}

function readHomeSleepTimerState(): HomeSleepState {
  try {
    var raw = localStorage.getItem(HOME_SLEEP_TIMER_KEY);
    if (!raw) return { active:false, endsAt:0, waitCurrent:false, pendingAfterSong:false, minutes:30 };
    var data = JSON.parse(raw);
    return {
      active: !!data.active,
      endsAt: Number(data.endsAt) || 0,
      waitCurrent: !!data.waitCurrent,
      pendingAfterSong: !!data.pendingAfterSong,
      minutes: Math.max(1, Math.min(720, Number(data.minutes) || 30))
    };
  } catch (e) {
    return { active:false, endsAt:0, waitCurrent:false, pendingAfterSong:false, minutes:30 };
  }
}

function saveHomeSleepTimerState(): void {
  try { localStorage.setItem(HOME_SLEEP_TIMER_KEY, JSON.stringify(homeSleepState)); } catch (e) {}
}

function formatHomeSleepCountdown(ms: number): string {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var h = Math.floor(total / 3600);
  var m = Math.floor((total % 3600) / 60);
  var s = total % 60;
  return h > 0 ? (h + ':' + padHomeTime(m) + ':' + padHomeTime(s)) : (padHomeTime(m) + ':' + padHomeTime(s));
}

function shouldHomeSleepWaitForCurrentSong(): boolean {
  return !!(homeSleepState && homeSleepState.waitCurrent && audio && currentIdx >= 0 && isFinite(audio.duration) && audio.duration > 0 && audio.currentTime < audio.duration - 1.2);
}

function updateHomeClockAndSleep(): void {
  var now = new Date();
  var dateEl = document.getElementById('home-calendar-date');
  var yearEl = document.getElementById('home-calendar-year');
  var weekdayEl = document.getElementById('home-calendar-weekday');
  var timeEl = document.getElementById('home-calendar-time');
  var statusEl = document.getElementById('home-sleep-status');
  var iconEl = document.getElementById('home-sleep-icon');
  var countdownEl = document.getElementById('home-sleep-countdown');
  var enabledEl = document.querySelector<HTMLInputElement>('#home-sleep-enabled');
  var inputEl = document.querySelector<HTMLInputElement>('#home-sleep-minutes');
  var waitEl = document.querySelector<HTMLInputElement>('#home-sleep-after-song');
  function setCountdownText(text: string, pending: boolean): void {
    if (!countdownEl) return;
    countdownEl.textContent = text || '';
    countdownEl.classList.toggle('show', !!text);
    countdownEl.classList.toggle('pending', !!pending);
  }
  if (yearEl) yearEl.textContent = String(now.getFullYear());
  if (weekdayEl) weekdayEl.textContent = now.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase();
  if (dateEl) dateEl.textContent = padHomeTime(now.getMonth() + 1) + '/' + padHomeTime(now.getDate());
  if (timeEl) timeEl.textContent = padHomeTime(now.getHours()) + ':' + padHomeTime(now.getMinutes());
  if (inputEl && document.activeElement !== inputEl) inputEl.value = String(homeSleepState.minutes || 30);
  if (enabledEl) enabledEl.checked = !!homeSleepState.active || !!homeSleepState.pendingAfterSong;
  if (waitEl && document.activeElement !== waitEl) waitEl.checked = !!homeSleepState.waitCurrent;
  if (iconEl) iconEl.classList.toggle('active', !!homeSleepState.active || !!homeSleepState.pendingAfterSong);
  if (statusEl) statusEl.classList.toggle('active', !!homeSleepState.active || !!homeSleepState.pendingAfterSong);
  if (homeSleepState.pendingAfterSong) {
    if (statusEl) statusEl.textContent = '等待本首歌播完后关闭';
    setCountdownText('播完后关闭', true);
    return;
  }
  if (!homeSleepState.active) {
    if (statusEl) statusEl.textContent = '定时关闭未开启';
    setCountdownText('', false);
    return;
  }
  var left = homeSleepState.endsAt - Date.now();
  if (left <= 0) {
    if (shouldHomeSleepWaitForCurrentSong()) {
      homeSleepState.active = false;
      homeSleepState.pendingAfterSong = true;
      saveHomeSleepTimerState();
      if (statusEl) statusEl.textContent = '等待本首歌播完后关闭';
      setCountdownText('播完后关闭', true);
      showToast('倒计时结束，本首歌播完后关闭');
      return;
    }
    performHomeSleepClose('timer');
    return;
  }
  var countdownText = formatHomeSleepCountdown(left);
  if (statusEl) statusEl.textContent = '将在 ' + countdownText + ' 后关闭';
  setCountdownText('剩余 ' + countdownText, false);
}

function ensureHomeClockTimer(): void {
  if (homeClockTimer) return;
  updateHomeClockAndSleep();
  homeClockTimer = setInterval(updateHomeClockAndSleep, 1000);
}

function startHomeSleepTimer(): void {
  var inputEl = document.querySelector<HTMLInputElement>('#home-sleep-minutes');
  var waitEl = document.querySelector<HTMLInputElement>('#home-sleep-after-song');
  var minutes = inputEl ? Number(inputEl.value) : 30;
  minutes = Math.max(1, Math.min(720, Math.round(minutes || 30)));
  homeSleepState = {
    active: true,
    endsAt: Date.now() + minutes * 60000,
    waitCurrent: !!(waitEl && waitEl.checked),
    pendingAfterSong: false,
    minutes: minutes
  };
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  showToast('已开启定时关闭: ' + minutes + ' 分钟');
}

function cancelHomeSleepTimer(show = false): void {
  homeSleepState.active = false;
  homeSleepState.endsAt = 0;
  homeSleepState.pendingAfterSong = false;
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  if (show) showToast('已取消定时关闭');
}

function setHomeSleepEnabled(enabled: boolean, show = false): void {
  if (enabled) startHomeSleepTimer();
  else cancelHomeSleepTimer(show);
}

function toggleHomeSleepPopover(e?: Event): void {
  if (e && e.stopPropagation) e.stopPropagation();
  var pop = document.getElementById('home-sleep-popover');
  if (!pop) return;
  pop.classList.toggle('show');
}

function closeHomeSleepPopover(): void {
  var pop = document.getElementById('home-sleep-popover');
  if (pop) pop.classList.remove('show');
}

function performHomeSleepClose(reason: string): boolean {
  homeSleepState.active = false;
  homeSleepState.pendingAfterSong = false;
  homeSleepState.endsAt = 0;
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  showToast(reason === 'after-song' ? '本首歌已播完，正在关闭' : '定时关闭时间到');
  var api = window.desktopWindow;
  if (api && api.isDesktop && typeof api.close === 'function') {
    api.close();
    return true;
  }
  try { window.close(); return true; } catch (e) {}
  return false;
}

function bindHomeSleepControls(): void {
  ensureHomeClockTimer();
  var enabledEl = document.querySelector<HTMLInputElement>('#home-sleep-enabled');
  var inputEl = document.querySelector<HTMLInputElement>('#home-sleep-minutes');
  var waitEl = document.querySelector<HTMLInputElement>('#home-sleep-after-song');
  if (enabledEl && !enabledEl.dataset.mineradioSleepBound) {
    enabledEl.dataset.mineradioSleepBound = '1';
    var sleepEnabled = enabledEl;
    enabledEl.addEventListener('change', function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      setHomeSleepEnabled(sleepEnabled.checked, true);
    });
  }
  if (inputEl && !inputEl.dataset.mineradioSleepBound) {
    inputEl.dataset.mineradioSleepBound = '1';
    var sleepMinutes = inputEl;
    inputEl.addEventListener('change', function(){
      var minutes = Math.max(1, Math.min(720, Math.round(Number(sleepMinutes.value) || 30)));
      sleepMinutes.value = String(minutes);
      homeSleepState.minutes = minutes;
      if (homeSleepState.active) homeSleepState.endsAt = Date.now() + minutes * 60000;
      saveHomeSleepTimerState();
      updateHomeClockAndSleep();
    });
  }
  if (waitEl && !waitEl.dataset.mineradioSleepBound) {
    waitEl.dataset.mineradioSleepBound = '1';
    var sleepAfterSong = waitEl;
    waitEl.addEventListener('change', function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      homeSleepState.waitCurrent = sleepAfterSong.checked;
      saveHomeSleepTimerState();
      updateHomeClockAndSleep();
    });
  }
  var pop = document.getElementById('home-sleep-popover');
  if (pop && !pop.dataset.mineradioSleepBound) {
    pop.dataset.mineradioSleepBound = '1';
    pop.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
  }
  if (!document._mineradioHomeSleepCloseBound) {
    document._mineradioHomeSleepCloseBound = true;
    document.addEventListener('click', function(e){
      var target = e.target;
      if (target instanceof Element && target.closest('.home-sleep-trigger-wrap')) return;
      closeHomeSleepPopover();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeHomeSleepPopover();
    });
  }
}
