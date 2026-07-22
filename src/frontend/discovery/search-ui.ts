function artistNameParts(song: PlaylistSong): string[] {
  var parts: string[] = [];
  if (song && Array.isArray(song.artists)) {
    song.artists.forEach(function(a){ if (a && a.name) parts.push(a.name); });
  }
  if (song && song.artist) {
    String(song.artist).split(/\s*\/\s*|\s*,\s*|、|&| feat\.? | ft\.? /i).forEach(function(name){
      if (name && name.trim()) parts.push(name.trim());
    });
  }
  return parts.map(normalizeMatchText).filter(Boolean);
}

function updateSearchBoxGlassDisplacementMap(): void {
  updateGlassDisplacementMapForElement(
    document.getElementById('search-box'),
    document.getElementById('search-box-glass-map'),
    'searchBoxKey'
  );
}

function updateSearchPillGlassDisplacementMap(): void {
  var img = document.getElementById('search-pill-glass-map');
  if (!img) return;
  var nodes = Array.from(document.querySelectorAll<HTMLElement>('.search-mode-tabs button,.search-history-chip'));
  if (!nodes.length) return;
  var maxW = 0, maxH = 0, maxRadius = 14;
  nodes.forEach(function(el){
    if (!el || el.offsetParent === null) return;
    var rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    maxW = Math.max(maxW, rect.width);
    maxH = Math.max(maxH, rect.height);
    maxRadius = Math.max(maxRadius, parseFloat(getComputedStyle(el).borderRadius) || Math.round(rect.height / 2) || 14);
  });
  if (maxW < 2 || maxH < 2) return;
  var width = Math.max(96, Math.round(maxW));
  var height = Math.max(32, Math.round(maxH));
  var radius = Math.max(12, Math.min(Math.round(maxRadius), Math.round(height / 2) + 10));
  var key = width + 'x' + height + ':' + radius;
  if (key === controlGlassState.searchPillKey) return;
  controlGlassState.searchPillKey = key;
  var href = generateControlGlassDisplacementMap(width, height, radius);
  img.setAttribute('href', href);
  try { img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href); } catch (e) {}
}

function __mineradioInitDiscoverySearch40(): void {
  // ============================================================
  //  搜索
  // ============================================================
  searchTimer = null;

  searchRequestSeq = 0;

  searchLastResultQuery = '';

  SEARCH_HISTORY_STORE_KEY = 'mineradio-search-history';

  var input = document.querySelector<HTMLInputElement>('#search-input');
  var results = document.getElementById('search-results');
  if (!input || !results) return;
  $input = input;

  $results = results;

  $loading = document.getElementById('loading-overlay');

  if (window.MutationObserver && $results) {
    new MutationObserver(syncSearchAreaResultState).observe($results, { childList: true, attributes: true, attributeFilter: ['class'] });
  }

  $input.addEventListener('input', function(){
    if ($input._mineradioComposing) return;
    if (searchTimer != null) { clearTimeout(searchTimer); searchTimer = null; }
    var q = $input.value.trim();
    if (!q) {
      if (searchMode === 'podcast') loadPodcastHot();
      else renderSearchHistory();
      return;
    }
    if (isMusicSearchMode(searchMode)) {
      $results.innerHTML = '<div class="search-empty">正在搜索 “' + escHtml(q) + '”…</div>';
      $results.classList.add('show');
    }
    searchTimer = setTimeout(function(){ searchTimer = null; doSearch(q); }, 300);
  });

  $input.addEventListener('compositionstart', function(){
    $input._mineradioComposing = true;
    if (searchTimer != null) { clearTimeout(searchTimer); searchTimer = null; }
  });

  $input.addEventListener('compositionend', function(){
    $input._mineradioComposing = false;
    $input.dispatchEvent(new Event('input', { bubbles: false }));
  });

  $input.addEventListener('focus', function(){
    var searchArea = document.getElementById('search-area');
    if (searchArea) setPeek(searchArea, true, 'search');
    if (!$input.value.trim() && isMusicSearchMode(searchMode)) renderSearchHistory();
    else if ($results.children.length > 0) $results.classList.add('show');
    else if (searchMode === 'podcast') loadPodcastHot();
  });

  searchBoxEl = document.getElementById('search-box');

  if (searchBoxEl) {
    searchBoxEl.addEventListener('click', function(){
      if ($input) $input.focus();
    });
  }

  $input.addEventListener('keydown', function(e){
    if (e.isComposing || $input._mineradioComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTimer != null) { clearTimeout(searchTimer); searchTimer = null; }
      var q = $input.value.trim();
      if (isMusicSearchMode(searchMode) && q && playlist.length && searchLastResultQuery === searchResultKey(q)) $results.classList.add('show');
      else doSearch(q, { autoPlayFirst: false });
    } else if (e.key === 'Escape') {
      if (searchTimer != null) { clearTimeout(searchTimer); searchTimer = null; }
      $input.blur();
      clearSearchResults();
      if (!emptyHomeActive) setPeek(document.getElementById('search-area'), false, 'search');
    }
  });

  $results.addEventListener('click', function(e){
    var clearBtn = e.target instanceof Element ? e.target.closest('[data-clear-history]') : null;
    if (clearBtn) {
      e.preventDefault();
      e.stopPropagation();
      clearSearchHistory();
      return;
    }
    var item = e.target instanceof Element ? e.target.closest('[data-history-query]') : null;
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      runSearchHistory(item.getAttribute('data-history-query') || '');
    }
  });

  document.addEventListener('click', function(e){
    var searchArea = document.getElementById('search-area');
    if (searchArea && !searchArea.contains(e.target instanceof Node ? e.target : null)) {
      $results.classList.remove('show');
      if (!emptyHomeActive) setPeek(searchArea, false, 'search');
    }
  });

  updateSearchModeTabs();

  SEARCH_ORIGINAL_ARTIST_HINTS = [
    { titles: ['日落大道'], artists: ['梁博'] },
    { titles: ['beautyandabeat', 'beauty and a beat'], artists: ['justin bieber', 'nicki minaj'] }
  ];
}
