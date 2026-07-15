function userFxArchiveExportPayload(slot: UserFxArchiveSlot): UserFxArchiveExportPayload {
  return {
    type: USER_FX_ARCHIVE_EXPORT_TYPE,
    schema: USER_FX_ARCHIVE_SCHEMA,
    exportedAt: Date.now(),
    name: slot.name,
    savedAt: slot.savedAt,
    snapshot: slot.snapshot
  };
}

function safeArchiveFileName(name: string): string {
  return String(name || 'Mineradio 用户存档').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 48) + '.json';
}

function exportUserFxArchive(index: number): void {
  var slot = userFxArchiveAt(index);
  if (!slot || !slot.snapshot) {
    showToast('空白存档不能导出');
    return;
  }
  var payload = userFxArchiveExportPayload(slot);
  var text = JSON.stringify(payload, null, 2);
  var api = getDesktopWindowApi && getDesktopWindowApi();
  if (api && typeof api.exportJsonFile === 'function') {
    api.exportJsonFile({ defaultName: safeArchiveFileName(slot.name), text: text }).then(function(res){
      if (res && res.ok) showToast('用户存档已导出');
      else if (!res || !res.canceled) showToast('用户存档导出失败');
    }).catch(function(){ showToast('用户存档导出失败'); });
    return;
  }
  var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = safeArchiveFileName(slot.name);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function normalizeImportedFxArchivePayload(payload: unknown, fileName: string): UserFxArchiveSlot | null {
  if (!payload || typeof payload !== 'object') return null;
  var record = payload as Record<string, unknown>;
  var snapshot = record.snapshot ? normalizeFxArchiveSnapshot(record.snapshot) : normalizeFxArchiveSnapshot(record);
  if (!snapshot) return null;
  var baseName = (String(fileName || '').split(/[\\/]/).pop() || '').replace(/\.json$/i, '');
  return {
    name: normalizeUserFxArchiveName(record.name || baseName, userFxArchives.length),
    createdAt: Date.now(),
    savedAt: Number(record.savedAt) || Date.now(),
    snapshot: snapshot
  };
}

function importUserFxArchiveText(text: unknown, fileName: string): boolean {
  var payload: unknown = null;
  try { payload = JSON.parse(String(text || '')); } catch (e) {}
  var slot = normalizeImportedFxArchivePayload(payload, fileName);
  if (!slot) {
    showToast('导入失败，文件不是有效的用户存档');
    return false;
  }
  userFxArchives.push(slot);
  saveUserFxArchives();
  renderUserFxArchives();
  showToast('已导入 ' + slot.name);
  return true;
}

function importUserFxArchiveFromDialog(): void {
  var api = getDesktopWindowApi && getDesktopWindowApi();
  if (api && typeof api.importJsonFile === 'function') {
    api.importJsonFile().then(function(res){
      if (res && res.ok) importUserFxArchiveText(res.text, res.filePath || '用户存档.json');
      else if (!res || !res.canceled) showToast('导入失败');
    }).catch(function(){ showToast('导入失败'); });
    return;
  }
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(){
    var file = input.files && input.files[0];
    if (file) readUserFxArchiveImportFile(file);
  };
  input.click();
}

function readUserFxArchiveImportFile(file: File): void {
  if (!file || !/\.json$/i.test(file.name || '')) {
    showToast('请导入 JSON 用户存档');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(){ importUserFxArchiveText(reader.result, file.name); };
  reader.onerror = function(){ showToast('导入失败'); };
  reader.readAsText(file, 'utf-8');
}

function bindUserFxArchiveDrop(): void {
  var grid = document.querySelector<ArchiveDropGrid>('#user-archive-grid');
  if (!grid || grid._archiveDropBound) return;
  grid._archiveDropBound = true;
  var activeGrid = grid;
  grid.addEventListener('dragover', function(e){
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    activeGrid.classList.add('dragover');
  });
  grid.addEventListener('dragleave', function(e){
    if (!(e.relatedTarget instanceof Node) || !activeGrid.contains(e.relatedTarget)) activeGrid.classList.remove('dragover');
  });
  grid.addEventListener('drop', function(e){
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    activeGrid.classList.remove('dragover');
    Array.from(e.dataTransfer.files).forEach(readUserFxArchiveImportFile);
  });
}
