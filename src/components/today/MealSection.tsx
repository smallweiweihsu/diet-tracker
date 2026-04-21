import { useState, useRef } from 'react'
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
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  // offset per entry: 0 = closed, -DELETE_THRESHOLD = swiped open (showing delete btn)
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({})
  const touchStartX = useRef<Record<string, number>>({})

  const DELETE_THRESHOLD = 80

  function closeAllSwipes(exceptId?: string) {
    setSwipeOffsets(prev => {
      const next: Record<string, number> = {}
      Object.keys(prev).forEach(k => { next[k] = k === exceptId ? prev[k] : 0 })
      return next
    })
  }

  function handleTouchStart(id: string, e: React.TouchEvent) {
    touchStartX.current[id] = e.touches[0].clientX
    // Close any other open swipes
    closeAllSwipes(id)
  }

  function handleTouchMove(id: string, e: React.TouchEvent) {
    const delta = e.touches[0].clientX - (touchStartX.current[id] ?? 0)
    if (delta > 0) return // only left swipe
    setSwipeOffsets(prev => ({ ...prev, [id]: Math.max(delta, -DELETE_THRESHOLD - 8) }))
  }

  function handleTouchEnd(id: string) {
    const offset = swipeOffsets[id] ?? 0
    if (offset <= -DELETE_THRESHOLD * 0.6) {
      // Snap to reveal position — wait for tap on delete button
      setSwipeOffsets(prev => ({ ...prev, [id]: -DELETE_THRESHOLD }))
    } else {
      // Snap back
      setSwipeOffsets(prev => ({ ...prev, [id]: 0 }))
    }
  }

  function confirmDelete(id: string) {
    removeFood(meal, id, date)
    setSwipeOffsets(prev => ({ ...prev, [id]: 0 }))
  }

  const total = entries.reduce((s, e) => s + e.calories, 0)

  function handleEntryClick(id: string, offset: number) {
    if (offset !== 0) {
      closeAllSwipes()
    } else {
      setExpandedId(prev => prev === id ? null : id)
    }
  }

  function handleOpenAdd() {
    closeAllSwipes()
    setEditEntry(null)
    setShowModal(true)
  }

  function handleOpenEdit(entry: FoodEntry) {
    closeAllSwipes()
    setEditEntry(entry)
    setExpandedId(null)
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditEntry(null)
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

    const photos = entry.photoUrls?.length ? entry.photoUrls : (entry.photoUrl ? [entry.photoUrl] : [])
    return (
      <div className="food-detail">
        {photos.length > 0 && (
          <div className="food-detail-photos" style={{ gridColumn: '1 / -1' }}>
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`photo-${i}`} className="food-detail-photo" />
            ))}
          </div>
        )}
        {items.map(item => (
          <div key={item.label} className="food-detail-row">
            <span className="food-detail-label">{item.label}</span>
            <span className="food-detail-value">{item.value}</span>
          </div>
        ))}
        <div className="food-detail-edit-row">
          <button className="btn-edit-food" onClick={() => handleOpenEdit(entry)}>
            ✏️ 編輯
          </button>
        </div>
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

          {entries.map(entry => {
            const offset = swipeOffsets[entry.id] ?? 0
            const isRevealed = offset <= -DELETE_THRESHOLD * 0.6
            return (
              <div key={entry.id} className="swipe-wrapper">
                {/* Delete button revealed on left swipe — requires explicit tap */}
                <button
                  className={`swipe-delete-bg ${isRevealed ? 'visible' : ''}`}
                  onClick={() => confirmDelete(entry.id)}
                  aria-label="刪除"
                >
                  <span style={{ fontSize: 18 }}>🗑</span>
                  <span>刪除</span>
                </button>
                <div
                  className={`food-entry ${expandedId === entry.id ? 'expanded' : ''}`}
                  style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? 'transform 0.25s ease' : 'none' }}
                  onClick={() => handleEntryClick(entry.id, offset)}
                  onTouchStart={e => handleTouchStart(entry.id, e)}
                  onTouchMove={e => handleTouchMove(entry.id, e)}
                  onTouchEnd={() => handleTouchEnd(entry.id)}
                >
                  {(entry.photoUrls?.[0] ?? entry.photoUrl) && (
                    <img src={entry.photoUrls?.[0] ?? entry.photoUrl} alt={entry.name} className="food-thumb" />
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
                  </div>
                </div>
                {expandedId === entry.id && renderDetail(entry)}
              </div>
            )
          })}

          <div className="meal-actions">
            <button className="btn-add-food" onClick={handleOpenAdd}>
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
        <AddFoodModal
          meal={meal}
          date={date}
          onClose={handleCloseModal}
          editEntry={editEntry ?? undefined}
        />
      )}
    </div>
  )
}
