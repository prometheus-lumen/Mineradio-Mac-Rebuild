function ensureHotkeySettingsButton(): void {
  var panel = document.getElementById('fx-panel');
  var head = panel && panel.querySelector<HTMLElement>('.fx-head');
  if (!head || document.getElementById('hotkey-settings-btn')) return;
  if (head.firstElementChild) head.firstElementChild.classList.add('fx-head-main');
  var actions = document.createElement('div');
  actions.className = 'fx-head-actions';
  var button = document.createElement('button');
  button.id = 'hotkey-settings-btn';
  button.type = 'button';
  button.className = 'fx-mini-btn ghost';
  button.textContent = '热键';
  button.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    openHotkeySettings();
  });
  actions.appendChild(button);
  head.appendChild(actions);
}

function ensureHotkeyModal(): HTMLElement {
  var existing = document.getElementById('hotkey-modal');
  if (existing) return existing;
  var modal = document.createElement('div');
  modal.id = 'hotkey-modal';
  modal.className = 'hotkey-modal';
  modal.innerHTML =
    '<div class="hotkey-dialog" role="dialog" aria-modal="true" aria-label="热键设置">' +
      '<div class="hotkey-head"><div><div class="hotkey-title">热键设置</div>' +
      '<div class="hotkey-sub">局内热键只在 Mineradio 窗口内生效；全局热键会向系统注册，并检测是否被占用。</div></div>' +
      '<button class="hotkey-close" type="button" data-hotkey-close aria-label="关闭">×</button></div>' +
      '<div class="hotkey-toolbar"><div class="hotkey-tabs">' +
      '<button type="button" data-hotkey-scope="local" class="active">局内热键</button>' +
      '<button type="button" data-hotkey-scope="global">全局热键</button></div>' +
      '<div class="hotkey-note">按 Backspace / Delete 可清空当前功能热键</div></div>' +
      '<div id="hotkey-local-section" class="hotkey-section active"></div>' +
      '<div id="hotkey-global-section" class="hotkey-section"></div>' +
      '<div class="hotkey-capture-tip" id="hotkey-capture-tip">正在录入组合键，按 Esc 取消。</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', handleHotkeyModalClick);
  return modal;
}

function handleHotkeyModalClick(event: MouseEvent): void {
  var modal = event.currentTarget as HTMLElement;
  var target = event.target as Element;
  if (target === modal || target.closest('[data-hotkey-close]')) closeHotkeySettings();
  var scopeButton = target.closest<HTMLElement>('[data-hotkey-scope]');
  if (scopeButton) setHotkeyModalScope(scopeButton.dataset.hotkeyScope || 'local');
  var bindButton = target.closest<HTMLElement>('[data-hotkey-bind]');
  if (bindButton) startHotkeyCapture(bindButton.dataset.hotkeyAction || '', bindButton.dataset.hotkeyBind || 'local');
  var resetButton = target.closest<HTMLElement>('[data-hotkey-reset]');
  if (resetButton) resetHotkeyBinding(resetButton.dataset.hotkeyAction || '', resetButton.dataset.hotkeyReset || 'local');
}

function hotkeyStatusMarkup(
  scope: HotkeyScope,
  actionKey: string,
  binding: string,
  duplicate: Record<string, number>
): string {
  if (!binding) return '<span class="hotkey-status">未设置</span>';
  if (duplicate[binding] > 1) return '<span class="hotkey-status conflict"><span class="source-icon">!</span>Mineradio 内部重复</span>';
  if (scope === 'local') return '<span class="hotkey-status ok">可用</span>';
  var status = hotkeyGlobalStatus[actionKey];
  if (!status) return '<span class="hotkey-status">待检测</span>';
  if (status.ok) return '<span class="hotkey-status ok">可用</span>';
  var source = status.conflict && status.conflict.sourceName || '系统 / 其他软件';
  return '<span class="hotkey-status conflict"><span class="source-icon">!</span>' + escHtml(source) + '</span>';
}

