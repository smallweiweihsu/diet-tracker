import { useAppStore } from '../../store/appStore'
import type { FoodEntry } from '../../types'

interface Props {
  onSelect: (food: FoodEntry) => void
}

export default function RecentFoodsRow({ onSelect }: Props) {
  const recentFoods = useAppStore(s => s.recentFoods)

  if (recentFoods.length === 0) return null

  return (
    <div className="recent-foods-section">
      <p className="recent-foods-label">最近使用</p>
      <div className="recent-foods-row">
        {recentFoods.map((food, i) => (
          <button
            key={i}
            className="recent-food-chip"
            onClick={() => onSelect(food)}
          >
            <span className="recent-food-name">{food.name}</span>
            <span className="recent-food-cal">{food.calories} kcal</span>
          </button>
        ))}
      </div>
    </div>
  )
}
