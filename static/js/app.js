/* eKasi — shared interface behaviour */

(function () {
  "use strict";

  // Drawer
  var menuBtn = document.getElementById("menuBtn");
  var drawer = document.getElementById("drawer");
  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", function () {
      drawer.classList.toggle("open");
    });
  }

  // Stats
  var statTotal = document.getElementById("statTotal");
  if (statTotal) {
    fetch("/api/stats")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        statTotal.textContent = d.total;
        document.getElementById("statTenders").textContent = d.tenders;
        document.getElementById("statYouth").textContent = d.youth;
      })
      .catch(function () {
        statTotal.textContent = "—";
      });
  }
})();