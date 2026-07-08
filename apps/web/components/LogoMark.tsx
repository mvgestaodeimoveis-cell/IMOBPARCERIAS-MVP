interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Símbolo oficial da marca (extraído da arte original), fundo transparente. */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.png"
      alt="Imob Parcerias"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}
