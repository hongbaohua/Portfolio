/**
 * float-index.js
 * 首頁浮動背景動效 — 「設計師的工作桌碎片」
 * 元素：多層次幾何形（三角/方/菱/六角/十字）+ 細線段 + 圓點
 * 注意：刻意不用圓形為主，保留小圓點作為點綴
 * 互動：磁力排斥 / 滑鼠軌跡殘影 / Hero 感應光暈
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
  const ACCENT = hexToRgb(CV.getPropertyValue('--accent'));      // #C4A35A
  const MUTED  = hexToRgb(CV.getPropertyValue('--text-muted')); // #8A8575

  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  // ── 畫布 ────────────────────────────────────────────────
  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── 工具 ────────────────────────────────────────────────
  const rand    = (a, b) => Math.random() * (b - a) + a;
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const isMobile = () => window.innerWidth < 768;

  // ── 物理常數 ─────────────────────────────────────────────
  const SPRING  = 0.055;
  const DAMP    = 0.80;
  const REPEL_R = 130;
  const REPEL_F = 5.5;

  // ── 形狀類型（刻意去掉 circle，保留多樣幾何） ─────────────
  const SHAPE_TYPES = ['triangle', 'square', 'diamond', 'hexagon', 'cross'];

  // ── 元素 ────────────────────────────────────────────────
  let lines  = [];
  let shapes = [];   // 包含 XL / L / M 三層尺寸
  let dots   = [];

  // ─── 類型 A：細線段（更長、更多樣） ─────────────────────
  function makeLine() {
    const thick = Math.random() < 0.25 ? 1.5 : 1; // 偶有粗線
    return {
      x: rand(0, W), y: rand(0, H),
      len: rand(30, 90),
      angle: rand(0, Math.PI * 2),
      color: Math.random() < 0.55 ? ACCENT : MUTED,
      opacity: rand(0.10, 0.22),
      thick,
      vx: rand(-0.22, 0.22), vy: rand(-0.22, 0.22),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  // ─── 類型 B：幾何形（三層大小層次） ─────────────────────
  function makeShape(tier) {
    // tier: 'xl' | 'l' | 'm'
    let sizeMin, sizeMax, opMin, opMax, speedMax;
    if (tier === 'xl') {
      sizeMin = 50; sizeMax = 85;
      opMin   = 0.03; opMax = 0.07;
      speedMax = 0.08;
    } else if (tier === 'l') {
      sizeMin = 25; sizeMax = 48;
      opMin   = 0.07; opMax = 0.13;
      speedMax = 0.14;
    } else {
      sizeMin = 8;  sizeMax = 22;
      opMin   = 0.10; opMax = 0.20;
      speedMax = 0.22;
    }
    const baseOp = rand(opMin, opMax);
    return {
      x: rand(0, W), baseY: rand(0, H),
      y: 0,  // 供排斥計算暫用
      type: SHAPE_TYPES[randInt(0, SHAPE_TYPES.length - 1)],
      size: rand(sizeMin, sizeMax),
      tier,
      baseOp,
      opacity: baseOp,
      rot: rand(0, Math.PI * 2),
      // XL 旋轉很慢，M 可以稍快
      rotSpeed: rand(-0.002, 0.002) * (tier === 'xl' ? 0.3 : tier === 'l' ? 0.7 : 1.2),
      sinePhase: rand(0, Math.PI * 2),
      sinePeriod: rand(tier === 'xl' ? 7000 : 4000, tier === 'xl' ? 12000 : 8000),
      sineAmp: tier === 'xl' ? 18 : tier === 'l' ? 12 : 7,
      vx: rand(-speedMax, speedMax), vy: rand(-speedMax, speedMax),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  // ─── 類型 C：圓點（小圓點作為點綴） ─────────────────────
  function makeDot() {
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(1.5, 4),
      opacity: rand(0.08, 0.18),
      wvx: rand(-0.2, 0.2), wvy: rand(-0.2, 0.2),
      ox: 0, oy: 0, ovx: 0, ovy: 0
    };
  }

  function buildAll() {
    const m = isMobile();

    // 線段
    lines = Array.from({ length: m ? 10 : 22 }, makeLine);

    // 幾何形：XL 幾個大錨點 + L 中層 + M 細節
    const xlN = m ? 2 : 4;
    const lN  = m ? 4 : 9;
    const mN  = m ? 5 : 12;
    shapes = [
      ...Array.from({ length: xlN }, () => makeShape('xl')),
      ...Array.from({ length: lN  }, () => makeShape('l')),
      ...Array.from({ length: mN  }, () => makeShape('m'))
    ];

    // 點
    dots = Array.from({ length: m ? 10 : 20 }, makeDot);
  }

  // ── 滑鼠狀態 ─────────────────────────────────────────────
  const mouse = { x: -9999, y: -9999 };
  const trail = [];

  // ── Hero 光暈倍率 ─────────────────────────────────────────
  let heroRect = null, heroMult = 1.0;

  function updateHeroRect() {
    const el = document.querySelector('.hero');
    if (el) heroRect = el.getBoundingClientRect();
  }

  // ── 彈簧排斥（共用） ─────────────────────────────────────
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

  function wrapXY(el) {
    if (el.x < 0) el.x += W; else if (el.x > W) el.x -= W;
    if (el.y < 0) el.y += H; else if (el.y > H) el.y -= H;
  }

  function wrapShape(s) {
    if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W;
    if (s.baseY < 0) s.baseY += H; else if (s.baseY > H) s.baseY -= H;
  }

  // ── 更新 ─────────────────────────────────────────────────
  function update(ts) {
    // Hero 光暈
    let inHero = false;
    if (heroRect) {
      inHero = mouse.x >= heroRect.left && mouse.x <= heroRect.right &&
               mouse.y >= heroRect.top  && mouse.y <= heroRect.bottom;
    }
    heroMult += ((inHero ? 1.8 : 1.0) - heroMult) * (inHero ? 0.04 : 0.025);

    // 線段
    for (const l of lines) {
      applySpringRepel(l);
      l.x += l.vx; l.y += l.vy;
      wrapXY(l);
    }

    // 幾何形
    for (const s of shapes) {
      s.y = s.baseY;
      applySpringRepel(s);
      s.rot   += s.rotSpeed;
      s.x     += s.vx;
      s.baseY += s.vy;
      s.opacity = Math.min(s.baseOp * 2.5, s.baseOp * heroMult);
      wrapShape(s);
    }

    // 圓點
    for (const d of dots) {
      applySpringRepel(d);
      d.wvx += rand(-0.04, 0.04);
      d.wvy += rand(-0.04, 0.04);
      d.wvx  = Math.max(-0.3, Math.min(0.3, d.wvx));
      d.wvy  = Math.max(-0.3, Math.min(0.3, d.wvy));
      d.x   += d.wvx;
      d.y   += d.wvy;
      wrapXY(d);
    }

    // 軌跡淡出
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= 0.038;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  // ── 繪製各形狀 ───────────────────────────────────────────
  function drawTriangle(ctx, size) {
    const r = size / 2;
    ctx.moveTo(0, -r);
    ctx.lineTo( r * 0.866,  r * 0.5);
    ctx.lineTo(-r * 0.866,  r * 0.5);
    ctx.closePath();
  }

  function drawSquare(ctx, size) {
    const h = size / 2;
    ctx.rect(-h, -h, size, size);
  }

  function drawDiamond(ctx, size) {
    const h = size / 2;
    ctx.moveTo(0, -h);
    ctx.lineTo(h, 0);
    ctx.lineTo(0, h);
    ctx.lineTo(-h, 0);
    ctx.closePath();
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
      // cross 用 fill 更清晰
      ctx.fillStyle = rgba(ACCENT, s.opacity * 0.65);
      ctx.beginPath();
      drawCross(ctx, s.size);
      ctx.fill();
    } else {
      ctx.strokeStyle = rgba(ACCENT, s.opacity);
      ctx.lineWidth   = s.tier === 'xl' ? 1 : 1;
      ctx.beginPath();
      if (s.type === 'triangle')  drawTriangle(ctx, s.size);
      else if (s.type === 'square')   drawSquare(ctx, s.size);
      else if (s.type === 'diamond')  drawDiamond(ctx, s.size);
      else if (s.type === 'hexagon')  drawHexagon(ctx, s.size);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLine(l) {
    const x   = l.x + l.ox, y = l.y + l.oy;
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
    ctx.clearRect(0, 0, W, H);

    for (const l of lines)  drawLine(l);
    for (const s of shapes) drawShape(s, ts);

    // 圓點
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x + d.ox, d.y + d.oy, d.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, d.opacity);
      ctx.fill();
    }

    // 軌跡殘影
    for (const t of trail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * t.life, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, 0.4 * t.life);
      ctx.fill();
    }
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
    const vel = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (vel > 3) {
      const n = randInt(3, 5);
      for (let i = 0; i < n; i++) {
        trail.push({ x: e.clientX + rand(-6,6), y: e.clientY + rand(-6,6), r: rand(1.5,3), life: 1 });
      }
    }
    updateHeroRect();
  });

  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  window.addEventListener('resize', () => { resize(); buildAll(); updateHeroRect(); });
  window.addEventListener('scroll', updateHeroRect, { passive: true });

  // ── 初始化 ───────────────────────────────────────────────
  resize();
  buildAll();
  updateHeroRect();
  requestAnimationFrame(loop);
})();
