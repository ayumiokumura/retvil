// ── i18n ────────────────────────────────────────────────
window.rvLang = localStorage.getItem('rv-lang') || 'ja';

window.applyLang = function (lang) {
  window.rvLang = lang;
  localStorage.setItem('rv-lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-ja], [data-en]').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (val !== null) el.textContent = val;
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
};

// ── partials ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Apply lang to page-level content first
  window.applyLang(window.rvLang);

  const load = (id, path, callback) => {
    fetch(path)
      .then(res => res.text())
      .then(data => {
        document.getElementById(id).innerHTML = data;
        window.applyLang(window.rvLang);
        if (callback) callback();
      });
  };

  load("header-include", "partials/header.html", () => {
    initHamburger();
    initLangButtons();
  });

  function initHamburger() {
    const btn = document.getElementById("hamburger-btn");
    const nav = document.getElementById("mobile-nav");
    if (!btn || !nav) {
      setTimeout(initHamburger, 30);
      return;
    }

    function openNav() {
      nav.classList.add("open");
      btn.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      nav.style.maxHeight = nav.scrollHeight + "px";
    }

    function closeNav() {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      nav.style.maxHeight = "0";
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.contains("open") ? closeNav() : openNav();
    });

    nav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => closeNav());
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#header-include") && nav.classList.contains("open")) {
        closeNav();
      }
    });
  }

  function initLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => window.applyLang(btn.dataset.lang));
    });
    // Reflect current lang on buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === window.rvLang);
    });
  }

  load("footer-include", "partials/footer.html");

  fetch("partials/cta.html")
    .then(res => res.text())
    .then(data => {
      document.body.insertAdjacentHTML("beforeend", data);
      window.applyLang(window.rvLang);

      const ctaFloat = document.getElementById("cta-float");
      const minBtn   = document.getElementById("cta-minimize");
      let minimized  = false;

      function minimize() {
        const offset = ctaFloat.offsetWidth + 24 - 68;
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
