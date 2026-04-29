document.addEventListener("DOMContentLoaded", () => {
  const load = (id, path, callback) => {
    fetch(path)
      .then(res => res.text())
      .then(data => {
        document.getElementById(id).innerHTML = data;
        if (callback) callback();
      });
  };

  load("header-include", "partials/header.html", () => {
    initHamburger();
  });

  function initHamburger() {
    const btn = document.getElementById("hamburger-btn");
    const nav = document.getElementById("mobile-nav");
    if (!btn || !nav) {
      setTimeout(initHamburger, 30);
      return;
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = nav.classList.toggle("open");
      btn.classList.toggle("open", isOpen);
      btn.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#header-include") && nav.classList.contains("open")) {
        nav.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

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
