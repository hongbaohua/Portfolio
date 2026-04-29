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
├── work-detail-template.html  設計作品詳情頁 HTML 模板
├── work-egg.html           作品詳細頁：EGG 餅乾品牌
├── work-graphic.html       作品詳細頁：平面設計合集
├── work-larkzhu.html       作品詳細頁：節節高 LARKZHU
├── work-liangkouxi.html    作品詳細頁：倆口囍
├── work-qihang.html        作品詳細頁：啟航
├── work-tempy.html         作品詳細頁：小恆 Tempy
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

### 動效系統（2026-04-13 建立）
勿重複實作已有的動效，新增動效前先確認此清單：

| 效果 | 實作位置 | 說明 |
|------|----------|------|
| `fadeUp` / `fadeIn` / `slideRight` | `main.css` @keyframes | 全站共用進場動畫 |
| `.reveal` + IntersectionObserver | `main.css` + `main.js` | 捲動進場，加 `data-delay` 可錯落 |
| Hero 文字序列進場 | `index.css` | eyebrow(0.1s)→title(0.28s)→desc(0.46s)→cta(0.64s) 各自 fadeUp |
| 捲動進度條 | `main.css` `.scroll-progress` + `main.js` | 頁頂 2px accent 線，`#scrollProgress`，隨捲動延伸 |
| 滑鼠光暈 | `main.css` `.cursor-glow` + `main.js` | 移動時顯示，靜止 100ms 後同時縮小（scale 0.3）淡出；`z-index: 99999` 始終在最頂層 |
| 圖片燈箱 | `main.js` 動態建立 | `.work-img-wrap img` 點擊放大，ESC 關閉 |
| Work card hover | `works.css` | translateY(-6px) + shadow-lg + 圖片 scale(1.06) |
| 按鈕 hover | `index.css` | translateY(-2px) |
| Nav 底線展開 | `main.css` | `::after` scaleX 0→1 |
| Timeline dot hover | `index.css` | `.edu-tl__dot` scale(1.25) + 填色 |
| Skill chip hover | `index.css` | `.skill-chip` translateY(-2px) + accent 色調 |
| 首頁浮動背景 | `js/float-index.js` + `#floatBg` canvas | 細線段/幾何形/圓點；磁力排斥+軌跡殘影+Hero光暈 |
| AI頁浮動背景 | `js/float-ai.js` + `#floatBg` canvas | 節點圖+二進位字元；滑鼠超級節點+點擊脈衝波+靜止吸引 |

### 作品詳情頁統一規範（2026-04-13 訂定）
所有設計作品詳情頁必須符合以下規範，模板參考 `work-detail-template.html`：

1. **大綱 bar**（`.work-outline`）：頁面頂部 sticky 錨點導覽，列出頁面所有區塊，捲動時自動 highlight 目前區塊
2. **完成方式 badge**：左側欄必須標示「獨立完成」（`.work-badge--solo`）或「小組作品」（`.work-badge--group`）；小組作品需加上「我負責：...」說明
3. **LOGO 置於簡介開頭**：品牌 LOGO 使用 `.work-intro-logo`（max-height: 100px，置中，margin-bottom 24px），放在 `#section-intro` 的 `.work-desc-block` 最前面
4. **圖片點擊放大**：所有 `.work-img-wrap img` 自動支援燈箱放大（main.js 全域處理，不需額外 HTML）
5. **區塊 ID**：各 section 需設 `id`（如 `section-intro`、`section-gallery`、`section-doc`）以供大綱 bar 錨點使用
6. **按鈕名稱規範**：外部連結按鈕名稱統一如下：企劃書 PDF → `查看企劃書`、線上閱讀 → `線上閱讀`、外部作品連結 → `查看作品`、影片 → `觀看影片`
7. **設計成果排列**：使用 `.work-img-masonry`（CSS columns: 3）排列，避免不同比例圖片產生空白
8. **平面設計合集特殊處理**：每個子類別（海報、廣告圖文等）需加 `.work-desc-block` 個別說明

### 側欄欄位順序（統一規範，2026-04-29 訂定）

**設計作品頁（work-*.html）側欄固定順序：**
1. 返回作品列表（`.back-btn`）
2. ─
3. 查看成果（如有，互動原型／電子書／線上成果，置頂作為 CTA）
4. ─
5. 核心說明（最重要的作品說明，緊接在查看成果之後）
6. ─
7. 作品類別
8. ─
9. 完成方式（`.work-badge--solo` 或 `--group`）
10. ─
11. 使用工具（如有，格式見下方 chip 規範）
12. ─
13. 完成時間（系列頁用「開始時間」）
14. ─
15. 相關文件（如有，PDF／Canva 簡報等文件，置底）

> ⚠️ **重要**：核心說明固定在第 5 位（查看成果之後，作品類別之前），完成時間固定在第 13 位（使用工具之後，相關文件之前）。此順序已於 2026-04-29 統一套用至所有 work-*.html。

**附件分類規則（2026-04-29 更新）：**
- **查看成果**：Figma 互動原型、Heyzine 電子書、線上 App、可直接操作的成果 → 置於側欄頂端（back-btn 下方）
- **相關文件**：PDF 企劃書、Canva 簡報 → 置於側欄底端

**AI 協作頁（ai-*.html）側欄固定順序：**
1. 返回 AI 協作（`.back-btn`）
2. ─
3. 應用類型
4. ─
5. 完成時間 / 開始時間
6. ─
7. 使用工具（格式見下方 chip 規範）
8. ─
9. 技術架構（如有）
10. ─
11. 查看成果 / 外部連結（如有）

