import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '今日', icon: '🍽️', end: true },
  { to: '/weight', label: '體重', icon: '⚖️', end: false },
  { to: '/history', label: '歷史', icon: '📋', end: false },
  { to: '/settings', label: '設定', icon: '⚙️', end: false },
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
