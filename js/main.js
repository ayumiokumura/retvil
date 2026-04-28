// スムーズスクロール
document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    const top = target.offsetTop - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// フェードイン
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    }
  });
});

document.querySelectorAll('.fade').forEach(el => observer.observe(el));
