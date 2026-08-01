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
├── manifest.json           PWA 配置（display: standalone）
├── js/
│   ├── main.js             全站共用 JS（nav toggle、scroll reveal、PWA 偵測）
│   └── works.js            作品過濾功能
└── assets/
    └── images/             圖片素材（logo、作品圖）
                            ★ 已備妥：name_icon_192.png、name_icon_512.png（PWA App 圖示）
```

---

## 開發注意事項
- 純靜態，不需 build，直接開啟 .html 預覽
- 字型：Noto Sans TC（Google Fonts）
- 圖示：Font Awesome 6.5
- 無使用任何 CSS 框架（非 Tailwind）

### 網站頁籤 Favicon（2026-07-28 新增）
所有 HTML 頁面 `<head>` 已加入 `<link rel="icon" type="image/png" href="assets/images/name_icon_192.png" />`（緊接在 apple-touch-icon 之後），瀏覽器分頁圖示統一使用品牌 logo（`name_icon_192.png`）。新增頁面時需一併加上此標籤。

### PWA 規範（2026-05-05 新增）
網站支援「加入主畫面」後以全螢幕獨立 App 模式開啟（display: standalone）。

**新增 HTML 頁面時必須加入以下 head 標籤**（插入 `<link rel="preconnect" href="https://fonts.googleapis.com" />` 之前）：
```html
<!-- PWA -->
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#C4A35A" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Ivy Portfolio" />
<link rel="apple-touch-icon" href="assets/images/name_icon_192.png" />
```

**App Icon 需求**（尚未備妥，需自行準備後放至 `assets/images/`）：
| 檔名 | 尺寸 | 用途 |
|------|------|------|
| `name_icon_192.png` | 192×192 px | Android 主畫面圖示 ✅ 已備妥 |
| `name_icon_512.png` | 512×512 px | 啟動畫面 / PWA 安裝 ✅ 已備妥 |

**注意事項：**
- `manifest.json` 已設定 `display: standalone`、`start_url: "./"` 及品牌金色 theme_color
- `main.css` 底部已加入 `@media (display-mode: standalone)` 安全區域 padding
- `main.js` 底部已加入 standalone 偵測（body 加 `.pwa-standalone` class 可供 CSS 使用）

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

### Pawket／Tickit 卡片預覽圖規範（2026-07-28 訂定）
`index.html`／`ai.html`／`ai-learning.html` 三處的 Pawket、Tickit 作品卡（`.work-card__img`）目前無實際截圖縮圖，改用「品牌主視覺色＋標誌圖示」呈現，取代原本兩者共用的深藍底佔位樣式：
- **Pawket**：暖米白底（`#FFFBF5 → #FFE7BE`），橘黃漸層膠囊徽章（`#FEE0A7 → #FBA440`）內置白色線稿貓臉 SVG（貓咪指揮中心 Meowney 圖示風格），文字「PAWKET」用深琥珀色 `#B9701E`。顏色取樣自 App 實際畫面（暖米白背景 `#FFFBF5`、橘黃 icon 漸層）。
- **Tickit**：淺薰衣草底（`#F1F4F9 → #E3E6F7`），靛藍漸層圓角方形徽章（`#6366F1 → #4F46E5`）內置白色勾勾，文字「TICKIT」用深靛藍 `#4338CA`。顏色取樣自 App 實際登入畫面（淺藍灰背景、靛藍 Logo 徽章）。
- 三處程式碼各自獨立內嵌（inline style + SVG），未抽成共用 class，之後若三處其中之一的卡片版型有異動，記得同步檢查另外兩處是否也要更新。

### 版本對照切換器（2026-08-02 訂定，首次套用於 ai-pawket.html）
當一個作品有明顯的「前後兩個版本」（例如 AI Studio 原型 → Claude Code 重啟版），且兩版落差大到需要各自完整敘事時，用同頁切換器呈現，不開新頁面、不直接覆蓋舊內容：