function renderHotkeyScope(scope: HotkeyScope): void {
  var wrap = document.getElementById(scope === 'global' ? 'hotkey-global-section' : 'hotkey-local-section');
  if (!wrap) return;
  var duplicate = hotkeyDuplicateMap(scope);
  var groups: Record<string, HotkeyActionDefinition[]> = {};
  HOTKEY_ACTIONS.forEach(function(action) {
    (groups[action.category] = groups[action.category] || []).push(action);
  });
  wrap.innerHTML = Object.keys(groups).map(function(category) {
    var rows = groups[category].map(function(action) {
      var binding = hotkeySettings[scope][action.key] || '';
      var capturing = hotkeyCaptureState && hotkeyCaptureState.scope === scope && hotkeyCaptureState.action === action.key;
      return '<div class="hotkey-row"><div class="hotkey-name">' + escHtml(action.label) + '</div>' +
        '<button class="hotkey-key' + (capturing ? ' capturing' : '') + '" type="button" data-hotkey-bind="' + scope +
        '" data-hotkey-action="' + action.key + '">' + escHtml(capturing ? '按下组合键...' : formatHotkey(binding)) + '</button>' +
        '<button class="hotkey-reset" type="button" data-hotkey-reset="' + scope + '" data-hotkey-action="' + action.key + '">默认</button>' +
        hotkeyStatusMarkup(scope, action.key, binding, duplicate) + '</div>';
    }).join('');
    return '<div class="hotkey-group"><div class="hotkey-group-title">' + escHtml(category) + '</div>' + rows + '</div>';
  }).join('');
}

function renderHotkeySettings(): void {
  var modal = ensureHotkeyModal();
  var active: HotkeyScope = modal.dataset.scope === 'global' ? 'global' : 'local';
  modal.classList.toggle('capturing', !!hotkeyCaptureState);
  modal.querySelectorAll<HTMLElement>('[data-hotkey-scope]').forEach(function(button) {
    button.classList.toggle('active', button.dataset.hotkeyScope === active);
  });
  document.getElementById('hotkey-local-section')?.classList.toggle('active', active === 'local');
  document.getElementById('hotkey-global-section')?.classList.toggle('active', active === 'global');
  renderHotkeyScope('local');
  renderHotkeyScope('global');
}

function setHotkeyModalScope(scope: string): void {
  var modal = ensureHotkeyModal();
  modal.dataset.scope = scope === 'global' ? 'global' : 'local';
  renderHotkeySettings();
}

function openHotkeySettings(): void {
  var modal = ensureHotkeyModal();
  modal.classList.add('show');
  modal.dataset.scope = modal.dataset.scope || 'local';
  renderHotkeySettings();
  registerGlobalHotkeys();
}

function closeHotkeySettings(): void {
  hotkeyCaptureState = null;
  document.getElementById('hotkey-modal')?.classList.remove('show', 'capturing');
}

function startHotkeyCapture(action: string, scope: string): void {
  hotkeyCaptureState = { action: action, scope: scope === 'global' ? 'global' : 'local' };
  ensureHotkeyModal().dataset.scope = hotkeyCaptureState.scope;
  renderHotkeySettings();
}

function setHotkeyBinding(action: string, scope: HotkeyScope, value: string): void {
  if (!hotkeySettings) hotkeySettings = getHotkeyDefaults();
  hotkeySettings[scope][action] = value || '';
  saveHotkeySettings();
  renderHotkeySettings();
  if (scope === 'global') registerGlobalHotkeys();
}

function resetHotkeyBinding(action: string, scope: string): void {
  var meta = hotkeyActionMeta(action);
  if (!meta) return;
  var typedScope: HotkeyScope = scope === 'global' ? 'global' : 'local';
  setHotkeyBinding(action, typedScope, typedScope === 'global' ? meta.global : meta.local);
}
