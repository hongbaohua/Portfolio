/* ============================================================
   works.js — 設計作品頁 JavaScript
   涵蓋：分類篩選邏輯、卡片顯示/隱藏動畫、無結果提示
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 篩選按鈕與作品卡片 ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const workCards  = document.querySelectorAll('.work-card');
  const emptyMsg   = document.querySelector('.works-empty');

  /* 當前篩選分類（預設「全部」） */
  let activeFilter = 'all';

  /* ── 執行篩選 ── */
  function applyFilter(category) {
    activeFilter = category;
    let visibleCount = 0;

    workCards.forEach(card => {
      // 每張卡片用 data-categories 存放所屬分類（逗號分隔）
      const cats = card.dataset.categories.split(',');
      const match = category === 'all' || cats.includes(category);

      if (match) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    // 顯示/隱藏無結果提示
    if (emptyMsg) {
      emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  /* ── 篩選按鈕點擊事件 ── */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 更新 active 樣式
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 套用篩選
      applyFilter(btn.dataset.filter);
    });
  });

  /* ── 初始顯示（預設全部） ── */
  applyFilter('all');

});
