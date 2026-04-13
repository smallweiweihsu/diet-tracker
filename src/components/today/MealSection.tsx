import { useState } from 'react'
import type { FoodEntry, MealType } from '../../types'
import { useAppStore } from '../../store/appStore'
import AddFoodModal from './AddFoodModal'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🍳 早餐',
  lunch: '🍱 午餐',
  dinner: '🍜 晚餐',
  snacks: '🧋 點心 & 飲料',
}

interface Props {
  meal: MealType
  entries: FoodEntry[]
}

export default function MealSection({ meal, entries }: Props) {
  const removeFood = useAppStore(s => s.removeFood)
  const [open, setOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const total = entries.reduce((s, e) => s + e.calories, 0)

  return (
    <div className="meal-section">
      <button className="meal-header" onClick={() => setOpen(o => !o)}>
        <span className="meal-title">{MEAL_LABELS[meal]}</span>
        <span className="meal-total">{total} kcal</span>
        <span className="meal-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="meal-body">
          {entries.length === 0 && (
            <p className="empty-meal">尚未記錄</p>
          )}
          {entries.map(entry => (
            <div key={entry.id} className="food-entry">
              {entry.photoUrl && (
                <img src={entry.photoUrl} alt={entry.name} className="food-thumb" />
              )}
              <div className="food-info">
                <span className="food-name">{entry.name}</span>
                <span className="food-macros">
                  {entry.calories} kcal
                  {entry.protein > 0 && ` · P ${entry.protein}g`}
                  {entry.carbs > 0 && ` · C ${entry.carbs}g`}
                  {entry.fat > 0 && ` · F ${entry.fat}g`}
                </span>
              </div>
              <button
                className="btn-icon danger"
                onClick={() => removeFood(meal, entry.id)}
                aria-label="刪除"
              >
                🗑
              </button>
            </div>
          ))}
          <button className="btn-add-food" onClick={() => setShowModal(true)}>
            + 新增食物
          </button>
        </div>
      )}

      {showModal && (
        <AddFoodModal meal={meal} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
