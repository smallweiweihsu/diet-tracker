import type { SVGProps, ReactNode } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  size?: number
  color?: string
  strokeWidth?: number
}

interface WrapperProps extends IconProps {
  children: ReactNode
  vb?: string
}

const Icon = ({ size = 24, color = 'currentColor', strokeWidth: _sw, children, vb = '0 0 64 64', className, style, ...rest }: WrapperProps) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
    style={{ color, ...style }}
    {...rest}
  >
    {children}
  </svg>
)

// ── Functional icons (nav) — viewBox 0 0 64 64 ───────────────────────────────

export const TodayIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="10" y="12" width="44" height="42" rx="3" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="22" y="6" width="20" height="8" fill="#b6896a" opacity="0.5" transform="rotate(-4 32 10)"/>
    <line x1="16" y1="26" x2="48" y2="26" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
    <line x1="16" y1="34" x2="48" y2="34" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
    <text x="32" y="50" fontFamily="Caveat, cursive" fontSize="18" fontWeight="700" textAnchor="middle" fill="#b55a5a" transform="rotate(-3 32 48)">22</text>
    <path d="M 42 19 L 45 22 L 50 16" fill="none" stroke="#7a8c5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Icon>
)

export const StatsIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8" y="12" width="48" height="42" rx="3" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="14" y1="44" x2="50" y2="44" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
    <rect x="16" y="32" width="6" height="12" fill="#b6896a"/>
    <rect x="24" y="26" width="6" height="18" fill="#7a8c5a"/>
    <rect x="32" y="22" width="6" height="22" fill="#b55a5a"/>
    <rect x="40" y="30" width="6" height="14" fill="#d9a85a"/>
    <path d="M 18 30 Q 26 22 32 18 T 44 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="18" cy="30" r="1.5" fill="currentColor"/>
    <circle cx="44" cy="26" r="1.5" fill="currentColor"/>
  </Icon>
)

export const AddMealIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="32" cy="32" r="22" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="32" cy="32" r="16" fill="none" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
    <line x1="32" y1="22" x2="32" y2="42" stroke="#b55a5a" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="22" y1="32" x2="42" y2="32" stroke="#b55a5a" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M 46 18 Q 52 14, 54 20 Q 48 24, 46 18 Z" fill="#7a8c5a"/>
    <line x1="46" y1="18" x2="52" y2="16" stroke="#5a6e42" strokeWidth="0.8"/>
  </Icon>
)

export const FastingIcon = (props: IconProps) => (
  <Icon {...props}>
    <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="10" x2="48" y2="10"/>
      <line x1="16" y1="54" x2="48" y2="54"/>
      <path d="M 18 10 Q 18 24 32 32 Q 46 24 46 10"/>
      <path d="M 18 54 Q 18 40 32 32 Q 46 40 46 54"/>
    </g>
    <path d="M 22 12 Q 22 20 32 27 Q 42 20 42 12 Z" fill="#b6896a" opacity="0.4"/>
    <path d="M 22 52 Q 22 44 32 36 Q 42 44 42 52 Z" fill="#b6896a" opacity="0.85"/>
    <circle cx="32" cy="32" r="1.5" fill="currentColor"/>
  </Icon>
)

export const HydrationIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M 32 10 C 32 24, 48 30, 48 42 A 16 16 0 0 1 16 42 C 16 30, 32 24, 32 10 Z" fill="#b6896a" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M 16 42 A 16 16 0 0 0 48 42 C 48 38, 40 38, 32 38 C 24 38, 16 38, 16 42 Z" fill="#b6896a"/>
    <path d="M 26 20 Q 22 26, 22 32" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
  </Icon>
)

