(function () {
  const shell = document.getElementById("reviews-shell");
  const btn = document.getElementById("toggle-reviews");
  if (!shell || !btn) return;

  function setCollapsed(collapsed) {
    shell.classList.toggle("is-collapsed", collapsed);
    btn.textContent = collapsed ? "Show more reviews" : "Show fewer reviews";
  }

  btn.addEventListener("click", () => {
    const collapsed = shell.classList.contains("is-collapsed");
    setCollapsed(!collapsed);
  });

  setCollapsed(true);
})();

