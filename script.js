/* GelByNoa Academy — interactions. Restrained by design. */
(function () {
  "use strict";

  /* Header: transparent over hero → solid on scroll.
     Interior pages have no dark hero — they render solid from the top. */
  var header = document.getElementById("header");
  var hero = document.querySelector(".hero");
  if (header && hero) {
    var onScroll = function () {
      if (window.scrollY > window.innerHeight * 0.72) header.classList.add("is-solid");
      else header.classList.remove("is-solid");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Mobile nav — built from the header links so every page inherits it */
  var burger = document.querySelector(".header__burger");
  var navSource = document.querySelector(".header__nav");
  if (burger && navSource) {
    // Full-screen backdrop; the actual menu is a right-side drawer inside it.
    var panel = document.createElement("div");
    panel.className = "mobile-nav";
    var drawer = document.createElement("nav");
    drawer.className = "mnav__drawer";
    drawer.setAttribute("aria-label", "תפריט נייד");
    // Drawer header: close (X) on the right, brand centered, globe on the left.
    var head = document.createElement("div");
    head.className = "mnav__head";
    var closeBtn = document.createElement("button");
    closeBtn.className = "mnav__close";
    closeBtn.setAttribute("aria-label", "סגירה");
    closeBtn.innerHTML = "<span></span><span></span>";
    head.appendChild(closeBtn);
    var brandSrc = document.querySelector(".header__brand");
    if (brandSrc) head.appendChild(brandSrc.cloneNode(true));
    drawer.appendChild(head);
    // Structured drawer: a right-aligned nav group, then a contact group.
    var links = document.createElement("div");
    links.className = "mnav__links";
    links.innerHTML = navSource.innerHTML;
    var navLabel = document.createElement("span");
    navLabel.className = "mnav__label eyebrow";
    navLabel.textContent = "ניווט";
    drawer.appendChild(navLabel);
    drawer.appendChild(links);
    // The CTA now lives outside the nav — clone it into a contact group.
    var headerCta = document.querySelector(".header > .header__cta");
    if (headerCta) {
      var contact = document.createElement("div");
      contact.className = "mnav__contact";
      contact.appendChild(headerCta.cloneNode(true));
      drawer.appendChild(contact);
    }
    panel.appendChild(drawer);
    document.body.appendChild(panel);
    var toggle = function (open) {
      var willOpen = open !== undefined ? open : !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", willOpen);
      burger.classList.toggle("is-open", willOpen);
      document.body.style.overflow = willOpen ? "hidden" : "";
    };
    burger.addEventListener("click", function () { toggle(); });
    closeBtn.addEventListener("click", function () { toggle(false); });
    // Close on link tap, or when the dark area outside the drawer is tapped.
    panel.addEventListener("click", function (e) {
      if (e.target === panel || e.target.tagName === "A") toggle(false);
    });
  }

  /* CTA links on mobile — sweep the underline (like the desktop hover) on tap,
     then follow the link. Plain same-tab navigations only. */
  var isMobile = window.matchMedia("(max-width: 640px)");
  // Reset sweep state on back/forward (bfcache) so the line returns to text width.
  window.addEventListener("pageshow", function () {
    [].slice.call(document.querySelectorAll("a.link-underline.is-sweep")).forEach(function (a) {
      a.classList.remove("is-sweep");
      delete a.dataset.swept;
    });
  });
  [].slice.call(document.querySelectorAll("a.link-underline")).forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!isMobile.matches || a.dataset.swept || e.metaKey || e.ctrlKey || a.target === "_blank") return;
      e.preventDefault();
      a.dataset.swept = "1";
      a.classList.add("is-sweep");
      setTimeout(function () { window.location.href = a.href; }, 700);
    });
  });

  /* Courses — centered circular carousel on mobile (infinite loop, RTL, scaled
     side cards, minimal dots). Desktop keeps the plain 3-up grid untouched. */
  var cGrid = document.querySelector(".courses__grid--three");
  if (cGrid) {
    var cReals = [].slice.call(cGrid.querySelectorAll(".course-card"));
    var N = cReals.length;
    if (N > 1) {
      var cMq = window.matchMedia("(max-width: 640px)");
      // Dots (one per real course)
      var dots = document.createElement("div");
      dots.className = "courses__dots";
      var dotEls = [];
      for (var di = 0; di < N; di++) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "מעבר לכרטיס " + (di + 1));
        (function (idx) {
          b.addEventListener("click", function () { goToReal(idx); });
        })(di);
        dots.appendChild(b);
        dotEls.push(b);
      }
      cGrid.parentNode.insertBefore(dots, cGrid.nextSibling);

      var built = false, allCards = [], rafPending = false, jumping = false;

      var centeredIndex = function () {
        var cc = cGrid.getBoundingClientRect();
        var center = cc.left + cc.width / 2;
        var best = 0, bestD = Infinity;
        for (var i = 0; i < allCards.length; i++) {
          var r = allCards[i].getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - center);
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      };
      var centerOn = function (i, smooth) {
        var card = allCards[i];
        if (!card) return;
        var target = card.offsetLeft - (cGrid.clientWidth - card.offsetWidth) / 2;
        cGrid.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
      };
      var render = function () {
        rafPending = false;
        var c = centeredIndex();
        for (var i = 0; i < allCards.length; i++) allCards[i].classList.toggle("is-center", i === c);
        var real = ((c % N) + N) % N;
        for (var d = 0; d < dotEls.length; d++) dotEls[d].classList.toggle("is-active", d === real);
        // Infinite loop: keep the centered card within the middle set
        if (!jumping) {
          if (c < N) { jumping = true; centerOn(c + N, false); requestAnimationFrame(function () { jumping = false; }); }
          else if (c >= 2 * N) { jumping = true; centerOn(c - N, false); requestAnimationFrame(function () { jumping = false; }); }
        }
      };
      var onScroll = function () { if (!rafPending) { rafPending = true; requestAnimationFrame(render); } };
      var goToReal = function (idx) {
        if (!built) { cReals[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); return; }
        // jump to the nearest instance of this real index, in the middle set
        centerOn(N + idx, true);
      };

      var build = function () {
        if (built) return;
        var before = cReals.map(function (c) { return c.cloneNode(true); });
        var after = cReals.map(function (c) { return c.cloneNode(true); });
        before.forEach(function (c) { c.classList.add("is-clone"); cGrid.insertBefore(c, cReals[0]); });
        after.forEach(function (c) { c.classList.add("is-clone"); cGrid.appendChild(c); });
        allCards = [].slice.call(cGrid.querySelectorAll(".course-card"));
        built = true;
        cGrid.addEventListener("scroll", onScroll, { passive: true });
        centerOn(N, false); // start on first real
        render();
      };
      var teardown = function () {
        if (!built) return;
        cGrid.removeEventListener("scroll", onScroll);
        [].slice.call(cGrid.querySelectorAll(".course-card.is-clone")).forEach(function (c) { c.parentNode.removeChild(c); });
        cReals.forEach(function (c) { c.classList.remove("is-center"); });
        allCards = [];
        built = false;
      };
      var sync = function () { if (cMq.matches) build(); else teardown(); };
      (cMq.addEventListener ? cMq.addEventListener("change", sync) : cMq.addListener(sync));
      sync();
    }
  }

  /* Scroll reveal — fade + rise, once.
     IntersectionObserver drives it; a scroll/resize fallback guarantees
     nothing is ever left invisible (covers programmatic scroll & odd renderers). */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));

  if (reduce) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var reveal = function (el) { el.classList.add("is-in"); };
    var check = function () {
      var vh = window.innerHeight;
      for (var i = reveals.length - 1; i >= 0; i--) {
        var el = reveals[i];
        var top = el.getBoundingClientRect().top;
        if (top < vh * 0.92) { reveal(el); reveals.splice(i, 1); }
      }
    };

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            reveal(e.target);
            io.unobserve(e.target);
            var idx = reveals.indexOf(e.target);
            if (idx > -1) reveals.splice(idx, 1);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    window.addEventListener("hashchange", function () { requestAnimationFrame(check); });
    window.addEventListener("load", function () { requestAnimationFrame(check); });
    check();
    // Failsafe: never leave content hidden if no scroll ever occurs.
    setTimeout(function () { reveals.slice().forEach(reveal); }, 2600);
  }

  /* Hero video — force playback across strict autoplay policies (Low Power Mode, etc.).
     Muted autoplay is usually allowed, but when it's blocked we start on first interaction. */
  var heroVideo = document.querySelector(".hero__video");
  if (heroVideo) {
    var tryPlay = function () {
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    };
    heroVideo.addEventListener("loadeddata", tryPlay);
    if (heroVideo.readyState >= 2) tryPlay();
    heroVideo.load();
    var kick = function () {
      tryPlay();
      ["pointerdown", "touchstart", "scroll", "keydown"].forEach(function (ev) {
        window.removeEventListener(ev, kick);
      });
    };
    ["pointerdown", "touchstart", "scroll", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, kick, { passive: true });
    });
  }

  /* Contact form — validates required fields with inline messages (only after a
     submit attempt), then sends the lead by email via Formspree. */
  var form = document.getElementById("contactForm");
  if (form) {
    var FORMSPREE_ENDPOINT = "https://formspree.io/f/xyeyegjp"; // emails leads to noadav@windowslive.com
    var REQUIRED = ["name", "phone", "email", "course"];
    var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
    var setError = function (id, msg) {
      var el = form.querySelector("#" + id); if (!el) return;
      var field = el.closest(".field"); if (!field) return;
      if (msg) {
        field.classList.add("is-error");
        var s = field.querySelector(".field__req");
        if (!s) { s = document.createElement("span"); s.className = "field__req"; field.appendChild(s); }
        s.textContent = "✱ " + msg;
      } else {
        field.classList.remove("is-error");
      }
    };
    // clear a field's error the moment it's filled / changed
    REQUIRED.forEach(function (id) {
      var el = form.querySelector("#" + id); if (!el) return;
      var clear = function () { if (el.value && el.value.trim()) setError(id, ""); };
      el.addEventListener("input", clear);
      el.addEventListener("change", clear);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("formNote");
      var btn = form.querySelector('button[type="submit"]');

      // validate required fields — mark the empty/invalid ones
      var firstBad = null;
      REQUIRED.forEach(function (id) {
        var el = form.querySelector("#" + id);
        var v = (el && el.value) ? el.value.trim() : "";
        var msg = "";
        if (!v) msg = "שדה חובה";
        else if (id === "email" && !emailOk(v)) msg = "אימייל לא תקין";
        setError(id, msg);
        if (msg && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      var fail = function () {
        if (note) { note.hidden = false; note.textContent = "אופס — משהו השתבש בשליחה. אפשר גם דרך כפתור הוואטסאפ בפינה 🤍"; }
        if (btn) { btn.disabled = false; btn.textContent = "לשליחת הפנייה"; }
      };
      var done = function () {
        if (note) { note.hidden = false; note.innerHTML = "תודה! הטופס נשלח. יכולה גם להשאיר הודעה בוואטסאפ בכפתור שמטה<br>אחזור אלייך אישית בקרוב."; }
        if (btn) btn.textContent = "נשלח ✓";
        form.reset();
      };
      if (btn) { btn.disabled = true; btn.textContent = "שולח…"; }
      if (!FORMSPREE_ENDPOINT) { done(); return; }
      fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { "Accept": "application/json" }, body: new FormData(form) })
        .then(function (r) { if (r.ok) done(); else fail(); })
        .catch(fail);
    });
  }

  /* Subtle hero parallax */
  var heroBg = document.querySelector(".hero__bg");
  if (heroBg && !reduce) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (y < window.innerHeight) heroBg.style.transform = "translateY(" + y * 0.18 + "px)";
    }, { passive: true });
  }

  /* Years of experience — counts up automatically each calendar year (since 2018) */
  var expEls = document.querySelectorAll("[data-experience-since]");
  for (var e = 0; e < expEls.length; e++) {
    var since = parseInt(expEls[e].getAttribute("data-experience-since"), 10);
    if (since) expEls[e].textContent = new Date().getFullYear() - since;
  }

  /* Count-up — numeric fact figures animate from 0 when scrolled into view */
  var figures = [].slice.call(document.querySelectorAll(".fact__num"));
  figures.forEach(function (el) {
    var raw = (el.textContent || "").trim();
    if (!/^\d+$/.test(raw)) return; // skip non-numeric values ("תל אביב", "∞")
    var target = parseInt(raw, 10);
    if (reduce) { el.textContent = target; return; }
    var run = function () {
      var dur = 1400, start = null;
      var step = function (t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { run(); io2.disconnect(); }
        });
      }, { threshold: 0.4 });
      io2.observe(el);
    } else { run(); }
  });

  /* Anchor landing — when arriving with a #hash (e.g. index.html#courses), the hero
     video and images above load after the initial jump and shift the layout, leaving
     the viewport on the wrong section. Re-scroll to the target once everything settles.
     scroll-padding-top (CSS) keeps the section heading clear of the fixed header. */
  if (window.location.hash.length > 1) {
    var landOnHash = function () {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) target.scrollIntoView();
    };
    window.addEventListener("load", function () { setTimeout(landOnHash, 80); });
  }
})();

