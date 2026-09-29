/* Zenith 2.0 — interactions. Tout est un plus : sans JavaScript, ou avec « réduire les animations »,
   la page reste complète, lisible et navigable. Aucune dépendance, aucun traqueur. */
(() => {
  "use strict";
  const doc = document;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => mq.matches;

  // Mémorise le choix de langue (utilisé par la page racine).
  $$("[data-lang-switch]").forEach((a) =>
    a.addEventListener("click", () => {
      try { localStorage.setItem("zenith-lang", a.dataset.langSwitch); } catch (_) {}
    })
  );
  try { localStorage.setItem("zenith-lang", doc.documentElement.lang); } catch (_) {}

  // En-tête : fond translucide dès que l'on quitte le haut de page.
  const header = $("[data-header]");
  const setHeader = () => header && header.classList.toggle("is-solid", window.scrollY > 24);

  // Révélations progressives.
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced()) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // Récit : l'écran affiché suit l'étape lue.
  const story = $("[data-story]");
  if (story && "IntersectionObserver" in window) {
    const shots = $$("[data-shot]", story);
    const count = $("[data-count]", story);
    const steps = $$("[data-step]", story);
    const show = (i) => {
      shots.forEach((s, k) => s.classList.toggle("is-active", k === i));
      if (count) count.textContent = String(i + 1).padStart(2, "0");
    };
    const so = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) show(Number(e.target.dataset.step)); }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => so.observe(s));
  }

  // Navigation : lien de la section courante.
  const links = $$(".nav a");
  if (links.length && "IntersectionObserver" in window) {
    const map = new Map();
    links.forEach((a) => {
      const t = $(a.getAttribute("href"));
      if (t) map.set(t, a);
    });
    // Les étapes du récit pointent vers « La séance » (#seance) ; « en-seance » et « rythme » comptent aussi.
    const alias = { "en-seance": "seance", modes: "seance" };
    const no = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = alias[e.target.id] || e.target.id;
        links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + id)));
      }),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    map.forEach((_, t) => no.observe(t));
    ["#en-seance", "#modes"].forEach((q) => { const t = $(q); if (t) no.observe(t); });
  }

  // Manifeste : les mots s'éclairent au fil du défilement.
  const manifesto = $("[data-manifesto]");
  const mWords = manifesto ? $$(".w", manifesto) : [];
  const setManifesto = () => {
    if (!manifesto) return;
    if (reduced()) { mWords.forEach((w) => w.classList.add("lit")); return; }
    const r = manifesto.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (vh * 0.55 + r.height * 0.4)));
    const n = Math.round(p * mWords.length);
    mWords.forEach((w, i) => w.classList.toggle("lit", i < n));
  };

  // Parallaxe très légère (hero) — désactivée si les mouvements sont réduits.
  const para = $$("[data-parallax]");
  const setParallax = () => {
    const y = window.scrollY;
    para.forEach((el) => {
      const f = Number(el.dataset.parallax) || 0;
      el.style.setProperty("--py", reduced() || y > window.innerHeight * 1.2 ? 0 : (y * f).toFixed(1));
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { setHeader(); setManifesto(); setParallax(); ticking = false; });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  mq.addEventListener && mq.addEventListener("change", onScroll);
  onScroll();

  // Comparaison clair / sombre : curseur natif (clavier + tactile), balayage d'invitation une fois.
  const cmp = $("[data-compare]");
  if (cmp) {
    const range = $("input", cmp);
    const set = (v) => {
      cmp.style.setProperty("--pos", v + "%");
      range.setAttribute("aria-valuetext", `${Math.round(100 - v)} % ${range.dataset.light} · ${Math.round(v)} % ${range.dataset.dark}`);
    };
    range.addEventListener("input", () => set(Number(range.value)));
    set(50);
    if (!reduced() && "IntersectionObserver" in window) {
      let touched = false;
      range.addEventListener("pointerdown", () => { touched = true; }, { once: true });
      range.addEventListener("keydown", () => { touched = true; }, { once: true });
      const co = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        co.disconnect();
        const t0 = performance.now();
        const step = (now) => {
          if (touched || reduced()) return;
          const k = Math.min(1, (now - t0) / 2400);
          const v = 50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k * 0.4);
          range.value = String(v); set(v);
          if (k < 1) requestAnimationFrame(step); else { range.value = "50"; set(50); }
        };
        requestAnimationFrame(step);
      }, { threshold: 0.6 });
      co.observe(cmp);
    }
  }
})();
