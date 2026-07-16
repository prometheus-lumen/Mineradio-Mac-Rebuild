function __mineradioInitUiFxPanel44() {
  // ============================================================
  //  控制台 — 预设卡片 + 主滑块 + 开关 + 三态
  // ============================================================
  presetMeta = [
    { name: 'emily专辑封面',  desc: '封面粒子 · 快速入场' },
    { name: '滚筒', desc: '隧道 · 沉浸感' },
    { name: '星球',  desc: '星球 · 雕塑感' },
    { name: '虚空', desc: '无粒子 · 自定义背景' },
    { name: '唱片', desc: '唱片 · 圆形封面' },
    { name: '星河', desc: '壁纸粒子 · 音乐律动' },
    { name: '安魂', desc: '骷髅·YUI7W', descHtml: '骷髅·<span class="pc-yui7w">YUI7W</span>' },
    { name: '六芒星', desc: '金青星阵 · 环形轨迹' },
    { name: '粒子时钟', desc: '星尘时间 · 精确到秒' },
    { name: '闪光灯', desc: '逐帧闪白 · 鼓点同步' },
    { name: '音域回响', desc: '频段地形 · 涟漪余波' },
  ];

  presetIcons = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 14c3-2 5-2 8 0s5 2 8 0M3 10c3-2 5-2 8 0s5 2 8 0M3 18c3-2 5-2 8 0s5 2 8 0"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><path d="M5 12a7 7 0 0 0 14 0"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><path d="M8.8 8.8l6.4 6.4"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/><path d="M16.5 5.2c2.1.9 3.4 2.4 4 4.5"/><path d="M18.8 3.2l1.5 4.8"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 15c2.2-4.4 4.4-4.4 6.6 0s4.4 4.4 6.6 0S20.6 10.6 23 15"/><path d="M3 9c2.2 2.2 4.4 2.2 6.6 0s4.4-2.2 6.6 0S20.6 11.2 23 9"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.2h4v6.2h4.2v3.8H14v7.6h-4v-7.6H5.8V9.4H10z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19.4 16H4.6L12 3.2Z"/><path d="M12 20.8 4.6 8h14.8L12 20.8Z"/><circle cx="12" cy="12" r="1.45" fill="currentColor" stroke="none"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.2v5.2l3.4 2.1"/><path d="M5.8 4.8 4.2 3.2"/><path d="M18.2 4.8l1.6-1.6"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.8 5.8 13h5.1l-1 8.2L18.2 10h-5.1z"/><path d="M4 4.5 2.6 3.1M20 4.5l1.4-1.4M3 19.5l-1.5 1.4M21 19.5l1.5 1.4"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.5 7.5 13l3 2.8 4.1-7.1 2.4 3.2 4-5.4"/><path d="M3 20.5h18"/><path d="M5.5 17.5v3M10.5 15.8v4.7M14.6 8.7v11.8M17 11.9v8.6"/></svg>',
  ];

  presetDisplayOrder = [10, 9, 0, 8, /* 7, 六芒星入口已停用 */ 6, 5, 4, 2, 1, 3];

  lyricColorPresets = [
    { name:'雾蓝', color:'#a9b8c8' },
    { name:'银蓝', color:'#9db8cf' },
    { name:'冰川', color:'#7ec8d8' },
    { name:'青绿', color:'#66d2b5' },
    { name:'松针', color:'#7fa894' },
    { name:'月白', color:'#d7d2c4' },
    { name:'岩金', color:'#c3ae7c' },
    { name:'琥珀', color:'#d9a45f' },
    { name:'暮粉', color:'#c78aa4' },
    { name:'玫红', color:'#d76a8d' },
    { name:'烟紫', color:'#9b83d3' },
    { name:'电紫', color:'#8d70ff' },
    { name:'靛蓝', color:'#5e78d8' },
    { name:'海蓝', color:'#3c9fe0' },
    { name:'霓青', color:'#28c5c3' },
    { name:'夜绿', color:'#245c49' },
    { name:'酒红', color:'#6d1f35' },
    { name:'墨黑', color:'#111318' },
  ];
}

function __mineradioInitUiFxPanel46() {
  coverColorPickerState = { target: 'visualTint', canvas: null };

  homeWaveTrackState = { bars: 0, smooth: [], lastAt: 0 };

  fxPanelTab = 'presets';

  globalHotkeyListenerBound = false;

  document.addEventListener('keydown', function(e){
    var hotkeyModal = document.getElementById('hotkey-modal');
    if (!hotkeyCaptureState) {
      if (hotkeyModal && hotkeyModal.classList.contains('show') && e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeHotkeySettings();
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      hotkeyCaptureState = null;
      renderHotkeySettings();
      return;
    }
    if (e.code === 'Backspace' || e.code === 'Delete') {
      var clearTarget = hotkeyCaptureState;
      hotkeyCaptureState = null;
      setHotkeyBinding(clearTarget.action, clearTarget.scope, '');
      return;
    }
    var combo = normalizeHotkeyEvent(e);
    if (!combo) return;
    var target = hotkeyCaptureState;
    hotkeyCaptureState = null;
    setHotkeyBinding(target.action, target.scope, combo);
  }, true);

  bindFxFabButton();
  refreshMusicCacheInfo();
}
