(function () {
  // ── Overlay ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';
  overlay.innerHTML =
    '<button id="lb-close" aria-label="閉じる">&times;</button>' +
    '<button id="lb-prev"  aria-label="前へ">&#8249;</button>' +
    '<img    id="lb-img"   alt="">' +
    '<button id="lb-next"  aria-label="次へ">&#8250;</button>';
  document.body.appendChild(overlay);

  const lbImg  = document.getElementById('lb-img');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');

  let group = [];
  let idx   = 0;

  // ── Helpers ──────────────────────────────────────────────
  function isLightboxable(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (img.closest('.hero-logo'))   return false;  // ロゴ
    if (img.classList.contains('owner-avatar')) return false;  // オーナー顔写真
    if (img.closest('#admin-main'))  return false;  // 管理画面
    return true;
  }

  function getGroup(img) {
    const container = img.closest('.facility-photo-row, .carousel, .photo-section');
    if (!container) return [img];
    return Array.from(container.querySelectorAll('img')).filter(isLightboxable);
  }

  // ── Open / Close / Navigate ──────────────────────────────
  function open(img) {
    group = getGroup(img);
    idx   = group.indexOf(img);
    if (idx < 0) idx = 0;
    render();
    overlay.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('lb-open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function render() {
    const src = group[idx];
    lbImg.src = src.src;
    lbImg.alt = src.alt || '';
    const multi = group.length > 1;
    lbPrev.style.display = multi ? '' : 'none';
    lbNext.style.display = multi ? '' : 'none';
  }

  function prev() { idx = (idx - 1 + group.length) % group.length; render(); }
  function next() { idx = (idx + 1)                % group.length; render(); }

  // ── Events ───────────────────────────────────────────────
  document.addEventListener('click', e => {
    const img = e.target.closest('img');
    if (img && isLightboxable(img)) { open(img); return; }
    if (e.target === overlay)        close();
  });

  document.getElementById('lb-close').addEventListener('click', close);
  lbPrev.addEventListener('click', e => { e.stopPropagation(); prev(); });
  lbNext.addEventListener('click', e => { e.stopPropagation(); next(); });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('lb-open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   prev();
    if (e.key === 'ArrowRight')  next();
  });

  // ── Touch swipe ──────────────────────────────────────────
  let touchStartX = 0;
  overlay.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  });
})();
