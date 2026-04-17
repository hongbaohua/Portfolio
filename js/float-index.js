/**
 * float-index.js
 * 首頁浮動背景動效 — 「設計師的工作桌碎片」
 * 元素活在「頁面座標空間」，draw() 以 scrollY 平移，視覺上跟著頁面滾動
 */
(function () {
  'use strict';

  const canvas = document.getElementById('floatBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── 顏色 ────────────────────────────────────────────────
  function hexToRgb(hex) {
    hex = hex.trim().replace(/^#/, '');
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  const CV     = getComputedStyle(document.documentElement);
  const ACCENT = hexToRgb(CV.getPropertyValue('--accent'));
  const MUTED  = hexToRgb(CV.getPropertyValue('--text-muted'));

  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  // ── 畫布（viewport 大小，不隨頁面縮放） ──────────────────
  let W = 0, H = 0, PAGE_H = 0;

  function resize() {
    W      = canvas.width  = window.innerWidth;
    H      = canvas.height = window.innerHeight;
    PAGE_H = Math.max(document.documentElement.scrollHeight, H);
  }

  // ── 工具 ────────────────────────────────────────────────
  const rand     = (a, b) => Math.random() * (b - a) + a;
  const randInt  = (a, b) => Math.floor(rand(a, b + 1));
  const isMobile = () => window.innerWidth < 768;

  // ── 物理常數 ─────────────────────────────────────────────
  const SPRING  = 0.055;
  const DAMP    = 0.80;
  const REPEL_R = 130;
  const REPEL_F = 5.5;

  const SHAPE_TYPES = ['triangle', 'square', 'diamond', 'hexagon', 'cross'];

  // ── 空間分布輔助 ─────────────────────────────────────────
  let sectionBounds = [];

  function computeSectionBounds() {
    sectionBounds = [];
    document.querySelectorAll('.hero, .section').forEach(el => {
      sectionBounds.push(el.offsetTop);
      sectionBounds.push(el.offsetTop + el.offsetHeight);
    });
  }

  // X 偏向兩側，中央稀疏
  function biasedX() {
    const r = Math.random();
    if (r < 0.55) return Math.random() < 0.5 ? rand(0, W * 0.22) : rand(W * 0.78, W);
    if (r < 0.80) return Math.random() < 0.5 ? rand(W * 0.22, W * 0.36) : rand(W * 0.64, W * 0.78);
    return rand(W * 0.36, W * 0.64);
  }

  // Y 偏向板塊邊界過渡帶，其餘均勻分布
  function biasedY() {
    if (sectionBounds.length > 0 && Math.random() < 0.55) {
      const b = sectionBounds[randInt(0, sectionBounds.length - 1)];
      return Math.max(0, Math.min(PAGE_H, b + rand(-160, 160)));
    }
    return rand(0, PAGE_H);
  }

  // ── 元素陣列 ─────────────────────────────────────────────
  let lines = [], shapes = [], dots = [];

  // ─── 類型 A：細線段 ──────────────────────────────────────
  function makeLine() {
    return {
      x: biasedX(), y: biasedY(),
      len: rand(40, 110),
      angle: rand(0, Math.PI * 2),
      color: ACCENT,
      opacity: rand(0.22, 0.42),
      thick: Math.random() < 0.3 ? 2 : 1,
      vx: rand(-0.22, 0.22), vy: rand(-0.22, 0.22),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  // ─── 類型 B：幾何形（三層大小） ──────────────────────────
  function makeShape(tier) {
    let sizeMin, sizeMax, opMin, opMax, speedMax;
    if (tier === 'xl') {
      sizeMin = 70; sizeMax = 120; opMin = 0.10; opMax = 0.18; speedMax = 0.08;
    } else if (tier === 'l') {
      sizeMin = 35; sizeMax = 65;  opMin = 0.18; opMax = 0.30; speedMax = 0.14;
    } else {
      sizeMin = 12; sizeMax = 30;  opMin = 0.25; opMax = 0.40; speedMax = 0.22;
    }

    const type    = SHAPE_TYPES[randInt(0, SHAPE_TYPES.length - 1)];
    const isCross = type === 'cross';
    const SIDE_W  = W * 0.22;
    // cross 強制兩側；其餘用 biasedX（偏向兩側但允許中央）
    const x = isCross
      ? (Math.random() < 0.5 ? rand(0, SIDE_W) : rand(W - SIDE_W, W))
      : biasedX();
    const vxBias = isCross ? (x < W / 2 ? -speedMax * 0.4 : speedMax * 0.4) : 0;

    const baseOp = rand(opMin, opMax);
    return {
      x, baseY: biasedY(),
      y: 0,
      type, size: rand(sizeMin, sizeMax), tier,
      baseOp, opacity: baseOp,
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.002, 0.002) * (tier === 'xl' ? 0.3 : tier === 'l' ? 0.7 : 1.2),
      sinePhase: rand(0, Math.PI * 2),
      sinePeriod: rand(tier === 'xl' ? 7000 : 4000, tier === 'xl' ? 12000 : 8000),
      sineAmp: tier === 'xl' ? 18 : tier === 'l' ? 12 : 7,
      vx: rand(-speedMax, speedMax) + vxBias, vy: rand(-speedMax, speedMax),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  // ─── 類型 C：圓點 ─────────────────────────────────────────
  function makeDot() {
    return {
      x: biasedX(), y: biasedY(),
      r: rand(2, 5),
      opacity: rand(0.20, 0.38),
      wvx: rand(-0.2, 0.2), wvy: rand(-0.2, 0.2),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  function buildAll() {
    computeSectionBounds();  // 先取得板塊邊界，供 biasedY() 使用
    const m = isMobile();
    const r = Math.min(PAGE_H / Math.max(H, 1), 5);

    const n = (base, cap) => Math.min(Math.round(base * r), cap);

    lines  = Array.from({ length: n(m ? 10 : 22, 90)  }, makeLine);
    shapes = [
      ...Array.from({ length: n(m ? 2 :  4, 18) }, () => makeShape('xl')),
      ...Array.from({ length: n(m ? 4 :  9, 38) }, () => makeShape('l')),
      ...Array.from({ length: n(m ? 5 : 12, 55) }, () => makeShape('m'))
    ];
    dots = Array.from({ length: n(m ? 10 : 20, 80) }, makeDot);
  }

  // ── 滑鼠狀態（mouse.y = 頁面座標） ───────────────────────
  const mouse = { x: -9999, y: -9999, prevClientY: -9999 };
  const trail = [];   // trail 也用頁面座標

  // ── Hero 感應（offsetTop 是頁面座標，不隨捲動變化） ───────
  let heroTop = 0, heroBottom = 0, heroMult = 1.0;

  function updateHeroPos() {
    const el = document.querySelector('.hero');
    if (el) {
      heroTop    = el.offsetTop;
      heroBottom = el.offsetTop + el.offsetHeight;
    }
  }

  // ── 彈簧排斥（所有座標均為頁面空間） ─────────────────────
  function applySpringRepel(el) {
    el.ovx += (0 - el.ox) * SPRING;
    el.ovy += (0 - el.oy) * SPRING;
    el.ovx *= DAMP;
    el.ovy *= DAMP;
    el.ox  += el.ovx;
    el.oy  += el.ovy;

    const dx = el.x - mouse.x, dy = el.y - mouse.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < REPEL_R * REPEL_R && d2 > 1) {
      const d     = Math.sqrt(d2);
      const force = (1 - d / REPEL_R) * REPEL_F;
      el.ovx += (dx / d) * force;
      el.ovy += (dy / d) * force;
    }
  }

  // 邊界回繞（頁面座標空間）
  function wrapXY(el) {
    if (el.x < 0) el.x += W;          else if (el.x > W)      el.x -= W;
    if (el.y < 0) el.y += PAGE_H;     else if (el.y > PAGE_H) el.y -= PAGE_H;
  }
  function wrapShape(s) {
    if (s.x < 0) s.x += W;            else if (s.x > W)        s.x -= W;
    if (s.baseY < 0) s.baseY += PAGE_H; else if (s.baseY > PAGE_H) s.baseY -= PAGE_H;
  }

  // ── 更新 ─────────────────────────────────────────────────
  function update(ts) {
    // Hero 光暈：mouse.y 為頁面座標，比對 offsetTop/offsetBottom
    const inHero = mouse.y >= heroTop && mouse.y <= heroBottom;
    heroMult += ((inHero ? 1.8 : 1.0) - heroMult) * (inHero ? 0.04 : 0.025);

    for (const l of lines) {
      applySpringRepel(l);
      l.x += l.vx; l.y += l.vy;
      wrapXY(l);
    }
    for (const s of shapes) {
      s.y = s.baseY;
      applySpringRepel(s);
      s.rot   += s.rotSpeed;
      s.x     += s.vx;
      s.baseY += s.vy;
      s.opacity = Math.min(0.55, s.baseOp * heroMult);
      wrapShape(s);
    }
    for (const d of dots) {
      applySpringRepel(d);
      d.wvx += rand(-0.04, 0.04);
      d.wvy += rand(-0.04, 0.04);
      d.wvx  = Math.max(-0.3, Math.min(0.3, d.wvx));
      d.wvy  = Math.max(-0.3, Math.min(0.3, d.wvy));
      d.x   += d.wvx; d.y += d.wvy;
      wrapXY(d);
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= 0.038;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  // ── 繪製形狀 ─────────────────────────────────────────────
  function drawTriangle(ctx, size) {
    const r = size / 2;
    ctx.moveTo(0, -r);
    ctx.lineTo( r * 0.866,  r * 0.5);
    ctx.lineTo(-r * 0.866,  r * 0.5);
    ctx.closePath();
  }
  function drawSquare(ctx, size) {
    const h = size / 2; ctx.rect(-h, -h, size, size);
  }
  function drawDiamond(ctx, size) {
    const h = size / 2;
    ctx.moveTo(0, -h); ctx.lineTo(h, 0); ctx.lineTo(0, h); ctx.lineTo(-h, 0); ctx.closePath();
  }
  function drawHexagon(ctx, size) {
    const r = size / 2;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
              : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
  }
  function drawCross(ctx, size) {
    const arm = size / 2, thick = size * 0.18;
    ctx.rect(-thick, -arm, thick * 2, size);
    ctx.rect(-arm, -thick, size, thick * 2);
  }

  function drawShape(s, ts) {
    const x       = s.x + s.ox;
    const sineOff = Math.sin(ts / s.sinePeriod + s.sinePhase) * s.sineAmp;
    const y       = s.baseY + s.oy + sineOff;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.rot);
    if (s.type === 'cross') {
      ctx.fillStyle = rgba(ACCENT, s.opacity * 0.65);
      ctx.beginPath(); drawCross(ctx, s.size); ctx.fill();
    } else {
      ctx.strokeStyle = rgba(ACCENT, s.opacity);
      ctx.lineWidth   = 1;
      ctx.beginPath();
      if      (s.type === 'triangle') drawTriangle(ctx, s.size);
      else if (s.type === 'square')   drawSquare(ctx, s.size);
      else if (s.type === 'diamond')  drawDiamond(ctx, s.size);
      else if (s.type === 'hexagon')  drawHexagon(ctx, s.size);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLine(l) {
    const x = l.x + l.ox, y = l.y + l.oy;
    const cos = Math.cos(l.angle), sin = Math.sin(l.angle);
    const hl  = l.len / 2;
    const grd = ctx.createLinearGradient(x - cos*hl, y - sin*hl, x + cos*hl, y + sin*hl);
    grd.addColorStop(0,   rgba(l.color, 0));
    grd.addColorStop(0.5, rgba(l.color, l.opacity));
    grd.addColorStop(1,   rgba(l.color, 0));
    ctx.beginPath();
    ctx.moveTo(x - cos*hl, y - sin*hl);
    ctx.lineTo(x + cos*hl, y + sin*hl);
    ctx.strokeStyle = grd;
    ctx.lineWidth   = l.thick;
    ctx.stroke();
  }

  // ── 整體繪製 ─────────────────────────────────────────────
  function draw(ts) {
    const sy = window.scrollY;
    ctx.clearRect(0, 0, W, H);

    // 平移到頁面座標空間：元素跟著頁面捲動
    ctx.save();
    ctx.translate(0, -sy);

    for (const l of lines)  drawLine(l);
    for (const s of shapes) drawShape(s, ts);
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x + d.ox, d.y + d.oy, d.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, d.opacity);
      ctx.fill();
    }
    // 軌跡殘影（頁面座標，隨頁面捲動）
    for (const t of trail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * t.life, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, 0.4 * t.life);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── 動畫迴圈 ─────────────────────────────────────────────
  let paused = false;
  function loop(ts) {
    if (!paused) { update(ts); draw(ts); }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  // ── 事件 ────────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    // 速度以 viewport 座標計算（避免捲動時誤觸發殘影）
    const vel = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.prevClientY);
    mouse.x         = e.clientX;
    mouse.prevClientY = e.clientY;
    mouse.y         = e.clientY + window.scrollY;   // 頁面座標

    if (vel > 3) {
      const n = randInt(3, 5);
      for (let i = 0; i < n; i++) {
        trail.push({
          x: mouse.x + rand(-6, 6),
          y: mouse.y + rand(-6, 6),   // 頁面座標
          r: rand(1.5, 3), life: 1
        });
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -9999; mouse.y = -9999;
  });

  window.addEventListener('resize', () => {
    resize(); buildAll(); updateHeroPos();
  });

  // 頁面完全載入後更新 PAGE_H（圖片等資源可能改變頁高）
  window.addEventListener('load', () => {
    resize(); buildAll(); updateHeroPos();
  });

  // ── 初始化 ───────────────────────────────────────────────
  resize();
  buildAll();
  updateHeroPos();
  requestAnimationFrame(loop);
})();
