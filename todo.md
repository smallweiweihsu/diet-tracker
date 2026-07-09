# Diet Tracker TODO

## 後端 / 資料庫
- [x] 建立 drizzle schema：weight_logs、food_logs、exercise_logs、user_goals
- [x] 執行 migration SQL
- [x] 後端 CRUD API：weight（體重）
- [x] 後端 CRUD API：food（飲食記錄）
- [x] 後端 CRUD API：exercise（運動記錄）
- [x] 後端 CRUD API：goals（使用者目標）
- [x] 後端 AI 圖像分析 API（/food/analyzeImage）
- [x] 後端 stats API（每日統計摘要）

## 設計系統
- [x] 全域 CSS 變數（翠綠主色、深色模式）
- [x] Noto Sans TC 字體引入
- [x] 底部導覽列元件（BottomNav）
- [x] 共用卡片元件樣式

## 頁面
- [x] App.tsx 路由設定（5 頁面）
- [x] 首頁（Dashboard）：日期、體重卡片、熱量圓環、三大營養素、今日餐點
- [x] 體重輸入 Modal
- [x] 飲食記錄頁：日期切換、餐點展開/收合、食物列表、每日總計
- [x] AI 拍照辨識 Modal（拍照→分析→確認→寫入）
- [x] 運動記錄頁：統計卡片、運動列表、新增運動表單
- [x] 趨勢圖表頁：體重折線圖、熱量長條圖、營養素圓環圖
- [x] 個人設定頁：目標設定、深色模式切換、提醒設定、CSV 匯出

## 測試
- [x] weight API vitest
- [x] food API vitest
- [x] exercise API vitest

## 程式碼審查修正（2026-07）
- [x] 修正 dayRange 時區 bug：改以前端傳入的當地日期起點計算範圍
- [x] weight.today / weight.logToday 接受前端 dateMs；更新體重時同步更新備註
- [x] 新增 stats.range API 並實作趨勢頁「每日熱量長條圖」
- [x] 新增 stats.exportAll API 並實作個人設定頁 CSV 匯出（含 UTF-8 BOM）
- [x] 移除未使用的模板頁面（Home、ComponentShowcase）
- [x] 補上 dayRange 與 stats.range 測試（19 個測試全數通過）
