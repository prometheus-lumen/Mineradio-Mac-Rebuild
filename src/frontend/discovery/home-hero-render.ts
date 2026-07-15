function resetHomeHeroMediaElements(): void {
  const hero = document.querySelector<HTMLElement>('.home-hero');
  const media = document.getElementById('home-hero-media');
  const image = document.getElementById('home-hero-media-image');
  const video = document.querySelector<HTMLVideoElement>('#home-hero-media-video');
  if (homeHeroMediaObjectUrl) {
    URL.revokeObjectURL(homeHeroMediaObjectUrl);
    homeHeroMediaObjectUrl = '';
  }
  if (image) image.style.backgroundImage = '';
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  media?.classList.remove('is-video');
  hero?.classList.remove('has-custom-bg');
}

function renderHomeHeroMediaRecord(record?: HomeHeroMediaRecord | null): void {
  resetHomeHeroMediaElements();
  if (!record || (!record.blob && !record.src)) return;
  const hero = document.querySelector<HTMLElement>('.home-hero');
  const media = document.getElementById('home-hero-media');
  const image = document.getElementById('home-hero-media-image');
  const video = document.querySelector<HTMLVideoElement>('#home-hero-media-video');
  const type = record.type === 'video' ? 'video' : 'image';
  const source = record.src || (record.blob ? URL.createObjectURL(record.blob) : '');
  if (!source) return;
  if (!record.src) homeHeroMediaObjectUrl = source;
  hero?.classList.add('has-custom-bg');
  media?.classList.toggle('is-video', type === 'video');
  if (type === 'video' && video) {
    video.src = source;
    void video.play().catch(() => undefined);
  } else if (image) {
    image.style.backgroundImage = `url("${cssImageUrl(source)}")`;
  }
}

async function applyHomeHeroMedia(): Promise<void> {
  if (homeHeroMediaLoading) return;
  homeHeroMediaLoading = true;
  const state = readHomeCardSettings();
  try {
    let record = await readHomeHeroMediaRecord();
    if (!record && state.heroBg) {
      if (/^data:image\//i.test(state.heroBg)) {
        const response = await fetch(state.heroBg);
        const blob = await response.blob();
        record = { blob, type: 'image', name: 'legacy-background', size: blob.size, updatedAt: Date.now() };
        await writeHomeHeroMediaRecord(record);
        state.heroBg = '';
        state.heroMediaType = 'image';
        state.heroMediaName = 'legacy-background';
        saveHomeCardSettings();
      } else {
        record = { src: state.heroBg, type: 'image' };
      }
    }
    renderHomeHeroMediaRecord(record);
    homeHeroMediaReady = true;
  } catch (error) {
    if (state.heroBg) renderHomeHeroMediaRecord({ src: state.heroBg, type: 'image' });
    else resetHomeHeroMediaElements();
    homeHeroMediaReady = true;
  } finally {
    homeHeroMediaLoading = false;
  }
}
