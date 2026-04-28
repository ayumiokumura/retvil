window.addEventListener('scroll', () => {
  const trigger = window.innerHeight * 0.3;

  if (window.scrollY > trigger) {
    document.querySelector('.hero-message').classList.add('show');
    document.querySelector('.hero-logo img').classList.add('show');
    document.querySelector('.hero-fade-bg').classList.add('bg-blur');
  }
});
