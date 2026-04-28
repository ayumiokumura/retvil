// スクロールで一言とロゴを表示
window.addEventListener('scroll', () => {
  const trigger = window.innerHeight * 0.3;

  if (window.scrollY > trigger) {
    document.querySelector('.hero-message').classList.add('show');
    document.querySelector('.hero-logo img').classList.add('show');
    document.querySelector('.hero-fade-bg').classList.add('bg-blur');
  }
});

// スムーズスクロール（前のまま）
document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    const top = target.offsetTop - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
