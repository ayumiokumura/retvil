document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".feature-card").forEach(card => {
    const header = card.querySelector(".feature-header");

    const chevron = document.createElement("span");
    chevron.className = "feature-chevron";
    header.appendChild(chevron);

    header.addEventListener("click", () => {
      card.classList.toggle("open");
    });
  });
});
