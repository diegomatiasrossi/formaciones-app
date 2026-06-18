interface SymbolProps {
  size?: number
  color?: string
  className?: string
}

export function LogoSymbol({ size = 40, color = '#1a1a1a', className = '' }: SymbolProps) {
  const h = Math.round(size * 108 / 100)
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g stroke={color} strokeWidth="13" strokeLinecap="butt" strokeLinejoin="miter">
        <path d="M32,22.5 L50,12 L68,22.5" />
        <path d="M68,22.5 L86,33 L86,54" />
        <path d="M86,54 L86,75 L68,85.5" />
        <path d="M68,85.5 L50,96 L32,85.5" />
        <path d="M32,85.5 L14,75 L14,54" />
        <path d="M14,54 L14,33 L32,22.5" />
      </g>
      <g fill={color}>
        <circle cx="50" cy="12"  r="6.5" />
        <circle cx="86" cy="33"  r="6.5" />
        <circle cx="86" cy="75"  r="6.5" />
        <circle cx="50" cy="96"  r="6.5" />
        <circle cx="14" cy="75"  r="6.5" />
        <circle cx="14" cy="33"  r="6.5" />
        <circle cx="50" cy="54"  r="6.5" />
      </g>
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  light?: boolean
}

export function Logo({ size = 36, className = '', light = false }: LogoProps) {
  const symbolColor = light ? '#f5f5f0' : '#1a1a1a'
  const textColor   = light ? '#f5f5f0' : '#1a1a1a'
  const fontSize    = Math.round(size * 0.54)

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="Crewficina">
      <LogoSymbol size={size} color={symbolColor} />
      <span
        style={{
          fontSize,
          fontWeight: 500,
          color: textColor,
          letterSpacing: '-0.01em',
          fontFamily: 'Inter, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        Crewfic<span style={{ color: '#C9A961' }}>i</span>na
      </span>
    </div>
  )
}
