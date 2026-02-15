(function () {
  const wrap = document.getElementById("testimonial-cards");
  if (!wrap) return;

  const cards = Array.from(wrap.querySelectorAll(".testimonial"));
  cards.sort((a, b) => {
    const da = Date.parse(a.getAttribute("data-date") || "");
    const db = Date.parse(b.getAttribute("data-date") || "");
    return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
  });

  for (const c of cards) wrap.appendChild(c);
})();

