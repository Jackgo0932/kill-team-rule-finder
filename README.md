# Kill Team 規則速查 PWA

這是一個純靜態 Web / PWA 專案，可直接部署到 GitHub Pages。

## 專案內容

- `index.html`：主程式
- `manifest.json`：PWA 設定
- `service-worker.js`：離線快取
- `icon-192.png` / `icon-512.png`：主畫面圖示
- `.nojekyll`：避免 GitHub Pages 使用 Jekyll 處理
- `404.html`：簡單的返回首頁頁面

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新的 repository，例如：
   `kill-team-rule-finder`

2. 把這個資料夾內的所有檔案上傳到 repository 根目錄。

3. 到 GitHub repository：
   `Settings → Pages`

4. 在 **Build and deployment**：
   - Source：`Deploy from a branch`
   - Branch：`main`
   - Folder：`/ (root)`
   - 按 Save

5. 等待 GitHub Pages 完成部署。

網址通常會是：

`https://你的GitHub帳號.github.io/kill-team-rule-finder/`

## 手機安裝

### iPhone / iPad
1. 用 Safari 開啟 GitHub Pages 網址。
2. 點「分享」。
3. 選「加入主畫面」。
4. 之後可直接從桌面圖示啟動。

### Android
1. 用 Chrome 開啟 GitHub Pages 網址。
2. 選單中選「安裝應用程式」或「加到主畫面」。
3. 安裝後可從桌面啟動。

## 離線

第一次在線上完整開啟網站後，Service Worker 會快取必要檔案。
之後即使沒有網路，也可以打開已安裝的 PWA 查規則。

## 本機測試

不要直接用 `file://` 測 PWA。

在此資料夾執行：

```bash
python3 -m http.server 8000
```

然後開啟：

`http://localhost:8000`

## 更新規則

目前資料直接放在 `index.html` 內，因此只要修改其中的規則資料並重新 push 到 GitHub 即可更新網站。

之後若規則量變大，可以再拆成：

```text
data/
  core-rules.json
  weapon-rules.json
  teams/
    plague-marines.json
```

這樣會更方便維護。
