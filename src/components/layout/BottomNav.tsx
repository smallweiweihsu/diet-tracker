import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { TodayIcon, StatsIcon, WeightIcon, ProfileIcon } from '../icons/LinenIcons'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/record', label: '記錄', icon: <TodayIcon size={26} />, end: false },
  { to: '/stats', label: '統計', icon: <StatsIcon size={26} />, end: false },
  { to: '/weight', label: '體重', icon: <WeightIcon size={26} />, end: false },
  { to: '/profile', label: '我的', icon: <ProfileIcon size={26} />, end: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
