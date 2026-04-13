import { useRef, useState } from 'react'
import type { FoodEntry, MealType } from '../../types'
import { useAppStore } from '../../store/appStore'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snacks: '點心 & 飲料',
}

interface Props {
  meal: MealType
  onClose: () => void
}

export default function AddFoodModal({ meal, onClose }: Props) {
  const addFood = useAppStore(s => s.addFood)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Session-only photo (not persisted)
    setPhotoUrl(URL.createObjectURL(file))
  }

  function handleSave() {
    if (!name.trim() || !calories) return
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      photoUrl,
      loggedAt: new Date().toISOString(),
    }
    addFood(meal, entry)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新增 {MEAL_LABELS[meal]}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Photo upload */}
          <div className="photo-upload" onClick={() => fileRef.current?.click()}>
            {photoUrl
              ? <img src={photoUrl} alt="food" className="food-photo-preview" />
              : <span>📷 點此拍照 / 選取照片（選填）</span>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }} onChange={handlePhoto} />

          <div className="form-group">
            <label>食物名稱 *</label>
            <input type="text" value={name} placeholder="例：雞胸肉便當"
              onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label>熱量 *</label>
            <div className="input-unit">
              <input type="number" value={calories} min={0} placeholder="0"
                onChange={e => setCalories(e.target.value)} inputMode="numeric" />
              <span>kcal</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>蛋白質</label>
              <div className="input-unit">
                <input type="number" value={protein} min={0} placeholder="0"
                  onChange={e => setProtein(e.target.value)} inputMode="numeric" />
                <span>g</span>
              </div>
            </div>
            <div className="form-group">
              <label>碳水</label>
              <div className="input-unit">
                <input type="number" value={carbs} min={0} placeholder="0"
                  onChange={e => setCarbs(e.target.value)} inputMode="numeric" />
                <span>g</span>
              </div>
            </div>
            <div className="form-group">
              <label>脂肪</label>
              <div className="input-unit">
                <input type="number" value={fat} min={0} placeholder="0"
                  onChange={e => setFat(e.target.value)} inputMode="numeric" />
                <span>g</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}
            disabled={!name.trim() || !calories}>
            新增
          </button>
        </div>
      </div>
    </div>
  )
}
