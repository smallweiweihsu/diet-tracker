interface Props {
  protein: number; proteinTarget: number
  carbs: number; carbTarget: number
  fat: number; fatTarget: number
}

export default function MacroProgressBars({ protein, proteinTarget, carbs, carbTarget, fat, fatTarget }: Props) {
  const items = [
    { key: 'p', name: '蛋白質', en: 'protein', val: Math.round(protein), target: proteinTarget, fillCls: 'mc-fill-leaf'  },
    { key: 'c', name: '碳水',   en: 'carbs',   val: Math.round(carbs),   target: carbTarget,     fillCls: 'mc-fill-honey' },
    { key: 'f', name: '脂肪',   en: 'fat',     val: Math.round(fat),     target: fatTarget,      fillCls: 'mc-fill-berry' },
  ]

  return (
    <div className="macro-cards">
      {items.map(({ key, name, en, val, target, fillCls }) => (
        <div key={key} className={`mc mc-${key}`}>
          <div className="mc-name">{name}</div>
          <div className="mc-en">{en}</div>
          <div className="mc-val">{val}<span className="mc-u">g</span></div>
          <div className="mc-target">of {target}g ~</div>
          <div className="mc-bar">
            <div
              className={`mc-fill ${fillCls}`}
              style={{ width: `${target > 0 ? Math.min(val / target * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
