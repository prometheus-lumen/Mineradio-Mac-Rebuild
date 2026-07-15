function cardDrawSignature(card: ShelfCard, item: ShelfCardItem): string {
  var coverRecord = item.cover ? playlistCoverCache[item.cover] : null;
  var coverState = item.cover
    ? (coverRecord && coverRecord.loaded ? 'ready' : (coverRecord && coverRecord.failed ? 'fail' : 'wait'))
    : 'none';
  var pulseBucket = card.isCenter ? Math.round((bass + beatPulse * 0.85) * 6) : 0;
  return [
    item.type || '', item.title || '', item.sub || '', item.tag || '',
    item.playlistId || '', item.podcastKey || '', item.queueIndex == null ? '' : item.queueIndex,
    item.cover || '', coverState, card.isCenter ? 1 : 0, card.selected ? 1 : 0,
    card.dofBucket == null ? -1 : card.dofBucket, pulseBucket,
    shelfAccentHex(), shelfSettings().bgOpacity
  ].join('|');
}

function drawCard(card: ShelfCard, item: ShelfCardItem = card.item): void {
  var nextDrawKey = cardDrawSignature(card, item);
  if (card.drawKey === nextDrawKey) return;
  card.drawKey = nextDrawKey;

  var canvas = card.canvas;
  var ctx = card.ctx;
  var width = canvas.width;
  var height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  var padding = 18;
  var isNowPlaying = item.type === 'queue' && item.tag === '正在播放';
  var shelfLook = shelfSettings();

  makeRoundRect(ctx, padding, padding, width - padding * 2, height - padding * 2, 32);
  ctx.fillStyle = 'rgba(0,0,0,' + shelfLook.bgOpacity.toFixed(3) + ')';
  ctx.fill();
  var background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, 'rgba(255,255,255,0.10)');
  background.addColorStop(1, 'rgba(255,255,255,0.018)');
  ctx.fillStyle = background;
  ctx.fill();

  ctx.strokeStyle = isNowPlaying ? shelfAccentRgba(0.72) : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = isNowPlaying
    ? 1.8 + Math.sin(uniforms.uTime.value * 3) * 0.28 + bass * 1.2
    : 1.1;
  ctx.stroke();

  if (card.selected) {
    ctx.save();
    makeRoundRect(ctx, padding + 2, padding + 2, width - padding * 2 - 4, height - padding * 2 - 4, 30);
    ctx.shadowColor = shelfAccentRgba(0.58);
    ctx.shadowBlur = 18;
    ctx.strokeStyle = shelfAccentRgba(0.72);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  var coverSize = height - padding * 2 - 8;
  var coverX = padding + 6;
  var coverY = padding + 4;
  makeRoundRect(ctx, coverX, coverY, coverSize, coverSize, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  if (item.cover) {
    var coverRecord = playlistCoverCache[item.cover];
    if (coverRecord && coverRecord.loaded && coverRecord.img) {
      ctx.save();
      makeRoundRect(ctx, coverX, coverY, coverSize, coverSize, 26);
      ctx.clip();
      ctx.drawImage(coverRecord.img, coverX, coverY, coverSize, coverSize);
      ctx.restore();
    } else if (!coverRecord || (!coverRecord.loading && !coverRecord.failed)) {
      requestPlaylistCover(item.cover, function(): void { drawCard(card, item); });
    }
  }

  var textX = padding + coverSize + 32;
  ctx.font = '700 17px Inter, Arial';
  ctx.fillStyle = isNowPlaying ? shelfAccentRgba(0.92) : 'rgba(255,255,255,0.92)';
  ctx.fillText(item.tag || '', textX, padding + 36);
  ctx.font = '700 30px Inter, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  wrapText(ctx, item.title || '', textX, padding + 78, width - textX - padding - 14, 36, 2);
  ctx.font = '400 17px Inter, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  wrapText(ctx, item.sub || '', textX, padding + 156, width - textX - padding - 14, 24, 2);

  ctx.strokeStyle = isNowPlaying ? shelfAccentRgba(0.90) : 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(textX, height - padding - 22);
  ctx.lineTo(textX + Math.min(260, 80 + bass * 320), height - padding - 22);
  ctx.stroke();

  if (card.isCenter) drawShelfCardActions(ctx, item, textX, height, padding);

  if (card.dofBlur > 0.12) {
    makeRoundRect(ctx, padding, padding, width - padding * 2, height - padding * 2, 32);
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.28, card.dofBlur * 0.18).toFixed(3) + ')';
    ctx.fill();
  }
  card.texture.needsUpdate = true;
}

function drawShelfCardActions(
  ctx: CanvasRenderingContext2D,
  item: ShelfCardItem,
  textX: number,
  height: number,
  padding: number
): void {
  var actionY = height - padding - 78;
  if (item.type === 'queue') {
    ctx.font = '600 14px Inter, "Microsoft YaHei", Arial';
    ctx.fillStyle = shelfAccentRgba(0.84);
    ctx.fillText('点击播放', textX, actionY + 25);
    return;
  }
  if (item.type !== 'playlist') return;

  makeRoundRect(ctx, textX, actionY, 138, 38, 18);
  var playGradient = ctx.createLinearGradient(textX, actionY, textX + 138, actionY + 38);
  playGradient.addColorStop(0, 'rgba(255,255,255,0.88)');
  playGradient.addColorStop(0.55, shelfAccentRgba(0.94));
  playGradient.addColorStop(1, shelfAccentRgba(0.58));
  ctx.fillStyle = playGradient;
  ctx.fill();
  ctx.strokeStyle = shelfAccentRgba(0.44);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.font = '800 14px Inter, "Microsoft YaHei", Arial';
  ctx.fillStyle = readableInkForHex(shelfAccentHex());
  ctx.fillText('▶ 播放歌单', textX + 25, actionY + 24);

  makeRoundRect(ctx, textX + 150, actionY, 104, 38, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.font = '700 14px Inter, "Microsoft YaHei", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText('详情', textX + 184, actionY + 24);
}
