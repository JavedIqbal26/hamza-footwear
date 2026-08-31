/**
 * Image gallery, as progressive enhancement.
 *
 * Without JavaScript the customer still sees the main photo and every thumbnail
 * at full clarity — the buttons simply do nothing. All this adds is swapping the
 * main image without a navigation, and moving the dot that shows which photo is
 * on screen.
 */

function swapMainImage(main: HTMLImageElement, thumb: HTMLElement): void {
  const { fullSrc, fullSrcset } = thumb.dataset;
  if (!fullSrc) return;

  main.src = fullSrc;
  if (fullSrcset) main.srcset = fullSrcset;
}

function paintDots(gallery: HTMLElement, activeIndex: number): void {
  const dots = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-dot]')];
  dots.forEach((dot, index) => {
    const active = index === activeIndex;
    dot.classList.toggle('w-5', active);
    dot.classList.toggle('bg-ink', active);
    dot.classList.toggle('w-2', !active);
    dot.classList.toggle('bg-ink/25', !active);
  });
}

export function initGallery(): void {
  const gallery = document.querySelector<HTMLElement>('[data-gallery]');
  if (!gallery) return;

  const main = gallery.querySelector<HTMLImageElement>('img');
  const thumbs = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-thumb]')];
  if (!main || thumbs.length === 0) return;

  /* One listener on the container rather than one per thumbnail. */
  gallery.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const thumb = target.closest<HTMLElement>('[data-gallery-thumb]');
    if (!thumb) return;

    swapMainImage(main, thumb);

    const index = thumbs.indexOf(thumb);
    for (const other of thumbs) {
      other.setAttribute('aria-current', other === thumb ? 'true' : 'false');
    }
    if (index >= 0) paintDots(gallery, index);
  });
}
