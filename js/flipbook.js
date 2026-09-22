/**
 * FlipBook — 自架翻頁電子書 Viewer
 * ------------------------------------------------------------------
 * 用法（頁面上放這個就會自動啟動，不需手動 init）：
 *
 *   <div class="flipbook"
 *        data-book="assets/books/qihang/book.json"
 *        data-height="680"
 *        data-layout="auto">
 *     <!-- 這裡放無 JS 時的退路內容，例如下載 PDF 連結 -->
 *   </div>
 *
 *   <link rel="stylesheet" href="vendor/stPageFlip.css" />
 *   <link rel="stylesheet" href="css/flipbook.css" />
 *   <script src="vendor/page-flip.browser.js"></script>
 *   <script src="js/flipbook.js"></script>
 *
 * data-* 屬性：
 *   data-book    （必填）book.json 路徑
 *   data-height  舞台最大高度 px，預設 680；設 "auto" 則用視窗高 × 0.82
 *   data-layout  auto | single | spread，覆寫 book.json 的設定
 *   data-start   起始頁（1 起算）
 *
 * 說明：StPageFlip 只負責「翻頁動畫」，版面尺寸與單雙頁判定全部由這裡算好後餵給它，
 *       之後若要換翻頁引擎，只需改 mountEngine() / destroyEngine() 兩個方法。
 */
