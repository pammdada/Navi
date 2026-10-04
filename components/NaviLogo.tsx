import { useId } from 'react';

interface NaviLogoProps {
  size?: number;
  /** Si el logo va junto al texto "Navi", se oculta a los lectores de pantalla para no repetirlo. */
  decorative?: boolean;
  className?: string;
}

/**
 * Logo de Navi: una "N" trazada como un camino (navegar) que termina en un punto de destino,
 * del que salen ondas de sonido (voz y lectura en voz alta).
 * Usa las variables --logo-bg, --logo-fg y --logo-accent para adaptarse al alto contraste.
 */
export function NaviLogo({ size = 48, decorative = false, className }: NaviLogoProps) {
  const titleId = useId();
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      focusable="false"
    >
      {!decorative && <title id={titleId}>Navi</title>}
      <rect width="64" height="64" rx="18" fill="var(--logo-bg, #1E3A8A)" />
      <path
        d="M17 47V19l24 24V31"
        fill="none"
        stroke="var(--logo-fg, #FFFFFF)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="19" r="5" fill="var(--logo-accent, #F59E0B)" />
      <path d="M44.1 10.5a9 9 0 0 1 5.4 11.6" fill="none" stroke="var(--logo-accent, #F59E0B)" strokeWidth="3" strokeLinecap="round" />
      <path d="M45.8 5.8a14 14 0 0 1 8.4 18" fill="none" stroke="var(--logo-accent, #F59E0B)" strokeWidth="3" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}
