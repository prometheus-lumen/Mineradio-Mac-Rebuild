function __mineradioInitVisualCoverMedia43(): void {
  // ============================================================
  //  文件拖放
  // ============================================================
  var fileInput = document.querySelector<HTMLInputElement>('#file-input');
  if (fileInput) {
    var coverFileInput = fileInput;
    coverFileInput.addEventListener('change', function(): void {
      if (coverFileInput.files) handleFiles(coverFileInput.files);
      coverFileInput.value = '';
    });
  }

  dropOv = document.getElementById('drop-overlay');
  dragCount = 0;

  document.addEventListener('dragenter', function(e: DragEvent): void {
    e.preventDefault();
    if (isHomeCardInternalDrag(e)) { dragCount = 0; dropOv?.classList.remove('show'); return; }
    dragCount++;
    dropOv?.classList.add('show');
  });

  document.addEventListener('dragleave', function(e: DragEvent): void {
    e.preventDefault();
    if (isHomeCardInternalDrag(e)) { dragCount = 0; dropOv?.classList.remove('show'); return; }
    dragCount--;
    if (dragCount<=0){ dragCount=0; dropOv?.classList.remove('show'); }
  });

  document.addEventListener('dragover', function(e: DragEvent): void {
    e.preventDefault();
    if (isHomeCardInternalDrag(e)) { dragCount = 0; dropOv?.classList.remove('show'); }
  });

  document.addEventListener('drop', function(e: DragEvent): void {
    e.preventDefault(); dragCount = 0; dropOv?.classList.remove('show');
    if (isHomeCardInternalDrag(e)) { homeCardDragActive = false; return; }
    var files = e.dataTransfer?.files;
    if (files?.length) handleFiles(files);
  });
}
