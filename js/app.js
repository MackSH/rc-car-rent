/* ==========================================================================
   RC Rent — logique du site
   - Catalogue des véhicules
   - Photos des véhicules (illustrations SVG en secours)
   - Sélecteur de disponibilités
   - Formulaire de réservation
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Configuration ---------- */
  const CONFIG = {
    currency: "USD",
    locale: "fr-FR",
    longRentalDays: 7,          // remise à partir de N jours
    longRentalDiscount: 0.10,   // -10 %
    storageKey: "rcrent.reservations",
  };

  const LOCATION_FEES = {
    "Agence centrale": 0,
    "Aéroport": 40,
    "Livraison à l'adresse": 60,
  };

  const OPTIONS = [
    { id: "insurance", name: "Protection totale", desc: "Franchise à 0, pneus et vitrage couverts", perDay: 25 },
    { id: "driver", name: "Conducteur supplémentaire", desc: "Un second conducteur autorisé", perDay: 10 },
    { id: "gps", name: "GPS", desc: "Navigation hors ligne, cartes à jour", perDay: 6 },
    { id: "child", name: "Siège enfant", desc: "Siège homologué, installé à la remise", perDay: 8 },
    { id: "expedition", name: "Kit expédition", desc: "Tente de toit, glacière, kit de désensablage", perDay: 35, types: ["pickup", "4x4"] },
  ];

  const TYPE_LABELS = { pickup: "Pick-up", "4x4": "4x4", suv: "SUV" };

  /* Réservations existantes, exprimées en jours relatifs à aujourd'hui
     [début, fin) — permet une démo toujours cohérente. */
  const CARS = [
    {
      id: "hilux-dc", name: "Hilux Double Cab", type: "pickup", shape: "pickup",
      photo: { src: "images/hilux-dc.webp", author: "Chanokchon", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Hilux_Revo_Prerunner_Double-Cab_2.4_Mid.jpg" },
      tagline: "Le pick-up de référence, 4x4 et prêt pour le travail.",
      color: "#f2f2f0", price: 95, units: 4,
      seats: 5, transmission: "Automatique", fuel: "Diesel", drive: "4x4",
      booked: [[0, 3], [1, 5]],
    },
    {
      id: "hilux-gr", name: "Hilux GR Sport", type: "pickup", shape: "pickup",
      photo: { src: "images/hilux-gr.webp", author: "LuvsMG481", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2024_Toyota_HiLux_GR_Sport_front.jpg" },
      tagline: "Suspensions sport et look affirmé.",
      color: "#3a3d42", accent: "#e1251b", price: 125, units: 2,
      seats: 5, transmission: "Automatique", fuel: "Diesel", drive: "4x4",
      booked: [[2, 8]],
    },
    {
      id: "lc300", name: "Land Cruiser 300", type: "4x4", shape: "suv",
      photo: { src: "images/lc300.webp", author: "TTTNIS", license: "CC0", page: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Land_Cruieser_300_ZX.jpg" },
      tagline: "Le vaisseau amiral. V6 biturbo, 7 places.",
      color: "#e9e7e2", darkColor: "#2b2c2f", price: 220, units: 2,
      seats: 7, transmission: "Automatique", fuel: "Diesel", drive: "4x4",
      booked: [[3, 10]],
    },
    {
      id: "lc70", name: "Land Cruiser 70", type: "4x4", shape: "boxy",
      photo: { src: "images/lc70.webp", author: "TuRbO_J", license: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:2015_Toyota_Land_Cruiser_(VDJ76R)_GXL_5-door_wagon_(19039611238).jpg" },
      tagline: "L'icône des expéditions. Mécanique indestructible.",
      color: "#d8c6a5", price: 160, units: 1,
      seats: 5, transmission: "Manuelle", fuel: "Diesel", drive: "4x4",
      booked: [[1, 3], [12, 16]],
    },
    {
      id: "prado", name: "Land Cruiser Prado", type: "4x4", shape: "suv",
      photo: { src: "images/prado.webp", author: "Ethan Llamas", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2024_Toyota_Land_Cruiser_Prado_2.4_Turbo_in_Avant_Garde_Bronze,_front_left.jpg" },
      tagline: "Robuste en piste, raffiné en ville.",
      color: "#8a8f96", price: 175, units: 3,
      seats: 7, transmission: "Automatique", fuel: "Diesel", drive: "4x4",
      booked: [],
    },
    {
      id: "fortuner", name: "Fortuner", type: "suv", shape: "suv",
      photo: { src: "images/fortuner.webp", author: "オーバードライブ83", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Fortuner_2.4_VRZ_4x2_GUN165R_(20220215).jpg" },
      tagline: "Sept places et la base technique du Hilux.",
      color: "#5b6470", price: 130, units: 2,
      seats: 7, transmission: "Automatique", fuel: "Diesel", drive: "4x4",
      booked: [[10, 14]],
    },
    {
      id: "rav4", name: "RAV4 Hybride", type: "suv", shape: "compact",
      photo: { src: "images/rav4.webp", author: "Alexander Migl", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2019_Toyota_RAV4_Hybrid_01.jpg" },
      tagline: "Sobre, silencieux et parfait au quotidien.",
      color: "#3f6c94", price: 85, units: 3,
      seats: 5, transmission: "Automatique", fuel: "Hybride", drive: "AWD",
      booked: [[0, 2], [0, 2], [1, 4]],
    },
  ];

  const byId = (id) => CARS.find((c) => c.id === id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Dates (jours entiers, sans fuseau) ---------- */
  const DAY = 86400000;
  const todayNum = (() => {
    const d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
  })();
  const toNum = (iso) => {
    if (!iso) return NaN;
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / DAY;
  };
  const toIso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const fmtDate = (n, opts = { day: "numeric", month: "short" }) =>
    new Date(n * DAY).toLocaleDateString(CONFIG.locale, { timeZone: "UTC", ...opts });

  const money = new Intl.NumberFormat(CONFIG.locale, {
    style: "currency", currency: CONFIG.currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0,
  });
  const fmtMoney = (v) => money.format(v);

  /* ---------- Réservations (démo + locales) ---------- */
  function loadReservations() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveReservation(r) {
    const list = loadReservations();
    list.push(r);
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
  }

  function bookingsFor(car) {
    const demo = car.booked.map(([s, e]) => [todayNum + s, todayNum + e]);
    const local = loadReservations()
      .filter((r) => r.carId === car.id)
      .map((r) => [toNum(r.start), toNum(r.end)]);
    return demo.concat(local);
  }

  /** Nombre d'unités libres sur la période [start, end). */
  function unitsLeft(car, start, end) {
    const overlapping = bookingsFor(car).filter(([s, e]) => s < end && start < e).length;
    return Math.max(0, car.units - overlapping);
  }

  /** Première date à partir de laquelle la même durée est disponible. */
  function nextAvailable(car, start, end) {
    const len = end - start;
    for (let s = start + 1; s < start + 120; s++) {
      if (unitsLeft(car, s, s + len) > 0) return s;
    }
    return null;
  }

  /* ---------- Couleurs ---------- */
  function mix(hex, target, amount) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex), b = p(target);
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("");
  }

  /* ---------- Illustrations SVG ---------- */
  const SHAPES = {
    pickup: {
      body: "M40 198 L38 150 Q38 139 49 138 L262 138 L268 131 L284 88 Q288 79 298 79 L404 77 Q415 77 422 84 L463 128 L560 136 Q585 140 591 157 L595 184 Q595 198 581 198 Z",
      windows: "M296 92 Q298 89 304 89 L404 88 Q410 88 414 93 L446 128 L289 130 Z",
      pillars: [[357, 88, 7]],
      doors: [[360, 132, 194], [458, 130, 190], [268, 134, 194]],
      handles: [[374, 146], [470, 144]],
      wheels: [150, 490],
      bedLine: true,
      tail: [38, 146, 8, 20],
      head: "M566 141 L590 149 L591 158 L570 154 Z",
      grille: "M589 160 L595 162 L596 182 L590 182 Z",
    },
    suv: {
      body: "M44 198 L42 122 Q42 98 57 87 L84 70 Q93 64 105 64 L404 62 Q419 62 427 70 L475 120 L566 130 Q591 134 597 152 L600 182 Q600 198 586 198 Z",
      windows: "M98 77 Q102 75 108 75 L402 74 Q410 74 415 80 L456 120 L72 122 Q72 102 84 90 Z",
      pillars: [[206, 74, 8], [330, 74, 7]],
      doors: [[334, 124, 194], [470, 122, 190], [210, 124, 194]],
      handles: [[350, 138], [228, 138]],
      wheels: [150, 490],
      tail: [42, 112, 8, 24],
      head: "M568 133 L594 142 L596 152 L572 148 Z",
      grille: "M594 156 L600 158 L600 182 L595 182 Z",
      rails: "M110 60 L400 58",
    },
    boxy: {
      body: "M44 198 L42 70 Q42 58 54 58 L384 58 Q395 58 399 67 L421 116 L556 120 Q575 122 577 140 L581 184 Q581 198 567 198 Z",
      windows: "M58 72 L380 72 Q385 72 387 76 L405 114 L58 116 Z",
      pillars: [[176, 72, 9], [298, 72, 8]],
      doors: [[302, 118, 194], [416, 118, 190], [180, 118, 194]],
      handles: [[318, 132], [196, 132]],
      wheels: [148, 476],
      tail: [42, 128, 8, 26],
      roundHead: [566, 138],
      grille: "M574 146 L581 147 L582 182 L576 182 Z",
      rails: "M60 54 L376 54",
      snorkel: "M404 70 L410 70 L428 116 L420 117 Z",
    },
    compact: {
      body: "M44 198 L44 134 Q44 112 60 104 L112 80 Q122 74 136 74 L380 74 Q395 74 405 84 L457 124 L560 134 Q588 138 594 158 L596 184 Q596 198 582 198 Z",
      windows: "M124 86 Q130 85 138 85 L380 85 Q388 85 394 90 L436 124 L66 126 Q70 110 86 102 Z",
      pillars: [[214, 85, 8], [326, 85, 7]],
      doors: [[330, 128, 194], [452, 126, 190], [218, 128, 194]],
      handles: [[346, 140], [234, 140]],
      wheels: [152, 480],
      tail: [44, 128, 8, 18],
      head: "M564 137 L590 146 L592 156 L568 151 Z",
      grille: "M591 162 L596 164 L596 182 L592 182 Z",
    },
  };

  let svgUid = 0;

  function carSVG(car, { variant } = {}) {
    const s = SHAPES[car.shape];
    const uid = "c" + (++svgUid);
    const color = variant === "dark" && car.darkColor ? car.darkColor : car.color;
    const top = mix(color, "#ffffff", 0.35);
    const mid = color;
    const bottom = mix(color, "#000000", 0.28);
    const dark = variant === "dark";
    const rimLight = dark ? "#9a9da3" : "#d6d8db";
    const rimDark = dark ? "#4b4e54" : "#8c8f94";

    const wheel = (x) => `
      <g transform="translate(${x} 196)">
        <circle r="47" fill="#121214"/>
        <circle r="40" fill="url(#${uid}-tire)"/>
        <circle r="26" fill="url(#${uid}-rim)"/>
        ${[0, 60, 120, 180, 240, 300].map((a) =>
          `<rect x="-3" y="-25" width="6" height="19" rx="2" fill="${rimDark}" transform="rotate(${a})"/>`).join("")}
        <circle r="7" fill="${rimDark}"/>
        <circle r="3" fill="${rimLight}"/>
      </g>`;

    const pillars = s.pillars.map(([x, y, w]) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${130 - y + 4}" fill="url(#${uid}-body)"/>`).join("");
    const doors = s.doors.map(([x, y1, y2]) =>
      `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 12}" stroke="${bottom}" stroke-opacity=".55" stroke-width="1.5"/>`).join("");
    const handles = s.handles.map(([x, y]) =>
      `<rect x="${x}" y="${y}" width="22" height="5" rx="2.5" fill="${bottom}" fill-opacity=".7"/>`).join("");
    const accent = car.accent
      ? `<rect x="30" y="170" width="580" height="4" fill="${car.accent}" clip-path="url(#${uid}-clip)"/>` : "";

    return `
<svg class="car" viewBox="0 0 640 262" role="img" aria-label="Illustration ${car.name}">
  <defs>
    <linearGradient id="${uid}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset=".45" stop-color="${mid}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <linearGradient id="${uid}-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a4654"/>
      <stop offset="1" stop-color="#0c1016"/>
    </linearGradient>
    <radialGradient id="${uid}-tire" cx=".5" cy=".5" r=".5">
      <stop offset=".7" stop-color="#2a2a2d"/>
      <stop offset="1" stop-color="#0d0d0f"/>
    </radialGradient>
    <linearGradient id="${uid}-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${rimLight}"/>
      <stop offset="1" stop-color="${rimDark}"/>
    </linearGradient>
    <radialGradient id="${uid}-shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity="${dark ? ".7" : ".32"}"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${uid}-clip"><path d="${s.body}"/></clipPath>
  </defs>

  <ellipse cx="320" cy="238" rx="300" ry="16" fill="url(#${uid}-shadow)"/>
  ${s.rails ? `<path d="${s.rails}" stroke="${dark ? "#55575c" : "#2a2a2d"}" stroke-width="4" stroke-linecap="round"/>` : ""}
  <path d="${s.body}" fill="url(#${uid}-body)"/>
  <g clip-path="url(#${uid}-clip)">
    <rect x="0" y="182" width="640" height="20" fill="#000" fill-opacity=".22"/>
    <path d="M30 ${car.shape === "boxy" ? 124 : 140} H620" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
  </g>
  <path d="${s.windows}" fill="url(#${uid}-glass)"/>
  <clipPath id="${uid}-glassclip"><path d="${s.windows}"/></clipPath>
  <path d="M60 40 L300 40 L230 140 L-10 140 Z" fill="#fff" fill-opacity=".08" clip-path="url(#${uid}-glassclip)"/>
  ${pillars}
  ${doors}
  ${handles}
  ${s.bedLine ? `<path d="M50 146 H258" stroke="${bottom}" stroke-opacity=".6" stroke-width="2"/><path d="M262 138 V190" stroke="${bottom}" stroke-opacity=".5" stroke-width="1.5"/>` : ""}
  ${s.snorkel ? `<path d="${s.snorkel}" fill="#1d1d1f"/>` : ""}
  <rect x="${s.tail[0]}" y="${s.tail[1]}" width="${s.tail[2]}" height="${s.tail[3]}" rx="2" fill="#c8201c"/>
  ${s.head ? `<path d="${s.head}" fill="#f4f7fb" stroke="${bottom}" stroke-opacity=".5"/>` : ""}
  ${s.roundHead ? `<circle cx="${s.roundHead[0]}" cy="${s.roundHead[1]}" r="8" fill="#f4f7fb" stroke="${bottom}" stroke-opacity=".6" stroke-width="2"/>` : ""}
  <path d="${s.grille}" fill="#1d1d1f"/>
  <path d="M${car.shape === "boxy" ? 400 : car.shape === "pickup" ? 440 : 452} ${car.shape === "boxy" ? 112 : 124} l10 -4 v8 z" fill="#1d1d1f"/>
  ${accent}
  ${s.wheels.map(wheel).join("")}
</svg>`;
  }

  /** Photo détourée du véhicule ; l'illustration SVG sert de secours. */
  function carArt(car, opts = {}) {
    if (!car.photo) return carSVG(car, opts);
    const eager = opts.eager ? ' fetchpriority="high"' : ' loading="lazy"';
    return `<figure class="photo"><img src="${car.photo.src}" alt="Toyota ${car.name}" decoding="async"${eager}></figure>`;
  }

  function paintArt(root = document) {
    $$("[data-car-art]", root).forEach((el) => {
      const car = byId(el.dataset.carArt);
      if (!car) return;
      el.innerHTML = carArt(car, { variant: el.dataset.variant, eager: el.dataset.size === "hero" });
      const img = $("img", el);
      if (img) img.addEventListener("error", () => { el.innerHTML = carSVG(car, { variant: el.dataset.variant }); }, { once: true });
    });
  }

  function renderCredits() {
    const el = $("#photoCredits");
    if (!el) return;
    el.innerHTML = "Photos : " + CARS.filter((c) => c.photo).map((c) =>
      `<a href="${c.photo.page}" target="_blank" rel="noopener">${c.name}</a> © ${c.photo.author} (${c.photo.license})`
    ).join(" · ") + ". Arrière-plans retirés.";
  }

  /* ---------- État du sélecteur ---------- */
  const state = {
    start: todayNum + 1,
    end: todayNum + 4,
    type: "all",
    seats: 0,
    transmission: "all",
    onlyAvailable: true,
  };

  const els = {
    fStart: $("#fStart"), fEnd: $("#fEnd"), fTrans: $("#fTrans"), fSeats: $("#fSeats"),
    fType: $("#fType"), fAvail: $("#fAvail"), grid: $("#fleetGrid"), empty: $("#fleetEmpty"),
    summary: $("#fleetSummary"), qsStart: $("#qsStart"), qsEnd: $("#qsEnd"),
  };

  function syncDateInputs() {
    const min = toIso(todayNum);
    [els.fStart, els.qsStart].forEach((i) => { i.min = min; i.value = toIso(state.start); });
    [els.fEnd, els.qsEnd].forEach((i) => { i.min = toIso(state.start + 1); i.value = toIso(state.end); });
  }

  function setDates(startIso, endIso) {
    let s = toNum(startIso), e = toNum(endIso);
    if (isNaN(s) || s < todayNum) s = todayNum;
    if (isNaN(e) || e <= s) e = s + Math.max(1, state.end - state.start);
    state.start = s;
    state.end = e;
    syncDateInputs();
    renderFleet();
  }

  function setType(type) {
    state.type = type;
    $$("button", els.fType).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.type === type)));
    renderFleet();
  }

  const days = () => state.end - state.start;

  function renderFleet() {
    const n = days();
    const list = CARS
      .filter((c) => state.type === "all" || c.type === state.type)
      .filter((c) => c.seats >= state.seats)
      .filter((c) => state.transmission === "all" || c.transmission === state.transmission)
      .map((c) => ({ car: c, left: unitsLeft(c, state.start, state.end) }))
      .sort((a, b) => (b.left > 0) - (a.left > 0) || a.car.price - b.car.price);

    const visible = state.onlyAvailable ? list.filter((x) => x.left > 0) : list;
    const availableCount = list.filter((x) => x.left > 0).length;

    els.summary.textContent =
      `${availableCount} véhicule${availableCount > 1 ? "s" : ""} disponible${availableCount > 1 ? "s" : ""} ` +
      `du ${fmtDate(state.start, { weekday: "short", day: "numeric", month: "short" })} ` +
      `au ${fmtDate(state.end, { weekday: "short", day: "numeric", month: "short" })} · ${n} jour${n > 1 ? "s" : ""}`;

    els.empty.hidden = visible.length > 0;
    els.grid.innerHTML = visible.map(({ car, left }) => cardHTML(car, left, n)).join("");
    paintArt(els.grid);
  }

  function cardHTML(car, left, n) {
    let badge;
    if (left === 0) badge = `<span class="badge badge--no">Indisponible</span>`;
    else if (left === 1) badge = `<span class="badge badge--low">Plus qu'1</span>`;
    else badge = `<span class="badge badge--ok">Disponible</span>`;

    const base = car.price * n;
    const total = n >= CONFIG.longRentalDays ? base * (1 - CONFIG.longRentalDiscount) : base;
    let action;
    if (left > 0) {
      action = `<button class="btn btn--primary btn--small" data-book="${car.id}">Réserver</button>`;
    } else {
      const next = nextAvailable(car, state.start, state.end);
      action = next !== null
        ? `<button class="btn btn--secondary btn--small" data-shift="${next}">Dès le ${fmtDate(next)}</button>`
        : `<button class="btn btn--small" disabled>Indisponible</button>`;
    }

    return `
      <article class="card${left === 0 ? " is-unavailable" : ""}">
        <div class="card__art" data-car-art="${car.id}"></div>
        <div class="card__body">
          <div class="card__top">
            <div>
              <p class="card__cat">${TYPE_LABELS[car.type]}</p>
              <h3 class="card__name">${car.name}</h3>
            </div>
            ${badge}
          </div>
          <p class="card__tag">${car.tagline}</p>
          <ul class="chips">
            <li>${car.seats} places</li>
            <li>${car.transmission}</li>
            <li>${car.fuel}</li>
            <li>${car.drive}</li>
          </ul>
          <div class="card__foot">
            <div class="price">
              <div class="price__day">${fmtMoney(car.price)} <small>/ jour</small></div>
              <div class="price__total">${fmtMoney(total)} pour ${n} jour${n > 1 ? "s" : ""}</div>
            </div>
            ${action}
          </div>
        </div>
      </article>`;
  }

  /* ---------- Réservation ---------- */
  const dialog = $("#bookingDialog");
  const form = $("#bookingForm");
  const bStart = $("#bStart"), bEnd = $("#bEnd");
  let currentCar = null;

  function fillTimes(select, def) {
    const out = [];
    for (let h = 8; h <= 19; h++) {
      for (const m of ["00", "30"]) {
        if (h === 19 && m === "30") continue;
        const v = `${String(h).padStart(2, "0")}:${m}`;
        out.push(`<option value="${v}"${v === def ? " selected" : ""}>${v}</option>`);
      }
    }
    select.innerHTML = out.join("");
  }
  fillTimes($("#bStartTime"), "10:00");
  fillTimes($("#bEndTime"), "10:00");

  function openBooking(carId) {
    const car = byId(carId);
    if (!car) return;
    currentCar = car;

    $("#bookingView").hidden = false;
    $("#bookingDone").hidden = true;
    form.reset();
    $$(".is-invalid", form).forEach((el) => el.classList.remove("is-invalid"));

    $("#bookingArt").innerHTML = carArt(car);
    $("#bookingEyebrow").textContent = `${TYPE_LABELS[car.type]} · ${fmtMoney(car.price)} / jour`;
    $("#bookingTitle").textContent = car.name;

    bStart.min = toIso(todayNum);
    bStart.value = toIso(state.start);
    bEnd.min = toIso(state.start + 1);
    bEnd.value = toIso(state.end);

    $("#bookingOptions").innerHTML = OPTIONS
      .filter((o) => !o.types || o.types.includes(car.type))
      .map((o) => `
        <label class="option">
          <input type="checkbox" name="opt" value="${o.id}">
          <span class="option__text">
            <span class="option__name">${o.name}</span>
            <span class="option__desc">${o.desc}</span>
          </span>
          <span class="option__price">+${fmtMoney(o.perDay)} / jour</span>
        </label>`).join("");

    updateSummary();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.scrollTop = 0;
  }

  function closeBooking() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function quote() {
    const s = toNum(bStart.value), e = toNum(bEnd.value);
    const valid = !isNaN(s) && !isNaN(e) && s >= todayNum && e > s;
    const n = valid ? e - s : 0;
    const opts = $$('input[name="opt"]:checked', form).map((i) => OPTIONS.find((o) => o.id === i.value));
    const rental = currentCar.price * n;
    const discount = n >= CONFIG.longRentalDays ? Math.round(rental * CONFIG.longRentalDiscount) : 0;
    const optionsTotal = opts.reduce((sum, o) => sum + o.perDay * n, 0);
    const fee = LOCATION_FEES[form.location.value] || 0;
    const left = valid ? unitsLeft(currentCar, s, e) : 0;
    return { s, e, n, valid, opts, rental, discount, optionsTotal, fee, left, total: rental - discount + optionsTotal + fee };
  }

  function updateSummary() {
    const q = quote();
    const err = $("#dateError");
    const submit = $("#bookingSubmit");

    if (!q.valid) {
      err.hidden = false;
      err.textContent = "La date de retour doit être postérieure à la date de départ.";
    } else if (q.left === 0) {
      const next = nextAvailable(currentCar, q.s, q.e);
      err.hidden = false;
      err.textContent = "Ce véhicule n'est pas disponible sur ces dates." +
        (next !== null ? ` Prochaine disponibilité pour la même durée : ${fmtDate(next, { day: "numeric", month: "long" })}.` : "");
    } else {
      err.hidden = true;
    }
    bStart.classList.toggle("is-invalid", !q.valid || q.left === 0);
    bEnd.classList.toggle("is-invalid", !q.valid || q.left === 0);
    submit.disabled = !q.valid || q.left === 0;

    const row = (label, value) => `<div class="summary__row"><span>${label}</span><span>${value}</span></div>`;
    $("#bookingSummary").innerHTML = !q.valid ? `<p class="summary__warn">Choisissez des dates valides.</p>` : [
      row(`${currentCar.name} · ${q.n} jour${q.n > 1 ? "s" : ""}`, fmtMoney(q.rental)),
      q.discount ? row(`Remise longue durée (−${CONFIG.longRentalDiscount * 100} %)`, "−" + fmtMoney(q.discount)) : "",
      ...q.opts.map((o) => row(o.name, fmtMoney(o.perDay * q.n))),
      q.fee ? row(form.location.value, fmtMoney(q.fee)) : "",
      row("Kilométrage illimité", "Inclus"),
      `<div class="summary__row summary__row--total"><span>Total</span><span>${fmtMoney(q.total)}</span></div>`,
    ].join("");
  }

  function validateForm() {
    let ok = true;
    $$("input[required], select[required], textarea[required]", form).forEach((el) => {
      const valid = el.type === "checkbox" ? el.checked : el.checkValidity() && el.value.trim() !== "";
      const target = el.type === "checkbox" ? el.closest(".check") : el;
      target.classList.toggle("is-invalid", !valid);
      if (!valid && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  form.addEventListener("input", (e) => {
    if (e.target === bStart) {
      bEnd.min = toIso(toNum(bStart.value) + 1);
      if (toNum(bEnd.value) <= toNum(bStart.value)) bEnd.value = toIso(toNum(bStart.value) + 1);
    }
    if (e.target.classList.contains("is-invalid") && e.target.checkValidity()) e.target.classList.remove("is-invalid");
    if (e.target.name === "terms") e.target.closest(".check").classList.remove("is-invalid");
    updateSummary();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = quote();
    if (!q.valid || q.left === 0) { updateSummary(); bStart.focus(); return; }
    if (!validateForm()) return;

    const data = new FormData(form);
    const ref = "RC-" + Date.now().toString(36).toUpperCase().slice(-6);
    const reservation = {
      ref,
      carId: currentCar.id,
      car: currentCar.name,
      start: toIso(q.s),
      end: toIso(q.e),
      startTime: data.get("startTime"),
      endTime: data.get("endTime"),
      location: data.get("location"),
      options: q.opts.map((o) => o.id),
      total: q.total,
      customer: {
        firstName: data.get("firstName").trim(),
        lastName: data.get("lastName").trim(),
        email: data.get("email").trim(),
        phone: data.get("phone").trim(),
        license: data.get("license").trim(),
        message: data.get("message").trim(),
      },
      createdAt: new Date().toISOString(),
    };
    saveReservation(reservation);

    $("#doneRef").textContent = ref;
    $("#doneText").textContent =
      `Merci ${reservation.customer.firstName}. Votre ${currentCar.name} vous attend le ` +
      `${fmtDate(q.s, { weekday: "long", day: "numeric", month: "long" })} à ${reservation.startTime} ` +
      `(${reservation.location}). Notre équipe vous contactera à ${reservation.customer.email} pour confirmer. ` +
      `Total : ${fmtMoney(q.total)}.`;
    $("#bookingView").hidden = true;
    $("#bookingDone").hidden = false;
    dialog.scrollTop = 0;
    renderFleet();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]") || e.target === dialog) closeBooking();
  });

  /* ---------- Événements globaux ---------- */
  document.addEventListener("click", (e) => {
    const book = e.target.closest("[data-book]");
    if (book) { e.preventDefault(); openBooking(book.dataset.book); return; }

    const shift = e.target.closest("[data-shift]");
    if (shift) {
      const s = Number(shift.dataset.shift);
      setDates(toIso(s), toIso(s + days()));
      return;
    }

    const filterLink = e.target.closest("[data-filter-link]");
    if (filterLink) setType(filterLink.dataset.filterLink);
  });

  els.fType.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-type]");
    if (b) setType(b.dataset.type);
  });
  els.fStart.addEventListener("change", () => setDates(els.fStart.value, els.fEnd.value));
  els.fEnd.addEventListener("change", () => setDates(els.fStart.value, els.fEnd.value));
  els.fTrans.addEventListener("change", () => { state.transmission = els.fTrans.value; renderFleet(); });
  els.fSeats.addEventListener("change", () => { state.seats = Number(els.fSeats.value); renderFleet(); });
  els.fAvail.addEventListener("change", () => { state.onlyAvailable = els.fAvail.checked; renderFleet(); });

  $("#resetFilters").addEventListener("click", () => {
    state.seats = 0; state.transmission = "all"; state.onlyAvailable = false;
    els.fSeats.value = "0"; els.fTrans.value = "all"; els.fAvail.checked = false;
    setType("all");
  });

  els.qsStart.addEventListener("change", () => {
    if (toNum(els.qsEnd.value) <= toNum(els.qsStart.value)) els.qsEnd.value = toIso(toNum(els.qsStart.value) + 1);
    els.qsEnd.min = toIso(toNum(els.qsStart.value) + 1);
  });
  $("#quickSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    setDates(els.qsStart.value, els.qsEnd.value);
    $("#flotte").scrollIntoView({ behavior: "smooth" });
  });

  /* Prix « à partir de » dans les sections vedettes */
  $$("[data-price]").forEach((el) => {
    const car = byId(el.dataset.price);
    if (car) el.textContent = fmtMoney(car.price);
  });

  /* Barre de navigation */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Apparition au défilement */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-visible"));
  }

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Démarrage ---------- */
  paintArt();
  renderCredits();
  syncDateInputs();
  renderFleet();
})();
