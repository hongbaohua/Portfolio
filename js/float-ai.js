/**
 * float-ai.js
 * AI 學習歷程頁浮動背景動效 — 「神經網路呼吸中」
 * 節點活在「頁面座標空間」，draw() 以 scrollY 平移跟著頁面捲動
 * 二進位字元維持在 viewport 空間（對話視窗感，不隨頁面走）
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

  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  // ── 畫布（viewport 大小） ────────────────────────────────
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
  const SPRING   = 0.05;
  const DAMP     = 0.82;
  const EDGE_R   = 150;
  const MOUSE_R  = 180;
  const REPEL_F  = 5.0;

  // ── 空間分布輔助 ─────────────────────────────────────────
  let sectionBounds = [];
  let aiHeroTop = 0, aiHeroBottom = 0;

  function computeSectionBounds() {
    sectionBounds = [];
    // 包含 .ai-hero（大標題深色格紋區）
    document.querySelectorAll('.hero, .ai-hero, section').forEach(el => {
      sectionBounds.push(el.offsetTop);
      sectionBounds.push(el.offsetTop + el.offsetHeight);
    });
  }

  function computeAiHeroBounds() {
    const el = document.querySelector('.ai-hero');
    if (el) { aiHeroTop = el.offsetTop; aiHeroBottom = el.offsetTop + el.offsetHeight; }
  }

  function biasedX() {
    const r = Math.random();
    if (r < 0.55) return Math.random() < 0.5 ? rand(0, W * 0.22) : rand(W * 0.78, W);
    if (r < 0.80) return Math.random() < 0.5 ? rand(W * 0.22, W * 0.36) : rand(W * 0.64, W * 0.78);
    return rand(W * 0.36, W * 0.64);
  }

  function biasedY() {
    if (sectionBounds.length > 0 && Math.random() < 0.55) {
      const b = sectionBounds[randInt(0, sectionBounds.length - 1)];
      return Math.max(0, Math.min(PAGE_H, b + rand(-160, 160)));
    }
    return rand(0, PAGE_H);
  }

  // ── 元素 ────────────────────────────────────────────────
  let nodes = [];
  let bits  = [];           // viewport 空間（不跟頁面走）
  const pulses = [];

  // ─── 節點（頁面座標） ─────────────────────────────────────
  // zone: 'hero'（深色大標題區，全寬 + 高 opacity）| 'normal'
  function makeNode(zone) {
    const inHero = zone === 'hero';
    const baseOp = inHero ? rand(0.38, 0.65) : rand(0.20, 0.38);
    // hero 區節點集中在右側（52%～100% 寬度）
    const x = inHero ? rand(W * 0.52, W) : biasedX();
    const y = inHero ? rand(aiHeroTop, aiHeroBottom) : biasedY();
    return {
      x, y,
      r: rand(inHero ? 2.5 : 2, inHero ? 6 : 5),
      baseOp, opacity: baseOp,
      displayOp: 0,                         // 淡入進度
      fadeElapsed: -rand(0, 2500),          // 錯落淡入：負值表示延遲時間（ms）
      vx: rand(-0.35, 0.35), vy: rand(-0.35, 0.35),
      ox: 0, oy: 0, ovx: 0, ovy: 0,
      glowR: 0, glowOp: 0, activeLeft: 0,
      attracted: false
    };
  }

  // ─── 二進位字元（viewport 座標，始終顯示在畫面上） ────────
  function makeBit() {
    return {
      x: rand(0, W),
      y: rand(0, H),     // viewport 座標
      char: Math.random() < 0.5 ? '0' : '1',
      size: rand(10, 14),
      opacity: rand(0.07, 0.16),
      speed: rand(0.15, 0.35),
      driftPhase: rand(0, Math.PI * 2),
      boosted: false, boostLeft: 0
    };
  }

  function buildAll() {
    computeSectionBounds();
    computeAiHeroBounds();
    const m  = isMobile();
    const r  = Math.min(PAGE_H / Math.max(H, 1), 5);
    const nc = Math.min(Math.round((m ? 16 : 22) * r), 110);

    // 14% 集中在深色大標題區右側（ai-hero），避免過於擁擠
    const heroN = aiHeroBottom > aiHeroTop
      ? Math.round(nc * 0.14)
      : 0;
    nodes = [
      ...Array.from({ length: heroN        }, () => makeNode('hero')),
      ...Array.from({ length: nc - heroN   }, () => makeNode('normal'))
    ];

    // 二進位字元在 viewport 空間，數量固定
    bits  = m ? [] : Array.from({ length: randInt(14, 20) }, makeBit);
  }

  // ── 滑鼠狀態 ─────────────────────────────────────────────
  // mouse.x/y = 頁面座標（用於節點物理互動）
  // mouse.clientY = viewport 座標（用於靜止偵測）
  const mouse = { x: -9999, y: -9999, clientY: -9999, inside: false };

  let stillTimer    = 0;
  let stillClientX  = -9999, stillClientY = -9999;
  let attractedSet  = [];
  let nextActivate  = 0;

  // ── 更新 ─────────────────────────────────────────────────
  function update(ts, dt) {
    // 活躍節點
    if (ts > nextActivate && nodes.length > 0) {
      const n = nodes[randInt(0, nodes.length - 1)];
      n.activeLeft = rand(600, 1200); n.glowR = 0; n.glowOp = 0.7;
      nextActivate = ts + rand(3000, 6000);
    }

    // 靜止偵測（用 viewport 座標，避免捲動誤觸發）
    if (mouse.inside) {
      const moved = Math.hypot(mouse.x - stillClientX, mouse.clientY - stillClientY);
      if (moved > 8) {
        stillTimer = 0; stillClientX = mouse.x; stillClientY = mouse.clientY;
        for (const n of attractedSet) n.attracted = false;
        attractedSet = [];
      } else {
        stillTimer += dt;
        if (stillTimer > 1500 && attractedSet.length === 0) {
          const sorted = [...nodes].sort((a, b) =>
            Math.hypot(a.x - mouse.x, a.y - mouse.y) -
            Math.hypot(b.x - mouse.x, b.y - mouse.y)
          );
          attractedSet = sorted.slice(0, 3);
          for (const n of attractedSet) n.attracted = true;
        }
      }
    }

    for (const n of nodes) {
      // 錯落淡入（fadeElapsed < 0 為等待期，>= 0 開始淡入）
      if (n.displayOp < n.baseOp) {
        n.fadeElapsed += dt;
        if (n.fadeElapsed > 0) {
          n.displayOp = Math.min(n.baseOp, n.displayOp + n.baseOp * (dt / 800));
        }
      }
      // 活躍光暈
      if (n.activeLeft > 0) {
        n.activeLeft -= dt; n.glowR += 0.7;
        n.glowOp = Math.max(0, n.glowOp - 0.007);
        if (n.activeLeft <= 0) { n.glowR = 0; n.glowOp = 0; }
      }
      // 彈簧
      n.ovx += (0 - n.ox) * SPRING; n.ovy += (0 - n.oy) * SPRING;
      n.ovx *= DAMP; n.ovy *= DAMP;
      n.ox  += n.ovx; n.oy  += n.ovy;
      // 吸引力
      if (n.attracted) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        n.vx += dx * 0.0018; n.vy += dy * 0.0018;
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > 1.5) { n.vx *= 1.5/spd; n.vy *= 1.5/spd; }
      }
      n.x += n.vx; n.y += n.vy;
      // 邊界回繞（頁面座標）
      if (n.x < 0) n.x += W;          else if (n.x > W)      n.x -= W;
      if (n.y < 0) n.y += PAGE_H;     else if (n.y > PAGE_H) n.y -= PAGE_H;
    }

    // 二進位字元（viewport 座標，向上飄）
    for (const b of bits) {
      b.y -= b.speed * (b.boosted ? 2.8 : 1);
      b.x += Math.sin(b.y * 0.016 + b.driftPhase) * 0.4;
      if (b.boosted) { b.boostLeft -= dt; if (b.boostLeft <= 0) b.boosted = false; }
      if (b.y < -20) {
        b.y = H + 10;   // viewport 底部重生
        b.x = rand(0, W);
        b.char = Math.random() < 0.5 ? '0' : '1';
      }
    }

    // 脈衝波（頁面座標）
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.elapsed += dt; p.radius = (p.elapsed / 800) * 200;
      p.opacity = 0.6 * (1 - p.elapsed / 800);
      if (p.elapsed >= 800) pulses.splice(i, 1);
    }
  }

  // ── 繪製 ─────────────────────────────────────────────────
  function draw(ts) {
    const sy = window.scrollY;
    ctx.clearRect(0, 0, W, H);

    // ── 頁面座標空間（節點、邊、脈衝跟著頁面走） ──────────
    ctx.save();
    ctx.translate(0, -sy);

    // 邊 + 流動光點
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const ax = a.x + a.ox, ay = a.y + a.oy;

      for (let j = i + 1; j < nodes.length; j++) {
        const b  = nodes[j];
        const bx = b.x + b.ox, by = b.y + b.oy;
        const d  = Math.hypot(bx - ax, by - ay);
        if (d >= EDGE_R) continue;
        // 兩端節點都完成淡入才畫邊
        const fadeRatio = Math.min(a.displayOp / Math.max(a.baseOp, 0.001),
                                   b.displayOp / Math.max(b.baseOp, 0.001));
        if (fadeRatio < 0.05) continue;
        const edgeOp = 0.22 * (1 - d / EDGE_R) * fadeRatio;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = rgba(ACCENT, edgeOp); ctx.lineWidth = 1; ctx.stroke();

        const spd1 = 0.8 + ((i * 7 + j * 3) % 10) * 0.07;
        const spd2 = 0.9 + ((i * 5 + j * 11) % 10) * 0.06;
        const ph1  = ((ts * 0.001 * spd1) + i * 0.37 + j * 0.53) % 1;
        const ph2  = 1 - ((ts * 0.001 * spd2) + i * 0.61 + j * 0.29) % 1;
        for (const ph of [ph1, ph2]) {
          ctx.beginPath();
          ctx.arc(ax + (bx - ax) * ph, ay + (by - ay) * ph, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(ACCENT, 0.65 * fadeRatio); ctx.fill();
        }
      }

      // 滑鼠超級節點連線（mouse.x/y 已是頁面座標）
      if (mouse.inside) {
        const d = Math.hypot(mouse.x - ax, mouse.y - ay);
        if (d < MOUSE_R) {
          const edgeOp = 0.48 * (1 - d / MOUSE_R);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = rgba(ACCENT, edgeOp); ctx.lineWidth = 1; ctx.stroke();
          const spd = 1.0 + (i % 5) * 0.12;
          const ph  = ((ts * 0.001 * spd) + i * 0.41) % 1;
          ctx.beginPath();
          ctx.arc(ax + (mouse.x - ax) * ph, ay + (mouse.y - ay) * ph, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(ACCENT, 0.65); ctx.fill();
        }
      }
    }

    // 節點
    for (const n of nodes) {
      const x = n.x + n.ox, y = n.y + n.oy;
      if (n.glowR > 0 && n.glowOp > 0) {
        ctx.beginPath(); ctx.arc(x, y, n.glowR, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ACCENT, n.glowOp); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.save();
      ctx.shadowBlur  = 6; ctx.shadowColor = rgba(ACCENT, 0.35);
      ctx.beginPath(); ctx.arc(x, y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, n.displayOp); ctx.fill();
      ctx.restore();
    }

    // 滑鼠超級節點（mouse.y = clientY + scrollY，translate(-sy) 後視覺位置 = clientY）
    if (mouse.inside) {
      ctx.save();
      ctx.shadowBlur = 14; ctx.shadowColor = rgba(ACCENT, 0.7);
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, 0.6); ctx.fill();
      ctx.restore();
    }

    // 脈衝波（頁面座標）
    for (const p of pulses) {
      if (p.opacity <= 0) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ACCENT, p.opacity); ctx.lineWidth = 1.5; ctx.stroke();
    }

    ctx.restore();

    // ── Viewport 座標空間（二進位字元不隨頁面走） ─────────
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const b of bits) {
      ctx.font      = `${b.size}px 'Courier New', monospace`;
      ctx.fillStyle = rgba(ACCENT, b.opacity);
      ctx.fillText(b.char, b.x, b.y);
    }
  }

  // ── 動畫迴圈 ─────────────────────────────────────────────
  let lastTs = 0, paused = false;
  function loop(ts) {
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    if (!paused) { update(ts, dt); draw(ts); }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  // ── 事件 ────────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    mouse.x       = e.clientX;
    mouse.clientY = e.clientY;
    mouse.y       = e.clientY + window.scrollY;   // 頁面座標
    mouse.inside  = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.inside = false; mouse.x = -9999; mouse.y = -9999;
    for (const n of attractedSet) n.attracted = false;
    attractedSet = []; stillTimer = 0;
  });

  window.addEventListener('click', e => {
    if (pulses.length >= 1) return;
    const px = e.clientX;
    const py = e.clientY + window.scrollY;   // 頁面座標

    pulses.push({ x: px, y: py, elapsed: 0, radius: 0, opacity: 0.6 });

    // 排斥節點（頁面座標比對）
    for (const n of nodes) {
      const dx = n.x - px, dy = n.y - py;
      const d  = Math.hypot(dx, dy);
      if (d < 200 && d > 1) {
        const force = (1 - d / 200) * REPEL_F;
        n.ovx += (dx / d) * force; n.ovy += (dy / d) * force;
      }
    }
    // 加速二進位字元（viewport 座標比對）
    for (const b of bits) {
      if (Math.hypot(b.x - e.clientX, b.y - e.clientY) < 200) {
        b.boosted = true; b.boostLeft = 500;
      }
    }
  });

  window.addEventListener('resize', () => { resize(); buildAll(); });

  window.addEventListener('load', () => { resize(); buildAll(); });


  // ── 初始化 ───────────────────────────────────────────────
  resize();
  buildAll();
  requestAnimationFrame(loop);
})();
