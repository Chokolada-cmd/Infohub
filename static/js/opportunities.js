/* eKasi — opportunity feed */

(function () {
  "use strict";

  var list     = document.getElementById("oppList");
  var emptyMsg = document.getElementById("emptyMsg");

  var fProvince = document.getElementById("fProvince");
  var fType     = document.getElementById("fType");
  var fYouth    = document.getElementById("fYouth");

  [fProvince, fType, fYouth].forEach(function (el) {
    el.addEventListener("change", load);
  });

  function load() {
    list.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    emptyMsg.hidden = true;

    var params = new URLSearchParams({
      province: fProvince.value,
      type:     fType.value,
      youth:    fYouth.checked ? "1" : "",
    });

    fetch("/api/opportunities?" + params)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.length) {
          list.innerHTML = "";
          emptyMsg.hidden = false;
          return;
        }

        list.innerHTML = data.map(renderCard).join("");
      })
      .catch(function () {
        list.innerHTML =
          '<p class="muted center">Could not load opportunities. Check your connection.</p>';
      });
  }

  function renderCard(o) {
    var youth = o.youth_setaside ? " youth" : "";
    var youthTag = o.youth_setaside
      ? '<span class="tag amber">Youth set-aside</span>'
      : "";

    return (
      '<article class="opp' + youth + '">' +
        "<h3>" + esc(o.title) + "</h3>" +
        '<div class="meta">' +
          '<span class="tag">' + esc(o.type) + "</span>" +
          youthTag +
          "<span>" + esc(o.province || "National") + "</span>" +
          "<span>Closes " + esc(o.closing_date || "open") + "</span>" +
        "</div>" +
        '<p class="provider">' +
          esc(o.provider || "") +
          (o.sector ? " &middot; " + esc(o.sector) : "") +
        "</p>" +
        '<div class="cta-row">' +
          '<a class="btn btn-primary" href="' + esc(o.link) +
          '" target="_blank" rel="noopener">Apply</a>' +
        "</div>" +
      "</article>"
    );
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  load();
})();