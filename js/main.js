document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.target;

    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.remove('active');
    });

    document.getElementById(target).classList.add('active');

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