export const MacrosIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="22" cy="26" r="12" fill="#7a8c5a" fillOpacity="0.9"/>
    <circle cx="42" cy="26" r="12" fill="#d9a85a" fillOpacity="0.9"/>
    <circle cx="32" cy="42" r="12" fill="#b55a5a" fillOpacity="0.9"/>
    <text x="22" y="30" fontFamily="Cormorant Garamond, serif" fontSize="12" fontWeight="700" fontStyle="italic" textAnchor="middle" fill="#f8f3e6">P</text>
    <text x="42" y="30" fontFamily="Cormorant Garamond, serif" fontSize="12" fontWeight="700" fontStyle="italic" textAnchor="middle" fill="#f8f3e6">C</text>
    <text x="32" y="46" fontFamily="Cormorant Garamond, serif" fontSize="12" fontWeight="700" fontStyle="italic" textAnchor="middle" fill="#f8f3e6">F</text>
  </Icon>
)

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="10" y="14" width="44" height="40" rx="3" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="14" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="32" cy="14" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="44" cy="14" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="10" y="22" width="44" height="4" fill="#b55a5a" fillOpacity="0.85"/>
    <g fill="#9b8f7d">
      <circle cx="18" cy="34" r="1.5"/><circle cx="26" cy="34" r="1.5"/>
      <circle cx="34" cy="34" r="1.5"/><circle cx="42" cy="34" r="1.5"/>
      <circle cx="18" cy="42" r="1.5"/><circle cx="34" cy="42" r="1.5"/>
      <circle cx="42" cy="42" r="1.5"/>
    </g>
    <circle cx="26" cy="42" r="4" fill="none" stroke="#b55a5a" strokeWidth="1.8"/>
    <path d="M 38 48 L 42 52 L 50 44" fill="none" stroke="#7a8c5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
  </Icon>
)

export const ProfileIcon = ({ initial = 'W', ...props }: IconProps & { initial?: string }) => (
  <Icon {...props}>
    <ellipse cx="32" cy="32" rx="22" ry="22" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <ellipse cx="32" cy="32" rx="18" ry="18" fill="none" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
    <text x="32" y="40" fontFamily="Cormorant Garamond, serif" fontSize="22" fontWeight="500" fontStyle="italic" textAnchor="middle" fill="#5a6e42">{initial}</text>
    <g transform="translate(48 16)">
      <circle cx="0" cy="0" r="1.5" fill="#b55a5a"/>
      <circle cx="3" cy="-2" r="1.2" fill="#d9a85a"/>
      <circle cx="-2" cy="-3" r="1" fill="#7a8c5a"/>
    </g>
  </Icon>
)

export const WeightIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="32" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="32" y1="13" x2="32" y2="54" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="23" x2="52" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="13" y1="23" x2="10" y2="38" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="20" y1="22" x2="22" y2="38" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="44" y1="21" x2="42" y2="35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="51" y1="20" x2="54" y2="35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M 8 38 Q 16 44 24 38" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M 40 35 Q 48 41 56 35" fill="#d9a85a" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="48" cy="34" rx="4" ry="2" fill="#b6896a" opacity="0.7"/>
    <rect x="27" y="52" width="10" height="3" rx="1.5" fill="#b6896a"/>
    <line x1="10" y1="22" x2="54" y2="22" stroke="#9b8f7d" strokeWidth="0.6" strokeDasharray="2 2"/>
  </Icon>
)

// ── Meal icons — viewBox 0 0 48 48 ───────────────────────────────────────────

export const BreakfastIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <circle cx="24" cy="26" r="9" fill="#d9a85a"/>
    <g stroke="#d9a85a" strokeWidth="1.5" strokeLinecap="round">
      <line x1="24" y1="11" x2="24" y2="7"/>
      <line x1="34" y1="16" x2="37" y2="13"/>
      <line x1="14" y1="16" x2="11" y2="13"/>
      <line x1="9" y1="26" x2="5" y2="26"/>
      <line x1="39" y1="26" x2="43" y2="26"/>
    </g>
    <line x1="6" y1="36" x2="42" y2="36" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="10" y1="40" x2="38" y2="40" stroke="#9b8f7d" strokeWidth="0.8" strokeDasharray="2 2"/>
  </Icon>
)

export const LunchIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <path d="M 8 24 Q 24 40 40 24" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M 16 16 Q 18 12 16 8" fill="none" stroke="#9b8f7d" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M 24 14 Q 26 10 24 6" fill="none" stroke="#9b8f7d" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M 32 16 Q 34 12 32 8" fill="none" stroke="#9b8f7d" strokeWidth="1.2" strokeLinecap="round"/>
    <ellipse cx="24" cy="24" rx="16" ry="2" fill="currentColor"/>
    <circle cx="18" cy="22" r="2" fill="#7a8c5a"/>
    <circle cx="24" cy="24" r="2.5" fill="#b55a5a"/>
    <circle cx="30" cy="22" r="2" fill="#d9a85a"/>
  </Icon>
)

