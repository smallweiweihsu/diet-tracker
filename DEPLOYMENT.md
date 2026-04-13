# 部署教學：把 App 加到 iPhone 主畫面

## 步驟一：產生 App 圖示

1. 用瀏覽器開啟 `public/icons/generate-icons.html`
2. 點擊「生成圖示」
3. 下載三個 PNG 檔案，放到 `public/icons/` 資料夾：
   - `icon-192x192.png`
   - `icon-512x512.png`
   - `apple-touch-icon.png`

---

## 步驟二：上傳到 GitHub

### 安裝 Git
到 https://git-scm.com/downloads 下載 Git for Windows，安裝時全部點「下一步」。

### 在 GitHub 建立 repository
1. 前往 https://github.com/new
2. Repository name 填 `diet-tracker`
3. 設定為 **Public**（GitHub Pages 免費版需要 Public）
4. 按「Create repository」

### 上傳程式碼（在 Windows 命令提示字元執行）

打開「命令提示字元」（按 Win+R 輸入 cmd），逐行執行：

```
cd C:\Users\User\Desktop\diet-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/diet-tracker.git
git push -u origin main
```

> 把 `你的帳號` 換成你的 GitHub 用戶名。
> 第一次 push 時 Git 會要求登入，選擇用瀏覽器登入（Sign in with browser）。

---

## 步驟三：啟用 GitHub Pages

1. 在 GitHub repo 頁面，點 **Settings**
2. 左側選 **Pages**
3. Source 選 **Deploy from a branch**
4. Branch 選 **gh-pages** → **(root)**
5. 按 **Save**

> 第一次等 GitHub Actions 跑完（約 2-3 分鐘），就會看到網址。

網址格式：`https://你的帳號.github.io/diet-tracker/`

---

## 步驟四：加到 iPhone 主畫面

1. 用 **iPhone 的 Safari** 打開上面的網址
2. 點底部的「**分享**」按鈕 (□ 帶箭頭的圖示)
3. 選「**加入主畫面**」
4. 名稱可以改成「飲食記錄」，點「**新增**」

App 就會出現在主畫面，點開後就是全螢幕模式，跟 native app 一樣！

---

## 本機開發

安裝完 Node.js 後，在 `diet-tracker` 資料夾內執行：

```
npm run dev
```

瀏覽器開啟 `http://localhost:5173/diet-tracker/` 就能看到 App。
