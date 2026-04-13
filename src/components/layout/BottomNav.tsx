import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/record', label: '記錄', icon: '📋', end: false },
  { to: '/stats', label: '統計', icon: '📊', end: false },
  { to: '/weight', label: '體重', icon: '⚖️', end: false },
  { to: '/profile', label: '我的', icon: '👤', end: false },
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