(function () {
  "use strict";

  var ENGINE = window.St && window.St.PageFlip;

  // ── 版面判定門檻 ────────────────────────────────────────
  var RATIO_PORTRAIT = 0.95;  // 比例小於此值視為直式書 → 雙頁跨頁
  var MOBILE_WIDTH   = 700;   // 容器窄於此寬度一律單頁
  var DEFAULT_HEIGHT = 680;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /** 取得 book.json 所在目錄，book.json 內的相對路徑都以它為基準 */
  function baseDirOf(url) {
    return url.replace(/[^/]*$/, "");
  }

  // ── 頁碼樣式 ──────────────────────────────────────────
  var ROMAN = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];

  function toRoman(n) {
    var out = "";
    for (var i = 0; i < ROMAN.length && n > 0; i++) {
      while (n >= ROMAN[i][0]) { out += ROMAN[i][1]; n -= ROMAN[i][0]; }
    }
    return out;
  }

  var STYLES = ["none", "arabic", "roman-lower", "roman-upper"];

  /** 把一段設定整理成乾淨、依起始張數排序的陣列 */
  function normalizeRanges(list) {
    var out = [];
    (list || []).forEach(function (r) {
      var from = parseInt(r.from, 10);
      if (!from || from < 1) return;
      var style = STYLES.indexOf(r.style) >= 0 ? r.style : "arabic";
      out.push({ from: from, style: style, start: Math.max(1, parseInt(r.start, 10) || 1) });
    });
    out.sort(function (a, b) { return a.from - b.from; });
    return out;
  }

  /** "1:none,2:roman-lower:1,6:arabic:1" → 段落陣列 */
  function parseRanges(text) {
    return normalizeRanges(String(text).split(",").map(function (chunk) {
      var bits = chunk.split(":");
      return { from: bits[0], style: (bits[1] || "").trim(), start: bits[2] };
    }));
  }

  function FlipBook(root) {
    this.root     = root;
    this.manifest = null;
    this.baseDir  = "";
    this.engine   = null;
    this.mode     = "single";     // single | spread
    this.pageEls  = [];
    this.current  = 0;            // StPageFlip 的頁索引（0 起算）
    this.destroyed = false;
    this._onResize = this._onResize.bind(this);
    this._onKey    = this._onKey.bind(this);
  }

  // ── 啟動 ──────────────────────────────────────────────
  FlipBook.prototype.init = function () {
    var self = this;
    var url = this.root.getAttribute("data-book");

    if (!ENGINE) {
      this.fail("翻頁引擎未載入（vendor/page-flip.browser.js）");
      return Promise.resolve();
    }
    if (!url) {
      this.fail("缺少 data-book 屬性");
      return Promise.resolve();
    }

    // 同一個元素上若已經有一本，先收乾淨再建新的（例如切換翻頁方向時重建）
    if (this.root.__flipbook) this.root.__flipbook.destroy();
    this.root.__flipbook = this;
    window.flipbooks = window.flipbooks || [];
    if (window.flipbooks.indexOf(this) < 0) window.flipbooks.push(this);

    this.baseDir  = baseDirOf(url);
    this.fallback = this.root.innerHTML;     // 保留無 JS 退路內容，載入失敗時還原
    this.root.classList.add("fb", "fb--loading");
    this.root.innerHTML = '<div class="fb-status">載入中…</div>';

    // cache: "no-cache" ＝ 每次都跟伺服器確認一下有沒有更新（沒更新會回 304，不會重下載）。
    // book.json 很小，但設定改過之後如果讀到瀏覽器裡的舊版，畫面會跟實際設定對不起來。
    return fetch(url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        self.manifest = data;
        self.build();
      })
      .catch(function (e) {
        self.fail("電子書載入失敗：" + e.message);
      });
  };

  FlipBook.prototype.fail = function (msg) {
    this.root.classList.remove("fb--loading");
    this.root.classList.add("fb--failed");
    this.root.innerHTML =
      '<div class="fb-status fb-status--error">' + msg + "</div>" + (this.fallback || "");
  };

  // ── 建立 DOM ──────────────────────────────────────────
  FlipBook.prototype.build = function () {
    var m = this.manifest;

    // 翻頁方向：ltr 左翻（預設）｜rtl 右翻｜btt 上翻｜ttb 下翻
    var dir = this.root.getAttribute("data-direction") || m.direction || "ltr";
    if (["ltr", "rtl", "btt", "ttb"].indexOf(dir) < 0) dir = "ltr";
    this.direction = dir;
    this.vertical = dir === "btt" || dir === "ttb";

    // 有沒有封面封底：有＝第一頁獨立顯示（像真的書封）；無＝第一頁直接跟第二頁配對
    var cover = this.root.getAttribute("data-show-cover");
    this.showCover = cover != null ? cover !== "false" : m.showCover !== false;

    // 頁碼顯示方式
    //   sheet ：第幾張（PDF 頁次），簡報最直覺，預設
    //   labels：照書上印的頁碼，而且可以分段換編號方式
    //           （例如 1 封面不編、2–5 用 i ii iii iv、6 起用 1 2 3）
    //   none  ：不顯示頁碼，只靠目錄跳轉（Heyzine 的做法）
    var num = m.numbering || {};
    var mode = this.root.getAttribute("data-numbering") || num.mode || "sheet";

    // 舊格式相容：早期的 book + bookPageOne 等同於「封面不編 → 某張起用阿拉伯數字」
    if (mode === "book") {
      mode = "labels";
      if (!num.ranges) {
        var one = Math.max(1, parseInt(num.bookPageOne, 10) || 1);
        num = { ranges: one > 1
          ? [{ from: 1, style: "none" }, { from: one, style: "arabic", start: 1 }]
          : [{ from: 1, style: "arabic", start: 1 }] };
      }
    }

    if (["sheet", "labels", "none"].indexOf(mode) < 0) mode = "sheet";
    this.numbering = mode;

    var attrRanges = this.root.getAttribute("data-ranges");
    this.ranges = attrRanges ? parseRanges(attrRanges) : normalizeRanges(num.ranges);

    this.root.classList.remove("fb--loading");
    this.root.innerHTML = "";
    this.root.setAttribute("tabindex", "0");
    this.root.setAttribute("role", "region");
    this.root.setAttribute("aria-label", (m.title || "電子書") + " 翻頁閱讀器");

    // viewport 負責裁切（放大後超出的部分），stage 負責縮放與平移
    this.viewport = el("div", "fb-viewport");
    this.stage = el("div", "fb-stage");
    this.book  = el("div", "fb-book");
    this.stage.appendChild(this.book);
    this.viewport.appendChild(this.stage);
    this.root.appendChild(this.viewport);

    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.bindZoomPan();

    this.buildPages();
    this.buildLabels();
    this.buildToolbar();

    this.layout();

    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("keydown", this._onKey);

    // 起始頁：data-start 優先，其次網址 #page=N
    var start = parseInt(this.root.getAttribute("data-start"), 10);
    if (!start) start = this.pageFromHash();
    if (start > 1) this.goto(start);
  };

  /** 依 book.json 的 pages 建出每一頁的 DOM（圖片頁 / HTML 插頁） */
  FlipBook.prototype.buildPages = function () {
    var self = this;
    var pages = this.manifest.pages || [];
    this.pageEls = [];

    pages.forEach(function (p, i) {
      var node = el("div", "fb-page" + (p.type === "html" ? " fb-page--html" : ""));
      node.setAttribute("data-page-no", i + 1);
      // HTML 插頁與封面封底都用硬頁（不彎曲），避免內容在翻頁動畫中破圖
      // 設定成「無封面」時，第一頁的硬頁標記要忽略，否則還是會用書封的翻法
      var hard = p.type === "html" || (p.hard && !(i === 0 && !self.showCover));
      if (hard) node.setAttribute("data-density", "hard");

      if (p.type === "html") {
        // 一律包一層 .fb-html：轉向模式下的 CSS 是對「頁面的唯一子元素」下手的
        var holder = el("div", "fb-html");
        node.appendChild(holder);
        if (p.html) {
          holder.innerHTML = p.html;
        } else if (p.src) {
          holder.innerHTML = '<div class="fb-status">載入中…</div>';
          fetch(self.baseDir + p.src)
            .then(function (r) { return r.text(); })
            .then(function (html) { holder.innerHTML = html; })
            .catch(function () { holder.innerHTML = '<div class="fb-status fb-status--error">插頁載入失敗</div>'; });
        }
      } else {
        var img = document.createElement("img");
        img.alt = p.alt || (self.manifest.title || "") + " 第 " + (i + 1) + " 頁";
        img.draggable = false;
        // 先掛縮圖當低解析度預覽，真正的內頁等翻到附近才換上（見 preload()）。
        // 註：不能用原生 loading="lazy"，因為 StPageFlip 會把沒在看的頁面設成
        //     display:none，瀏覽器永遠不會觸發載入，翻過去就會閃一下白的。
        if (p.thumb) {
          img.src = self.baseDir + p.thumb;
          img.className = "fb-img--low";
          img.setAttribute("data-full", self.baseDir + p.src);
        } else {
          img.src = self.baseDir + p.src;
        }
        node.appendChild(img);
        node._img = img;
      }

      self.addHotspots(node, i + 1);
      self.pageEls.push(node);
      self.book.appendChild(node);
    });
  };

  /**
   * 預載：把目前頁前後幾頁的高解析度內頁換上去。
   * 先在背景把圖片解碼完成，好了才換 src，避免翻頁時看到圖片邊載邊出現。
   */
  FlipBook.prototype.preload = function (center) {
    var self = this;
    var from = Math.max(0, center - 2);
    var to   = Math.min(this.pageEls.length - 1, center + 3);

    for (var i = from; i <= to; i++) {
      (function (node) {
        var img = node && node._img;
        if (!img) return;
        var full = img.getAttribute("data-full");
        if (!full) return;
        img.removeAttribute("data-full");     // 先拔掉，避免重複觸發

        var pre = new Image();
        pre.onload = function () {
          img.src = full;
          img.classList.remove("fb-img--low");
        };
        pre.onerror = function () { img.setAttribute("data-full", full); };
        pre.src = full;
      })(self.pageEls[i]);
    }
  };

  /** 熱區連結：座標用 0–1 比例，縮放後位置仍正確 */
  FlipBook.prototype.addHotspots = function (node, pageNo) {
    var list = (this.manifest.hotspots || []).filter(function (h) { return h.page === pageNo; });
    list.forEach(function (h) {
      var a = el("a", "fb-hotspot");
      a.href = h.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.title = h.title || "";
      a.style.cssText =
        "left:" + h.x * 100 + "%;top:" + h.y * 100 + "%;" +
        "width:" + h.w * 100 + "%;height:" + h.h * 100 + "%";
      node.appendChild(a);
    });
  };

  // ── 版面計算（尺寸隨來源自適應的核心）────────────────────
  FlipBook.prototype.decideMode = function (containerW) {
    var m = this.manifest;
    var want = this.root.getAttribute("data-layout") || m.layout || "auto";
    var ratio = (m.page && m.page.aspectRatio) || 0.707;

    if (this.vertical) return "single";                       // 上／下翻不做跨頁（見 docs/02 四之二）
    if (containerW < MOBILE_WIDTH) return "single";          // 手機一律單頁
    if (want === "single" || want === "spread") return want;  // 明確指定
    return ratio < RATIO_PORTRAIT ? "spread" : "single";      // auto：直式攤開、橫式單頁
  };

  FlipBook.prototype.maxStageHeight = function () {
    // 全螢幕時無視 data-height，盡量佔滿螢幕（扣掉工具列與留白）
    if (this.isFullscreen) return Math.max(240, window.innerHeight - 104);

    var attr = this.root.getAttribute("data-height");
    var winCap = Math.round(window.innerHeight * 0.82);
    var h = (!attr || attr === "auto")
      ? winCap
      : Math.min(parseInt(attr, 10) || DEFAULT_HEIGHT, winCap);
    // 視窗高度量不到（背景分頁、尚未排版完成）時別讓整本書縮成 0
    return Math.max(240, h);
  };

  /**
   * 在維持原始比例的前提下，算出容器內能放下的最大單頁尺寸。
   * 舞台（fb-stage）寬度會被設成剛好 1 頁或 2 頁寬 ——
   * 這一步是必要的：StPageFlip 用「容器寬 < 單頁寬 × 2」來判定要不要單頁顯示。
   */
  FlipBook.prototype.computeSize = function () {
    var m = this.manifest;
    var ratio = (m.page && m.page.aspectRatio) || 0.707;
    var availW = this.root.clientWidth || this.root.offsetWidth || 900;
    var availH = this.maxStageHeight();

    this.mode = this.decideMode(availW);
    var cols = this.mode === "spread" ? 2 : 1;

    var pageW = Math.floor(availW / cols);
    var pageH = Math.round(pageW / ratio);
    if (pageH > availH) {
      pageH = availH;
      pageW = Math.round(pageH * ratio);
    }
    return { w: pageW, h: pageH, cols: cols };
  };

  FlipBook.prototype.layout = function () {
    var s = this.computeSize();
    this.size = s;

    // 舞台永遠是「看起來的」尺寸
    this.stage.style.width  = s.w * s.cols + "px";
    this.stage.style.height = s.h + "px";

    this.root.classList.toggle("fb--spread", s.cols === 2);
    this.root.classList.toggle("fb--single", s.cols === 1);
    this.root.classList.toggle("fb--vert", this.vertical);
    this.root.setAttribute("data-dir", this.direction);

    // 上下翻：整本書轉 90°，所以餵給引擎的長寬要對調，頁面內容再用 CSS 轉回來
    var e = this.vertical ? { w: s.h, h: s.w } : { w: s.w, h: s.h };
    this.engineSize = e;

    this.sizeBook(e);

    // 供 CSS 把頁面內容轉正後仍填滿版面用
    this.root.style.setProperty("--fb-pw", s.w + "px");
    this.root.style.setProperty("--fb-ph", s.h + "px");

    if (!this.engine) this.mountEngine(e);
    else this.resizeEngine(e);

    this.clampPan();          // 版面變了，原本的平移量可能已經超界
    this.applyTransform();
    this.syncToolbar();
  };

  // ── 翻頁引擎封裝（要換引擎只改這一段）────────────────────
  FlipBook.prototype.engineConfig = function (e) {
    return {
      width: e.w,
      height: e.h,
      size: "fixed",
      usePortrait: true,
      showCover: this.showCover,
      autoSize: false,
      maxShadowOpacity: 0.5,
      flippingTime: 700,
      drawShadow: true,
      showPageCorners: !this.vertical,
      mobileScrollSupport: true,
      clickEventForward: true,
      swipeDistance: 30,
      useMouseEvents: !this.vertical,
    };
  };

  FlipBook.prototype.mountEngine = function (s) {
    var self = this;
    this.engine = new ENGINE(this.book, this.engineConfig(s));
    this.engine.loadFromHTML(this.pageEls);
    this.engine.on("flip", function (e) {
      self.current = e.data;
      self.preload(e.data);
      self.syncToolbar();
      self.writeHash();
    });
    this.preload(this.current);
    if (this.vertical) this.bindVerticalControls();
  };

  /**
   * 上／下翻模式自己的操作：點上下半部、滾輪、手機上下滑。
   * （左右翻不需要這些，引擎原生的拖曳就很完整）
   */
  FlipBook.prototype.bindVerticalControls = function () {
    var self = this;
    var st = this.stage;

    // 點半邊：點「翻頁前進的那一側」＝下一頁（btt 往上掀，所以上半部是下一頁）
    st.addEventListener("click", function (e) {
      if (e.target.closest("a, button, input, select, textarea")) return;  // 別擋住熱區與插頁裡的連結
      var r = st.getBoundingClientRect();
      var upper = e.clientY - r.top < r.height / 2;
      var forwardIsUp = self.direction === "btt";
      if (upper === forwardIsUp) self.next(); else self.prev();
    });

    // 滾輪與滑動一律照閱讀直覺：往下捲／往上滑＝下一頁（跟翻頁方向無關）
    // 翻得動的時候要擋掉頁面捲動，不然會邊翻頁邊把整個網頁捲走；
    // 翻到頭或翻到底就放行，讓使用者能正常捲離這本書（不做成捲不出去的陷阱）
    st.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) < 8) return;
      if (!self.canFlip(e.deltaY > 0)) return;        // 已到盡頭 → 不攔截，頁面照常捲

      e.preventDefault();

      var now = Date.now();
      if (now - (self._wheelAt || 0) < 500) return;   // 節流，免得一捲就翻好幾頁
      self._wheelAt = now;
      if (e.deltaY > 0) self.next(); else self.prev();
    }, { passive: false });

    st.addEventListener("touchstart", function (e) {
      self._touchY = e.touches[0].clientY;
    }, { passive: true });

    st.addEventListener("touchmove", function (e) {
      if (self._touchY == null) return;
      var dy = e.touches[0].clientY - self._touchY;
      if (Math.abs(dy) < 10) return;
      if (self.canFlip(dy < 0)) e.preventDefault();   // 同上：翻得動才攔
    }, { passive: false });

    st.addEventListener("touchend", function (e) {
      if (self._touchY == null) return;
      var dy = e.changedTouches[0].clientY - self._touchY;
      self._touchY = null;
      if (Math.abs(dy) < 40) return;
      if (dy < 0) self.next(); else self.prev();      // 手指往上滑＝下一頁
    }, { passive: true });
  };

  /**
   * 改變書本尺寸（視窗縮放、進出全螢幕都會走這裡）。
   *
   * ⚠️ 踩過的坑，別再走回頭路：
   *   1. `engine.update(新設定)` —— 它的 update() **不收參數**
   *      （原始碼 PageFlip.ts:63 是 `update(): void`），傳什麼都被忽略，
   *      尺寸會一直停在掛載當下的值。全螢幕不會變大就是這個原因。
   *   2. `destroy()` 之後重建引擎 —— 不能用。`render.start()` 開的是一個
   *      **永久的 requestAnimationFrame 迴圈**，而 destroy() 不會停掉它；
   *      重建後新舊兩個迴圈會同時畫同一批頁面元素，互相蓋掉。
   *
   * 正解：直接改它內部那份 settings（getSettings() 回傳的就是活的物件，
   * Render 拿的是同一個參考），再呼叫無參數的 update() 讓它重算顯示區域。
   * 頁面本身由那個 rAF 迴圈在下一幀依新的 rect 重畫（HTMLPage.simpleDraw 每次都
   * 重讀 render.getRect()），所以不需要我們自己動手。
   */
  FlipBook.prototype.resizeEngine = function (e) {
    var live = this.engine.getSettings();
    var cfg = this.engineConfig(e);
    for (var k in cfg) if (Object.prototype.hasOwnProperty.call(cfg, k)) live[k] = cfg[k];
    this.engine.update();
  };

  /** 書本容器要剛好一頁或兩頁寬，引擎靠這個寬度判斷要不要單頁顯示 */
  FlipBook.prototype.sizeBook = function (e) {
    this.book.style.width  = e.w * this.size.cols + "px";
    this.book.style.height = e.h + "px";
  };

  FlipBook.prototype.destroyEngine = function () {
    if (this.engine) { this.engine.destroy(); this.engine = null; }
  };

  // ── 操作 ──────────────────────────────────────────────
  FlipBook.prototype.next = function () { if (this.engine) this.engine.flipNext(); };
  FlipBook.prototype.prev = function () { if (this.engine) this.engine.flipPrev(); };

  /** 跳到第 n 頁（1 起算） */
  FlipBook.prototype.goto = function (n) {
    if (!this.engine) return;
    var idx = Math.max(0, Math.min(this.pageEls.length - 1, n - 1));
    this.preload(idx);
    this.engine.turnToPage(idx);
    this.current = idx;
    this.syncToolbar();
  };

  // ── 工具列 ────────────────────────────────────────────
  FlipBook.prototype.buildToolbar = function () {
    var self = this;
    var bar = el("div", "fb-toolbar");
    this.toolbar = bar;

    // 箭頭跟著翻頁方向走，才不會出現「按右箭頭卻往上翻」這種怪事
    var G = {
      ltr: { prev: "‹", next: "›", first: "«", last: "»" },
      rtl: { prev: "›", next: "‹", first: "»", last: "«" },
      btt: { prev: "⌄", next: "⌃", first: "⤓", last: "⤒" },
      ttb: { prev: "⌃", next: "⌄", first: "⤒", last: "⤓" },
    }[this.direction] || { prev: "‹", next: "›", first: "«", last: "»" };

    function btn(cls, glyph, label, fn) {
      var b = el("button", "fb-btn " + cls, '<span aria-hidden="true">' + glyph + "</span>");
      b.type = "button";
      b.title = label;
      b.setAttribute("aria-label", label);
      b.addEventListener("click", fn);
      bar.appendChild(b);
      return b;
    }

    // ── 翻頁 ──
    this.btnFirst = btn("fb-btn--edge", G.first, "回到第一頁", function () { self.goto(1); });
    this.btnPrev  = btn("", G.prev, "上一頁", function () { self.prev(); });

    // ── 頁碼輸入 ──
    var pager = el("span", "fb-pager");
    this.pager = pager;
    this.pageInput = document.createElement("input");
    this.pageInput.type = "text";
    this.pageInput.className = "fb-pager__input";
    this.pageInput.inputMode = "numeric";
    this.pageInput.title = this.numbering === "labels"
      ? "輸入書上印的頁碼後按 Enter 跳頁（羅馬數字也可以）"
      : "輸入頁碼後按 Enter 跳頁";
    this.pageInput.setAttribute("aria-label", "頁碼");
    this.pageInput.addEventListener("keydown", function (e) {
      e.stopPropagation();                       // 別讓 ← → 被當成翻頁快捷鍵
      if (e.key === "Enter") self.gotoFromInput();
    });
    this.pageInput.addEventListener("blur", function () { self.gotoFromInput(); });
    this.pageInput.addEventListener("focus", function () { this.select(); });

    this.pageTotal = el("span", "fb-pager__total");
    pager.appendChild(this.pageInput);
    pager.appendChild(this.pageTotal);
    bar.appendChild(pager);

    this.btnNext = btn("", G.next, "下一頁", function () { self.next(); });
    this.btnLast = btn("fb-btn--edge", G.last, "跳到最後一頁", function () { self.goto(self.pageEls.length); });

    // ── 目錄（book.json 有 toc 才出現）──
    this.buildToc(bar);

    bar.appendChild(el("span", "fb-sep"));

    // ── 縮放 ──
    btn("", "−", "縮小", function () { self.zoomBy(-1); });
    this.zoomLabel = el("span", "fb-zoom-label", "100%");
    this.zoomLabel.title = "點一下回到原始大小";
    this.zoomLabel.addEventListener("click", function () { self.setZoom(1); });
    bar.appendChild(this.zoomLabel);
    btn("", "＋", "放大", function () { self.zoomBy(1); });

    // ── 全螢幕 ──
    this.btnFull = btn("", "⛶", "全螢幕閱讀", function () { self.toggleFullscreen(); });

    // ── 下載 ──
    var src = this.manifest.source;
    if (src && src.downloadable && src.file) {
      var dl = el("a", "fb-btn fb-btn--text", "下載 PDF");
      dl.href = this.baseDir + src.file;
      dl.download = "";
      dl.title = "下載原始 PDF" + (src.sizeLabel ? "（" + src.sizeLabel + "）" : "");
      bar.appendChild(dl);
    }

    this.root.appendChild(bar);
  };

  /** 目錄：按鈕 ＋ 展開面板。book.json 的 toc 是空的就整個不顯示 */
  FlipBook.prototype.buildToc = function (bar) {
    var self = this;
    var toc = this.manifest.toc || [];

    if (this.tocWrap) { this.tocWrap.remove(); this.tocWrap = null; }
    if (!toc.length) return;

    var wrap = el("span", "fb-toc");
    this.tocWrap = wrap;

    var btn = el("button", "fb-btn fb-btn--text", "目錄");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");

    var panel = el("div", "fb-toc__panel");
    panel.hidden = true;

    toc.forEach(function (item) {
      var row = el("button", "fb-toc__item");
      row.type = "button";

      // 目錄裡的頁碼也跟著「頁碼顯示方式」走，才不會跟工具列對不起來
      var shown = "";
      if (self.numbering === "sheet") shown = item.page;
      else if (self.numbering === "labels") shown = self.labelOf(item.page);

      row.innerHTML =
        '<span class="fb-toc__label"></span><span class="fb-toc__page">' + shown + "</span>";
      row.querySelector(".fb-toc__label").textContent = item.label;
      row.addEventListener("click", function () {
        self.goto(item.page);
        close();
      });
      panel.appendChild(row);
    });

    function open()  { panel.hidden = false; btn.setAttribute("aria-expanded", "true");  document.addEventListener("click", onDocClick); }
    function close() { panel.hidden = true;  btn.setAttribute("aria-expanded", "false"); document.removeEventListener("click", onDocClick); }
    function onDocClick(e) { if (!wrap.contains(e.target)) close(); }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.hidden) open(); else close();
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    bar.appendChild(wrap);
  };

  /** 讓外部（製作工作台）即時換掉目錄，不必重建整本書 */
  FlipBook.prototype.setToc = function (toc) {
    this.manifest.toc = toc || [];
    if (!this.toolbar) return;
    var anchor = this.tocWrap;
    this.buildToc(this.toolbar);
    // buildToc 是 append 到最後，這裡把它移回原本的位置（下一頁按鈕之後）
    if (this.tocWrap && this.btnLast) this.btnLast.after(this.tocWrap);
    if (anchor) anchor.remove();
  };

  // ── 頁碼換算 ──────────────────────────────────────────
  /**
   * 依分段設定算出每一張的頁碼標籤，順便建一張「標籤 → 第幾張」的對照表。
   * 例：1 封面不編、2–5 用 i ii iii iv、6 起用 1 2 3
   */
  FlipBook.prototype.buildLabels = function () {
    var n = this.pageEls.length;
    var ranges = this.ranges && this.ranges.length
      ? this.ranges
      : [{ from: 1, style: "arabic", start: 1 }];

    this.labels = new Array(n);
    this.labelMap = {};

    for (var sheet = 1; sheet <= n; sheet++) {
      var r = null;
      for (var i = 0; i < ranges.length; i++) if (ranges[i].from <= sheet) r = ranges[i];

      var label = "";
      if (r && r.style !== "none") {
        var num = r.start + (sheet - r.from);
        label = r.style === "roman-lower" ? toRoman(num)
              : r.style === "roman-upper" ? toRoman(num).toUpperCase()
              : String(num);
      }

      this.labels[sheet - 1] = label;
      var key = label.toLowerCase();
      if (label && !(key in this.labelMap)) this.labelMap[key] = sheet;   // 重複時取第一個
    }
  };

  /** 讓製作工作台即時換掉頁碼分段設定，不必重建整本書 */
  FlipBook.prototype.setRanges = function (ranges) {
    this.ranges = normalizeRanges(ranges);
    this.buildLabels();
    this.setToc(this.manifest.toc);   // 目錄上的頁碼也要跟著換算
    this.syncToolbar();
  };

  /** 第幾張 → 書上印的頁碼（沒編號的前置頁回傳空字串） */
  FlipBook.prototype.labelOf = function (sheet) {
    if (this.numbering !== "labels" || !this.labels) return String(sheet);
    return this.labels[sheet - 1] || "";
  };

  /** 全書最後一個有編號的標籤，當作工具列的「總頁數」 */
  FlipBook.prototype.lastLabel = function () {
    if (!this.labels) return String(this.pageEls.length);
    for (var i = this.labels.length - 1; i >= 0; i--) if (this.labels[i]) return this.labels[i];
    return String(this.pageEls.length);
  };

  FlipBook.prototype.gotoFromInput = function () {
    var raw = String(this.pageInput.value).trim();

    // 頁碼標籤模式下，使用者輸入的是書上印的（可能是 12，也可能是 iv）
    if (this.numbering === "labels") {
      var sheet = this.labelMap[raw.toLowerCase()];
      if (sheet) this.goto(sheet);
      else this.syncToolbar();
      return;
    }

    var n = parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!n || n < 1 || n > this.pageEls.length) { this.syncToolbar(); return; }
    this.goto(n);
  };

  FlipBook.prototype.syncToolbar = function () {
    if (!this.pageInput) return;
    var total = this.pageEls.length;
    var cur = this.current + 1;

    if (this.numbering === "none") {
      this.pager.hidden = true;
    } else {
      this.pager.hidden = false;

      // 目前看得到的是哪幾張（跨頁時兩張）
      var sheets = this.mode === "spread" && cur < total && cur > 1
        ? [cur, Math.min(cur + 1, total)]
        : [cur];

      if (this.numbering === "labels") {
        // 沒編號的前置頁（封面、扉頁…）就不顯示數字
        var shown = sheets.map(this.labelOf, this).filter(Boolean);
        this.pageInput.value = shown.length ? shown.join("–") : "—";
        this.pageTotal.textContent = "/ " + this.lastLabel();
      } else {
        this.pageInput.value = sheets.join("–");
        this.pageTotal.textContent = "/ " + total;
      }

      this.pageInput.size = Math.max(3, this.pageInput.value.length);
    }

    var atStart = this.current <= 0;
    var atEnd = this.current >= total - 1;
    if (this.btnPrev)  this.btnPrev.disabled  = atStart;
    if (this.btnFirst) this.btnFirst.disabled = atStart;
    if (this.btnNext)  this.btnNext.disabled  = atEnd;
    if (this.btnLast)  this.btnLast.disabled  = atEnd;
  };

  // ── 放大縮小與平移 ─────────────────────────────────────
  var ZOOM_STEPS = [1, 1.5, 2, 3];

  FlipBook.prototype.zoomBy = function (dir) {
    var i = ZOOM_STEPS.indexOf(this.zoom);
    if (i < 0) i = 0;
    this.setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir))]);
  };

  FlipBook.prototype.setZoom = function (z) {
    this.zoom = z;
    if (z === 1) this.pan = { x: 0, y: 0 };
    this.clampPan();
    this.applyTransform();
    this.root.classList.toggle("fb--zoomed", z > 1);
    if (this.zoomLabel) this.zoomLabel.textContent = Math.round(z * 100) + "%";
  };

  /** 不讓內容被拖到整個跑出畫面外 */
  FlipBook.prototype.clampPan = function () {
    if (!this.viewport || !this.size) return;
    var vw = this.viewport.clientWidth;
    var sw = this.size.w * this.size.cols;
    var sh = this.size.h;
    var maxX = Math.max(0, (sw * this.zoom - vw) / 2);
    var maxY = Math.max(0, (sh * this.zoom - sh) / 2);
    this.pan.x = Math.max(-maxX, Math.min(maxX, this.pan.x));
    this.pan.y = Math.max(-maxY, Math.min(maxY, this.pan.y));
  };

  FlipBook.prototype.applyTransform = function () {
    if (!this.stage) return;
    this.stage.style.transform =
      "translate(" + this.pan.x + "px," + this.pan.y + "px) scale(" + this.zoom + ")";
  };

  /**
   * 放大後改成拖曳平移。
   * 用捕獲階段攔下事件並停止傳遞，翻頁引擎才不會同時收到 —— 它是用元素座標算拖曳的，
   * 畫面被 scale 過之後那套算法會失準（跟上下翻轉 90° 是同一類問題）。
   */
  FlipBook.prototype.bindZoomPan = function () {
    var self = this;
    var vp = this.viewport;
    var dragging = false;
    var from = null;

    function down(e) {
      if (self.zoom <= 1) return;
      if (e.target.closest && e.target.closest("a, button")) return;
      dragging = true;
      from = { x: e.clientX, y: e.clientY, px: self.pan.x, py: self.pan.y };
      vp.classList.add("is-panning");
      e.stopPropagation();
      e.preventDefault();
    }

    function move(e) {
      if (!dragging) return;
      self.pan.x = from.px + (e.clientX - from.x);
      self.pan.y = from.py + (e.clientY - from.y);
      self.clampPan();
      self.applyTransform();
    }

    function up() {
      if (!dragging) return;
      dragging = false;
      vp.classList.remove("is-panning");
    }

    vp.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    this._panMove = move;
    this._panUp = up;

    // 放大後也要吃掉點擊，不然放開滑鼠會被引擎當成「點一下翻頁」
    vp.addEventListener("click", function (e) {
      if (self.zoom > 1) e.stopPropagation();
    }, true);

    // Ctrl／⌘ ＋ 滾輪縮放（跟大部分看圖軟體一致）
    vp.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      self.zoomBy(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  };

  // ── 全螢幕 ────────────────────────────────────────────
  FlipBook.prototype.toggleFullscreen = function () {
    var self = this;

    if (this.isFullscreen) { this.exitFullscreen(); return; }

    // 有些情境拿不到真正的全螢幕（嵌在 iframe 裡、權限被擋、瀏覽器不支援），
    // 那就退而求其次用滿版覆蓋，至少功能不會整個失效
    if (!this.root.requestFullscreen) { this.enterFullscreen(true); return; }

    this.root.requestFullscreen().then(function () {
      self.enterFullscreen(false);
    }).catch(function () {
      self.enterFullscreen(true);
    });
  };

  FlipBook.prototype.enterFullscreen = function (pseudo) {
    var self = this;

    this.isFullscreen = true;
    this.pseudoFullscreen = !!pseudo;
    this.root.classList.add("fb--fullscreen");
    this.root.classList.toggle("fb--fullscreen-pseudo", !!pseudo);
    if (this.btnFull) this.btnFull.title = "結束全螢幕（Esc）";

    if (pseudo) {
      this._escExit = function (e) { if (e.key === "Escape") self.exitFullscreen(); };
      document.addEventListener("keydown", this._escExit);
      this._prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      this._fsWatch = function () {
        if (document.fullscreenElement !== self.root) self.exitFullscreen();
        else self.relayoutSoon();
      };
      document.addEventListener("fullscreenchange", this._fsWatch);
    }

    this.setZoom(1);
    this.relayoutSoon();
  };

  /**
   * 進出全螢幕時要多算幾次版面。
   * 瀏覽器回報「已進入全螢幕」的當下，視窗尺寸常常還沒換成螢幕尺寸，
   * 這時候算出來的書會停在切換前的大小（實測就是這個原因導致全螢幕沒有放大）。
   */
  FlipBook.prototype.relayoutSoon = function () {
    var self = this;
    var run = function () { if (!self.destroyed) self.layout(); };

    run();
    requestAnimationFrame(function () {
      run();
      requestAnimationFrame(run);
    });
    clearTimeout(this._fsRelayout);
    this._fsRelayout = setTimeout(run, 250);
  };

  FlipBook.prototype.exitFullscreen = function () {
    if (!this.isFullscreen) return;

    if (this._fsWatch) {
      document.removeEventListener("fullscreenchange", this._fsWatch);
      this._fsWatch = null;
    }
    if (this._escExit) {
      document.removeEventListener("keydown", this._escExit);
      this._escExit = null;
    }
    if (this.pseudoFullscreen) document.body.style.overflow = this._prevOverflow || "";
    else if (document.fullscreenElement === this.root) document.exitFullscreen();

    this.isFullscreen = false;
    this.pseudoFullscreen = false;
    this.root.classList.remove("fb--fullscreen", "fb--fullscreen-pseudo");
    if (this.btnFull) this.btnFull.title = "全螢幕閱讀";

    this.setZoom(1);
    this.relayoutSoon();
  };

  // ── 網址深層連結 #page=N ───────────────────────────────
  FlipBook.prototype.pageFromHash = function () {
    var mt = /(?:^|[#&])page=(\d+)/.exec(location.hash);
    return mt ? parseInt(mt[1], 10) : 0;
  };

  FlipBook.prototype.writeHash = function () {
    if (this.root.getAttribute("data-hash") !== "on") return;   // 預設只有全頁閱讀器開啟
    var h = "#page=" + (this.current + 1);
    if (location.hash !== h) history.replaceState(null, "", h);
  };

  // ── 事件 ──────────────────────────────────────────────
  FlipBook.prototype._onResize = function () {
    var self = this;
    clearTimeout(this._rt);
    this._rt = setTimeout(function () {
      if (self.destroyed) return;
      var before = self.mode;
      self.layout();
      // 單雙頁模式切換時 StPageFlip 需要重新計算，保險起見回到目前頁
      if (before !== self.mode) self.goto(self.current + 1);
    }, 150);
  };

  FlipBook.prototype._onKey = function (e) {
    // 只在滑鼠停在這本書上、或焦點在書內時才接受鍵盤操作
    var active = this.root.contains(document.activeElement) || this.root.matches(":hover");
    if (!active) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // 各方向的「下一頁」鍵不同，對照表見 docs/02 四之二
    var nextKeys, prevKeys;
    switch (this.direction) {
      case "rtl": nextKeys = ["ArrowLeft", "ArrowDown", "PageDown"];  prevKeys = ["ArrowRight", "ArrowUp", "PageUp"];   break;
      case "btt": nextKeys = ["ArrowUp", "PageUp"];                   prevKeys = ["ArrowDown", "PageDown"];             break;
      case "ttb": nextKeys = ["ArrowDown", "PageDown"];               prevKeys = ["ArrowUp", "PageUp"];                 break;
      default:    nextKeys = ["ArrowRight", "ArrowDown", "PageDown"]; prevKeys = ["ArrowLeft", "ArrowUp", "PageUp"];
    }

    if (nextKeys.indexOf(e.key) >= 0) this.next();
    else if (prevKeys.indexOf(e.key) >= 0) this.prev();
    else if (e.key === "Home") this.goto(1);
    else if (e.key === "End")  this.goto(this.pageEls.length);
    else return;

    e.preventDefault();
  };

  FlipBook.prototype.destroy = function () {
    this.destroyed = true;
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("keydown", this._onKey);
    if (this._panMove) window.removeEventListener("pointermove", this._panMove);
    if (this._panUp) window.removeEventListener("pointerup", this._panUp);
    if (this._fsWatch) document.removeEventListener("fullscreenchange", this._fsWatch);
    if (this._escExit) document.removeEventListener("keydown", this._escExit);
    clearTimeout(this._fsRelayout);
    if (this.pseudoFullscreen) document.body.style.overflow = this._prevOverflow || "";
    clearTimeout(this._rt);
    this.destroyEngine();

    if (this.root.__flipbook === this) delete this.root.__flipbook;
    var list = window.flipbooks || [];
    var i = list.indexOf(this);
    if (i >= 0) list.splice(i, 1);
  };

  // ── 自動啟動 ──────────────────────────────────────────
  function boot() {
    var nodes = document.querySelectorAll("[data-book]");
    for (var i = 0; i < nodes.length; i++) new FlipBook(nodes[i]).init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.FlipBook = FlipBook;
})();
