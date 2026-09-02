# Kill Team 規則速查

一個以手機桌邊查詢為優先的 **Warhammer 40,000: Kill Team** 靜態規則速查工具。

目標不是取代完整規則書，而是讓玩家在對戰中可以快速搜尋核心規則、武器規則、小隊規則、任務、裝備與特工資料，減少在官方 App／PDF 之間反覆翻頁的時間。

## 目前版本

**v2.2.3 — Approved Ops 中文術語統一**

網站採純靜態架構，可部署於 GitHub Pages，並支援 PWA／離線快取。

## 規則資料原則

- **目前有效的英文規則**作為規則內容與更新判定的主要依據。
- **官方簡體中文資料**主要作為官方中文術語來源，再轉為繁體中文。
- 若中文資料尚未包含後續更新，保留目前英文規則內容，不以較舊中文規則覆蓋。
- 距離採 Kill Team 常見標示方式，例如 `6"`。
- 小隊與任務若有後續 Balance Dataslate、FAQ、Errata 或 Approved Ops Update，應以目前有效更新為準。

> 本工具是玩家用速查工具。實際比賽與規則爭議仍應以 Games Workshop 當前官方規則與更新文件為準。

## 主要功能

### 查規則

採兩層分類，避免資料增加後頂部分類過度擁擠。

第一層：

- **全部**
- **核心規則**
- **Approved Ops 2025**
- **裝備**
- **小隊**

第二層依第一層內容顯示：

- 核心規則 → 核心、武器規則
- Approved Ops 2025 → 對戰流程、Crit Ops、Kill Op、Tac Ops、地圖
- 裝備 → 通用裝備、陣營裝備
- 小隊 → 小隊資訊、陣營規則、戰略計謀、交戰計謀、特工

Approved Ops 2025 被視為一套完整的對戰／任務框架，而不是單純與核心規則平級的「任務」資料。Crit Ops、Kill Op、Tac Ops 因此集中於此分類；實戰用的「流程」頁仍保留為獨立快速入口。

「全部」搜尋仍會跨分類搜尋所有資料。

### 小隊

選擇小隊後，只顯示與該小隊實際相關的內容：

- 小隊資訊／陣營規則
- 戰略計謀／交戰計謀
- Tac Ops
- 通用裝備／陣營裝備
- 特工

**Crit Ops 與 Kill Op 為共通規則，因此不放在小隊頁，統一於「查規則 → Approved Ops 2025」查詢。**

Tac Ops 會依目前小隊的 Archetype 自動過濾。

### 流程

收錄 Approved Ops 的對戰流程與常用規則子流程。流程中的特定規則可以直接展開說明，並維持目前所在的流程步驟，方便實戰時快速確認。

### 收藏

可收藏常用規則，資料儲存在瀏覽器 Local Storage。

### PWA／離線使用

網站包含 Manifest 與 Service Worker，可在支援的平台加入主畫面並於快取完成後離線使用。

## 目前支援小隊

- 瘟疫戰士（Plague Marines）
- 死亡天使（Angels of Death）
- 破壞專隊（Wrecka Krew）
- 屠戮之翼（Murderwing）
- 軍團（Legionary）
- 死亡守望（Deathwatch）
- 潔天使隱伏者（Celestian Insidiants）
- 冥工之環（Canoptek Circle）
- 卡舍津（Kasrkin）

## 任務系統

目前已收錄：

- **Crit Ops** — Approved Ops 共通主要任務
- **Kill Op** — Kill Grade 與 VP 判定速查
- **Tac Ops** — 依 Archetype 分類，並依所選小隊過濾

Tac Ops 亦包含部分容易誤判的規則補充與官方更新後的互動說明。

## 專案結構

```text
/
├─ index.html
├─ styles.css
├─ app.js
├─ manifest.json
├─ service-worker.js
├─ VERSION.txt
├─ data/
│  ├─ core_rules.js
│  ├─ weapon_rules.js
│  ├─ universal_equipment.js
│  ├─ tac_ops.js
│  ├─ mission_ops.js
│  └─ 各小隊資料檔
└─ assets/
   └─ 各小隊特工圖片
```

資料使用傳統 JavaScript 全域資料檔載入，而不是依賴伺服器 API，因此可直接部署到 GitHub Pages，並配合 Service Worker 離線快取。

