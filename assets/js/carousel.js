document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".carousel").forEach(carousel => {
    const items = Array.from(carousel.querySelectorAll(".carousel-item"));
    const n = items.length;
    let cur = 0;

    // ドット生成
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel-dots";
    const dots = Array.from({ length: n }, () => {
      const dot = document.createElement("span");
      dot.className = "carousel-dot";
      dotsWrap.appendChild(dot);
      return dot;
    });
    carousel.insertAdjacentElement("afterend", dotsWrap);

    function update() {
      items.forEach((item, i) => {
        item.classList.remove("active", "prev", "next");
        const diff = ((i - cur) % n + n) % n;
        if (diff === 0)          item.classList.add("active");
        else if (diff === 1)     item.classList.add("next");
        else if (diff === n - 1) item.classList.add("prev");
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === cur);
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

    // ドットクリックで直接移動
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        cur = i;
        update();
      });
    });

    update();
  });
});
