import { useRef, useState, useEffect, useCallback } from 'react'
import type { FoodEntry, MealType } from '../../types'
import { useAppStore } from '../../store/appStore'
import { userGet, userSet } from '../../utils/storage'
import RecentFoodsRow from './RecentFoodsRow'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snacks: '點心 & 飲料',
}

interface Props {
  meal: MealType
  date: string
  onClose: () => void
}

// Compress image to base64 using canvas (max 300px, JPEG 0.6)
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const maxSize = 300
      let w = img.width
      let h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize }
        else { w = Math.round((w * maxSize) / h); h = maxSize }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = reject
    img.src = url
  })
}

const DRAFT_KEY = 'foodDraft'

export default function AddFoodModal({ meal, date, onClose }: Props) {
  const addFood = useAppStore(s => s.addFood)
  const currentUser = useAppStore(s => s.currentUser)
  const userId = currentUser?.id ?? ''

  // Load draft on open
  const draft = userGet(DRAFT_KEY, userId, null)

  const [name, setName] = useState(draft?.name ?? '')
  const [portion, setPortion] = useState(draft?.portion ?? '')
  const [calories, setCalories] = useState(draft?.calories?.toString() ?? '')
  const [protein, setProtein] = useState(draft?.protein?.toString() ?? '')
  const [carbs, setCarbs] = useState(draft?.carbs?.toString() ?? '')
  const [fat, setFat] = useState(draft?.fat?.toString() ?? '')
  const [sugar, setSugar] = useState(draft?.sugar?.toString() ?? '')
  const [saturatedFat, setSaturatedFat] = useState(draft?.saturatedFat?.toString() ?? '')
  const [fiber, setFiber] = useState(draft?.fiber?.toString() ?? '')
  const [sodium, setSodium] = useState(draft?.sodium?.toString() ?? '')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(draft?.photoUrl ?? undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  // Save draft on any change
  const saveDraft = useCallback(() => {
    userSet(DRAFT_KEY, userId, {
      name, portion,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      sugar: Number(sugar) || 0,
      saturatedFat: Number(saturatedFat) || 0,
      fiber: Number(fiber) || 0,
      sodium: Number(sodium) || 0,
      photoUrl,
    })
  }, [name, portion, calories, protein, carbs, fat, sugar, saturatedFat, fiber, sodium, photoUrl, userId])

  useEffect(() => {
    saveDraft()
  }, [saveDraft])

  function clearDraft() {
    userSet(DRAFT_KEY, userId, null)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhotoUrl(compressed)
    } catch {
      setPhotoUrl(URL.createObjectURL(file))
    }
  }

  function handleSelectRecent(food: FoodEntry) {
    setName(food.name)
    setPortion(food.portion ?? '')
    setCalories(food.calories.toString())
    setProtein(food.protein.toString())
    setCarbs(food.carbs.toString())
    setFat(food.fat.toString())
    setSugar((food.sugar ?? 0).toString())
    setSaturatedFat((food.saturatedFat ?? 0).toString())
    setFiber((food.fiber ?? 0).toString())
    setSodium((food.sodium ?? 0).toString())
    if (food.photoUrl) setPhotoUrl(food.photoUrl)
  }

  function handleSave() {
    if (!name.trim() || !calories) return
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      portion: portion.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      sugar: Number(sugar) || 0,
      saturatedFat: Number(saturatedFat) || 0,
      fiber: Number(fiber) || 0,
      sodium: Number(sodium) || 0,
      photoUrl,
      loggedAt: new Date().toISOString(),
    }
    addFood(meal, entry, date)
    clearDraft()
    onClose()
  }

  function handleCancel() {
    clearDraft()
    onClose()
  }

  const fields = [
    { label: '份量', value: portion, set: setPortion, unit: '', type: 'text', placeholder: '例：1碗、100g' },
    { label: '熱量 *', value: calories, set: setCalories, unit: 'kcal', type: 'number', placeholder: '0', required: true },
    { label: '蛋白質', value: protein, set: setProtein, unit: 'g', type: 'number', placeholder: '0' },
    { label: '碳水化合物', value: carbs, set: setCarbs, unit: 'g', type: 'number', placeholder: '0' },
    { label: '脂肪', value: fat, set: setFat, unit: 'g', type: 'number', placeholder: '0' },
    { label: '糖', value: sugar, set: setSugar, unit: 'g', type: 'number', placeholder: '0' },
    { label: '飽和脂肪', value: saturatedFat, set: setSaturatedFat, unit: 'g', type: 'number', placeholder: '0' },
    { label: '膳食纖維', value: fiber, set: setFiber, unit: 'g', type: 'number', placeholder: '0' },
    { label: '鈉', value: sodium, set: setSodium, unit: 'mg', type: 'number', placeholder: '0' },
  ]

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新增 {MEAL_LABELS[meal]}</h3>
          <button className="btn-icon" onClick={handleCancel} aria-label="關閉">✕</button>
        </div>

        <div className="modal-body">
          {/* Recent foods */}
          <RecentFoodsRow onSelect={handleSelectRecent} />

          {/* Photo upload */}
          <div className="photo-upload" onClick={() => fileRef.current?.click()}>
            {photoUrl
              ? <img src={photoUrl} alt="food" className="food-photo-preview" />
              : <span>📷 點此選取照片或拍照（選填）</span>
            }
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />

          {/* Name */}
          <div className="form-group">
            <label>食物名稱 *</label>
            <input
              type="text"
              value={name}
              placeholder="例：雞胸肉便當"
              className="input-text"
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* All nutrition fields - vertical */}
          {fields.map(f => (
            <div key={f.label} className="form-group">
              <label>{f.label}</label>
              {f.unit ? (
                <div className="input-unit">
                  <input
                    type={f.type}
                    value={f.value}
                    min={0}
                    placeholder={f.placeholder}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    onChange={e => f.set(e.target.value)}
                  />
                  <span>{f.unit}</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={f.value}
                  placeholder={f.placeholder}
                  className="input-text"
                  onChange={e => f.set(e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleCancel}>取消</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!name.trim() || !calories}
          >
            新增
          </button>
        </div>
      </div>
    </div>
  )
}