1. **切換器 UI**：`.version-switch` 置於 `.container` 內、`.work-layout` 之前，兩個 `.version-switch__btn`（`data-vswitch="prototype"` / `"rebuild"`，命名可依實際版本調整），預設第一個按鈕帶 `.is-active`
2. **狀態容器**：`<main class="work-content" data-active-version="prototype">` 上帶 `data-active-version`，JS 點擊切換器按鈕時改寫這個屬性（見頁面底部 inline `<script>`，邏輯很短，不需要抽成 main.js 共用函式）
3. **內容顯示控制**：純 CSS，`[data-active-version="prototype"] [data-vshow="rebuild"] { display:none }`（反向同理），所有會隨版本改變的區塊都包一層 `data-vshow="prototype"` 或 `"rebuild"`——包含側欄 `work-info__section`、試用按鈕、大綱 nav（兩份完整的 `.work-outline`）、簡介、中段所有敘事區塊
4. **id 命名**：兩版各自 section 的 `id` 不可重複，第二版一律加 `r-` 前綴（例如 `r-arch`、`r-gallery`），大綱 nav 的錨點對應各自版本的 id
5. **試用按鈕**：已停用的版本用 `.work-try-btn.work-try-btn--disabled`（純文字說明，不可點擊，附「已由OO版取代，僅存截圖記錄」字樣）；仍可用的版本維持原本 `.work-try-btn` 連結
6. **截圖未到位時**：用 `.work-gallery-pending` 佔位區塊（虛線框＋圖示＋「製作中」文字），不要放假截圖或留空
7. **`.reveal` 動畫慎用**：新版區塊避免加 `.reveal` class（IntersectionObserver 搭配 `display:none` 切換偶爾會有動畫卡在隱藏狀態的風險），純表格／文字區塊維持無動畫即可，跟現有 `.work-table-wrap`／`.work-desc-block` 慣例一致

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
9. **App／網站類作品醒目試用按鈕**（2026-07-28 訂定，同日調整）：作品為實際可操作的 App 或網站（非 Figma 原型／PDF／簡報）時，可在大綱 bar 之後、`#section-intro` 簡介之前插入 `.work-try-btn`（樣式定義於 `work-detail.css`），文字統一為「立即試用 [作品名稱]」，連結指向該作品的實際上線網址。**套用前需確認該連結目前指向的內容與頁面敘述一致、且服務為可正常使用狀態**，否則不加或需加註警語：
   - `ai-tickit.html`：**不套用**。Supabase 免費版資料庫會因閒置而未開放，試用連結可能無法正常使用，故移除按鈕，維持側欄「查看成果」連結即可。
   - `ai-pawket.html`：目前套用中，但 https://pawket-omega.vercel.app 已因重啟計畫導向全新版本 App，與本頁敘述的 AI Studio 原型故事不符——這與待辦事項「ai-pawket.html 加前後版本對照切換器」（見下方「待製作」）是同一個問題，待該切換器做完後再一併處理試用按鈕的對應連結，暫不現在調整。

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
3. **更新 `web/js/main.js` 的 `BUILD_TIME`**（格式 `'YYYY-MM-DD HH:mm'`，填當前時間）
4. **推上 GitHub**（git add → commit → push）

唯一例外：用戶明確說「先不要推」。

### 3. 無縫接手原則
- 本 CLAUDE.md 是專案的唯一真相來源
- 即使更換 Claude 帳號或新開對話，只要專案資料夾完整，就能從這裡讀懂所有背景繼續開發
- 每當有重要設計決定、規範更新、頁面狀態變化，必須同步寫入此檔

---

## 目前網站狀態（最後更新：2026-07-28，新增 iPAS 品牌企劃師認證（不標示級別）；首頁 AI 協作精選卡片順序調整為 仍在等＞Tickit＞Pawket＞AI業主模擬練習；全站 20 個 HTML 頁面加入 favicon；ai-pawket.html 新增醒目試用按鈕（ai-tickit.html 因 Supabase 免費版資料庫閒置問題移除同按鈕）；Pawket／Tickit 全站卡片預覽圖改為品牌主視覺色＋標誌圖示；ai-pawket.html 新增前後版本對照切換器（原型版／重啟版），重啟版截圖待補

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
| ai-pawket.html | ✅ 完成 | 喵喵財庫 Pawket 詳細頁（Prompt Engineering × App 開發，2026-04-18；2026-08-02 新增前後版本對照切換器，見下方「版本對照切換器」規範）|
| ai-tickit.html | ✅ 完成 | Tickit 備考刷題 App 詳細頁（Prompt Engineering × Web App 開發，2026-04-27；2026-05-05 更新：v4.5～v4.7 版本歷史、開發挑戰三/四）|
| resume.html | ✅ 完成 | A4 履歷（獨立頁面，不含 nav；2026-04-30 更新：新增 ERP 軟體應用師（配銷模組 SAP S/4HANA版）證照）|

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
| **ai-pawket.html 重啟版截圖補上**（2026-08-02，待做） | 版面／文字內容已完成（見下方「版本對照切換器」規範），`#r-gallery` 目前是 `.work-gallery-pending` 待補佔位區。等 Ivy 準備好**測試帳號（非真實記帳資料）**畫面截圖後，比照原型版 `#section-gallery` 的 `.work-img-scroll`／`.work-img-grid` 結構換上，同時記得把 `.work-gallery-pending` 移除。 |

---

## 重要背景：AI新秀計畫
用戶自 2025 年起參加**經濟部產業發展署「AI新秀計畫」**（AI Rookie Program），
此計畫期間接觸多元 AI 工具，並完成多件 AI 應用作品。
AI 學習頁（ai.html）的「AI 應用成果」區塊，將展示這些作品。
用戶將自行整理 AI 對話紀錄與操作過程，交由 Claude 整理成頁面內容。

規劃筆記詳見：`notes/網站架構/b.規劃/2.AI學習/2-1 AI 學習歷程.md`
