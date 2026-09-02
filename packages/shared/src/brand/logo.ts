/**
 * The Hamza Footwear mark: a white H standing on a brick sole slab, in a
 * rounded ink tile.
 *
 * The geometry lives here, in shared, because two apps draw it — the Astro
 * storefront and the React admin — and a logo that drifts between them is
 * worse than no logo. Both wrappers render from these constants; neither
 * hardcodes a rectangle.
 *
 * Drawn, never set in a typeface. A font would make the mark depend on a
 * download that may not arrive: `@font-face` failing is a shrug for body copy
 * and a missing brand for a logo. As inline SVG it is a few hundred bytes,
 * always correct, and crisp at every size.
 */

/** One rectangle of the artwork, in the 40×40 glyph space. */
export interface LogoRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx?: number;
  /** `glyph` follows the variant; `slab` is brick in both. */
  readonly fill: 'glyph' | 'slab';
}

/** The H and the sole it stands on. Coordinates are the brief's, verbatim. */
export const LOGO_RECTS: readonly LogoRect[] = [
  { x: 6, y: 4, width: 7, height: 26, fill: 'glyph' },
  { x: 6, y: 15, width: 28, height: 6, fill: 'glyph' },
  { x: 27, y: 4, width: 7, height: 26, fill: 'glyph' },
  { x: 4, y: 32, width: 32, height: 5, rx: 2.5, fill: 'slab' },
];

/** The glyph is authored in a 40×40 box and scaled into the tile. */
export const LOGO_VIEWBOX = 40;

export type LogoVariant = 'light' | 'dark';

export interface LogoColors {
  readonly tile: string;
  readonly glyph: string;
  readonly slab: string;
}

/**
 * The slab stays brick in both variants — it is the one part of the mark that
 * carries the brand colour, so inverting it would invert the brand.
 */
export const LOGO_COLORS: Readonly<Record<LogoVariant, LogoColors>> = {
  light: { tile: '#17120f', glyph: '#fffdf9', slab: '#8f2f16' },
  dark: { tile: '#fffdf9', glyph: '#17120f', slab: '#8f2f16' },
};

/**
 * Below this the sole slab stops being a sole and becomes a smudge.
 * Enforced in the wrappers rather than trusted to the caller.
 */
export const LOGO_MIN_TILE = 24;

/*
 * The brief specifies four tile/radius/glyph triples:
 *
 *   40 / 10 / 23    34 / 9 / 20    42 / 11 / 24    52 / 13 / 30
 *
 * They are all the same two ratios — a quarter and a shade under three
 * fifths — so the mark is one scalable drawing rather than four hand-tuned
 * ones, and `Math.round` reproduces every published triple exactly. Any size
 * in between is therefore also correct, which is what lets the header change
 * tile size across a breakpoint without a second copy of the artwork.
 */
const RADIUS_RATIO = 0.25;
const GLYPH_RATIO = 0.575;

export interface LogoGeometry {
  /** Tile edge, in px. */
  readonly tile: number;
  readonly radius: number;
  /** Edge of the square the 40×40 glyph is scaled into. */
  readonly glyph: number;
  /** Where that square sits, to centre it in the tile. */
  readonly offset: number;
  /** Multiplier taking glyph-space units to tile-space units. */
  readonly scale: number;
}

export function logoGeometry(tile: number): LogoGeometry {
  const size = Math.max(tile, LOGO_MIN_TILE);
  const glyph = Math.round(size * GLYPH_RATIO);

  return {
    tile: size,
    radius: Math.round(size * RADIUS_RATIO),
    glyph,
    offset: (size - glyph) / 2,
    scale: glyph / LOGO_VIEWBOX,
  };
}
