const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 20, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export function PdfIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M7 3h7l5 5v13H7z" {...stroke} />
      <path d="M14 3v5h5" {...stroke} />
      <path d="M10 13h5M10 17h5" {...stroke} />
    </Svg>
  )
}

export function UploadIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M12 16V5" {...stroke} />
      <path d="M8 9l4-4 4 4" {...stroke} />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" {...stroke} />
    </Svg>
  )
}

export function LockIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" {...stroke} />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...stroke} />
      <path d="M12 14v2.5" {...stroke} />
    </Svg>
  )
}

export function EyeIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" {...stroke} />
      <circle cx="12" cy="12" r="2.6" {...stroke} />
    </Svg>
  )
}

export function EyeOffIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M2.5 12s3.4-6 9.5-6c1.7 0 3.2.5 4.5 1.2" {...stroke} />
      <path d="M21.5 12s-3.4 6-9.5 6c-1.7 0-3.2-.5-4.5-1.2" {...stroke} />
      <path d="M4 20 20 4" {...stroke} />
    </Svg>
  )
}

export function ChevronLeftIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M14 6l-6 6 6 6" {...stroke} />
    </Svg>
  )
}

export function ChevronRightIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M10 6l6 6-6 6" {...stroke} />
    </Svg>
  )
}

export function ZoomInIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="6.5" {...stroke} />
      <path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" {...stroke} />
    </Svg>
  )
}

export function ZoomOutIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="6.5" {...stroke} />
      <path d="M16 16l4.5 4.5M8.5 11h5" {...stroke} />
    </Svg>
  )
}

export function RotateIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M20 12a8 8 0 1 1-3-6.2" {...stroke} />
      <path d="M20 4v5h-5" {...stroke} />
    </Svg>
  )
}

export function DownloadIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M12 4v11" {...stroke} />
      <path d="M8 11l4 4 4-4" {...stroke} />
      <path d="M4 19h16" {...stroke} />
    </Svg>
  )
}

export function CloseIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12M18 6 6 18" {...stroke} />
    </Svg>
  )
}

export function CheckIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" {...stroke} strokeWidth={2.4} />
    </Svg>
  )
}

export function ImageIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...stroke} />
      <circle cx="8.5" cy="9.5" r="1.6" {...stroke} />
      <path d="M4.5 17.5 10 12l4 4 3-3 3 3" {...stroke} />
    </Svg>
  )
}

export function InstallIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <path d="M12 4v9" {...stroke} />
      <path d="M8.5 9.5 12 13l3.5-3.5" {...stroke} />
      <path d="M5 17.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" {...stroke} />
    </Svg>
  )
}

export function BrandMark({ size = 40 }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="116" fill="#16181d" />
      <path
        d="M146 100h150l64 64v248a20 20 0 0 1-20 20H146a20 20 0 0 1-20-20V120a20 20 0 0 1 20-20z"
        fill="#ffffff"
      />
      <path d="M296 100l64 64h-64z" fill="#e2452f" />
      <path
        d="M172 296l24 92 32-70 32 70 24-92"
        fill="none"
        stroke="#e2452f"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
