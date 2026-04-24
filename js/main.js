/* ============================================================
   main.js — 共用 JavaScript
   涵蓋：導覽列捲動效果、漢堡選單、捲動進場動畫、active 標記
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 滑鼠光暈（有 #floatBg 的頁面自帶滑鼠效果，不需光暈） ── */
  if (!document.getElementById('floatBg')) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    let glowTimer;
    window.addEventListener('mousemove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
      glow.style.opacity = '1';
      glow.style.transform = 'translate(-50%, -50%) scale(1)';
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => {
        glow.style.opacity = '0';
        glow.style.transform = 'translate(-50%, -50%) scale(0.3)';
      }, 100);
    }, { passive: true });
  }

  /* ── 捲動進度條 ── */
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* ── 導覽列：捲動加陰影 ── */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  /* ── 漢堡選單切換（行動版） ── */
  const toggle = document.querySelector('.nav__toggle');
  const links  = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    // 點連結後收合選單（含下拉連結）
    links.querySelectorAll('.nav__link, .nav__dropdown-link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        document.querySelectorAll('.nav__item--has-dropdown').forEach(item => item.classList.remove('is-open'));
      });
    });
  }

  /* ── 下拉選單 toggle（行動版） ── */
  document.querySelectorAll('.nav__item--has-dropdown').forEach(item => {
    const caretBtn = item.querySelector('.nav__caret-btn');
    if (caretBtn) {
      caretBtn.addEventListener('click', e => {
        e.stopPropagation();
        item.classList.toggle('is-open');
        caretBtn.setAttribute('aria-expanded', item.classList.contains('is-open'));
      });
    }
  });

  // 點選外部時收合下拉
  document.addEventListener('click', e => {
    document.querySelectorAll('.nav__item--has-dropdown').forEach(item => {
      if (!item.contains(e.target)) item.classList.remove('is-open');
    });
  });

  /* ── 標記目前頁面的 active 連結 ── */
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  // 主選單連結
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // AI 系列頁：讓下拉選單父連結顯示 active
  const aiPages = ['ai.html', 'ai-learning.html', 'ai-stillwaiting.html', 'ai-ecdesign.html'];
  if (aiPages.includes(currentPage)) {
    const aiNavLink = document.querySelector('.nav__item--has-dropdown > .nav__link');
    if (aiNavLink) aiNavLink.classList.add('active');
  }

  // 下拉選單連結
  document.querySelectorAll('.nav__dropdown-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  /* ── 圖片燈箱（點擊開啟，支援縮放 / 平移） ── */
  const workImgs = document.querySelectorAll('.work-img-wrap img');
  if (workImgs.length > 0) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '圖片放大檢視');
    lb.innerHTML = `
      <button class="lightbox__close" aria-label="關閉"><i class="fa-solid fa-xmark"></i></button>
      <img class="lightbox__img" src="" alt="" />
      <p class="lightbox__caption"></p>
      <span class="lightbox__hint">滾輪縮放・雙擊重設・拖曳平移</span>
    `;
    document.body.appendChild(lb);

    const lbImg     = lb.querySelector('.lightbox__img');
    const lbCaption = lb.querySelector('.lightbox__caption');

    // ── 縮放狀態 ──
    let scale = 1, tx = 0, ty = 0;
    let isDragging = false, didDrag = false;
    let dragStartX = 0, dragStartY = 0;
    let pinchDist  = 0;
    let singleTX   = 0, singleTY = 0;
    const MIN_SCALE = 1, MAX_SCALE = 6;

    function applyTransform() {
      lbImg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
      lbImg.style.cursor = scale > 1 ? 'move' : 'zoom-in';
    }

    function resetTransform() {
      scale = 1; tx = 0; ty = 0;
      applyTransform();
    }

    // ── 開啟燈箱 ──
    workImgs.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        const fig = img.closest('figure');
        lbCaption.textContent = fig?.querySelector('figcaption')?.textContent || img.alt || '';
        resetTransform();
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    // ── 關閉燈箱 ──
    const closeLb = () => {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      resetTransform();
    };

    lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
    lb.addEventListener('click', e => { if (e.target === lb && !didDrag) closeLb(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLb();
    });

    // ── 滾輪縮放 ──
    lb.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      if (scale === MIN_SCALE) { tx = 0; ty = 0; }
      applyTransform();
    }, { passive: false });

    // ── 雙擊放大 / 重設 ──
    lbImg.addEventListener('dblclick', e => {
      if (scale > 1) { resetTransform(); }
      else           { scale = 2.5; applyTransform(); }
      e.stopPropagation();
    });

    // ── 滑鼠拖曳平移 ──
    lbImg.addEventListener('mousedown', e => {
      if (scale <= 1) return;
      isDragging = true; didDrag = false;
      dragStartX = e.clientX - tx;
      dragStartY = e.clientY - ty;
      lbImg.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      didDrag = true;
      tx = e.clientX - dragStartX;
      ty = e.clientY - dragStartY;
      applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      setTimeout(() => { didDrag = false; }, 50);
      applyTransform(); // restores move/zoom-in cursor
    });

    // ── 觸控：雙指縮放 + 單指平移 ──
    lb.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1 && scale > 1) {
        singleTX = e.touches[0].clientX - tx;
        singleTY = e.touches[0].clientY - ty;
      }
    }, { passive: true });

    lb.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchDist > 0) {
          scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (d / pinchDist)));
          if (scale === MIN_SCALE) { tx = 0; ty = 0; }
          applyTransform();
        }
        pinchDist = d;
      } else if (e.touches.length === 1 && scale > 1) {
        e.preventDefault();
        tx = e.touches[0].clientX - singleTX;
        ty = e.touches[0].clientY - singleTY;
        applyTransform();
      }
    }, { passive: false });

    lb.addEventListener('touchend', () => { pinchDist = 0; }, { passive: true });
  }

  /* ── 大綱 bar：滾動時標記目前區塊 ── */
  const outlineLinks = document.querySelectorAll('.work-outline__item');
  if (outlineLinks.length > 0) {
    const sections = [...outlineLinks]
      .map(a => document.getElementById(a.getAttribute('href').replace('#', '')))
      .filter(Boolean);

    const syncOutline = () => {
      let current = sections[0]?.id || '';
      sections.forEach(s => {
        if (window.scrollY + 100 >= s.offsetTop) current = s.id;
      });
      outlineLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    };

    window.addEventListener('scroll', syncOutline, { passive: true });
    syncOutline();
  }

  /* ── 捲動進場動畫（IntersectionObserver） ── */
  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // 每個元素依序延遲，產生錯落感
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(el => observer.observe(el));
  }

});