## 近期更新

### v2.2.3
- Approved Ops 2025 英文殘留術語進行中文化整理。
- `Killzone` 統一使用官方簡中「杀戮区」轉繁體後的「殺戮區」。
- `Drop Zone` 沿用官方簡中「降落区」轉繁體後的「降落區」。
- `Kill Grade` 在目前可取得的官方簡中資料中未找到 Approved Ops 正式譯名，因此暫用「擊殺等級（Kill Grade）」；表格欄位簡化為「等級 1～5」，保留英文原詞方便核對英文卡片。
- 地圖名稱改以中文殺戮區名稱為主，英文名稱置於括號中供核對。
- 不把自行翻譯的 Approved Ops 專有詞標示成官方中文譯名。


### v2.2.2
- Approved Ops 2025 新增「對戰流程」速查卡。
- Approved Ops 2025 新增「地圖」分類。
- 地圖頁先收錄 Volkus、Bheta-Decima、Tomb World、Gallowdark 與 Non-specific Killzone，各 6 張配置。
- 依官方 Tournament Companion 的提醒，不自行推測地形精確座標；在取得可靠官方地圖圖面前先提供可用地圖組與數量。
- 對戰流程與原本獨立「流程」入口並存：前者負責 Approved Ops 規則查詢，後者仍作為實戰流程導覽。


### v2.2.1
- 「查規則」第一層的「規則」改為「核心規則」。
- 「任務」改為「Approved Ops 2025」，將 Crit Ops、Kill Op、Tac Ops 集中在同一套對戰框架下。
- 小隊頁維持精簡，不加入共通的 Crit Ops／Kill Op。
- 「流程」頁維持獨立實戰入口，不與資料分類綁死。


### v2.2.0.2
- 重新整理 README。
- 補回目前功能、規則資料原則、支援小隊與近期版本紀錄。
- 建立後續發版固定同步 README／VERSION／PWA cache 的維護方式。

### v2.2.0.1
- 修正手機版兩層分類可能互相覆蓋的問題。
- 第一層與第二層分類固定分成兩行，各自可水平滑動。

### v2.2.0
- 重整整體資訊架構。
- 「查規則」改為第一層大分類＋第二層細分類。
- 「小隊」頁重新分組，降低頂部 Tab 數量。
- Crit Ops／Kill Op 從小隊頁移除，集中到共通任務查詢。
- Tac Ops 保留於小隊頁並依 Archetype 過濾。

### v2.1.9
- 新增 Crit Ops。
- 新增 Kill Op 與 Kill Grade 速查表。
- 與既有 Tac Ops 共同形成任務查詢內容。

### v2.1.8.3
- Tac Ops 距離標示統一為 `6"`、`5"` 等英吋符號格式。
- 修正距離文字可能顯示反斜線的問題。

### v2.1.8.1
- Tac Ops 增加「規則補充」區塊。
- 補充 Expendable 與 Martyrs、Rout、Sweep & Clear、Dominate、Steal Intelligence 等互動。
- 更新 Retrieval 與 Sweep & Clear 的目前規則。

### v2.1.8
- 新增 12 張 Tac Ops。
- Tac Ops 依 Recon、Security、Seek & Destroy、Infiltration 分類。
- 小隊頁依 Archetype 自動顯示可選 Tac Ops。

### v2.1.7.x
- 新增通用裝備資料。
- 區分「通用裝備」與「陣營裝備」。
- 修正通用裝備資料檔未正確載入的問題。

## 發版檢查

之後每次建立新版本時，至少同步：

1. 更新 `VERSION.txt`
2. 更新 `service-worker.js` cache 名稱
3. 更新 `README.md` 的目前版本與近期更新
4. 新增資料檔／素材時確認已納入 Service Worker precache
5. 執行 JavaScript 語法檢查
6. 手機版確認搜尋、分類、卡片展開與水平捲動

## 部署

本專案可直接部署至 GitHub Pages。

更新版本後，建議首次在線上開啟一次網站，讓新的 Service Worker 與靜態資源完成更新與快取。

## Disclaimer

Warhammer 40,000、Kill Team 及相關名稱、規則與美術資產屬其各自權利人所有。本專案為非官方玩家製作的規則速查工具，與 Games Workshop 無關。
