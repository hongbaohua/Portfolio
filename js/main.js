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

  /* ── 圖片燈箱（點擊開啟，支援切換 / 縮放 / 平移） ── */
  const workImgsArr = Array.from(document.querySelectorAll('.work-img-wrap img'));
  if (workImgsArr.length > 0) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '圖片放大檢視');
    lb.innerHTML = `
      <button class="lightbox__prev" aria-label="上一張"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="lightbox__close" aria-label="關閉"><i class="fa-solid fa-xmark"></i></button>
      <button class="lightbox__next" aria-label="下一張"><i class="fa-solid fa-chevron-right"></i></button>
      <img class="lightbox__img" src="" alt="" />
      <p class="lightbox__caption"></p>
      <span class="lightbox__counter"></span>
      <span class="lightbox__hint">← → 切換・滾輪縮放・點擊放大</span>
    `;
    document.body.appendChild(lb);

    const lbImg     = lb.querySelector('.lightbox__img');
    const lbCaption = lb.querySelector('.lightbox__caption');
    const lbCounter = lb.querySelector('.lightbox__counter');
    const lbPrev    = lb.querySelector('.lightbox__prev');
    const lbNext    = lb.querySelector('.lightbox__next');

    // ── 縮放狀態 ──
    let scale = 1, tx = 0, ty = 0;
    let isDragging = false, didDrag = false;
    let dragStartX = 0, dragStartY = 0;
    let pinchDist = 0, singleTX = 0, singleTY = 0;
    let swipeStartX = 0, swipeStartY = 0, isSwiping = false;
    let currentIdx = 0;
    const MIN_SCALE = 1;
    let MAX_SCALE = 6;
    const hasMultiple = workImgsArr.length > 1;

    function applyTransform() {
      lbImg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
      lbImg.style.cursor = scale > 1 ? 'move' : 'zoom-in';
    }

    function resetTransform() {
      scale = 1; tx = 0; ty = 0;
      applyTransform();
    }

    // ── 切換圖片 ──
    function showImage(idx) {
      currentIdx = (idx + workImgsArr.length) % workImgsArr.length;
      const img = workImgsArr[currentIdx];
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      const fig = img.closest('figure');
      lbCaption.textContent = fig?.querySelector('figcaption')?.textContent || img.alt || '';
      lbCounter.textContent = hasMultiple ? `${currentIdx + 1} / ${workImgsArr.length}` : '';
      // 依圖片長寬比動態調整最大縮放倍率（長圖可放更大）
      const ratio = img.naturalHeight / (img.naturalWidth || 1);
      MAX_SCALE = Math.max(6, Math.round(ratio * 2.5));
      resetTransform();
    }

    // 切換按鈕：單張圖時隱藏
    lbPrev.style.display = hasMultiple ? '' : 'none';
    lbNext.style.display = hasMultiple ? '' : 'none';
    lbCounter.style.display = hasMultiple ? '' : 'none';

    // ── 開啟燈箱 ──
    workImgsArr.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        showImage(i);
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
    lbPrev.addEventListener('click', e => { e.stopPropagation(); showImage(currentIdx - 1); });
    lbNext.addEventListener('click', e => { e.stopPropagation(); showImage(currentIdx + 1); });

    // ── 鍵盤：Esc 關閉，← → 切換 ──
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')      closeLb();
      if (e.key === 'ArrowLeft')   showImage(currentIdx - 1);
      if (e.key === 'ArrowRight')  showImage(currentIdx + 1);
    });

    // ── 滾輪縮放 ──
    lb.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      if (scale === MIN_SCALE) { tx = 0; ty = 0; }
      applyTransform();
    }, { passive: false });

    // ── 單擊放大 / 重設 ──
    lbImg.addEventListener('click', e => {
      if (didDrag) return;
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
      applyTransform();
    });

    // ── 觸控：雙指縮放 + 單指平移（放大時）/ 橫掃切換（縮放=1時） ──
    lb.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        isSwiping = false;
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1) {
        if (scale > 1) {
          singleTX = e.touches[0].clientX - tx;
          singleTY = e.touches[0].clientY - ty;
        } else {
          swipeStartX = e.touches[0].clientX;
          swipeStartY = e.touches[0].clientY;
          isSwiping = true;
        }
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

    lb.addEventListener('touchend', e => {
      // 橫掃切換（僅在未縮放時）
      if (isSwiping && e.changedTouches.length === 1 && scale <= 1) {
        const dx = e.changedTouches[0].clientX - swipeStartX;
        const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY);
        if (Math.abs(dx) > 60 && Math.abs(dx) > dy) {
          dx < 0 ? showImage(currentIdx + 1) : showImage(currentIdx - 1);
        }
        isSwiping = false;
      }
      pinchDist = 0;
    }, { passive: true });
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

  /* ── 橫向滑動列：加導航按鈕 + 滑鼠拖曳 ── */
  document.querySelectorAll('.work-img-scroll').forEach(scroll => {
    // 建立包裝容器，把 reveal 移至 wrapper 讓按鈕一起進場
    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-wrap';
    if (scroll.classList.contains('reveal')) {
      scroll.classList.remove('reveal');
      wrapper.classList.add('reveal');
      if (scroll.dataset.delay) wrapper.dataset.delay = scroll.dataset.delay;
    }
    scroll.parentNode.insertBefore(wrapper, scroll);
    wrapper.appendChild(scroll);

    // 前後按鈕
    const prevBtn = document.createElement('button');
    prevBtn.className = 'scroll-btn scroll-btn--prev';
    prevBtn.setAttribute('aria-label', '向左滑動');
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'scroll-btn scroll-btn--next';
    nextBtn.setAttribute('aria-label', '向右滑動');
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    wrapper.insertBefore(prevBtn, scroll);
    wrapper.appendChild(nextBtn);

    const STEP = 320;

    const syncBtns = () => {
      prevBtn.classList.toggle('is-faded', scroll.scrollLeft <= 0);
      nextBtn.classList.toggle('is-faded',
        scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 1);
    };

    prevBtn.addEventListener('click', () => scroll.scrollBy({ left: -STEP, behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => scroll.scrollBy({ left:  STEP, behavior: 'smooth' }));
    scroll.addEventListener('scroll', syncBtns, { passive: true });
    requestAnimationFrame(syncBtns);

    // 滑鼠拖曳
    let isDown = false, startX = 0, startScrollLeft = 0;

    scroll.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX;
      startScrollLeft = scroll.scrollLeft;
      scroll.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDown) return;
      scroll.scrollLeft = startScrollLeft - (e.pageX - startX);
    });

    document.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      scroll.style.cursor = 'grab';
      syncBtns();
    });
  });

  /* ── 首頁精選作品卡片橫向滑動 ── */
  document.querySelectorAll('.featured-scroll-track--cards').forEach(track => {
    const outer = track.parentElement;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'featured-scroll-btn featured-scroll-btn--prev';
    prevBtn.setAttribute('aria-label', '向左滑動');
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'featured-scroll-btn featured-scroll-btn--next';
    nextBtn.setAttribute('aria-label', '向右滑動');
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    outer.appendChild(prevBtn);
    outer.appendChild(nextBtn);

    const getStep = () => {
      const card = track.querySelector('.work-card');
      return card ? card.offsetWidth + 28 : 400;
    };

    const syncBtns = () => {
      prevBtn.classList.toggle('is-faded', track.scrollLeft <= 0);
      nextBtn.classList.toggle('is-faded',
        track.scrollLeft >= track.scrollWidth - track.clientWidth - 1);
    };

    prevBtn.addEventListener('click', () => track.scrollBy({ left: -getStep(), behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => track.scrollBy({ left:  getStep(), behavior: 'smooth' }));
    track.addEventListener('scroll', syncBtns, { passive: true });
    requestAnimationFrame(syncBtns);

    let isDown = false, startX = 0, startScrollLeft = 0;
    track.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX;
      startScrollLeft = track.scrollLeft;
      track.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!isDown) return;
      track.scrollLeft = startScrollLeft - (e.pageX - startX);
    });
    document.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      track.style.cursor = 'grab';
      syncBtns();
    });
  });

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
