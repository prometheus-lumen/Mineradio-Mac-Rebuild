interface ShelfCardBuildJob {
  end: number;
  next: number;
  cancelled: boolean;
  raf: number;
}

class ShelfCardWindow {
  readonly cards: ShelfCard[] = [];
  readonly items: ShelfCardItem[] = [];
  readonly visibleRadius: number;
  private readonly maxRender: number;
  private group: THREE.Group | null = null;
  private renderedStart = -1;
  private buildQueue: ShelfCardBuildJob | null = null;

  constructor(visibleRadius: number) {
    this.visibleRadius = visibleRadius;
    this.maxRender = visibleRadius * 2 + 1;
  }

  setGroup(group: THREE.Group | null): void {
    if (this.group && this.group !== group) this.dispose();
    this.group = group;
  }

  setItems(items: ShelfCardItem[]): void {
    this.items.splice(0, this.items.length, ...items);
  }

  dispose(): void {
    this.cancelBuild();
    if (this.group) disposeShelfCardGroup(this.group);
    this.cards.splice(0);
    this.renderedStart = -1;
  }

  sync(centerTarget: number, selectedIndex: number, force = false, asyncBuild = false): void {
    var group = this.group;
    if (!group) return;
    if (!this.items.length) {
      this.dispose();
      return;
    }
    var center = Math.round(centerTarget);
    var start = Math.max(0, center - this.visibleRadius);
    var end = Math.min(this.items.length - 1, start + this.maxRender - 1);
    start = Math.max(0, end - this.maxRender + 1);
    if (!force && start === this.renderedStart && this.cards.length === end - start + 1) {
      this.refreshChangedItems();
      return;
    }
    this.dispose();
    this.renderedStart = start;
    if (asyncBuild) {
      var job: ShelfCardBuildJob = { end: end, next: start, cancelled: false, raf: 0 };
      this.buildQueue = job;
      this.scheduleBuild(job, selectedIndex);
      return;
    }
    for (var index = start; index <= end; index++) this.appendCard(index, selectedIndex, false);
  }

  private cancelBuild(): void {
    if (!this.buildQueue) return;
    this.buildQueue.cancelled = true;
    if (this.buildQueue.raf) cancelAnimationFrame(this.buildQueue.raf);
    this.buildQueue = null;
  }

  private refreshChangedItems(): void {
    this.cards.forEach((card): void => {
      var nextItem = this.items[card.index] || card.item;
      if (card.item === nextItem) return;
      card.item = nextItem;
      card.drawKey = '';
      drawCard(card, card.item);
    });
  }

  private appendCard(index: number, selectedIndex: number, warmTexture: boolean): void {
    if (!this.group) return;
    var card = buildShelfCard(this.items[index], index, this.group, selectedIndex);
    this.cards.push(card);
    drawCard(card, card.item);
    if (warmTexture) warmShelfTexture(card.texture);
  }

  private scheduleBuild(job: ShelfCardBuildJob, selectedIndex: number): void {
    var requestIdle = (window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    }).requestIdleCallback;
    var step = (): void => {
      if (job.cancelled || this.buildQueue !== job || !this.group) return;
      var started = performance.now();
      var built = 0;
      while (job.next <= job.end && built < 2 && performance.now() - started < 7) {
        this.appendCard(job.next, selectedIndex, true);
        job.next += 1;
        built += 1;
      }
      if (job.next > job.end) {
        this.buildQueue = null;
      } else if (requestIdle) {
        requestIdle(step, { timeout: 180 });
      } else {
        job.raf = requestAnimationFrame(step);
      }
    };
    if (requestIdle) requestIdle(step, { timeout: 180 });
    else job.raf = requestAnimationFrame(step);
  }
}
