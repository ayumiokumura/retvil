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
      document.getElementById("cta-close").addEventListener("click", () => {
        document.getElementById("cta-float").remove();
      });
    });
});
