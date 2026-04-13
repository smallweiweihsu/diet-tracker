import { useState } from 'react'
import type { FoodEntry, MealType, MealTemplate } from '../../types'
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
  date: string
}

export default function MealSection({ meal, entries, date }: Props) {
  const removeFood = useAppStore(s => s.removeFood)
  const mealTemplates = useAppStore(s => s.mealTemplates)
  const saveMealTemplate = useAppStore(s => s.saveMealTemplate)
  const applyMealTemplate = useAppStore(s => s.applyMealTemplate)

  const [open, setOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const total = entries.reduce((s, e) => s + e.calories, 0)

  function handleToggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function handleSaveAsTemplate() {
    const templateName = prompt('範本名稱（例：標準早餐）')
    if (!templateName?.trim()) return
    const template: MealTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      items: entries.map(e => ({
        name: e.name,
        portion: e.portion ?? '',
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        sugar: e.sugar ?? 0,
        saturatedFat: e.saturatedFat ?? 0,
        fiber: e.fiber ?? 0,
        sodium: e.sodium ?? 0,
      })),
    }
    saveMealTemplate(template)
    alert('✓ 已儲存為範本')
  }

  // Nutrition detail rows for expanded view
  function renderDetail(entry: FoodEntry) {
    const items = [
      { label: '熱量', value: `${entry.calories} kcal` },
      entry.portion ? { label: '份量', value: entry.portion } : null,
      entry.protein > 0 ? { label: '蛋白質', value: `${entry.protein}g` } : null,
      entry.carbs > 0 ? { label: '碳水', value: `${entry.carbs}g` } : null,
      entry.fat > 0 ? { label: '脂肪', value: `${entry.fat}g` } : null,
      (entry.sugar ?? 0) > 0 ? { label: '糖', value: `${entry.sugar}g` } : null,
      (entry.saturatedFat ?? 0) > 0 ? { label: '飽和脂肪', value: `${entry.saturatedFat}g` } : null,
      (entry.fiber ?? 0) > 0 ? { label: '膳食纖維', value: `${entry.fiber}g` } : null,
      (entry.sodium ?? 0) > 0 ? { label: '鈉', value: `${entry.sodium}mg` } : null,
    ].filter(Boolean) as { label: string; value: string }[]

    return (
      <div className="food-detail">
        {items.map(item => (
          <div key={item.label} className="food-detail-row">
            <span className="food-detail-label">{item.label}</span>
            <span className="food-detail-value">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="meal-section card">
      <button className="meal-header" onClick={() => setOpen(o => !o)}>
        <span className="meal-title">{MEAL_LABELS[meal]}</span>
        <span className="meal-total">{total > 0 ? `${total} kcal` : ''}</span>
        <span className="meal-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="meal-body">
          {entries.length === 0 && (
            <p className="empty-meal">尚未記錄</p>
          )}

          {entries.map(entry => (
            <div key={entry.id}>
              <div
                className={`food-entry ${expandedId === entry.id ? 'expanded' : ''}`}
                onClick={() => handleToggleExpand(entry.id)}
              >
                {entry.photoUrl && (
                  <img src={entry.photoUrl} alt={entry.name} className="food-thumb" />
                )}
                <div className="food-info">
                  <span className="food-name">{entry.name}</span>
                  <span className="food-macros">
                    {entry.calories} kcal
                    {entry.portion && ` · ${entry.portion}`}
                  </span>
                </div>
                <div className="food-entry-right">
                  <span className="food-expand-icon">{expandedId === entry.id ? '▲' : '▼'}</span>
                  <button
                    className="btn-icon danger"
                    onClick={e => { e.stopPropagation(); removeFood(meal, entry.id, date) }}
                    aria-label="刪除"
                  >
                    🗑
                  </button>
                </div>
              </div>
              {expandedId === entry.id && renderDetail(entry)}
            </div>
          ))}

          <div className="meal-actions">
            <button className="btn-add-food" onClick={() => setShowModal(true)}>
              + 新增食物
            </button>
            {mealTemplates.length > 0 && (
              <button className="btn-template" onClick={() => setShowTemplates(s => !s)}>
                📋 套用範本
              </button>
            )}
            {entries.length > 0 && (
              <button className="btn-save-template" onClick={handleSaveAsTemplate}>
                💾 存為範本
              </button>
            )}
          </div>

          {showTemplates && (
            <div className="template-sheet">
              <p className="template-sheet-title">選擇範本</p>
              {mealTemplates.map(t => (
                <button
                  key={t.id}
                  className="template-choice"
                  onClick={() => {
                    applyMealTemplate(t.id, meal, date)
                    setShowTemplates(false)
                  }}
                >
                  <span>{t.name}</span>
                  <span className="template-choice-cal">
                    {t.items.reduce((s, i) => s + i.calories, 0)} kcal
                  </span>
                </button>
              ))}
              <button className="btn-secondary" onClick={() => setShowTemplates(false)}>取消</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddFoodModal meal={meal} date={date} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
