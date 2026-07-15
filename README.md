# Morsel 🥐

Morsel — 個人飲食、運動與身體數據追蹤 app。記錄體重、飲食（含 AI 拍照辨識營養成分）、運動與重訓，並以圖表追蹤趨勢。

**完全獨立部署**：不依賴任何特定平台，只需要一個 MySQL 資料庫；AI 辨識功能接你自己的 Anthropic API key。

## 功能

- 📊 **首頁總覽**：今日體重、熱量圓環、三大營養素進度、各餐摘要
- 🍱 **飲食記錄**：日期切換、依餐別分組、AI 拍照自動辨識食物與營養成分（Claude 視覺模型）
- 🏃 **運動記錄**：運動類型、時間、消耗熱量（依類型自動估算）
- 📈 **趨勢圖表**：體重折線圖、每日熱量長條圖（含目標線）、營養素分佈圓環
- ⚙️ **個人設定**：目標設定、深色模式、CSV 匯出

## 技術架構

| 層 | 技術 |
|---|---|
| 前端 | React 19 + Vite + Tailwind CSS 4 + Recharts |
| 後端 | Express + tRPC 11 |
| 資料庫 | MySQL（Drizzle ORM） |
| AI | Anthropic Claude（`@anthropic-ai/sdk`，拍照辨識食物） |
| 登入 | 單一使用者，可選 `APP_PASSWORD` 密碼保護 |

## 本機開發

需求：Node.js 20+、pnpm、一個 MySQL 資料庫。

```bash
pnpm install
cp .env.example .env   # 填入 DATABASE_URL、JWT_SECRET（其餘選填）
pnpm db:push           # 建立資料表
pnpm dev               # http://localhost:3000
```

## 環境變數

| 變數 | 必填 | 說明 |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL 連線字串 |
| `JWT_SECRET` | ✅（production） | 簽署 session cookie 的密鑰 |
| `ANTHROPIC_API_KEY` | 選填 | 啟用 AI 拍照辨識；到 [platform.claude.com](https://platform.claude.com) 取得 |
| `ANTHROPIC_MODEL` | 選填 | 預設 `claude-opus-4-8` |
| `APP_PASSWORD` | 選填 | 設定後開啟 App 需輸入密碼；未設定則直接可用 |
| `HEALTH_SYNC_TOKEN` | 選填 | 啟用 `POST /api/health/sync`，配合 iPhone 捷徑同步 Apple Watch 運動記錄 |
| `PORT` | 選填 | 預設 3000 |

## 部署

任何能跑 Node.js 的平台都可以（Render、Railway、Fly.io、Zeabur、自家 VPS…）。

### 一般 Node 平台（Render / Railway / Zeabur）

- Build command：`pnpm install && pnpm build`
- Start command：`pnpm start`
- 設定上表的環境變數；資料庫可用平台附帶的 MySQL 或外部免費方案（TiDB Cloud、Aiven 等）
- 首次部署後執行一次 `pnpm db:push` 建立資料表（或在本機對同一個資料庫執行）

### Docker

```bash
docker build -t morsel .
docker run -p 3000:3000 --env-file .env morsel
```

## 指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 開發模式（Vite HMR） |
| `pnpm build` | 建置前後端到 `dist/` |
| `pnpm start` | 以 production 模式啟動 |
| `pnpm check` | TypeScript 型別檢查 |
| `pnpm test` | vitest 測試 |
| `pnpm db:push` | 產生並套用資料庫 migration |
