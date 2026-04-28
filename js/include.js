document.addEventListener("DOMContentLoaded", () => {
  const headerContainer = document.getElementById("header-include");

  fetch("common/header.html")
    .then(res => res.text())
    .then(data => {
      headerContainer.innerHTML = data;
    });
});
