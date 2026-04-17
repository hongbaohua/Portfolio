/**
 * float-ai.js
 * AI 學習歷程頁浮動背景動效 — 「神經網路呼吸中」
 * 元素：神經網路節點圖 / 浮動二進位字元
 * 互動：滑鼠超級節點 / 點擊脈衝波 / 靜止節點吸引
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
  const SPRING   = 0.05;
  const DAMP     = 0.82;
  const EDGE_R   = 150;   // 節點連線距離
  const MOUSE_R  = 180;   // 滑鼠超級節點連線距離
  const REPEL_F  = 5.0;

  // ── 元素陣列 ─────────────────────────────────────────────
  let nodes = [];
  let bits  = [];     // 二進位字元
  const pulses = []; // 點擊脈衝波

  // ── 類型 A：節點 ─────────────────────────────────────────
  function makeNode() {
    const baseOp = rand(0.15, 0.30);
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(2, 5),
      baseOp,
      opacity: baseOp,
      vx: rand(-0.35, 0.35), vy: rand(-0.35, 0.35),
      ox: 0, oy: 0, ovx: 0, ovy: 0,
      // 活躍光暈
      glowR: 0, glowOp: 0, activeLeft: 0,
      // 吸引（滑鼠靜止）
      attracted: false
    };
  }

  // ── 類型 B：二進位字元 ───────────────────────────────────
  function makeBit() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      char: Math.random() < 0.5 ? '0' : '1',
      size: rand(10, 14),
      opacity: rand(0.04, 0.10),
      speed: rand(0.15, 0.35),
      driftPhase: rand(0, Math.PI * 2),
      boosted: false, boostLeft: 0
    };
  }

  function buildAll() {
    const m  = isMobile();
    const nc = m ? 15 : 25;
    nodes = Array.from({ length: nc }, makeNode);
    bits  = m ? [] : Array.from({ length: randInt(12, 16) }, makeBit);
  }

  // ── 滑鼠狀態 ─────────────────────────────────────────────
  const mouse = { x: -9999, y: -9999, inside: false };

  // 滑鼠靜止偵測
  let stillTimer   = 0;
  let stillX       = -9999, stillY = -9999;
  let attractedSet = [];  // 被吸引的 3 個節點

  // 下一次活躍節點觸發時間
  let nextActivate = 0;

  // ── 更新邏輯 ─────────────────────────────────────────────
  function update(ts, dt) {
    // 隨機活躍節點
    if (ts > nextActivate && nodes.length > 0) {
      const n = nodes[randInt(0, nodes.length - 1)];
      n.activeLeft = rand(600, 1200);
      n.glowR = 0;
      n.glowOp = 0.7;
      nextActivate = ts + rand(3000, 6000);
    }

    // 靜止偵測
    if (mouse.inside) {
      const moved = Math.hypot(mouse.x - stillX, mouse.y - stillY);
      if (moved > 8) {
        // 移動了，重置
        stillTimer = 0;
        stillX = mouse.x; stillY = mouse.y;
        for (const n of attractedSet) n.attracted = false;
        attractedSet = [];
      } else {
        stillTimer += dt;
        if (stillTimer > 1500 && attractedSet.length === 0) {
          // 找最近 3 個節點
          const sorted = [...nodes].sort((a, b) =>
            Math.hypot(a.x - mouse.x, a.y - mouse.y) -
            Math.hypot(b.x - mouse.x, b.y - mouse.y)
          );
          attractedSet = sorted.slice(0, 3);
          for (const n of attractedSet) n.attracted = true;
        }
      }
    }

    // 更新節點
    for (const n of nodes) {
      // 活躍光暈
      if (n.activeLeft > 0) {
        n.activeLeft -= dt;
        n.glowR  += 0.7;
        n.glowOp  = Math.max(0, n.glowOp - 0.007);
        if (n.activeLeft <= 0) { n.glowR = 0; n.glowOp = 0; }
      }

      // 彈簧拉回
      n.ovx += (0 - n.ox) * SPRING;
      n.ovy += (0 - n.oy) * SPRING;
      n.ovx *= DAMP;
      n.ovy *= DAMP;
      n.ox  += n.ovx;
      n.oy  += n.ovy;

      // 吸引力（靜止互動）
      if (n.attracted) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        n.vx += dx * 0.0018;
        n.vy += dy * 0.0018;
        // 速度限制
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > 1.5) { n.vx *= 1.5/spd; n.vy *= 1.5/spd; }
      }

      n.x += n.vx;
      n.y += n.vy;

      // 邊界回繞
      if (n.x < 0) n.x += W; else if (n.x > W) n.x -= W;
      if (n.y < 0) n.y += H; else if (n.y > H) n.y -= H;
    }

    // 更新二進位字元
    for (const b of bits) {
      const speedMult = b.boosted ? 2.8 : 1;
      b.y -= b.speed * speedMult;
      b.x += Math.sin(b.y * 0.016 + b.driftPhase) * 0.4;
      if (b.boosted) {
        b.boostLeft -= dt;
        if (b.boostLeft <= 0) b.boosted = false;
      }
      // 頂部消失後從底部重生
      if (b.y < -20) {
        b.y = H + 10;
        b.x = rand(0, W);
        b.char = Math.random() < 0.5 ? '0' : '1';
      }
    }

    // 更新脈衝波
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.elapsed += dt;
      p.radius  = (p.elapsed / 800) * 200;
      p.opacity = 0.6 * (1 - p.elapsed / 800);
      if (p.elapsed >= 800) pulses.splice(i, 1);
    }
  }

  // ── 繪製函數 ─────────────────────────────────────────────
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    // 邊與流動光點
    for (let i = 0; i < nodes.length; i++) {
      const a  = nodes[i];
      const ax = a.x + a.ox, ay = a.y + a.oy;

      // 節點對節點
      for (let j = i + 1; j < nodes.length; j++) {
        const b  = nodes[j];
        const bx = b.x + b.ox, by = b.y + b.oy;
        const d  = Math.hypot(bx - ax, by - ay);
        if (d >= EDGE_R) continue;

        const edgeOp = 0.12 * (1 - d / EDGE_R);

        // 邊線
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = rgba(ACCENT, edgeOp);
        ctx.lineWidth   = 1;
        ctx.stroke();

        // 流動光點（兩個，方向相反）
        const spd1 = 0.8 + ((i * 7 + j * 3) % 10) * 0.07;
        const spd2 = 0.9 + ((i * 5 + j * 11) % 10) * 0.06;
        const ph1  = ((ts * 0.001 * spd1) + i * 0.37 + j * 0.53) % 1;
        const ph2  = 1 - ((ts * 0.001 * spd2) + i * 0.61 + j * 0.29) % 1;

        for (const ph of [ph1, ph2]) {
          ctx.beginPath();
          ctx.arc(ax + (bx - ax) * ph, ay + (by - ay) * ph, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(ACCENT, 0.5);
          ctx.fill();
        }
      }

      // 滑鼠超級節點連線
      if (mouse.inside) {
        const mx = mouse.x, my = mouse.y;
        const d  = Math.hypot(mx - ax, my - ay);
        if (d < MOUSE_R) {
          const edgeOp = 0.35 * (1 - d / MOUSE_R);

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = rgba(ACCENT, edgeOp);
          ctx.lineWidth   = 1;
          ctx.stroke();

          // 光點流向滑鼠
          const spd = 1.0 + (i % 5) * 0.12;
          const ph  = ((ts * 0.001 * spd) + i * 0.41) % 1;
          ctx.beginPath();
          ctx.arc(ax + (mx - ax) * ph, ay + (my - ay) * ph, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(ACCENT, 0.65);
          ctx.fill();
        }
      }
    }

    // 節點本體
    for (const n of nodes) {
      const x = n.x + n.ox, y = n.y + n.oy;

      // 活躍光圈
      if (n.glowR > 0 && n.glowOp > 0) {
        ctx.beginPath();
        ctx.arc(x, y, n.glowR, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ACCENT, n.glowOp);
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // 節點圓（帶暈光）
      ctx.save();
      ctx.shadowBlur  = 6;
      ctx.shadowColor = rgba(ACCENT, 0.35);
      ctx.beginPath();
      ctx.arc(x, y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, n.baseOp);
      ctx.fill();
      ctx.restore();
    }

    // 滑鼠超級節點
    if (mouse.inside) {
      ctx.save();
      ctx.shadowBlur  = 14;
      ctx.shadowColor = rgba(ACCENT, 0.7);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, 0.6);
      ctx.fill();
      ctx.restore();
    }

    // 二進位字元
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    for (const b of bits) {
      ctx.font      = `${b.size}px 'Courier New', monospace`;
      ctx.fillStyle = rgba(ACCENT, b.opacity);
      ctx.fillText(b.char, b.x, b.y);
    }

    // 脈衝波
    for (const p of pulses) {
      if (p.opacity <= 0) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ACCENT, p.opacity);
      ctx.lineWidth   = 1.5;
      ctx.stroke();
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

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
  });

  // ── 事件監聽 ─────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.inside = false;
    mouse.x = -9999; mouse.y = -9999;
    // 釋放吸引節點
    for (const n of attractedSet) n.attracted = false;
    attractedSet = [];
    stillTimer = 0;
  });

  window.addEventListener('click', e => {
    // 每次只允許一個脈衝（避免連點混亂）
    if (pulses.length >= 1) return;

    pulses.push({ x: e.clientX, y: e.clientY, elapsed: 0, radius: 0, opacity: 0.6 });

    // 排斥範圍內的節點
    for (const n of nodes) {
      const dx = n.x - e.clientX, dy = n.y - e.clientY;
      const d  = Math.hypot(dx, dy);
      if (d < 200 && d > 1) {
        const force = (1 - d / 200) * REPEL_F;
        n.ovx += (dx / d) * force;
        n.ovy += (dy / d) * force;
      }
    }

    // 加速範圍內的二進位字元
    for (const b of bits) {
      if (Math.hypot(b.x - e.clientX, b.y - e.clientY) < 200) {
        b.boosted   = true;
        b.boostLeft = 500;
      }
    }
  });

  window.addEventListener('resize', () => {
    resize();
    buildAll();
  });

  // ── 初始化 ───────────────────────────────────────────────
  resize();
  buildAll();
  requestAnimationFrame(loop);
})();
