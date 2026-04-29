document.addEventListener("DOMContentLoaded", () => {
  const load = (id, path) => {
    fetch(path)
      .then(res => res.text())
      .then(data => {
        document.getElementById(id).innerHTML = data;
      });
  };

  load("header-include", "partials/header.html");
  load("footer-include", "partials/footer.html");

  fetch("partials/cta.html")
    .then(res => res.text())
    .then(data => {
      document.body.insertAdjacentHTML("beforeend", data);

      const ctaFloat = document.getElementById("cta-float");
      const minBtn   = document.getElementById("cta-minimize");
      let minimized  = false;

      function minimize() {
        const offset = ctaFloat.offsetWidth + 24 - 14;
        ctaFloat.style.transform = `translateX(${offset}px)`;
        ctaFloat.classList.add("minimized");
        minimized = true;
      }

      function restore() {
        ctaFloat.style.transform = "translateX(0)";
        ctaFloat.classList.remove("minimized");
        minimized = false;
      }

      minBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        minimize();
      });

      ctaFloat.addEventListener("click", () => {
        if (minimized) restore();
      });
    });
});
