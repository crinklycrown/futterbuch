'use strict';
/* =========================================================
   Futterbuch – Ernährungstagebuch (lokal, offline)
   ========================================================= */

const APP_VERSION = '1.0.0';

/* ---------- Helfer ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const num = v => (v === null || v === undefined || v === '') ? NaN : parseFloat(String(v).replace(',', '.'));
const f0 = n => Math.round(n || 0).toLocaleString('de-DE');
const f1 = n => (Math.round((n || 0) * 10) / 10).toLocaleString('de-DE');
const norm = s => String(s).toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- Datum ---------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayKey = () => keyOf(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekStart = d => addDays(d, -((d.getDay() + 6) % 7));
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
function rangeLabel(mon) {
  const end = addDays(mon, 6);
  if (mon.getMonth() === end.getMonth()) return `${mon.getDate()}.–${end.getDate()}. ${MON[end.getMonth()]} ${end.getFullYear()}`;
  return `${mon.getDate()}. ${MONS[mon.getMonth()]} – ${end.getDate()}. ${MONS[end.getMonth()]} ${end.getFullYear()}`;
}
const longDate = k => { const d = fromKey(k); return `${WDL[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`; };
function relLabel(k) {
  const diff = Math.round((fromKey(k) - fromKey(todayKey())) / 86400000);
  return { 0: 'Heute', '-1': 'Gestern', 1: 'Morgen' }[diff] || '';
}

/* ---------- Icons ---------- */
const sv = p => `<svg viewBox="0 0 24 24">${p}</svg>`;
const I = {
  back: sv('<path d="M15 18l-6-6 6-6"/>'),
  chevL: sv('<path d="M15 18l-6-6 6-6"/>'),
  chevR: sv('<path d="M9 18l6-6-6-6"/>'),
  gear: sv('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  camera: sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  image: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  share: sv('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
  copy: sv('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  trash: sv('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  plate: sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>'),
  moon: sv('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  apple: sv('<path d="M12 7.5c-1.6-1.2-5-1.4-6.4 1.6S5 16 7.5 19c1.2 1.4 2.8 1.4 4.5.6 1.7.8 3.3.8 4.5-.6 2.5-3 3.4-7-2-9.9-1.6-.9-3.2-.8-2.5-.6z"/><path d="M12 7.5c0-2 1-3.5 3-4.2"/>'),
  book: sv('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  pot: sv('<path d="M4 10h16v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M9 6.5c0-1.2 1-1.3 1-2.5M14 6.5c0-1.2 1-1.3 1-2.5"/>'),
  leaf: sv('<path d="M5 19c0-8.5 5.5-14 15-14 0 9.5-5.5 15-14 15"/><path d="M5 19l7-7"/>'),
  download: sv('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: sv('<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>'),
  save: sv('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7M8 20v-6h8v6"/>'),
};

/* ---------- Konstanten ---------- */
const MEALS = [
  { k: 'fruehstueck', l: 'Frühstück', file: 'Fruehstueck', icon: I.sun },
  { k: 'mittag', l: 'Mittag', file: 'Mittag', icon: I.plate },
  { k: 'abend', l: 'Abendessen', file: 'Abendessen', icon: I.moon },
  { k: 'snacks', l: 'Snacks', file: 'Snacks', icon: I.apple },
];
const mealLabel = k => MEALS.find(m => m.k === k).l;
const CATS = [...Object.keys(FOOD_RAW), 'Eigene'];
const BUILTIN = [];
for (const [cat, rows] of Object.entries(FOOD_RAW)) {
  for (const r of rows) BUILTIN.push({ id: 'b:' + slug(r[0]), name: r[0], kcal: r[1], p: r[2], c: r[3], f: r[4], cat, piece: r[5] || null, pieceLabel: r[6] || null, builtin: true });
}
const DEFAULT_GOALS = { kcal: 2800, p: 160, c: 360, f: 80 };

/* ---------- Speicher (IndexedDB) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('futterbuch', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  get(k, st = 'kv') { return this.tx(st, 'readonly', s => s.get(k)); },
  set(k, v, st = 'kv') { return this.tx(st, 'readwrite', s => s.put(v, k)); },
  del(k, st = 'kv') { return this.tx(st, 'readwrite', s => s.delete(k)); },
  clear(st) { return this.tx(st, 'readwrite', s => s.clear()); },
  entries(st = 'kv') {
    return new Promise((res, rej) => {
      const t = this.db.transaction(st, 'readonly'); const s = t.objectStore(st);
      const kr = s.getAllKeys(), vr = s.getAll();
      t.oncomplete = () => res(kr.result.map((k, i) => [k, vr.result[i]]));
      t.onerror = () => rej(t.error);
    });
  },
};

/* ---------- Zustand ---------- */
const S = {
  days: {}, dishes: [], customFoods: [], overrides: {}, hidden: [], usage: {}, recent: [],
  settings: { goals: { ...DEFAULT_GOALS } },
  sel: todayKey(), view: 'diary', foodFilter: 'all', foodQuery: '', dishQuery: '',
};
const persist = (k, v) => DB.set(k, clone(v)).catch(e => toast('Speichern fehlgeschlagen: ' + e.message));
const saveDay = k => persist('day:' + k, S.days[k]);
const saveDishes = () => persist('dishes', S.dishes);
const saveFoods = () => { persist('customFoods', S.customFoods); persist('overrides', S.overrides); persist('hidden', S.hidden); };
const saveUsage = () => { persist('usage', S.usage); persist('recent', S.recent); };
const saveSettings = () => persist('settings', S.settings);

function emptyDay() { const d = { meals: {} }; MEALS.forEach(m => d.meals[m.k] = { items: [], photos: [] }); return d; }
function getDay(k) { if (!S.days[k]) S.days[k] = emptyDay(); return S.days[k]; }
const dayHasData = k => { const d = S.days[k]; return !!d && MEALS.some(m => d.meals[m.k].items.length || d.meals[m.k].photos.length); };

function allFoods() {
  const out = [];
  for (const b of BUILTIN) {
    if (S.hidden.includes(b.id)) continue;
    out.push(S.overrides[b.id] ? { ...b, ...S.overrides[b.id], overridden: true } : b);
  }
  return out.concat(S.customFoods);
}
const foodById = id => allFoods().find(f => f.id === id) || null;
const p100 = f => f ? { kcal: +f.kcal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0 } : null;
function bump(id) {
  S.usage[id] = (S.usage[id] || 0) + 1;
  S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 25);
  saveUsage();
}
function searchFoods(q) {
  const list = allFoods();
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return list;
  const nq = norm(q);
  return list.filter(f => { const n = norm(f.name); return t.every(x => n.includes(x)); })
    .sort((a, b) => {
      const as = norm(a.name).startsWith(nq) ? 1 : 0, bs = norm(b.name).startsWith(nq) ? 1 : 0;
      if (as !== bs) return bs - as;
      const u = (S.usage[b.id] || 0) - (S.usage[a.id] || 0);
      return u || a.name.localeCompare(b.name, 'de');
    });
}

/* ---------- Nährwerte ---------- */
const Z = () => ({ kcal: 0, p: 0, c: 0, f: 0, unknown: 0 });
function addN(a, b) { a.kcal += b.kcal; a.p += b.p; a.c += b.c; a.f += b.f; a.unknown += b.unknown || 0; return a; }
function per(v, g) { return v ? { kcal: v.kcal * g / 100, p: v.p * g / 100, c: v.c * g / 100, f: v.f * g / 100, unknown: 0 } : { ...Z(), unknown: 1 }; }
const resolveP100 = ing => { const f = ing.foodId && foodById(ing.foodId); return f ? p100(f) : ing.per100 || null; };
const sumG = ings => ings.reduce((a, i) => a + (num(i.g) || 0), 0);
const ingsN = ings => ings.reduce((a, i) => addN(a, per(i.per100, num(i.g) || 0)), Z());
function dishFactor(e) {
  const tot = num(e.total) || sumG(e.ingredients);
  if (e.mode === 'eaten') return tot ? (num(e.amt) || 0) / tot : 0;
  if (e.mode === 'left') return tot ? Math.max(0, tot - (num(e.amt) || 0)) / tot : 0;
  const f = num(e.factor); return isNaN(f) ? 0 : f;
}
function itemN(it) {
  if (it.type === 'dish') {
    const n = ingsN(it.ingredients), k = dishFactor(it);
    return { kcal: n.kcal * k, p: n.p * k, c: n.c * k, f: n.f * k, unknown: n.unknown };
  }
  return per(it.per100, num(it.g) || 0);
}
const mealN = m => m.items.reduce((a, it) => addN(a, itemN(it)), Z());
const dayN = d => MEALS.reduce((a, m) => addN(a, mealN(d.meals[m.k])), Z());

const FRAC = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '1'], [1.5, '1½'], [2, '2']];
function fracLabel(x) { const m = FRAC.find(([v]) => Math.abs(v - x) < 0.01); return m ? m[1] : f1(x); }
function dishAmountLabel(e) {
  if (e.mode === 'eaten') return `${f0(num(e.amt) || 0)} g gegessen`;
  if (e.mode === 'left') { const tot = num(e.total) || sumG(e.ingredients); return `${f0(Math.max(0, tot - (num(e.amt) || 0)))} g gegessen (${f0(num(e.amt) || 0)} g übrig)`; }
  return `${fracLabel(num(e.factor) || 0)} Portion`;
}
const nutBox = n => `<div class="nutbox"><div class="k"><b>${f0(n.kcal)}</b><span>kcal</span></div><div class="p"><b>${f0(n.p)} g</b><span>Eiweiß</span></div><div class="c"><b>${f0(n.c)} g</b><span>Kohlenh.</span></div><div class="f"><b>${f0(n.f)} g</b><span>Fett</span></div></div>`;
const per100Line = v => v ? `${f0(v.kcal)} kcal · P ${f1(v.p)} · KH ${f1(v.c)} · F ${f1(v.f)} g <span style="color:var(--mu2)">/100 g</span>` : '<span style="color:var(--f)">ohne Nährwerte</span>';

/* ---------- Overlays mit Zurück-Taste ---------- */
const stack = [];
let popWaiters = [];
function pushOverlay(el) {
  el.style.zIndex = 50 + stack.length * 2;
  stack.push(el);
  document.body.appendChild(el);
  el.getBoundingClientRect();
  requestAnimationFrame(() => el.classList.add('open'));
  history.pushState({ ov: stack.length }, '');
}
function removeOverlay(el) {
  el.classList.remove('open');
  el.dispatchEvent(new Event('closed'));
  setTimeout(() => el.remove(), 280);
}
function closeOverlays(n = 1) {
  n = Math.min(n, stack.length);
  if (n <= 0) return Promise.resolve();
  return new Promise(r => { popWaiters.push(r); history.go(-n); });
}
window.addEventListener('popstate', e => {
  const target = (e.state && e.state.ov) || 0;
  while (stack.length > target) removeOverlay(stack.pop());
  const w = popWaiters; popWaiters = []; w.forEach(f => f());
  refreshAll();
});
function openSheet({ title, full = false }) {
  const el = document.createElement('div');
  el.className = 'ov sheet' + (full ? ' full' : '');
  el.innerHTML = `<div class="scrim"></div><div class="sheet-b"><div class="grab"></div><div class="sheet-h"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Schließen">${I.x}</button></div><div class="sheet-c"></div></div>`;
  $('.scrim', el).onclick = () => closeOverlays(1);
  $('[data-close]', el).onclick = () => closeOverlays(1);
  el.content = $('.sheet-c', el);
  el.setTitle = t => { $('.sheet-h h2', el).textContent = t; };
  pushOverlay(el);
  return el;
}
function openPanel() {
  const el = document.createElement('div');
  el.className = 'ov panel';
  el.innerHTML = `<div class="panel-b"><div class="panel-in"></div></div>`;
  el.content = $('.panel-in', el);
  pushOverlay(el);
  return el;
}
function dialog({ title, text = '', buttons, input = null }) {
  return new Promise(resolve => {
    let result = null;
    const el = document.createElement('div');
    el.className = 'ov dlg';
    el.innerHTML = `<div class="scrim"></div><div class="dlg-b"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${input ? `<input value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}">` : ''}<div class="dlg-btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}<button class="btn ghost" data-i="-1">Abbrechen</button></div></div>`;
    $('.scrim', el).onclick = () => closeOverlays(1);
    $$('[data-i]', el).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i >= 0) {
        result = buttons[i].value;
        if (input) { const v = $('input', el).value.trim(); if (!v) { $('input', el).focus(); return; } result = { value: result, text: v }; }
      }
      closeOverlays(1);
    });
    el.addEventListener('closed', () => resolve(result));
    pushOverlay(el);
    if (input) setTimeout(() => $('input', el).focus(), 250);
  });
}
const confirmDlg = (title, text, label = 'Löschen', cls = 'danger') => dialog({ title, text, buttons: [{ label, value: true, cls }] });

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Hauptansicht ---------- */
function refreshAll() { renderMain(); stack.forEach(o => o.refresh && o.refresh()); }
function renderMain() {
  ({ diary: renderDiary, dishes: renderDishes, foods: renderFoods })[S.view]();
  $('#nav').innerHTML = [['diary', 'Tagebuch', I.book], ['dishes', 'Gerichte', I.pot], ['foods', 'Lebensmittel', I.leaf]]
    .map(([k, l, ic]) => `<button class="${S.view === k ? 'on' : ''}" data-view="${k}">${ic}${l}</button>`).join('');
}
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  S.view = b.dataset.view; renderMain(); window.scrollTo(0, 0);
});

function ringSvg(v, goal) {
  const r = 52, c = 2 * Math.PI * r, frac = goal ? Math.min(1, v / goal) : 0;
  return `<svg viewBox="0 0 118 118"><circle class="bg" cx="59" cy="59" r="${r}"/><circle class="fg" cx="59" cy="59" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/></svg>`;
}
function barRow(label, v, goal, color) {
  const w = goal ? Math.min(100, v / goal * 100) : 0;
  return `<div><div class="bar-h"><span>${label}</span><b>${f0(v)} <small>/ ${f0(goal)} g</small></b></div><div class="bar"><i style="width:${w}%;background:${v > goal * 1.1 ? 'var(--red)' : color}"></i></div></div>`;
}
function renderDiary() {
  const app = $('#app');
  const sel = fromKey(S.sel), mon = weekStart(sel), tk = todayKey();
  const day = getDay(S.sel), n = dayN(day), g = S.settings.goals;
  const rel = relLabel(S.sel);
  const leftK = g.kcal - n.kcal, leftP = g.p - n.p;
  app.innerHTML = `
    <header class="top">
      <div class="kw"><span class="kw-num">KW ${isoWeek(sel)}</span><span class="kw-range">${rangeLabel(mon)}</span></div>
      <div class="top-actions">
        ${S.sel !== tk ? '<button class="chip" data-act="today">Heute</button>' : ''}
        <button class="icon-btn" data-act="prevW" aria-label="Vorherige Woche">${I.chevL}</button>
        <button class="icon-btn" data-act="nextW" aria-label="Nächste Woche">${I.chevR}</button>
        <button class="icon-btn" data-act="settings" aria-label="Einstellungen">${I.gear}</button>
      </div>
    </header>
    <nav class="week">${[0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = addDays(mon, i), k = keyOf(d);
      return `<button class="wd ${k === S.sel ? 'sel' : ''} ${k === tk ? 'today' : ''}" data-act="day" data-k="${k}"><span>${WD[i]}</span><b>${d.getDate()}</b><i class="${dayHasData(k) ? 'on' : ''}"></i></button>`;
    }).join('')}</nav>
    <h1 class="day-title">${rel ? `<b>${rel}</b>·` : ''} ${longDate(S.sel)}</h1>
    <section class="card summary">
      <div class="ring ${n.kcal > g.kcal * 1.1 ? 'over' : ''}">${ringSvg(n.kcal, g.kcal)}<div class="ring-c"><b>${f0(n.kcal)}</b><span>von ${f0(g.kcal)} kcal</span></div></div>
      <div class="bars">${barRow('Eiweiß', n.p, g.p, 'var(--p)')}${barRow('Kohlenhydrate', n.c, g.c, 'var(--c)')}${barRow('Fett', n.f, g.f, 'var(--f)')}</div>
    </section>
    <div class="remain">
      ${leftK >= 0 ? `<span class="pill">Noch <b>${f0(leftK)} kcal</b></span>` : `<span class="pill warn"><b>${f0(-leftK)} kcal</b> über Ziel</span>`}
      ${leftP > 0 ? `<span class="pill">Noch <b>${f0(leftP)} g Eiweiß</b></span>` : `<span class="pill ok">Eiweißziel erreicht</span>`}
      ${n.unknown ? `<span class="pill warn">${n.unknown} ${n.unknown === 1 ? 'Eintrag' : 'Einträge'} ohne Werte</span>` : ''}
    </div>
    <section class="meals">${MEALS.map(m => {
      const md = day.meals[m.k], mn = mealN(md);
      const names = md.items.map(it => it.name).join(', ');
      const empty = !md.items.length && !md.photos.length;
      return `<button class="meal" data-act="meal" data-m="${m.k}">
        <span class="m-ic m-${m.k}">${m.icon}</span>
        <span class="m-main"><b>${m.l}</b><small>${empty ? 'Noch nichts eingetragen' : esc(names || 'Nur Fotos')}</small>
          ${md.photos.length || mn.unknown ? `<span class="m-meta">${md.photos.length ? `${I.camera}${md.photos.length}` : ''}${mn.unknown ? `<span style="color:var(--f)">${mn.unknown}× ohne Werte</span>` : ''}</span>` : ''}
        </span>
        ${empty ? `<span class="m-add">${I.plus}</span>` : `<span class="m-side"><b>${f0(mn.kcal)}</b><small>kcal · ${f0(mn.p)} g P</small></span>`}
      </button>`;
    }).join('')}</section>
    <div class="share-row">
      <button class="btn primary big" data-act="share">${I.share} Tag teilen</button>
      <button class="btn ghost big" data-act="copy" aria-label="Text kopieren">${I.copy}</button>
    </div>`;
}
$('#app').addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (S.view === 'diary') {
    if (act === 'day') { S.sel = a.dataset.k; renderMain(); }
    else if (act === 'today') { S.sel = todayKey(); renderMain(); }
    else if (act === 'prevW') { S.sel = keyOf(addDays(fromKey(S.sel), -7)); renderMain(); }
    else if (act === 'nextW') { S.sel = keyOf(addDays(fromKey(S.sel), 7)); renderMain(); }
    else if (act === 'meal') openMeal(S.sel, a.dataset.m);
    else if (act === 'share') shareDay(S.sel);
    else if (act === 'copy') copyDay(S.sel);
    else if (act === 'settings') openSettings();
  } else if (S.view === 'dishes') {
    if (act === 'newDish') openRecipeEditor(null);
    else if (act === 'dish') openRecipeEditor(S.dishes.find(d => d.id === a.dataset.id));
  } else if (S.view === 'foods') {
    if (act === 'newFood') openFoodEditor({ name: S.foodQuery });
    else if (act === 'food') openFoodEditor({ food: foodById(a.dataset.id) });
    else if (act === 'filter') { S.foodFilter = a.dataset.f; renderFoods(); }
  }
});
$('#app').addEventListener('input', e => {
  if (e.target.id === 'foodQ') { S.foodQuery = e.target.value; renderFoodList(); }
  if (e.target.id === 'dishQ') { S.dishQuery = e.target.value; renderDishList(); }
});

/* ---------- Mahlzeit-Ansicht ---------- */
const photoUrls = {};
async function photoUrl(id) {
  if (photoUrls[id]) return photoUrls[id];
  const b = await DB.get(id, 'photos'); if (!b) return '';
  return (photoUrls[id] = URL.createObjectURL(b));
}
function fillThumbs(root) {
  $$('img[data-pid]', root).forEach(async img => { img.src = await photoUrl(img.dataset.pid); });
}
function itemRow(it, i) {
  const n = itemN(it);
  const sub = it.type === 'dish'
    ? `<span class="badge ac" style="margin:0 6px 0 0">Gericht</span>${dishAmountLabel(it)}`
    : `${f0(num(it.g))} g`;
  return `<button class="item" data-act="item" data-i="${i}">
    <span class="row-main"><b>${esc(it.name)}${n.unknown ? '<span class="badge warn">ohne Werte</span>' : ''}</b><small>${sub}</small></span>
    <span class="row-side"><b>${f0(n.kcal)}</b>kcal · ${f0(n.p)} g P</span>
  </button>`;
}
function openMeal(dk, mk) {
  const ov = openPanel();
  const render = () => {
    const md = getDay(dk).meals[mk], n = mealN(md);
    const foodsCount = md.items.filter(i => i.type === 'food').length;
    ov.content.innerHTML = `
      <header class="ph"><button class="icon-btn" data-act="back" aria-label="Zurück">${I.back}</button><div><h2>${mealLabel(mk)}</h2><p>${longDate(dk)}</p></div></header>
      <div class="macro-strip"><div class="mac k"><b>${f0(n.kcal)}</b><span>kcal</span></div><div class="mac p"><b>${f0(n.p)}</b><span>g Eiweiß</span></div><div class="mac c"><b>${f0(n.c)}</b><span>g Kohlenh.</span></div><div class="mac f"><b>${f0(n.f)}</b><span>g Fett</span></div></div>
      ${md.items.length ? `<div class="items">${md.items.map(itemRow).join('')}</div>` : '<div class="empty"><b>Noch leer</b>Füge ein Lebensmittel oder ein gespeichertes Gericht hinzu.</div>'}
      <div class="btn-row"><button class="btn" data-act="addFood">${I.plus} Lebensmittel</button><button class="btn" data-act="addDish">${I.plus} Gericht</button></div>
      <div class="sec-h"><h3>Fotos</h3>${md.photos.length ? `<span class="muted">${md.photos.length}</span>` : ''}</div>
      ${md.photos.length ? `<div class="thumbs">${md.photos.map(id => `<button class="thumb" data-act="photo" data-id="${id}"><img data-pid="${id}" alt=""></button>`).join('')}</div>` : ''}
      <div class="btn-row">
        <label class="btn ghost file-btn">${I.camera} Kamera<input type="file" accept="image/*" capture="environment" data-photo></label>
        <label class="btn ghost file-btn">${I.image} Galerie<input type="file" accept="image/*" multiple data-photo></label>
      </div>
      ${foodsCount >= 2 ? `<button class="btn ghost full" style="margin-top:22px" data-act="asDish">${I.save} Als Gericht speichern</button>` : ''}`;
    fillThumbs(ov.content);
  };
  ov.refresh = render;
  ov.content.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const md = getDay(dk).meals[mk];
    switch (a.dataset.act) {
      case 'back': closeOverlays(1); break;
      case 'addFood': openFoodPicker({
        title: mealLabel(mk) + ' – hinzufügen',
        onPick: food => openGrams({
          food, onConfirm: g => {
            md.items.push({ id: uid(), type: 'food', foodId: food.id || null, name: food.name, g, per100: food.id ? p100(food) : null });
            if (food.id) bump(food.id);
            saveDay(dk); toast(`${food.name} hinzugefügt`);
          },
        }),
      }); break;
      case 'addDish': openDishPicker(dk, mk); break;
      case 'item': {
        const i = +a.dataset.i, it = md.items[i];
        if (it.type === 'dish') openDishEntry({ dk, mk, entry: it, isNew: false });
        else openGrams({
          food: { id: it.foodId, name: it.name, per100: it.per100, piece: foodById(it.foodId)?.piece, pieceLabel: foodById(it.foodId)?.pieceLabel },
          g: num(it.g), confirmLabel: 'Speichern',
          onConfirm: g => { it.g = g; saveDay(dk); },
          onDelete: () => { md.items.splice(md.items.indexOf(it), 1); saveDay(dk); toast('Entfernt'); },
          onAddValues: async () => {
            await closeOverlays(1);
            openFoodEditor({ name: it.name, onSaved: f => { it.foodId = f.id; it.per100 = p100(f); saveDay(dk); refreshAll(); } });
          },
        });
        break;
      }
      case 'photo': openPhoto(dk, mk, a.dataset.id); break;
      case 'asDish': saveMealAsDish(md); break;
    }
  });
  ov.content.addEventListener('change', async e => {
    if (!e.target.matches('[data-photo]')) return;
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    toast('Foto wird gespeichert …');
    const md = getDay(dk).meals[mk];
    for (const f of files) {
      try { const blob = await compressImage(f); const id = uid(); await DB.set(id, blob, 'photos'); md.photos.push(id); }
      catch (err) { toast('Foto konnte nicht gelesen werden'); }
    }
    saveDay(dk); refreshAll(); toast(files.length > 1 ? `${files.length} Fotos gespeichert` : 'Foto gespeichert');
  });
  render();
}
async function saveMealAsDish(md) {
  const r = await dialog({ title: 'Als Gericht speichern', text: 'Alle einzelnen Lebensmittel dieser Mahlzeit werden zu einem Gericht zusammengefasst.', input: { placeholder: 'Name, z. B. Reispudding' }, buttons: [{ label: 'Speichern', value: true, cls: 'primary' }] });
  if (!r) return;
  const ings = md.items.filter(i => i.type === 'food').map(i => ({ foodId: i.foodId, name: i.name, g: num(i.g), per100: i.per100 }));
  S.dishes.push({ id: uid(), name: r.text, ingredients: ings, cookedWeight: null });
  saveDishes(); toast(`Gericht „${r.text}“ gespeichert`);
}

/* ---------- Fotos ---------- */
function compressImage(file, max = 1280, q = 0.78) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
async function openPhoto(dk, mk, id) {
  const el = document.createElement('div');
  el.className = 'ov viewer';
  el.innerHTML = `<div class="viewer-bar"><button class="btn" data-a="close">${I.back} Zurück</button><button class="btn danger" data-a="del">${I.trash} Löschen</button></div><img alt="">`;
  pushOverlay(el);
  $('img', el).src = await photoUrl(id);
  $('[data-a=close]', el).onclick = () => closeOverlays(1);
  $('[data-a=del]', el).onclick = async () => {
    if (!await confirmDlg('Foto löschen?', 'Das Foto wird aus der Mahlzeit entfernt.')) return;
    const md = getDay(dk).meals[mk];
    md.photos = md.photos.filter(x => x !== id);
    await DB.del(id, 'photos').catch(() => { });
    saveDay(dk); await closeOverlays(1); toast('Foto gelöscht');
  };
}

/* ---------- Lebensmittel-Auswahl ---------- */
function foodRow(f, act = 'pick') {
  const tag = f.custom ? '<span class="badge ac">eigen</span>' : f.overridden ? '<span class="badge">angepasst</span>' : '';
  return `<button class="row" data-act="${act}" data-id="${f.id}"><span class="row-main"><b>${esc(f.name)}${tag}</b><small>${f0(f.kcal)} kcal · P ${f1(f.p)} · KH ${f1(f.c)} · F ${f1(f.f)} g /100 g</small></span></button>`;
}
function openFoodPicker({ title, onPick }) {
  const sh = openSheet({ title, full: true });
  let q = '';
  sh.content.innerHTML = `<div class="search">${I.search}<input placeholder="Lebensmittel suchen …" autocomplete="off" enterkeyhint="search"></div><div class="res"></div><div class="picked"><button class="btn primary full" data-act="done">Fertig</button></div>`;
  const inp = $('input', sh.content), res = $('.res', sh.content);
  const render = () => {
    const nq = q.trim();
    let html = '';
    if (!nq) {
      const rec = S.recent.map(foodById).filter(Boolean).slice(0, 15);
      if (rec.length) html += `<div class="list-label">Zuletzt verwendet</div><div class="list">${rec.map(f => foodRow(f)).join('')}</div>`;
      html += `<div class="list-label">Alle Lebensmittel</div><div class="list">${searchFoods('').sort((a, b) => a.name.localeCompare(b.name, 'de')).slice(0, 60).map(f => foodRow(f)).join('')}</div><p class="muted" style="text-align:center;margin-top:10px">Tippe oben, um alle ${allFoods().length} Lebensmittel zu durchsuchen.</p>`;
    } else {
      const r = searchFoods(nq).slice(0, 50);
      html += r.length ? `<div class="list" style="margin-top:4px">${r.map(f => foodRow(f)).join('')}</div>` : '<div class="empty">Nichts gefunden.</div>';
      html += `<div class="list-label">Nicht dabei?</div><div class="list">
        <button class="row" data-act="adhoc"><span class="row-main"><b>„${esc(nq)}“ ohne Nährwerte eintragen</b><small>Claude schätzt die Werte bei der Auswertung</small></span></button>
        <button class="row" data-act="create"><span class="row-main"><b>„${esc(nq)}“ als Lebensmittel anlegen</b><small>Nährwerte von der Verpackung eintragen</small></span></button></div>`;
    }
    res.innerHTML = html;
  };
  inp.addEventListener('input', () => { q = inp.value; render(); });
  sh.content.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'done') closeOverlays(1);
    else if (a.dataset.act === 'pick') onPick(foodById(a.dataset.id));
    else if (a.dataset.act === 'adhoc') onPick({ id: null, name: q.trim(), per100: null });
    else if (a.dataset.act === 'create') openFoodEditor({ name: q.trim(), onSaved: f => setTimeout(() => onPick(f), 300) });
  });
  sh.refresh = render;
  render();
  setTimeout(() => inp.focus(), 300);
}

/* ---------- Grammeingabe ---------- */
function openGrams({ food, g = null, confirmLabel = 'Hinzufügen', onConfirm, onDelete, onAddValues }) {
  const v = food.per100 !== undefined ? food.per100 : p100(food);
  const sh = openSheet({ title: food.name });
  let val = g ?? (food.piece || 100);
  const quick = food.piece ? [1, 2, 3].map(x => [x * food.piece, `${x} ${food.pieceLabel || 'Stück'}`]) : [];
  [50, 100, 150, 200, 250].forEach(x => quick.push([x, `${x} g`]));
  sh.content.innerHTML = `
    <div class="info">${per100Line(v)}${food.piece ? `<br>1 ${esc(food.pieceLabel || 'Stück')} ≈ ${f0(food.piece)} g` : ''}</div>
    ${!v ? `<div class="info warn">Ohne Nährwerte – wird beim Auswerten anhand Menge und Foto geschätzt.${onAddValues ? ' <button class="chip" data-act="addValues" style="margin-top:8px;display:inline-block">Nährwerte nachtragen</button>' : ''}</div>` : ''}
    <div class="inp-g inp-big"><input inputmode="decimal" value="${f1(val)}" aria-label="Menge in Gramm"><em>g</em></div>
    <div class="chips">${quick.map(([x, l]) => `<button class="chip" data-g="${x}">${esc(l)}</button>`).join('')}</div>
    <div class="nb"></div>
    <div class="sheet-actions">${onDelete ? `<button class="btn danger" data-act="del">${I.trash}</button>` : ''}<button class="btn primary" data-act="ok">${confirmLabel}</button></div>`;
  const inp = $('input', sh.content), nb = $('.nb', sh.content);
  const upd = () => { const x = num(inp.value) || 0; nb.innerHTML = v ? nutBox(per(v, x)) : ''; $$('.chip[data-g]', sh.content).forEach(c => c.classList.toggle('on', Math.abs(+c.dataset.g - x) < 0.01)); };
  inp.addEventListener('input', upd);
  inp.addEventListener('focus', () => inp.select());
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-act=ok]', sh.content).click(); });
  sh.content.addEventListener('click', async e => {
    const c = e.target.closest('[data-g]'); if (c) { inp.value = f1(+c.dataset.g); upd(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'ok') {
      const x = num(inp.value);
      if (!(x > 0)) { inp.focus(); toast('Bitte eine Menge eingeben'); return; }
      onConfirm(Math.round(x * 10) / 10); await closeOverlays(1);
    } else if (a.dataset.act === 'del') {
      if (!await confirmDlg('Eintrag entfernen?', food.name)) return;
      onDelete(); await closeOverlays(1);
    } else if (a.dataset.act === 'addValues') onAddValues();
  });
  upd();
  if (g === null) setTimeout(() => { inp.focus(); inp.select(); }, 300);
}

/* ---------- Zutatenliste (Gericht) ---------- */
function ingRowsHtml(ings) {
  if (!ings.length) return '<div class="empty" style="padding:16px">Noch keine Zutaten.</div>';
  return ings.map((g, i) => `<div class="ing">
    <span class="ing-n">${esc(g.name)}<small id="ik${i}"></small></span>
    <span class="inp-g"><input inputmode="decimal" data-ing="${i}" value="${f1(num(g.g) || 0)}"><em>g</em></span>
    <button class="icon-btn sm" data-act="rmIng" data-i="${i}" aria-label="Entfernen">${I.x}</button></div>`).join('');
}
function ingKcalUpdate(root, ings) {
  ings.forEach((g, i) => { const el = $('#ik' + i, root); if (el) el.textContent = g.per100 ? `${f0(per(g.per100, num(g.g) || 0).kcal)} kcal · ${f1(per(g.per100, num(g.g) || 0).p)} g P` : 'ohne Nährwerte'; });
}
function pickIngredient(ings, onChange) {
  openFoodPicker({
    title: 'Zutat hinzufügen',
    onPick: food => openGrams({
      food, onConfirm: g => {
        ings.push({ foodId: food.id || null, name: food.name, g, per100: food.id ? p100(food) : null });
        if (food.id) bump(food.id);
        onChange(); toast(`${food.name} hinzugefügt`);
      },
    }),
  });
}
const sameIngs = (a, b) => a.length === b.length && a.every((x, i) => (x.foodId || x.name) === (b[i].foodId || b[i].name) && Math.abs((num(x.g) || 0) - (num(b[i].g) || 0)) < 0.05);

/* ---------- Gericht-Eintrag (im Tagebuch) ---------- */
function newEntryFromDish(d) {
  return {
    id: uid(), type: 'dish', dishId: d.id, name: d.name,
    ingredients: d.ingredients.map(i => ({ ...clone(i), per100: resolveP100(i) })),
    mode: 'portion', factor: 1, amt: '', total: d.cookedWeight || '',
  };
}
function openDishEntry({ dk, mk, entry, isNew }) {
  const e = clone(entry);
  const sh = openSheet({ title: e.name, full: true });
  const render = () => {
    const tot = num(e.total) || sumG(e.ingredients);
    sh.content.innerHTML = `
      <div class="seg">${[['portion', 'Portion'], ['eaten', 'Gegessen'], ['left', 'Rest übrig']].map(([m, l]) => `<button class="${e.mode === m ? 'on' : ''}" data-act="mode" data-m="${m}">${l}</button>`).join('')}</div>
      ${e.mode === 'portion'
        ? `<div class="chips" style="margin-top:0">${FRAC.map(([v, l]) => `<button class="chip ${Math.abs(v - (num(e.factor) || 0)) < 0.01 ? 'on' : ''}" data-act="fac" data-v="${v}">${l}</button>`).join('')}</div>
           <label class="field"><span>Oder eigener Faktor</span><input data-f="factor" inputmode="decimal" value="${f1(num(e.factor) || 0)}"></label>`
        : `<div class="grid2">
             <label class="field"><span>${e.mode === 'eaten' ? 'Gegessen' : 'Übrig geblieben'}</span><span class="inp-g"><input data-f="amt" inputmode="decimal" value="${esc(e.amt)}" placeholder="0"><em>g</em></span></label>
             <label class="field"><span>Ganzes Gericht</span><span class="inp-g"><input data-f="total" inputmode="decimal" value="${f1(tot)}"><em>g</em></span></label>
           </div>
           <p class="muted" style="margin:-6px 0 12px">Am besten das Gewicht nach dem Kochen eintragen (Topf/Schüssel abgezogen) – Summe der Zutaten: ${f0(sumG(e.ingredients))} g.</p>`}
      <div class="nb"></div>
      <div class="sec-h" style="margin-top:6px"><h3>Zutaten (ganzes Gericht)</h3></div>
      <div class="ings">${ingRowsHtml(e.ingredients)}</div>
      <div class="adder"><button class="btn ghost" data-act="addIng">${I.plus} Zutat</button></div>
      <div class="sheet-actions">${!isNew ? `<button class="btn danger" data-act="del">${I.trash}</button>` : ''}<button class="btn primary" data-act="save">${isNew ? 'Hinzufügen' : 'Speichern'}</button></div>`;
    upd();
  };
  const upd = () => {
    const n = ingsN(e.ingredients), k = dishFactor(e);
    $('.nb', sh.content).innerHTML = nutBox({ kcal: n.kcal * k, p: n.p * k, c: n.c * k, f: n.f * k }) + (n.unknown ? `<div class="info warn" style="margin-top:-8px">${n.unknown} Zutat(en) ohne Nährwerte</div>` : '');
    ingKcalUpdate(sh.content, e.ingredients);
  };
  sh.content.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.ing !== undefined) e.ingredients[+t.dataset.ing].g = num(t.value) || 0;
    else if (t.dataset.f === 'factor') { e.factor = num(t.value) || 0; $$('[data-act=fac]', sh.content).forEach(c => c.classList.toggle('on', Math.abs(+c.dataset.v - e.factor) < 0.01)); }
    else if (t.dataset.f === 'amt') e.amt = t.value;
    else if (t.dataset.f === 'total') e.total = t.value;
    upd();
  });
  sh.content.addEventListener('click', async ev => {
    const a = ev.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'mode') { e.mode = a.dataset.m; if (e.mode === 'portion' && !(num(e.factor) > 0)) e.factor = 1; render(); }
    else if (act === 'fac') { e.factor = +a.dataset.v; render(); }
    else if (act === 'rmIng') { e.ingredients.splice(+a.dataset.i, 1); render(); }
    else if (act === 'addIng') pickIngredient(e.ingredients, render);
    else if (act === 'del') {
      if (!await confirmDlg('Eintrag entfernen?', e.name)) return;
      const md = getDay(dk).meals[mk]; md.items = md.items.filter(x => x.id !== e.id); saveDay(dk);
      await closeOverlays(1); toast('Entfernt');
    } else if (act === 'save') {
      if (!(dishFactor(e) > 0)) { toast('Bitte eine Menge angeben'); return; }
      const recipe = S.dishes.find(d => d.id === e.dishId);
      if (recipe && !sameIngs(recipe.ingredients, e.ingredients)) {
        const c = await dialog({
          title: 'Zutaten geändert', text: 'Gilt die Änderung nur für heute oder soll das gespeicherte Rezept angepasst werden?',
          buttons: [{ label: 'Nur für heute', value: 'today' }, { label: 'Ins Rezept übernehmen', value: 'recipe', cls: 'primary' }],
        });
        if (!c) return;
        if (c === 'recipe') {
          recipe.ingredients = e.ingredients.map(i => ({ foodId: i.foodId, name: i.name, g: num(i.g) || 0, per100: i.per100 }));
          if (num(e.total) > 0) recipe.cookedWeight = num(e.total);
          saveDishes(); toast('Rezept aktualisiert');
        }
      }
      const md = getDay(dk).meals[mk];
      const idx = md.items.findIndex(x => x.id === e.id);
      if (idx >= 0) md.items[idx] = e; else { md.items.push(e); S.usage['d:' + e.dishId] = (S.usage['d:' + e.dishId] || 0) + 1; saveUsage(); }
      saveDay(dk);
      await closeOverlays(isNew ? 2 : 1);
      if (isNew) toast(`${e.name} hinzugefügt`);
    }
  });
  render();
}
function openDishPicker(dk, mk) {
  const sh = openSheet({ title: 'Gericht hinzufügen', full: true });
  const render = () => {
    const list = [...S.dishes].sort((a, b) => (S.usage['d:' + b.id] || 0) - (S.usage['d:' + a.id] || 0) || a.name.localeCompare(b.name, 'de'));
    sh.content.innerHTML = list.length
      ? `<div class="list">${list.map(d => { const n = ingsN(d.ingredients.map(i => ({ ...i, per100: resolveP100(i) }))); return `<button class="row" data-act="pick" data-id="${d.id}"><span class="row-main"><b>${esc(d.name)}</b><small>${d.ingredients.length} Zutaten${d.cookedWeight ? ` · ${f0(d.cookedWeight)} g fertig` : ''}</small></span><span class="row-side"><b>${f0(n.kcal)}</b>kcal · ${f0(n.p)} g P</span></button>`; }).join('')}</div>
         <button class="btn ghost full" style="margin-top:14px" data-act="new">${I.plus} Neues Gericht anlegen</button>`
      : `<div class="empty"><b>Noch keine Gerichte</b>Lege Gerichte an, die du öfter isst – z. B. deinen Reispudding.</div><button class="btn primary full" data-act="new">${I.plus} Neues Gericht anlegen</button>`;
  };
  sh.refresh = render;
  sh.content.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'pick') openDishEntry({ dk, mk, entry: newEntryFromDish(S.dishes.find(d => d.id === a.dataset.id)), isNew: true });
    else if (a.dataset.act === 'new') openRecipeEditor(null);
  });
  render();
}

/* ---------- Gerichte (Rezepte) ---------- */
function renderDishes() {
  $('#app').innerHTML = `
    <div class="view-h"><h1>Gerichte</h1><button class="btn primary" data-act="newDish" style="min-height:40px;padding:8px 14px">${I.plus} Neu</button></div>
    ${S.dishes.length > 5 ? `<div class="search">${I.search}<input id="dishQ" placeholder="Gericht suchen …" value="${esc(S.dishQuery)}"></div>` : ''}
    <div id="dishList"></div>`;
  renderDishList();
}
function renderDishList() {
  const el = $('#dishList'); if (!el) return;
  const q = norm(S.dishQuery.trim());
  const list = S.dishes.filter(d => !q || norm(d.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  el.innerHTML = list.length ? `<div class="list">${list.map(d => {
    const ings = d.ingredients.map(i => ({ ...i, per100: resolveP100(i) })), n = ingsN(ings);
    return `<button class="row" data-act="dish" data-id="${d.id}"><span class="row-main"><b>${esc(d.name)}</b><small>${esc(d.ingredients.map(i => i.name).join(', ')) || 'keine Zutaten'}</small></span><span class="row-side"><b>${f0(n.kcal)}</b>kcal · ${f0(n.p)} g P</span></button>`;
  }).join('')}</div><p class="muted" style="text-align:center;margin-top:12px">Werte gelten für das ganze Gericht.</p>`
    : `<div class="empty"><b>${S.dishes.length ? 'Nichts gefunden' : 'Noch keine Gerichte'}</b>Gerichte, die du öfter isst, legst du hier einmal an und fügst sie dann mit einem Tipp hinzu.</div>`;
}
function openRecipeEditor(dish) {
  const isNew = !dish;
  const d = dish ? clone(dish) : { id: uid(), name: '', ingredients: [], cookedWeight: null };
  d.ingredients.forEach(i => i.per100 = resolveP100(i));
  const sh = openSheet({ title: isNew ? 'Neues Gericht' : 'Gericht bearbeiten', full: true });
  const render = () => {
    sh.content.innerHTML = `
      <label class="field"><span>Name</span><input data-f="name" value="${esc(d.name)}" placeholder="z. B. Hähnchen mit Reis"></label>
      <div class="sec-h" style="margin-top:4px"><h3>Zutaten</h3><span class="muted">${f0(sumG(d.ingredients))} g</span></div>
      <div class="ings">${ingRowsHtml(d.ingredients)}</div>
      <div class="adder"><button class="btn ghost" data-act="addIng">${I.plus} Zutat hinzufügen</button></div>
      <label class="field" style="margin-top:16px"><span>Gewicht fertig gekocht (optional)</span><span class="inp-g"><input data-f="cw" inputmode="decimal" value="${d.cookedWeight ? f1(d.cookedWeight) : ''}" placeholder="z. B. 900"><em>g</em></span><small>Hilft später beim Eintragen: „100 g gegessen“ oder „200 g übrig“.</small></label>
      <div class="sec-h"><h3>Nährwerte ganzes Gericht</h3></div>
      <div class="nb"></div>
      <div class="sheet-actions">${!isNew ? `<button class="btn danger" data-act="del">${I.trash}</button>` : ''}<button class="btn primary" data-act="save">Speichern</button></div>`;
    upd();
  };
  const upd = () => {
    const n = ingsN(d.ingredients);
    const cw = num(d.cookedWeight);
    $('.nb', sh.content).innerHTML = nutBox(n) + (cw > 0 ? `<p class="muted" style="margin:-8px 0 0;text-align:center">pro 100 g fertig: ${f0(n.kcal / cw * 100)} kcal · ${f1(n.p / cw * 100)} g Eiweiß</p>` : '') + (n.unknown ? `<div class="info warn" style="margin-top:10px">${n.unknown} Zutat(en) ohne Nährwerte</div>` : '');
    ingKcalUpdate(sh.content, d.ingredients);
  };
  sh.content.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.ing !== undefined) { d.ingredients[+t.dataset.ing].g = num(t.value) || 0; upd(); }
    else if (t.dataset.f === 'name') d.name = t.value;
    else if (t.dataset.f === 'cw') { d.cookedWeight = num(t.value) || null; upd(); }
  });
  sh.content.addEventListener('click', async ev => {
    const a = ev.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'rmIng') { d.ingredients.splice(+a.dataset.i, 1); render(); }
    else if (a.dataset.act === 'addIng') pickIngredient(d.ingredients, render);
    else if (a.dataset.act === 'del') {
      if (!await confirmDlg('Gericht löschen?', `„${d.name}“ wird gelöscht. Bereits eingetragene Mahlzeiten bleiben erhalten.`)) return;
      S.dishes = S.dishes.filter(x => x.id !== d.id); saveDishes(); await closeOverlays(1); toast('Gericht gelöscht');
    } else if (a.dataset.act === 'save') {
      if (!d.name.trim()) { $('[data-f=name]', sh.content).focus(); toast('Bitte einen Namen eingeben'); return; }
      if (!d.ingredients.length) { toast('Bitte mindestens eine Zutat hinzufügen'); return; }
      d.name = d.name.trim();
      const i = S.dishes.findIndex(x => x.id === d.id);
      if (i >= 0) S.dishes[i] = d; else S.dishes.push(d);
      saveDishes(); await closeOverlays(1); toast('Gericht gespeichert');
    }
  });
  render();
  if (isNew) setTimeout(() => $('[data-f=name]', sh.content)?.focus(), 300);
}

/* ---------- Lebensmittel ---------- */
function renderFoods() {
  $('#app').innerHTML = `
    <div class="view-h"><h1>Lebensmittel</h1><button class="btn primary" data-act="newFood" style="min-height:40px;padding:8px 14px">${I.plus} Neu</button></div>
    <div class="search">${I.search}<input id="foodQ" placeholder="Suchen …" value="${esc(S.foodQuery)}" autocomplete="off"></div>
    <div class="chips" style="margin-top:0">${[['all', 'Alle'], ['own', 'Eigene & angepasste']].map(([k, l]) => `<button class="chip ${S.foodFilter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
    <div id="foodList"></div>`;
  renderFoodList();
}
function renderFoodList() {
  const el = $('#foodList'); if (!el) return;
  let list = searchFoods(S.foodQuery.trim());
  if (S.foodFilter === 'own') list = list.filter(f => f.custom || f.overridden);
  if (S.foodQuery.trim()) { el.innerHTML = list.length ? `<div class="list">${list.map(f => foodRow(f, 'food')).join('')}</div>` : `<div class="empty"><b>Nichts gefunden</b>Lege „${esc(S.foodQuery.trim())}“ über „Neu“ an.</div>`; return; }
  const groups = {};
  list.forEach(f => (groups[f.cat || 'Eigene'] ||= []).push(f));
  el.innerHTML = CATS.filter(c => groups[c]).map(c => `<div class="list-label">${esc(c)}</div><div class="list">${groups[c].sort((a, b) => a.name.localeCompare(b.name, 'de')).map(f => foodRow(f, 'food')).join('')}</div>`).join('')
    || '<div class="empty"><b>Noch keine eigenen Lebensmittel</b>Eigene oder angepasste Lebensmittel erscheinen hier.</div>';
}
function openFoodEditor({ food = null, name = '', onSaved }) {
  const f = food ? { ...food } : { name, cat: 'Eigene', kcal: '', p: '', c: '', f: '', piece: '', pieceLabel: '' };
  const sh = openSheet({ title: food ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel' });
  const fld = (k, l, u = 'g') => `<label class="field"><span>${l}</span><span class="inp-g"><input data-f="${k}" inputmode="decimal" value="${f[k] === '' || f[k] == null ? '' : f1(f[k])}" placeholder="0"><em>${u}</em></span></label>`;
  sh.content.innerHTML = `
    <label class="field"><span>Name</span><input data-f="name" value="${esc(f.name)}" placeholder="z. B. Lieblings-Müsli"></label>
    <label class="field"><span>Kategorie</span><select data-f="cat">${CATS.map(c => `<option ${c === f.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <div class="sec-h" style="margin-top:4px"><h3>Nährwerte pro 100 g / 100 ml</h3></div>
    <div class="grid2">${fld('kcal', 'Kalorien', 'kcal')}${fld('p', 'Eiweiß')}${fld('c', 'Kohlenhydrate')}${fld('f', 'Fett')}</div>
    <p class="muted" style="margin:-4px 0 14px">Kalorien leer lassen → werden aus Eiweiß, Kohlenhydraten und Fett berechnet.</p>
    <div class="sec-h" style="margin-top:4px"><h3>Stück / Portion (optional)</h3></div>
    <div class="grid2">${fld('piece', 'Gewicht')}<label class="field"><span>Bezeichnung</span><input data-f="pieceLabel" value="${esc(f.pieceLabel || '')}" placeholder="z. B. Scheibe"></label></div>
    <div class="sheet-actions">
      ${food && food.custom ? `<button class="btn danger" data-act="del">${I.trash}</button>` : ''}
      ${food && food.builtin && food.overridden ? '<button class="btn" data-act="reset">Standard</button>' : ''}
      ${food && food.builtin ? '<button class="btn" data-act="hide">Ausblenden</button>' : ''}
      <button class="btn primary" data-act="save">Speichern</button>
    </div>
    ${food && food.builtin ? '<p class="muted" style="margin-top:12px">Standardwerte sind Richtwerte. Für genaue Werte einfach die Angaben von deiner Verpackung eintragen.</p>' : ''}`;
  const val = k => $(`[data-f=${k}]`, sh.content).value;
  sh.content.addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'save') {
      const nm = val('name').trim();
      if (!nm) { $('[data-f=name]', sh.content).focus(); toast('Bitte einen Namen eingeben'); return; }
      const P = num(val('p')) || 0, C = num(val('c')) || 0, F = num(val('f')) || 0;
      let K = num(val('kcal')); if (isNaN(K)) K = Math.round(P * 4 + C * 4 + F * 9);
      const data = { name: nm, cat: val('cat'), kcal: K, p: P, c: C, f: F, piece: num(val('piece')) || null, pieceLabel: val('pieceLabel').trim() || null };
      let saved;
      if (food && food.builtin) { S.overrides[food.id] = data; saved = { ...food, ...data, overridden: true }; }
      else if (food && food.custom) { Object.assign(S.customFoods.find(x => x.id === food.id), data); saved = foodById(food.id); }
      else { saved = { id: 'c:' + uid(), custom: true, ...data }; S.customFoods.push(saved); }
      saveFoods(); await closeOverlays(1); toast('Gespeichert');
      onSaved && onSaved(saved);
    } else if (a.dataset.act === 'del') {
      if (!await confirmDlg('Lebensmittel löschen?', `„${food.name}“ wird gelöscht. Einträge im Tagebuch bleiben erhalten.`)) return;
      S.customFoods = S.customFoods.filter(x => x.id !== food.id); saveFoods(); await closeOverlays(1); toast('Gelöscht');
    } else if (a.dataset.act === 'reset') {
      delete S.overrides[food.id]; saveFoods(); await closeOverlays(1); toast('Auf Standardwerte zurückgesetzt');
    } else if (a.dataset.act === 'hide') {
      if (!await confirmDlg('Ausblenden?', `„${food.name}“ erscheint nicht mehr in der Suche.`, 'Ausblenden', 'primary')) return;
      S.hidden.push(food.id); saveFoods(); await closeOverlays(1); toast('Ausgeblendet');
    }
  });
  if (!food) setTimeout(() => $(name ? '[data-f=kcal]' : '[data-f=name]', sh.content)?.focus(), 300);
}

/* ---------- Export / Teilen ---------- */
function buildExport(dk) {
  const day = getDay(dk), n = dayN(day), g = S.settings.goals, d = fromKey(dk);
  const L = [];
  const nl = x => `${f0(x.kcal)} kcal | P ${f0(x.p)} g | KH ${f0(x.c)} g | F ${f0(x.f)} g`;
  L.push(`Ernährungsprotokoll – ${WDL[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} (KW ${isoWeek(d)})`);
  const missing = [];
  for (const m of MEALS) {
    const md = day.meals[m.k];
    L.push('');
    if (!md.items.length && !md.photos.length) { L.push(`${m.l.toUpperCase()}: nichts eingetragen`); continue; }
    L.push(`${m.l.toUpperCase()} – ${nl(mealN(md))}`);
    for (const it of md.items) {
      const x = itemN(it);
      if (it.type === 'dish') {
        L.push(`- Gericht „${it.name}“ – ${dishAmountLabel(it)} (${f0(x.kcal)} kcal, P ${f0(x.p)} g)`);
        L.push(`    Zutaten ganzes Gericht${num(it.total) > 0 ? ` (fertig ${f0(num(it.total))} g)` : ''}: ${it.ingredients.map(i => `${i.name} ${f0(num(i.g))} g${i.per100 ? '' : ' [ohne Werte]'}`).join(', ')}`);
        it.ingredients.filter(i => !i.per100).forEach(i => missing.push(`${i.name} (${m.l})`));
      } else {
        L.push(`- ${it.name} – ${f0(num(it.g))} g${it.per100 ? ` (${f0(x.kcal)} kcal, P ${f0(x.p)} g)` : ' [ohne Nährwerte]'}`);
        if (!it.per100) missing.push(`${it.name}, ${f0(num(it.g))} g (${m.l})`);
      }
    }
    if (md.photos.length) L.push(`  Fotos: ${md.photos.map((_, i) => photoName(dk, m, i)).join(', ')}`);
  }
  L.push('', `GESAMT: ${nl(n)}`, `ZIEL:   ${f0(g.kcal)} kcal | P ${f0(g.p)} g | KH ${f0(g.c)} g | F ${f0(g.f)} g`);
  const dk2 = g.kcal - n.kcal, dp = g.p - n.p;
  L.push(`Differenz: ${dk2 >= 0 ? 'noch ' + f0(dk2) : f0(-dk2) + ' über Ziel'} kcal, Eiweiß ${dp > 0 ? 'noch ' + f0(dp) + ' g' : 'erreicht'}`);
  if (missing.length) L.push('', `Ohne Nährwerte (bitte schätzen, ggf. anhand der Fotos): ${missing.join('; ')}`);
  L.push('', 'Hinweis: App-Werte sind Richtwerte.');
  return L.join('\n');
}
const photoName = (dk, m, i) => `${dk}_${m.file}_${i + 1}.jpg`;
async function dayFiles(dk) {
  const day = getDay(dk), files = [];
  for (const m of MEALS) {
    const ids = day.meals[m.k].photos;
    for (let i = 0; i < ids.length; i++) {
      const b = await DB.get(ids[i], 'photos');
      if (b) files.push(new File([b], photoName(dk, m, i), { type: 'image/jpeg' }));
    }
  }
  return files;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { }
    ta.remove(); return ok;
  }
}
async function copyDay(dk) { toast(await copyText(buildExport(dk)) ? 'Tagesprotokoll kopiert' : 'Kopieren nicht möglich'); }
async function shareDay(dk) {
  if (!dayHasData(dk)) { toast('Für diesen Tag ist noch nichts eingetragen'); return; }
  const text = buildExport(dk);
  const files = await dayFiles(dk);
  copyText(text);
  try {
    if (files.length && navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ title: 'Ernährungsprotokoll', text, files });
    } else if (navigator.share) {
      await navigator.share({ title: 'Ernährungsprotokoll', text });
      if (files.length) toast('Fotos konnten nicht mitgeteilt werden');
    } else {
      toast('Text kopiert – Teilen wird hier nicht unterstützt');
    }
  } catch (e) {
    if (e.name !== 'AbortError') toast('Teilen fehlgeschlagen – Text ist kopiert');
  }
}

/* ---------- Einstellungen & Backup ---------- */
async function openSettings() {
  const g = S.settings.goals;
  const sh = openSheet({ title: 'Einstellungen', full: true });
  const fld = (k, l, u) => `<label class="field"><span>${l}</span><span class="inp-g"><input data-g="${k}" inputmode="decimal" value="${f1(g[k])}"><em>${u}</em></span></label>`;
  let est = '';
  try { const e = await navigator.storage.estimate(); est = `Belegter Speicher: ${f1(e.usage / 1048576)} MB`; } catch { }
  sh.content.innerHTML = `
    <div class="sec-h" style="margin-top:4px"><h3>Tagesziele</h3></div>
    <div class="grid2">${fld('kcal', 'Kalorien', 'kcal')}${fld('p', 'Eiweiß', 'g')}${fld('c', 'Kohlenhydrate', 'g')}${fld('f', 'Fett', 'g')}</div>
    <button class="btn primary full" data-act="saveGoals">Ziele speichern</button>
    <div class="sec-h"><h3>Datensicherung</h3></div>
    <p class="muted" style="margin-bottom:12px">Alle Daten liegen nur auf diesem Handy. Mach ab und zu ein Backup – z. B. vor einem Handywechsel oder bevor du Browserdaten löschst.</p>
    <div class="set-row">
      <button class="btn" data-act="export">${I.download} Backup speichern</button>
      <label class="btn file-btn">${I.upload} Wiederherstellen<input type="file" accept="application/json,.json" data-import></label>
    </div>
    <p class="muted">${est}${est ? ' · ' : ''}Version ${APP_VERSION}</p>`;
  sh.content.addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'saveGoals') {
      $$('[data-g]', sh.content).forEach(i => { const v = num(i.value); if (v > 0) g[i.dataset.g] = v; });
      saveSettings(); await closeOverlays(1); toast('Ziele gespeichert');
    } else if (a.dataset.act === 'export') exportBackup();
  });
  sh.content.addEventListener('change', async e => {
    if (!e.target.matches('[data-import]')) return;
    const f = e.target.files[0]; e.target.value = ''; if (f) importBackup(f);
  });
}
const blobToDataUrl = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function exportBackup() {
  toast('Backup wird erstellt …');
  const data = { app: 'futterbuch', version: 1, exported: new Date().toISOString(), kv: {}, photos: {} };
  for (const [k, v] of await DB.entries('kv')) data.kv[k] = v;
  for (const [k, v] of await DB.entries('photos')) data.photos[k] = await blobToDataUrl(v);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = `futterbuch-backup-${todayKey()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup gespeichert');
}
async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); if (data.app !== 'futterbuch') throw 0; }
  catch { toast('Das ist keine gültige Futterbuch-Sicherung'); return; }
  if (!await confirmDlg('Backup wiederherstellen?', `Alle aktuellen Daten werden durch die Sicherung vom ${new Date(data.exported).toLocaleDateString('de-DE')} ersetzt.`, 'Wiederherstellen', 'primary')) return;
  await DB.clear('kv'); await DB.clear('photos');
  for (const [k, v] of Object.entries(data.kv)) await DB.set(k, v);
  for (const [k, v] of Object.entries(data.photos)) await DB.set(k, await (await fetch(v)).blob(), 'photos');
  toast('Wiederhergestellt'); setTimeout(() => location.reload(), 700);
}

/* ---------- Start ---------- */
async function init() {
  history.replaceState({ ov: 0 }, '');
  try {
    await DB.open();
    for (const [k, v] of await DB.entries('kv')) {
      if (k.startsWith('day:')) S.days[k.slice(4)] = v;
      else if (k === 'settings') S.settings = { ...S.settings, ...v, goals: { ...DEFAULT_GOALS, ...(v.goals || {}) } };
      else if (k in S) S[k] = v;
    }
  } catch (e) {
    toast('Speicher nicht verfügbar – Daten werden nicht gesichert');
  }
  renderMain();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
  // Tageswechsel, wenn die App lange offen bleibt
  let lastToday = todayKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && todayKey() !== lastToday) { if (S.sel === lastToday) S.sel = todayKey(); lastToday = todayKey(); renderMain(); }
  });
}
init();
