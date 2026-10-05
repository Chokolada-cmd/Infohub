/* =========================================================
   SISONKE — shared behaviour
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. Sticky nav ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 2. Mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    links.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- 3. Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("is-in"));
  }

  /* ---------- 4. Animated counters ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const formatNumber = (n, opts = {}) => {
    if (opts.short && n >= 1_000_000)
      return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (opts.short && n >= 1_000)
      return (n / 1_000).toFixed(0) + "K";
    return Math.round(n).toLocaleString("en-ZA");
  };
  const runCounter = el => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const short  = el.dataset.short === "true";
    const dur = 1600;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + formatNumber(target * eased, { short }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + formatNumber(target, { short }) + suffix;
    };
    requestAnimationFrame(tick);
  };
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            runCounter(e.target);
            cio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(c => cio.observe(c));
  }

  /* ---------- 5. Testimonial rotator (home) ---------- */
  const quotes = document.querySelectorAll("#quotes .quote");
  const dotsBox = document.getElementById("quoteDots");
  if (quotes.length && dotsBox) {
    let idx = 0;
    quotes.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Testimonial " + (i + 1));
      if (i === 0) b.classList.add("is-active");
      b.addEventListener("click", () => show(i));
      dotsBox.appendChild(b);
    });
    const dots = dotsBox.querySelectorAll("button");
    const show = i => {
      quotes.forEach((q, k) => q.classList.toggle("is-active", k === i));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
      idx = i;
    };
    show(0);
    let timer = setInterval(() => show((idx + 1) % quotes.length), 6500);
    dotsBox.addEventListener("click", () => {
      clearInterval(timer);
      timer = setInterval(() => show((idx + 1) % quotes.length), 6500);
    });
  }

  /* ---------- 6. Gallery filters (experiences page) ---------- */
  const filterBtns = document.querySelectorAll(".filter");
  const xpCards = document.querySelectorAll(".gallery .xp");
  if (filterBtns.length && xpCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        filterBtns.forEach(b => b.classList.toggle("is-active", b === btn));
        xpCards.forEach(card => {
          const tags = (card.dataset.tags || "").split(",");
          const match = f === "all" || tags.includes(f);
          card.classList.toggle("is-hidden", !match);
        });
      });
    });
  }

  /* ---------- 7. Signup form ---------- */
  const form = document.getElementById("signupForm");
  if (form) {
    /* chips (circle type) */
    const chips = form.querySelectorAll(".chip");
    chips.forEach(c => {
      c.addEventListener("click", () => {
        chips.forEach(x => x.classList.toggle("is-active", x === c));
      });
    });

    /* contribution slider */
    const slider  = document.getElementById("contribution");
    const valEl   = document.getElementById("contributionVal");
    const months  = 12;
    const people  = 8;
    const totalEl = document.getElementById("poolTotal");
    const monthEl = document.getElementById("poolMonthly");
    const tripEl  = document.getElementById("tripsPerYear");

    const update = () => {
      if (!slider) return;
      const amt = parseInt(slider.value, 10);
      const monthly = amt * people;
      const total   = monthly * months;

      if (valEl)   valEl.innerHTML = "R" + amt.toLocaleString("en-ZA") + " <small>/ month</small>";
      if (monthEl) monthEl.textContent = "R" + monthly.toLocaleString("en-ZA");
      if (totalEl) totalEl.textContent = "R" + total.toLocaleString("en-ZA");

      if (tripEl) {
        const trips = total >= 120000 ? "3" : total >= 70000 ? "2" : "1";
        tripEl.textContent = trips + " trip" + (trips === "1" ? "" : "s");
      }
    };
    if (slider) {
      slider.addEventListener("input", update);
      update();
    }

    /* submit */
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const card = form.closest(".form-card");
      const success = document.getElementById("signupSuccess");
      if (card && success) {
        form.style.display = "none";
        success.classList.add("is-visible");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  /* ---------- 8. Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();