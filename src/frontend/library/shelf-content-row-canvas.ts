function isShelfLoadingLabel(value: unknown): boolean {
  return /加载中|正在载入/.test(String(value || ''));
}

function drawShelfContentRow(row: ShelfContentRow, song: PlaylistSong = row.song || {}, isCenter: boolean): void {
  var cv = row.canvas, ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Shelf content row canvas is unavailable');
  var W = cv.width, H = cv.height;
  var isPodcastRadio = !!(song && song.type === 'podcast-radio');
  var playable = !!(song && song.id && !isPodcastRadio);
  var actionReady = playable || isPodcastRadio;
  ctx.clearRect(0, 0, W, H);
  makeRoundRect(ctx, 14, 10, W - 28, H - 20, 22);
  var rowGrad = ctx.createLinearGradient(0, 0, W, H);
  var rowBgAlpha = shelfSettings().bgOpacity;
  var centerRowBgAlpha = isCenter ? Math.max(rowBgAlpha, 0.92) : rowBgAlpha;
  if (isCenter) {
    rowGrad.addColorStop(0, 'rgba(8,14,24,' + Math.min(0.985, centerRowBgAlpha + 0.040).toFixed(3) + ')');
    rowGrad.addColorStop(0.48, 'rgba(0,0,0,' + Math.min(0.985, centerRowBgAlpha + 0.030).toFixed(3) + ')');
    rowGrad.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.98, centerRowBgAlpha + 0.015).toFixed(3) + ')');
  } else {
    rowGrad.addColorStop(0, 'rgba(16,16,20,' + Math.max(0.20, rowBgAlpha - 0.02).toFixed(3) + ')');
    rowGrad.addColorStop(1, 'rgba(0,0,0,' + Math.max(0.20, rowBgAlpha - 0.04).toFixed(3) + ')');
  }
  if (isCenter) {
    ctx.shadowColor = canvasAccent(0.20);
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = rowGrad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isCenter ? canvasAccent(0.48) : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = isCenter ? 1.6 : 1;
  ctx.stroke();
  ctx.font = '700 18px Inter, Arial';
  ctx.fillStyle = isCenter ? canvasAccent(0.95) : 'rgba(255,255,255,0.34)';
  var n = String(row.index + 1);
  if (n.length < 2) n = '0' + n;
  ctx.fillText(n, 32, 52);
  var coverSize = 54;
  var coverX = 84;
  var coverY = H/2 - coverSize/2;
  var songCover = songCoverSrc(song, 80);
  var hasSongCover = !!songCover;
  if (actionReady || hasSongCover) {
    makeRoundRect(ctx, coverX, coverY, coverSize, coverSize, 13);
    ctx.fillStyle = isCenter ? canvasAccent(0.12) : 'rgba(255,255,255,0.07)';
    ctx.fill();
    if (hasSongCover) {
      var songCoverRec = playlistCoverCache[songCover];
      if (songCoverRec && songCoverRec.loaded && songCoverRec.img) {
        ctx.save();
        makeRoundRect(ctx, coverX, coverY, coverSize, coverSize, 13);
        ctx.clip();
        ctx.drawImage(songCoverRec.img, coverX, coverY, coverSize, coverSize);
        ctx.restore();
      } else if (!songCoverRec || (!songCoverRec.loading && !songCoverRec.failed)) {
        requestPlaylistCover(songCover, function(){
          if (row && row.mesh && row.mesh.parent) drawShelfContentRow(row, row.song, !!row.lastCenter);
        });
      }
    }
  }
  // 标题
  var textX = (actionReady || hasSongCover) ? 154 : 82;
  var btnW = 104, btnH = 48, btnX = W - 144, btnY = H/2 - btnH/2;
  var miniBtn = 44, likeX = btnX - 156, collectX = btnX - 104, nextX = btnX - 52;
  var textMax = actionReady && isCenter ? (isPodcastRadio ? btnX - textX - 24 : likeX - textX - 24) : W - textX - 42;
  var loadingRow = !playable && isShelfLoadingLabel(song && song.name);
  if (loadingRow) {
    ctx.font = '700 22px Inter, "Microsoft YaHei", Arial';
    ctx.fillStyle = 'rgba(255,247,224,0.88)';
    ctx.fillText('正在载入歌单', textX, 42);
    var phase = ((uniforms.uTime.value || 0) * 0.85) % 1;
    for (var sk = 0; sk < 3; sk++) {
      var barY = 58 + sk * 13;
      var barW = sk === 0 ? 330 : (sk === 1 ? 250 : 180);
      makeRoundRect(ctx, textX, barY, barW, 7, 4);
      var skGrad = ctx.createLinearGradient(textX, barY, textX + barW, barY);
      var hot = (phase + sk * 0.14) % 1;
      skGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
      skGrad.addColorStop(Math.max(0, hot - 0.18), canvasAccent(0.10));
      skGrad.addColorStop(Math.min(0.99, hot), canvasAccent(0.34));
      skGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
      ctx.fillStyle = skGrad; ctx.fill();
    }
    row.texture.needsUpdate = true;
    return;
  }
  ctx.font = isCenter ? '800 24px Inter, "Microsoft YaHei", Arial' : '600 20px Inter, "Microsoft YaHei", Arial';
  ctx.fillStyle = isCenter ? 'rgba(255,247,224,0.96)' : 'rgba(255,255,255,0.80)';
  ctx.fillText(ellipsize(ctx, song.name || '', textMax), textX, 44);
  ctx.font = '500 15px Inter, "Microsoft YaHei", Arial';
  ctx.fillStyle = isCenter ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.64)';
  ctx.fillText(ellipsize(ctx, song.artist || '', textMax), textX, 72);
  // center 行右侧显示红心/收藏/播放按钮
  if (isCenter && actionReady) {
    if (!isPodcastRadio) {
    var liked = isSongLiked(song);
    makeRoundRect(ctx, likeX, btnY + 2, miniBtn, btnH - 4, 15);
    ctx.fillStyle = liked ? 'rgba(255,122,144,0.18)' : 'rgba(255,255,255,0.075)';
    ctx.fill();
    ctx.strokeStyle = liked ? 'rgba(255,122,144,0.52)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    drawCanvasHeart(ctx, likeX + miniBtn / 2, btnY + 26, 20, liked ? '#ff7a90' : 'rgba(255,255,255,0.76)');

    makeRoundRect(ctx, collectX, btnY + 2, miniBtn, btnH - 4, 15);
    var collectGrad = ctx.createLinearGradient(collectX, btnY + 2, collectX + miniBtn, btnY + btnH);
    collectGrad.addColorStop(0, 'rgba(255,255,255,0.080)');
    collectGrad.addColorStop(1, canvasAccent(0.075));
    ctx.fillStyle = collectGrad;
    ctx.fill();
    ctx.strokeStyle = canvasAccent(0.22);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    var collectCx = collectX + miniBtn / 2;
    var collectCy = btnY + btnH / 2;
    ctx.strokeStyle = canvasAccent(0.72);
    ctx.lineWidth = 2.35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(collectCx - 11, collectCy + 1);
    ctx.lineTo(collectCx - 11, collectCy + 12);
    ctx.lineTo(collectCx + 11, collectCy + 12);
    ctx.lineTo(collectCx + 11, collectCy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(collectCx, collectCy - 9);
    ctx.lineTo(collectCx, collectCy + 5);
    ctx.moveTo(collectCx - 7, collectCy - 2);
    ctx.lineTo(collectCx + 7, collectCy - 2);
    ctx.stroke();

    makeRoundRect(ctx, nextX, btnY + 2, miniBtn, btnH - 4, 15);
    var nextGrad = ctx.createLinearGradient(nextX, btnY + 2, nextX + miniBtn, btnY + btnH);
    nextGrad.addColorStop(0, 'rgba(255,255,255,0.082)');
    nextGrad.addColorStop(0.62, 'rgba(255,255,255,0.045)');
    nextGrad.addColorStop(1, canvasAccent(0.055));
    ctx.fillStyle = nextGrad;
    ctx.fill();
    ctx.strokeStyle = canvasAccent(0.24);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    var nextCx = nextX + miniBtn / 2;
    var nextCy = btnY + btnH / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.90)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(nextCx, nextCy - 8);
    ctx.lineTo(nextCx, nextCy + 8);
    ctx.moveTo(nextCx - 8, nextCy);
    ctx.lineTo(nextCx + 8, nextCy);
    ctx.stroke();
    }

    makeRoundRect(ctx, btnX, btnY, btnW, btnH, 18);
    var btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, 'rgba(255,255,255,0.88)');
    btnGrad.addColorStop(0.56, canvasAccent(0.94));
    btnGrad.addColorStop(1, canvasAccent(0.58));
    ctx.fillStyle = btnGrad; ctx.fill();
    ctx.strokeStyle = canvasAccent(0.42);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = '700 15px Inter, Arial';
    ctx.fillStyle = readableInkForHex(shelfAccentHex());
    ctx.fillText('播放', btnX + 36, btnY + 29);
  }
  row.texture.needsUpdate = true;
}

