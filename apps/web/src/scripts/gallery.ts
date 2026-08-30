/**
 * Image gallery, as progressive enhancement.
 *
 * Without JavaScript the customer still sees the main photo and every thumbnail
 * at full clarity — the buttons simply do nothing. All this adds is swapping the
 * main image without a navigation.
 *
 * Only loaded on products that actually have more than one photo.
 */

function swapMainImage(main: HTMLImageElement, thumb: HTMLElement): void {
  const { fullSrc, fullSrcset } = thumb.dataset;
  if (!fullSrc) return;

  main.src = fullSrc;
  if (fullSrcset) main.srcset = fullSrcset;
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
    for (const other of thumbs) {
      other.setAttribute('aria-current', other === thumb ? 'true' : 'false');
    }
  });
}
