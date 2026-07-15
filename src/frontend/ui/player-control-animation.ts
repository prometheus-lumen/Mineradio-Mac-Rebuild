function setPlayIcon(playingNow: boolean): void {
  var icon = document.getElementById('play-icon');
  if (icon) icon.innerHTML = playingNow
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<path d="M8 5v14l11-7z"/>';
}

function bindPlayerControlAnimations(): void {
  if (!window.gsap) return;
  document.querySelectorAll<HTMLButtonElement>('#bottom-bar .ctrl-btn').forEach(function(button): void {
    if (button.dataset.controlAnimBound === '1') return;
    button.dataset.controlAnimBound = '1';
    bindPlayerControlAnimation(button);
  });
}

function bindPlayerControlAnimation(button: HTMLButtonElement): void {
  var isPlay = button.id === 'play-btn';
  var icon = button.querySelector('svg,.lyrics-word-icon,#quality-btn-label');
  function canAnimate(): boolean {
    return !button.disabled && !button.classList.contains('busy');
  }
  function hoverIn(event?: PointerEvent): void {
    if (!canAnimate() || event?.pointerType === 'touch') return;
    window.gsap?.to(button, { y: -2, scale: isPlay ? 1.07 : 1.08, duration: 0.20, ease: 'power2.out', overwrite: 'auto' });
    if (icon) window.gsap?.to(icon, { scale: isPlay ? 1.08 : 1.10, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
  }
  function hoverOut(): void {
    window.gsap?.to(button, { y: 0, scale: 1, rotate: 0, duration: 0.26, ease: 'power2.out', overwrite: 'auto' });
    if (icon) window.gsap?.to(icon, { scale: 1, rotate: 0, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
  }
  function pressDown(): void {
    if (!canAnimate()) return;
    window.gsap?.to(button, { y: 0, scale: isPlay ? 0.91 : 0.90, duration: 0.10, ease: 'power2.out', overwrite: 'auto' });
    if (icon) window.gsap?.to(icon, { scale: 0.88, duration: 0.10, ease: 'power2.out', overwrite: 'auto' });
  }
  function release(event: PointerEvent): void {
    if (!canAnimate()) return;
    var hovered = event.pointerType !== 'touch' && button.matches(':hover');
    window.gsap?.to(button, { y: hovered ? -2 : 0, scale: hovered ? (isPlay ? 1.07 : 1.08) : 1, duration: 0.24, ease: 'back.out(1.9)', overwrite: 'auto' });
    if (icon) window.gsap?.to(icon, { scale: hovered ? 1.06 : 1, duration: 0.22, ease: 'back.out(1.8)', overwrite: 'auto' });
  }
  function clickPulse(): void {
    if (!canAnimate() || button.id === 'play-mode-btn') return;
    var pulseSize = isPlay ? 18 : 10;
    var pulseColor = isPlay ? 'rgba(255,63,85,.34)' : 'rgba(255,255,255,.22)';
    window.gsap?.killTweensOf(button, 'boxShadow');
    window.gsap?.fromTo(button,
      { boxShadow: '0 0 0 0 ' + pulseColor },
      { boxShadow: '0 0 0 ' + pulseSize + 'px rgba(255,63,85,0)', duration: isPlay ? 0.58 : 0.42, ease: 'sine.out', overwrite: false,
        onComplete: function(): void { window.gsap?.set(button, { clearProps: 'boxShadow' }); } }
    );
    if (icon) window.gsap?.fromTo(icon, { rotate: isPlay ? 0 : -5 }, { rotate: 0, duration: 0.34, ease: 'elastic.out(1,0.55)', overwrite: 'auto' });
  }
  button.addEventListener('pointerenter', hoverIn);
  button.addEventListener('pointerleave', hoverOut);
  button.addEventListener('pointercancel', hoverOut);
  button.addEventListener('mousedown', function(event): void { event.preventDefault(); });
  button.addEventListener('pointerdown', pressDown);
  button.addEventListener('pointerup', release);
  button.addEventListener('click', clickPulse);
  button.addEventListener('focus', function(): void { hoverIn(); });
  button.addEventListener('blur', hoverOut);
}

function clearPlayerControlFocusState(reason?: string): void {
  try {
    document.querySelectorAll<HTMLButtonElement>('#bottom-bar .ctrl-btn').forEach(function(button): void {
      if (document.activeElement === button) button.blur();
      button.classList.remove('focus-visible');
      var icon = button.querySelector('svg,.lyrics-word-icon,#quality-btn-label');
      if (window.gsap) {
        window.gsap.killTweensOf(button);
        window.gsap.set(button, { y: 0, scale: 1, rotate: 0, clearProps: 'boxShadow' });
        if (icon) {
          window.gsap.killTweensOf(icon);
          window.gsap.set(icon, { scale: 1, rotate: 0 });
        }
      } else {
        button.style.transform = '';
        button.style.boxShadow = '';
      }
    });
  } catch (error) {
    console.warn('[ControlFocusClear]', reason || 'unknown', error);
  }
}
