# Portfolio 專案 — 洪寶華 Ivy

## 專案說明
個人設計作品集網站，純靜態網頁（HTML / CSS / JS），無框架。
目標：展示品牌設計、包裝設計、平面視覺與 AI 學習等作品。

**GitHub：** https://github.com/hongbaohua/Portfolio
**本機路徑：** `C:\Users\Master\Projects\Portfolio\web\`
**Obsidian 筆記：** `C:\Users\Master\Projects\Portfolio\notes\`
**啟動方式：** 桌面 `啟動Portfolio.bat`（一鍵開啟 Obsidian + 終端機）

---

## 資料夾結構
```
web/
├── index.html              首頁（Hero + 自我介紹 + 學歷技能 + 聯絡）
├── works.html              設計作品列表頁（含 filter 功能）
├── ai.html                 AI 學習歷程頁
├── ai-case-template.html   AI 案例詳細頁模板（尚未正式使用）
├── work-egg.html           作品詳細頁：EGG 餅乾品牌
├── work-graphic.html       作品詳細頁：平面設計合集
├── work-larkzhu.html       作品詳細頁：節節高 LARKZHU
├── work-liangkouxi.html    作品詳細頁：倆口囍
├── work-qihang.html        作品詳細頁：啟航
├── work-xiaoheng.html      作品詳細頁：小恆
├── work-yebuff.html        作品詳細頁：YeBuff
├── work-yuejilabs.html     作品詳細頁：月記LAB
├── css/
│   ├── main.css            全站共用樣式（nav、footer、CSS 變數）
│   ├── index.css           首頁專用
│   ├── works.css           作品列表專用（含 ai-tools-grid、ai-timeline 等）
│   ├── work-detail.css     作品詳細頁共用
│   └── ai.css              AI 頁專用
├── js/
│   ├── main.js             全站共用 JS（nav toggle、scroll reveal）
│   └── works.js            作品過濾功能
└── assets/
    └── images/             圖片素材（logo、作品圖）
```

---

## 開發注意事項
- 純靜態，不需 build，直接開啟 .html 預覽
- 字型：Noto Sans TC（Google Fonts）
- 圖示：Font Awesome 6.5
- 無使用任何 CSS 框架（非 Tailwind）

---

## 字體大小規範（標準層級）
新增樣式時只能使用以下值，不得使用其他數值：

| 層級 | 值 | 用途 |
|------|----|------|
| xs | `0.72rem` | 最小標籤（sub-label、year badge、計數） |
| sm | `0.78rem` | 輔助文字（圖說、tag、role、日期） |
| base-sm | `0.85rem` | 一般說明（卡片描述、按鈕、footer email） |
| base | `0.9rem` | 內文、導覽列、作品描述 |
| md | `1rem` | 卡片標題、區塊按鈕 |
| lg | `1.2rem` | 中型標題 |
| xl | `clamp(1.8rem, 3vw, 2.6rem)` | Section 主標題 |
| hero | `clamp(2rem, 4vw, 3.2rem)` | Hero 大標 |

---

## 色彩規範
所有顏色必須使用 `main.css` 中的 CSS 變數，禁止直接寫死色碼：
`--bg` / `--bg-dark` / `--text` / `--text-muted` / `--accent` / `--accent-light` / `--accent-dark` / `--border` / `--dark` / `--white`

完整規範詳見 Obsidian：`notes/網站架構/c.規範/視覺設計規範.md`

---

## AI 協作規則（Claude Code 操作規範）
以下規則必須每次對話都遵守，不需用戶重申：

### 1. 全程使用繁體中文
- 所有說明、確認操作、詢問，一律繁體中文
- 用戶看不懂英文，英文說明等於無效同意

### 2. 每次修改必須自動完成三件事
任何對 web/ 內容的修改，完成後必須一併執行，不得落下：
1. **更新 Obsidian MD 筆記**（`notes/網站架構/b.規劃/` 對應頁面）
2. **更新本 CLAUDE.md**（若有結構、規範、頁面異動）
3. **推上 GitHub**（git add → commit → push）

唯一例外：用戶明確說「先不要推」。

### 3. 無縫接手原則
- 本 CLAUDE.md 是專案的唯一真相來源
- 即使更換 Claude 帳號或新開對話，只要專案資料夾完整，就能從這裡讀懂所有背景繼續開發
- 每當有重要設計決定、規範更新、頁面狀態變化，必須同步寫入此檔

---

## 目前網站狀態（最後更新：2026-04-12）

### 已完成頁面
| 頁面 | 狀態 | 說明 |
|------|------|------|
| index.html | ✅ 完成 | Hero、聯絡卡、學歷技能區塊 |
| works.html | ✅ 完成 | 作品卡列表，帶 logo，含 filter |
| ai.html | ✅ 完成 | 工具卡、Callout、時間軸、AI Works 佔位卡 |
| work-egg.html | ✅ 完成 | EGG 餅乾品牌 |
| work-graphic.html | ✅ 完成 | 平面設計合集 |
| work-larkzhu.html | ✅ 完成 | 節節高 LARKZHU |
| work-liangkouxi.html | ✅ 完成 | 倆口囍糕餅 |
| work-qihang.html | ✅ 完成 | 啟航餅乾品牌 |
| work-xiaoheng.html | ✅ 完成 | 小恆保溫杯吉祥物 |
| work-yebuff.html | ✅ 完成 | YeBuff 金運面膜 |
| work-yuejilabs.html | ✅ 完成 | 月記LAB 手搖飲 |

### 待製作
| 項目 | 說明 |
|------|------|
| AI Works 詳細頁 | ai-case-template.html 為模板，待用戶提供 AI新秀計畫作品內容後製作 |
| ai.html 時間軸更新 | 待新增「經濟部產業發展署 AI新秀計畫（2025）」節點 |

---

## 重要背景：AI新秀計畫
用戶自 2025 年起參加**經濟部產業發展署「AI新秀計畫」**（AI Rookie Program），
此計畫期間接觸多元 AI 工具，並完成多件 AI 應用作品。
AI 學習頁（ai.html）的「AI 應用成果」區塊，將展示這些作品。
用戶將自行整理 AI 對話紀錄與操作過程，交由 Claude 整理成頁面內容。

規劃筆記詳見：`notes/網站架構/b.規劃/2.AI學習/2-1 AI 學習歷程.md`