export const SnackIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <path d="M 14 16 L 14 40 Q 14 42 16 42 L 32 42 Q 34 42 34 40 L 34 16 Z" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M 13 16 L 35 16 L 32 12 L 16 12 Z" fill="#b6896a"/>
    <ellipse cx="20" cy="26" rx="2.5" ry="2" fill="#b6896a"/>
    <ellipse cx="27" cy="28" rx="2.5" ry="2" fill="currentColor"/>
    <ellipse cx="22" cy="32" rx="2.5" ry="2" fill="currentColor"/>
    <ellipse cx="28" cy="34" rx="2.5" ry="2" fill="#b6896a"/>
    <line x1="18" y1="20" x2="30" y2="20" stroke="#9b8f7d" strokeWidth="0.6" strokeDasharray="1.5 1.5"/>
  </Icon>
)

export const DinnerIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <path d="M 30 10 A 14 14 0 1 0 36 30 A 10 10 0 0 1 30 10 Z" fill="#5a6e42"/>
    <circle cx="24" cy="18" r="1.2" fill="currentColor" fillOpacity="0.3"/>
    <circle cx="22" cy="26" r="0.8" fill="currentColor" fillOpacity="0.3"/>
    <g fill="#d9a85a">
      <circle cx="12" cy="14" r="1.2"/>
      <circle cx="40" cy="38" r="1"/>
      <circle cx="10" cy="36" r="0.8"/>
    </g>
  </Icon>
)

// ── Utility icons — viewBox 0 0 48 48 ────────────────────────────────────────

export const EditIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <g transform="rotate(-45 24 24)">
      <rect x="20" y="8" width="8" height="28" rx="1" fill="#b6896a" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M 20 36 L 24 44 L 28 36 Z" fill="currentColor"/>
      <line x1="24" y1="38" x2="24" y2="43" stroke="#f8f3e6" strokeWidth="0.8"/>
      <rect x="20" y="14" width="8" height="1.5" fill="currentColor"/>
      <rect x="20" y="16" width="8" height="1" fill="currentColor"/>
    </g>
    <path d="M 32 34 Q 36 36 40 34" fill="none" stroke="#b55a5a" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
  </Icon>
)

export const DeleteIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <path d="M 10 20 Q 8 14 14 12 Q 22 8 28 12 Q 40 12 38 20 Q 42 28 36 34 Q 30 40 22 38 Q 12 40 10 32 Q 6 26 10 20 Z" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
    <g stroke="#9b8f7d" strokeWidth="0.8" fill="none">
      <path d="M 16 18 L 20 22 L 18 26"/>
      <path d="M 26 16 L 30 20 L 28 24"/>
      <path d="M 22 28 L 26 30 L 24 34"/>
      <path d="M 30 28 L 34 26"/>
    </g>
    <g stroke="#b55a5a" strokeWidth="2" strokeLinecap="round">
      <line x1="19" y1="21" x2="29" y2="31"/>
      <line x1="29" y1="21" x2="19" y2="31"/>
    </g>
  </Icon>
)

export const NotesIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <g transform="rotate(-4 24 24)">
      <rect x="10" y="10" width="28" height="28" fill="#d9a85a" fillOpacity="0.9"/>
      <path d="M 32 10 L 38 10 L 38 16 Z" fill="#b6896a"/>
      <path d="M 32 10 L 38 16 L 32 16 Z" fill="#b6896a" fillOpacity="0.6"/>
      <line x1="14" y1="20" x2="30" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="14" y1="25" x2="32" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </g>
  </Icon>
)

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props} vb="0 0 48 48">
    <g transform="translate(24 24)">
      <g fill="currentColor">
        <rect x="-2" y="-18" width="4" height="6" rx="1"/>
        <rect x="-2" y="12" width="4" height="6" rx="1"/>
        <rect x="-18" y="-2" width="6" height="4" rx="1"/>
        <rect x="12" y="-2" width="6" height="4" rx="1"/>
        <g transform="rotate(45)">
          <rect x="-2" y="-18" width="4" height="6" rx="1"/>
          <rect x="-2" y="12" width="4" height="6" rx="1"/>
          <rect x="-18" y="-2" width="6" height="4" rx="1"/>
          <rect x="12" y="-2" width="6" height="4" rx="1"/>
        </g>
      </g>
      <circle r="11" fill="#f8f3e6" stroke="currentColor" strokeWidth="1.5"/>
      <circle r="4" fill="#b55a5a"/>
    </g>
  </Icon>
)
