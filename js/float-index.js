/**
 * float-index.js
 * 首頁浮動背景動效 — 「設計師的工作桌碎片」
 * 元素：細線段 / 幾何形 / 圓點
 * 互動：磁力排斥 / 滑鼠軌跡殘影 / Hero 感應光暈
 */
(function () {
  'use strict';

  const canvas = document.getElementById('floatBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── 顏色工具 ────────────────────────────────────────────
  function hexToRgb(hex) {
    hex = hex.trim().replace(/^#/, '');
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  const CV = getComputedStyle(document.documentElement);
  const ACCENT = hexToRgb(CV.getPropertyValue('--accent'));
  const MUTED  = hexToRgb(CV.getPropertyValue('--text-muted'));

  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  // ── 畫布 ────────────────────────────────────────────────
  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── 工具函數 ─────────────────────────────────────────────
  const rand    = (a, b) => Math.random() * (b - a) + a;
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const isMobile = () => window.innerWidth < 768;

  // ── 物理常數 ─────────────────────────────────────────────
  const SPRING  = 0.055;
  const DAMP    = 0.80;
  const REPEL_R = 120;   // 磁力半徑 px
  const REPEL_F = 5.0;   // 最大推力

  // ── 元素陣列 ─────────────────────────────────────────────
  let lines = [], shapes = [], dots = [];

  // ── 類型 A：細線段 ───────────────────────────────────────
  function makeLine() {
    return {
      x: rand(0, W), y: rand(0, H),
      len: rand(20, 50),
      angle: rand(0, Math.PI * 2),
      color: Math.random() < 0.6 ? ACCENT : MUTED,
      opacity: rand(0.08, 0.18),
      vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
      ox: 0, oy: 0, ovx: 0, ovy: 0   // 排斥位移 & 速度
    };
  }

  // ── 類型 B：幾何形碎片 ───────────────────────────────────
  const SHAPE_TYPES = ['triangle', 'square', 'circle'];

  function makeShape() {
    const baseOp = rand(0.05, 0.12);
    return {
      x: rand(0, W), baseY: rand(0, H),  // baseY 隨時間漂移，x 直接漂移
      type: SHAPE_TYPES[randInt(0, 2)],
      size: rand(8, 28),
      baseOp,
      opacity: baseOp,
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.003, 0.003),
      sinePhase: rand(0, Math.PI * 2),
      sinePeriod: rand(4000, 8000),
      vx: rand(-0.12, 0.12), vy: rand(-0.10, 0.10),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  // ── 類型 C：圓點群 ───────────────────────────────────────
  function makeDot() {
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(2, 5),
      opacity: rand(0.06, 0.15),
      wvx: rand(-0.2, 0.2), wvy: rand(-0.2, 0.2),  // 隨機遊走
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  function buildAll() {
    const m  = isMobile();
    lines  = Array.from({ length: m ? 10 : 20 }, makeLine);
    shapes = Array.from({ length: m ?  7 : 14 }, makeShape);
    dots   = Array.from({ length: m ? 11 : 22 }, makeDot);
  }

  // ── 滑鼠狀態 ─────────────────────────────────────────────
  const mouse = { x: -9999, y: -9999 };
  const trail = [];  // 軌跡殘影

  // ── Hero 光暈 ────────────────────────────────────────────
  let heroRect = null;
  let heroMult = 1.0;   // 目前 opacity 乘數（平滑過渡）

  function updateHeroRect() {
    const el = document.querySelector('.hero');
    if (el) heroRect = el.getBoundingClientRect();
  }

  // ── 物理：彈簧排斥 ───────────────────────────────────────
  function applySpringRepel(el) {
    // 彈簧拉回原位
    el.ovx += (0 - el.ox) * SPRING;
    el.ovy += (0 - el.oy) * SPRING;
    el.ovx *= DAMP;
    el.ovy *= DAMP;
    el.ox  += el.ovx;
    el.oy  += el.ovy;

    // 滑鼠排斥力
    const dx = el.x - mouse.x;
    const dy = el.y - mouse.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < REPEL_R * REPEL_R && d2 > 1) {
      const d     = Math.sqrt(d2);
      const force = (1 - d / REPEL_R) * REPEL_F;
      el.ovx += (dx / d) * force;
      el.ovy += (dy / d) * force;
    }
  }

  function wrapXY(el) {
    if (el.x < 0) el.x += W; else if (el.x > W) el.x -= W;
    if (el.y < 0) el.y += H; else if (el.y > H) el.y -= H;
  }

  function wrapXBaseY(el) {
    if (el.x < 0) el.x += W; else if (el.x > W) el.x -= W;
    if (el.baseY < 0) el.baseY += H; else if (el.baseY > H) el.baseY -= H;
  }

  // ── 更新邏輯 ─────────────────────────────────────────────
  function update(ts) {
    // Hero 光暈：判斷滑鼠是否在 hero 區塊
    let inHero = false;
    if (heroRect) {
      inHero = mouse.x >= heroRect.left && mouse.x <= heroRect.right &&
               mouse.y >= heroRect.top  && mouse.y <= heroRect.bottom;
    }
    const targetMult = inHero ? 1.8 : 1.0;
    heroMult += (targetMult - heroMult) * (inHero ? 0.04 : 0.025);

    // 線段
    for (const l of lines) {
      applySpringRepel(l);
      l.x += l.vx;
      l.y += l.vy;
      wrapXY(l);
    }

    // 幾何形
    for (const s of shapes) {
      // 排斥時用 x/baseY 的中心做計算
      s.x   += 0; // 先不移動，applySpringRepel 讀 s.x, s.y 但 shape 的 y 要用 baseY
      s.y    = s.baseY; // 同步讓排斥函數讀到正確 y
      applySpringRepel(s);
      s.rot += s.rotSpeed;
      s.x   += s.vx;
      s.baseY += s.vy;
      s.opacity = Math.min(0.20, s.baseOp * heroMult);
      wrapXBaseY(s);
    }

    // 圓點
    for (const d of dots) {
      applySpringRepel(d);
      // 隨機遊走
      d.wvx += rand(-0.04, 0.04);
      d.wvy += rand(-0.04, 0.04);
      d.wvx = Math.max(-0.3, Math.min(0.3, d.wvx));
      d.wvy = Math.max(-0.3, Math.min(0.3, d.wvy));
      d.x += d.wvx;
      d.y += d.wvy;
      wrapXY(d);
    }

    // 軌跡殘影淡出
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= 0.038;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  // ── 繪製函數 ─────────────────────────────────────────────
  function drawLine(l) {
    const x = l.x + l.ox, y = l.y + l.oy;
    const cos = Math.cos(l.angle), sin = Math.sin(l.angle);
    const hl = l.len / 2;
    const grd = ctx.createLinearGradient(x - cos*hl, y - sin*hl, x + cos*hl, y + sin*hl);
    grd.addColorStop(0,   rgba(l.color, 0));
    grd.addColorStop(0.5, rgba(l.color, l.opacity));
    grd.addColorStop(1,   rgba(l.color, 0));
    ctx.beginPath();
    ctx.moveTo(x - cos*hl, y - sin*hl);
    ctx.lineTo(x + cos*hl, y + sin*hl);
    ctx.strokeStyle = grd;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  function drawShape(s, ts) {
    const x = s.x + s.ox;
    const sineOff = Math.sin(ts / s.sinePeriod + s.sinePhase) * 12;
    const y = s.baseY + s.oy + sineOff;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.rot);
    ctx.strokeStyle = rgba(ACCENT, s.opacity);
    ctx.lineWidth   = 1;
    ctx.beginPath();
    if (s.type === 'circle') {
      ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
    } else if (s.type === 'square') {
      const h = s.size / 2;
      ctx.rect(-h, -h, s.size, s.size);
    } else {
      // 正三角形（空心）
      const r = s.size / 2;
      ctx.moveTo(0, -r);
      ctx.lineTo( r * 0.866,  r * 0.5);
      ctx.lineTo(-r * 0.866,  r * 0.5);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawDot(d) {
    ctx.beginPath();
    ctx.arc(d.x + d.ox, d.y + d.oy, d.r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(ACCENT, d.opacity);
    ctx.fill();
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    for (const l of lines)     drawLine(l);
    for (const s of shapes)    drawShape(s, ts);
    for (const d of dots)      drawDot(d);

    // 軌跡殘影
    for (const t of trail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * t.life, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, 0.35 * t.life);
      ctx.fill();
    }
  }

  // ── 動畫迴圈 ─────────────────────────────────────────────
  let paused = false;

  function loop(ts) {
    if (!paused) { update(ts); draw(ts); }
    requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
  });

  // ── 事件監聽 ─────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    const vel = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // 軌跡殘影（快速移動時）
    if (vel > 3) {
      const n = randInt(3, 5);
      for (let i = 0; i < n; i++) {
        trail.push({
          x: e.clientX + rand(-6, 6),
          y: e.clientY + rand(-6, 6),
          r: rand(1.5, 3),
          life: 1
        });
      }
    }
    updateHeroRect();
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener('resize', () => {
    resize();
    buildAll();
    updateHeroRect();
  });

  window.addEventListener('scroll', updateHeroRect, { passive: true });

  // ── 初始化 ───────────────────────────────────────────────
  resize();
  buildAll();
  updateHeroRect();
  requestAnimationFrame(loop);
})();
