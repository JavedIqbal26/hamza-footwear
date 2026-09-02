import {
  LOGO_COLORS,
  LOGO_RECTS,
  LOGO_VIEWBOX,
  logoGeometry,
  type LogoVariant,
} from '@hamza/shared';

/**
 * The Hamza Footwear mark.
 *
 * The React twin of the storefront's `Logo.astro`. Both draw from the same
 * geometry in `@hamza/shared` — the rectangles are declared once, so the two
 * apps cannot end up with subtly different logos.
 *
 * Admin gets the mark alone, without the wordmark: the header already carries
 * the page title, and a second reading of the shop's name beside it is noise
 * for the one person who is only ever here to pack orders.
 */

interface Props {
  /** Tile edge in px. Clamped at the minimum, never drawn smaller. */
  size?: number;
  variant?: LogoVariant;
}

export function Logo({ size = 34, variant = 'light' }: Props) {
  const colors = LOGO_COLORS[variant];
  const { radius, offset, scale } = logoGeometry(LOGO_VIEWBOX);
  const { tile } = logoGeometry(size);

  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}
      width={tile}
      height={tile}
      role="img"
      aria-label="Hamza Footwear"
      className="shrink-0"
    >
      <rect width={LOGO_VIEWBOX} height={LOGO_VIEWBOX} rx={radius} fill={colors.tile} />
      <g transform={`translate(${offset} ${offset}) scale(${scale})`}>
        {LOGO_RECTS.map((rect, index) => (
          <rect
            key={index}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={rect.rx}
            fill={rect.fill === 'slab' ? colors.slab : colors.glyph}
          />
        ))}
      </g>
    </svg>
  );
}
