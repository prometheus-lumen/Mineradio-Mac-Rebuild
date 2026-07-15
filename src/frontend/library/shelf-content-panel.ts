function buildShelfContentPanel(group: THREE.Group): ShelfContentPanel {
  var canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1024;
  var texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });
  var geometry = new THREE.PlaneGeometry(2.62, 3.02, 1, 1);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-0.02, 0, 0.20);
  mesh.renderOrder = 232;
  group.add(mesh);
  return { canvas: canvas, texture: texture, mesh: mesh };
}

function drawShelfContentPanel(
  panel: ShelfContentPanel,
  model: ShelfContentPanelModel,
  onCoverReady: () => void
): void {
  var context = panel.canvas.getContext('2d');
  if (!context) throw new Error('Shelf content panel canvas is unavailable');
  var width = panel.canvas.width;
  var height = panel.canvas.height;
  context.clearRect(0, 0, width, height);
  makeRoundRect(context, 24, 28, width - 48, height - 56, 34);
  var background = context.createLinearGradient(0, 0, width, height);
  var opacity = shelfSettings().bgOpacity;
  background.addColorStop(0, 'rgba(0,0,0,' + Math.min(0.98, opacity + 0.02).toFixed(3) + ')');
  background.addColorStop(0.42, 'rgba(0,0,0,' + opacity.toFixed(3) + ')');
  background.addColorStop(1, 'rgba(0,0,0,' + Math.max(0.20, opacity - 0.04).toFixed(3) + ')');
  context.fillStyle = background;
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.16)';
  context.lineWidth = 1.4;
  context.stroke();
  context.font = '800 38px Inter, "Microsoft YaHei", Arial';
  context.fillStyle = 'rgba(255,246,220,0.94)';
  context.fillText(ellipsize(context, model.title || '歌单详情', width - 310), 72, 92);
  context.font = '500 18px Inter, "Microsoft YaHei", Arial';
  context.fillStyle = canvasAccent(0.62);
  context.fillText(shelfContentCountLabel(model), 74, 128);
  drawShelfContentCover(context, model.sourceCard?.item.cover, width, onCoverReady);

  var sweep = (Math.sin((uniforms.uTime.value || 0) * 1.7) + 1) * 0.5;
  var shine = context.createLinearGradient(70, 154, width - 80, 154);
  shine.addColorStop(0, canvasAccent(0));
  shine.addColorStop(Math.max(0.01, sweep * 0.72), canvasAccent(0.14));
  shine.addColorStop(Math.min(0.99, sweep * 0.72 + 0.14), canvasAccent(0.56));
  shine.addColorStop(1, canvasAccent(0));
  context.fillStyle = shine;
  context.fillRect(72, 154, width - 144, 2);
  panel.texture.needsUpdate = true;
}

function shelfContentCountLabel(model: ShelfContentPanelModel): string {
  var contentCount = model.tracks.filter(function(song): boolean { return Boolean(song?.id); }).length;
  var playableCount = model.tracks.filter(function(song): boolean {
    return Boolean(song?.id && song.type !== 'podcast-radio');
  }).length;
  var loading = model.tracks.length === 1 && isShelfLoadingLabel(model.tracks[0]?.name);
  if (model.kind === 'podcast') {
    return contentCount ? contentCount + ' 项播客内容' : (loading ? '正在载入' : '暂无播客内容');
  }
  return playableCount ? playableCount + ' 首歌曲' : (loading ? '正在载入' : '暂无可播放歌曲');
}

function drawShelfContentCover(
  context: CanvasRenderingContext2D,
  coverUrl: string | undefined,
  width: number,
  onCoverReady: () => void
): void {
  var size = 96;
  var x = width - 172;
  var y = 56;
  makeRoundRect(context, x, y, size, size, 22);
  context.fillStyle = 'rgba(255,255,255,0.06)';
  context.fill();
  if (!coverUrl) return;
  var record = playlistCoverCache[coverUrl];
  if (record?.loaded && record.img) {
    context.save();
    makeRoundRect(context, x, y, size, size, 22);
    context.clip();
    context.drawImage(record.img, x, y, size, size);
    context.restore();
  } else if (!record || (!record.loading && !record.failed)) {
    requestPlaylistCover(coverUrl, onCoverReady);
  }
}

function disposeShelfContentPanel(panel: ShelfContentPanel | null): void {
  if (!panel) return;
  panel.mesh.parent?.remove(panel.mesh);
  panel.texture.dispose();
  panel.mesh.material.dispose();
  panel.mesh.geometry.dispose();
}
