document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".carousel").forEach(carousel => {
    const items = Array.from(carousel.querySelectorAll(".carousel-item"));
    const n = items.length;
    let cur = 0;

    function update() {
      items.forEach((item, i) => {
        item.classList.remove("active", "prev", "next");
        const diff = ((i - cur) % n + n) % n;
        if (diff === 0)     item.classList.add("active");
        else if (diff === 1) item.classList.add("next");
        else if (diff === n - 1) item.classList.add("prev");
      });
    }

    carousel.querySelector(".carousel-btn.prev").addEventListener("click", () => {
      cur = (cur - 1 + n) % n;
      update();
    });

    carousel.querySelector(".carousel-btn.next").addEventListener("click", () => {
      cur = (cur + 1) % n;
      update();
    });

    // サイドの写真をクリックして移動
    items.forEach(item => {
      item.addEventListener("click", () => {
        if (item.classList.contains("prev")) {
          cur = (cur - 1 + n) % n;
          update();
        } else if (item.classList.contains("next")) {
          cur = (cur + 1) % n;
          update();
        }
      });
    });

    update();
  });
});
