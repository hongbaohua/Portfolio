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

  /* ── 圖片燈箱（點擊放大，動態建立） ── */
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
    `;
    document.body.appendChild(lb);

    const lbImg     = lb.querySelector('.lightbox__img');
    const lbCaption = lb.querySelector('.lightbox__caption');

    workImgs.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        // 嘗試抓同層 figcaption，否則用 alt
        const fig = img.closest('figure');
        lbCaption.textContent = fig?.querySelector('figcaption')?.textContent || img.alt || '';
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLb = () => {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    };

    lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLb();
    });
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