### 使用工具 Chip 規範（2026-04-28 訂定，2026-04-29 排版更新）

**格式：** 使用 `.work-info__chips` 容器包覆 `.work-info__chip` 標籤，每個 chip 顯示工具名稱（第一行）與用途（第二行）。容器使用 `flex-wrap: wrap`，chip 依文字寬度自動換行排列——短 chip 會並排，過寬的 chip 自動獨佔一行。

```html
<div class="work-info__chips">
  <span class="work-info__chip work-info__chip--ai">
    <span class="chip__head"><i class="fa-solid fa-robot" aria-hidden="true"></i>工具名稱</span>
    <span class="chip__role">用途說明</span>
  </span>
</div>
```

**工具類型與樣式：**

| 類型 | class 修飾 | 色調 | 適用工具範例 |
|------|-----------|------|-------------|
| 設計工具 | （無，預設金色） | 金色 | Photoshop、Illustrator、InDesign、Figma、剪映專業版 |
| AI 工具 | `--ai` | 藍色 | ChatGPT、Gemini、Claude、SUNO、Runway、Felo、Google AI Studio |
| 開發工具 | `--dev` | 青綠色 | Supabase、GitHub Pages、Obsidian、Vite、React |

**規則：**
- 每個 chip 必須有 `.chip__head`（icon + 工具名）和 `.chip__role`（用途說明）
- 用途說明不超過 10 字，精準描述在這個作品中的具體用途
- 不得省略 `chip__role`，沒有用途說明等於沒有意義
- 設計作品中若有使用 AI 輔助，該 AI 工具必須標示 `--ai` 類型

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

## 目前網站狀態（最後更新：2026-04-27，Tickit 作品頁上架）

### 已完成頁面
| 頁面 | 狀態 | 說明 |
|------|------|------|
| index.html | ✅ 完成 | Hero、聯絡卡、學歷技能、精選作品（設計作品 Carousel 5卡+AI協作 Carousel 4卡，左右滑動含按鍵） |
| works.html | ✅ 完成 | 作品卡列表，帶 logo，含 filter |
| ai.html | ✅ 完成 | AI 應用成果作品卡列表（格式同 works.html），4 卡；nav 主項改名「AI 協作」 |
| ai-learning.html | ✅ 完成 | AI 學習歷程：工具卡、Callout、時間軸（5節點含AI新秀計畫）、精選 AI 協作（3卡） |
| ai-stillwaiting.html | ✅ 完成 | 「仍在等」AI 作品詳細頁（影音 MV） |
| work-egg.html | ✅ 完成 | EGG 餅乾品牌 |
| work-graphic.html | ✅ 完成 | 平面設計合集 |
| work-larkzhu.html | ✅ 完成 | 節節高 LARKZHU |
| work-liangkouxi.html | ✅ 完成 | 倆口囍糕餅 |
| work-qihang.html | ✅ 完成 | 啟航餅乾品牌 |
| work-tempy.html | ✅ 完成 | 小恆 Tempy 保溫杯吉祥物 |
| work-yebuff.html | ✅ 完成 | YeBuff 金運面膜 |
| work-yuejilabs.html | ✅ 完成 | 月記LAB 手搖飲 |
| work-ecdesign.html | ✅ 完成 | EC Design 電商設計練習系列頁（持續更新，初霧 Chūwù 為 No.01）|
| ai-ecdesign.html | ✅ 完成 | AI 業主模擬練習系列頁（方法論＋各練習 AI 紀錄，持續更新）|
| ai-pawket.html | ✅ 完成 | 喵喵財庫 Pawket 詳細頁（Prompt Engineering × App 開發，2026-04-18）|
| ai-tickit.html | ✅ 完成 | Tickit 備考刷題 App 詳細頁（Prompt Engineering × Web App 開發，2026-04-27）|
| resume.html | ✅ 完成 | A4 履歷（獨立頁面，不含 nav；2026-04-25 全面修正：照片頭像、邊距 8mm、字級統一、核心能力 chips、證照對齊、間距一致、LOGO 落款）|

### EC Design 系列頁新增練習 SOP

當完成一道新 EC Design 練習題時：
1. 把最終版圖複製到 `assets/images/`（命名：`[品牌拼音]_v[n].jpg`）
2. 在 `work-ecdesign.html` 的 `#section-log` 新增一個 `.ec-case` 區塊（參考 No.01 結構）
3. 在 `ai-ecdesign.html` 的 `#section-cases` 新增一個 `.ec-ai-case` 區塊
4. 更新 Obsidian md 練習索引表格
5. `git commit & push`

### 待製作
| 項目 | 說明 |
|------|------|
| AI Works 詳細頁 | 「仍在等」、「Pawket」、「Tickit」已完成；更多 AI 應用仍待製作 |
| ai-learning.html 時間軸 | ✅ 已新增「AI新秀計畫（2025）」節點；內容細節待作品集完整後補充 |
| index.html AI 技能 chips | 作品集圖片全部上傳完成後，根據實際作品使用工具更新 AI 輔助創作分組內容 |

---

## 重要背景：AI新秀計畫
用戶自 2025 年起參加**經濟部產業發展署「AI新秀計畫」**（AI Rookie Program），
此計畫期間接觸多元 AI 工具，並完成多件 AI 應用作品。
AI 學習頁（ai.html）的「AI 應用成果」區塊，將展示這些作品。
用戶將自行整理 AI 對話紀錄與操作過程，交由 Claude 整理成頁面內容。

規劃筆記詳見：`notes/網站架構/b.規劃/2.AI學習/2-1 AI 學習歷程.md`
