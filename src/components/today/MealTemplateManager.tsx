import { useAppStore } from '../../store/appStore'

export default function MealTemplateManager() {
  const templates = useAppStore(s => s.mealTemplates)
  const deleteTemplate = useAppStore(s => s.deleteMealTemplate)

  if (templates.length === 0) {
    return (
      <div className="card">
        <p className="empty-chart">尚無餐點範本。<br />在新增食物後，可從餐次選單儲存為範本。</p>
      </div>
    )
  }

  return (
    <div className="template-manager">
      {templates.map(t => (
        <div key={t.id} className="card template-item">
          <div className="template-header">
            <span className="template-name">{t.name}</span>
            <button className="btn-icon danger" onClick={() => deleteTemplate(t.id)}>🗑</button>
          </div>
          <div className="template-items-list">
            {t.items.map((item, i) => (
              <div key={i} className="template-food-row">
                <span className="template-food-name">{item.name}</span>
                {item.portion && <span className="template-food-portion">{item.portion}</span>}
                <span className="template-food-cal">{item.calories} kcal</span>
              </div>
            ))}
          </div>
          <div className="template-total">
            共 {t.items.reduce((s, i) => s + i.calories, 0)} kcal
          </div>
        </div>
      ))}
    </div>
  )
}