/* Language switcher — Google website translation (automatic) */
(function () {
  "use strict";
  var wraps = [].slice.call(document.querySelectorAll(".header__lang"));
  if (!wraps.length) return;

  // Inject the (hidden) Google Translate element + script; we drive it via cookie.
  if (!document.getElementById("google_translate_element")) {
    var gt = document.createElement("div");
    gt.id = "google_translate_element";
    document.body.appendChild(gt);
    window.googleTranslateElementInit = function () {
      /* global google */
      new google.translate.TranslateElement(
        { pageLanguage: "iw", includedLanguages: "en,iw", autoDisplay: false },
        "google_translate_element"
      );
    };
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(s);
  }

  function setCookie(v) {
    document.cookie = "googtrans=" + v + ";path=/";
    try {
      var h = location.hostname.replace(/^www\./, "");
      if (h) document.cookie = "googtrans=" + v + ";path=/;domain=." + h;
    } catch (e) {}
  }
  function clearCookie() {
    document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    try {
      var h = location.hostname.replace(/^www\./, "");
      if (h) document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=." + h;
    } catch (e) {}
  }
  function goLang(lang) {
    if (lang === "en") setCookie("/iw/en");
    else clearCookie();
    location.reload();
  }

  var cur = (document.cookie.match(/googtrans=([^;]+)/) || [])[1] || "";
  var isEn = cur.indexOf("/en") > -1;
  document.addEventListener("click", function () {
    wraps.forEach(function (w) { w.classList.remove("is-open"); });
  });
  wraps.forEach(function (wrap) {
    var t = wrap.querySelector(".header__lang-toggle");
    if (t) t.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = wrap.classList.contains("is-open");
      wraps.forEach(function (w) { w.classList.remove("is-open"); });
      wrap.classList.toggle("is-open", !open);
    });
    [].slice.call(wrap.querySelectorAll("[data-lang]")).forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); goLang(b.getAttribute("data-lang")); });
    });
    var active = wrap.querySelector('[data-lang="' + (isEn ? "en" : "he") + '"]');
    if (active) active.classList.add("is-active");
  });
})();
