import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* Palco de jogos + globo de rotas da home do app desktop.
   Montado dentro do protótipo da home atual (ver src/build.py). Textos em inglês, como o app. */

/* ---------- Jogos ---------- */
// Capas: caixas da Wikipedia (retrato) e, para Throne and Liberty, LoL e Fortnite, a arte do protótipo atual.
// Regiões, servidores e número de rotas são simulados para o protótipo.
const REGIONS = {
  br: { n: 'Brazil', c: [-23.55, -46.63, 'Sao Paulo', 'SAO'] },
  nae: { n: 'NA East', c: [39.04, -77.49, 'Ashburn', 'IAD'] },
  nac: { n: 'NA Central', c: [41.88, -87.63, 'Chicago', 'CHI'] },
  naw: { n: 'NA West', c: [34.05, -118.24, 'Los Angeles', 'LAX'] },
  euw: { n: 'EU West', c: [50.11, 8.68, 'Frankfurt', 'FRA'] },
  eun: { n: 'EU North', c: [59.33, 18.07, 'Stockholm', 'STO'] },
  sea: { n: 'Southeast Asia', c: [1.35, 103.82, 'Singapore', 'SIN'] },
  jp: { n: 'Japan', c: [35.68, 139.69, 'Tokyo', 'TYO'] },
  kr: { n: 'Korea', c: [37.57, 126.98, 'Seoul', 'SEL'] },
  oce: { n: 'Oceania', c: [-33.87, 151.21, 'Sydney', 'SYD'] }
};
const A = 'assets/games/';
const GAMES = [
  { name: 'Throne and Liberty Global', img: A + 'throne-and-liberty.jpg', lanes: 4, regions: ['nae', 'naw', 'euw', 'br'], state: 'on', since: -(41 * 60 + 12) },
  { name: 'League of Legends', img: A + 'league-of-legends.jpg', lanes: 3, regions: ['br', 'nac', 'euw', 'eun', 'kr', 'oce'], state: 'on', since: -(8 * 60 + 40) },
  { name: 'Fortnite', img: A + 'fortnite.jpg', lanes: 4, regions: ['br', 'nae', 'naw', 'euw', 'sea', 'oce'] },
  { name: 'Counter-Strike 2', img: A + 'box-cs2.jpg', lanes: 4, regions: ['br', 'nae', 'naw', 'euw', 'eun', 'sea'] },
  { name: 'Apex Legends', img: A + 'box-apex-legends.jpg', lanes: 3, regions: ['br', 'nae', 'naw', 'euw', 'jp'] },
  { name: 'Dota 2', img: A + 'box-dota-2.jpg', lanes: 3, regions: ['br', 'nae', 'euw', 'sea'] },
  { name: "Tom Clancy's Rainbow Six Siege", img: A + 'box-rainbow-six-siege.jpg', lanes: 4, regions: ['br', 'nae', 'euw', 'sea'] },
  { name: 'Overwatch 2', img: A + 'box-overwatch-2.jpg', lanes: 3, regions: ['nac', 'euw', 'kr'] },
  { name: 'PUBG: Battlegrounds', img: A + 'box-pubg.jpg', lanes: 2, regions: ['nae', 'euw', 'kr', 'sea'] },
  { name: 'Rocket League', img: A + 'box-rocket-league.jpg', lanes: 2, regions: ['br', 'nae', 'euw', 'oce'] },
  { name: 'Naruto Shippuden: Ultimate Ninja Storm 4', img: A + 'box-naruto-storm-4.jpg', lanes: 2, regions: ['nae', 'euw', 'jp'] }
];
// Catálogo para "Add game or app": jogos que ainda não estão no palco (capas da Wikipedia, dados simulados).
const CATALOG = [
  { name: 'Escape from Tarkov', img: A + 'box-tarkov.jpg', lanes: 3, regions: ['nae', 'naw', 'euw', 'eun', 'sea'] },
  { name: 'Destiny 2', img: A + 'box-destiny-2.jpg', lanes: 3, regions: ['nae', 'naw', 'euw', 'jp'] },
  { name: 'World of Warcraft', img: A + 'box-wow.jpg', lanes: 4, regions: ['br', 'nae', 'naw', 'euw', 'kr', 'oce'] },
  { name: 'Path of Exile 2', img: A + 'box-poe2.jpg', lanes: 2, regions: ['br', 'nae', 'euw', 'sea', 'oce'] },
  { name: 'Dead by Daylight', img: A + 'box-dead-by-daylight.jpg', lanes: 2, regions: ['br', 'nae', 'euw', 'jp', 'oce'] },
  { name: 'Elden Ring', img: A + 'box-elden-ring.jpg', lanes: 2, regions: ['nae', 'euw', 'jp'] },
  { name: 'Warframe', img: A + 'box-warframe.jpg', lanes: 3, regions: ['nae', 'euw', 'sea'] },
  { name: 'Ark: Survival Evolved', img: A + 'box-ark.jpg', lanes: 2, regions: ['br', 'nae', 'euw', 'oce'] }
];
GAMES.forEach(g => { g.state = g.state || 'off'; });
// Gabriel (07/10): ao otimizar, o globo mapeia várias rotas possíveis, escolhe as melhores e destaca 1.
// Quantas ficam continua por jogo, até 4 (g.lanes), decisão dele no mesmo dia.

const D = Math.PI / 180;
const toV = (lat, lon, r = 1) => { const p = (90 - lat) * D, th = (lon + 180) * D; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(th), r * Math.cos(p), r * Math.sin(p) * Math.sin(th)); };
const toLL = v => { const n = v.clone().normalize(); const lat = 90 - Math.acos(n.y) / D; let lon = Math.atan2(n.z, -n.x) / D - 180; lon = ((lon % 360) + 540) % 360 - 180; return [lat, lon]; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x * x * (3 - 2 * x);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

/* ---------- Origem: onde o jogador está ---------- */
// Fuso horário do navegador, sem pedir permissão. No app, usar a geolocalização por IP. Para testar: #tokyo, #london no fim do link.
const CITIES = {
  'America/Sao_Paulo': [-23.55, -46.63, 'Sao Paulo', 'SAO'], 'America/Bahia': [-12.97, -38.5, 'Salvador', 'SSA'], 'America/Fortaleza': [-3.73, -38.52, 'Fortaleza', 'FOR'],
  'America/Recife': [-8.05, -34.88, 'Recife', 'REC'], 'America/Belem': [-1.46, -48.5, 'Belem', 'BEL'], 'America/Manaus': [-3.12, -60.02, 'Manaus', 'MAO'],
  'America/Cuiaba': [-15.6, -56.1, 'Cuiaba', 'CGB'], 'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires', 'BUE'], 'America/Santiago': [-33.45, -70.67, 'Santiago', 'SCL'],
  'America/Lima': [-12.05, -77.04, 'Lima', 'LIM'], 'America/Bogota': [4.71, -74.07, 'Bogota', 'BOG'], 'America/Mexico_City': [19.43, -99.13, 'Mexico City', 'MEX'],
  'America/New_York': [40.71, -74.0, 'New York', 'NYC'], 'America/Chicago': [41.88, -87.63, 'Chicago', 'CHI'], 'America/Denver': [39.74, -104.99, 'Denver', 'DEN'],
  'America/Los_Angeles': [34.05, -118.24, 'Los Angeles', 'LAX'], 'America/Toronto': [43.65, -79.38, 'Toronto', 'YYZ'],
  'Europe/Lisbon': [38.72, -9.14, 'Lisbon', 'LIS'], 'Europe/London': [51.51, -0.13, 'London', 'LON'], 'Europe/Madrid': [40.42, -3.7, 'Madrid', 'MAD'],
  'Europe/Paris': [48.86, 2.35, 'Paris', 'PAR'], 'Europe/Berlin': [52.52, 13.4, 'Berlin', 'BER'], 'Europe/Warsaw': [52.23, 21.01, 'Warsaw', 'WAW'],
  'Europe/Istanbul': [41.01, 28.98, 'Istanbul', 'IST'], 'Europe/Moscow': [55.76, 37.62, 'Moscow', 'MOW'], 'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg', 'JNB'],
  'Asia/Dubai': [25.2, 55.27, 'Dubai', 'DXB'], 'Asia/Kolkata': [19.08, 72.88, 'Mumbai', 'BOM'], 'Asia/Singapore': [1.35, 103.82, 'Singapore', 'SIN'],
  'Asia/Manila': [14.6, 120.98, 'Manila', 'MNL'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo', 'TYO'], 'Asia/Seoul': [37.57, 126.98, 'Seoul', 'SEL'], 'Australia/Sydney': [-33.87, 151.21, 'Sydney', 'SYD']
};
const FALLBACK = { America: 'America/Sao_Paulo', Europe: 'Europe/London', Africa: 'Africa/Johannesburg', Asia: 'Asia/Singapore', Australia: 'Australia/Sydney' };
function findOrigin() {
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const h = slug(decodeURIComponent(location.hash.slice(1)));
  if (h) for (const [tz, c] of Object.entries(CITIES)) if (slug(c[2]) === h || slug(tz.split('/').pop()) === h) return c;
  let tz = 'America/Sao_Paulo';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch { }
  return CITIES[tz] || CITIES[FALLBACK[tz.split('/')[0]]] || CITIES['America/Sao_Paulo'];
}
const origin = findOrigin();
const vO = toV(origin[0], origin[1]);
// Região inicial: a mais próxima a pelo menos ~1.700 km (mesma regra da landing), para a rota ter o que mostrar.
function pickRegion(g) {
  const by = g.regions.map(r => [r, vO.angleTo(toV(REGIONS[r].c[0], REGIONS[r].c[1]))]).sort((a, b) => a[1] - b[1]);
  g.region = (by.find(([, a]) => a > 0.27) || by[0])[0];
}
GAMES.forEach(pickRegion);
// ping estimado com ExitLag até cada servidor (mesma conta da telemetria: ~1,1 ms a cada 100 km + 8 ms)
const estPing = r => Math.round(8 + vO.angleTo(toV(REGIONS[r].c[0], REGIONS[r].c[1])) * 6371 / 100 * 1.1);
const bestRegion = g => g.regions.reduce((b, r) => vO.angleTo(toV(REGIONS[r].c[0], REGIONS[r].c[1])) < vO.angleTo(toV(REGIONS[b].c[0], REGIONS[b].c[1])) ? r : b);

/* ---------- Palco: carrossel ---------- */
const deck = $('pkDeck');
// Sala 360° (referência do Gabriel): as capas formam uma parede curva ao redor da câmera; o anel gira até o jogo ficar de frente.
const ring = document.createElement('div'); ring.className = 'pk-ring'; deck.appendChild(ring);
const SLOTS = 14, STEP = 2 * Math.PI / SLOTS, GAP = 16;
let R = 500, pitch = 240, camV = 0, dragCam = 0;
let N = GAMES.length, moved = false;
function makeCard(g, i) {
  const b = document.createElement('div');
  b.className = 'pk-card'; b.setAttribute('role', 'option'); b.setAttribute('aria-label', g.name);
  b.innerHTML = `<span class="bg" style="background-image:url('${g.img}')"></span><img src="${g.img}" alt="" draggable="false">`;
  const im = b.querySelector('img');
  const fit = () => b.classList.toggle('wide', im.naturalWidth / im.naturalHeight > 1.05);
  if (im.complete) fit(); else im.addEventListener('load', fit);
  b.addEventListener('click', () => { if (!moved) select(i); });
  ring.appendChild(b);
  return b;
}
const cards = GAMES.map(makeCard);
$('pkTotal').textContent = N;
let sel = 0;
const wrapK = k => ((k % N) + N + N / 2) % N - N / 2;
// tamanho da capa (3:4, caixa do jogo) e raio do anel a partir do espaço do palco
function sizeDeck() {
  const W = deck.clientWidth, H = deck.clientHeight - (parseFloat(getComputedStyle(deck).getPropertyValue('--padT')) || 0); // --padT: folga para o brilho, fora da conta da capa
  if (!W || !H) return;
  const ph = Math.round(Math.min(H * 0.72, W * 0.5 / 0.75)), pw = Math.round(ph * 0.75);
  R = (pw / 2 + GAP / 2) / Math.tan(Math.PI / SLOTS); pitch = pw + GAP;
  deck.style.setProperty('--pw', pw + 'px'); deck.style.setProperty('--ph', ph + 'px');
  deck.style.setProperty('--R', R.toFixed(1) + 'px'); deck.style.setProperty('--P', (R * 1.5).toFixed(1) + 'px');
}
new ResizeObserver(sizeDeck).observe(deck); sizeDeck();
// estado (seleção e otimizado); a posição é desenhada quadro a quadro em deckFrame
function layout() {
  cards.forEach((c, i) => {
    c.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    c.classList.toggle('on', GAMES[i].state === 'on');
  });
  if (typeof syncThumbs8 === 'function') syncThumbs8();
}
let deckLast = performance.now();
function deckFrame(now) {
  const dt = Math.min(0.05, (now - deckLast) / 1000); deckLast = now;
  const dragging = dragX !== null && moved;
  if (!dragging) { const d = wrapK(sel - camV); camV += reduce || Math.abs(d) < 0.0005 ? d : d * Math.min(1, dt * 5.5); }
  cards.forEach((c, i) => {
    const th = wrapK(i - camV) * STEP, a = Math.abs(th);
    if (a > 1.95) { c.style.visibility = 'hidden'; return; }
    c.style.visibility = '';
    const lift = i === sel && !dragging ? 18 * (1 - Math.min(1, Math.abs(wrapK(sel - camV)) * 2)) : 0;
    c.style.transform = `rotateY(${(-th).toFixed(4)}rad) translateZ(${(-R + lift).toFixed(1)}px)`;
    c.style.filter = a < 0.08 ? '' : `brightness(${Math.max(0.38, 1 - 0.42 * a).toFixed(3)}) saturate(${Math.max(0.6, 1 - 0.25 * a).toFixed(3)})`;
  });
  requestAnimationFrame(deckFrame);
}
requestAnimationFrame(deckFrame);
// Arrasta com mouse ou dedo; roda horizontal do trackpad; setas do teclado.
let dragX = null;
deck.addEventListener('pointerdown', e => { dragX = e.clientX; moved = false; dragCam = camV; });
addEventListener('pointermove', e => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  if (!moved && Math.abs(dx) > 6) { moved = true; deck.classList.add('drag'); }
  if (moved) camV = dragCam - dx / pitch;
});
addEventListener('pointerup', () => {
  if (dragX === null) return;
  dragX = null; deck.classList.remove('drag');
  if (moved) { const v = Math.round(camV); select(v); setTimeout(() => { moved = false; }, 0); }
});
let wheelAcc = 0, wheelT = 0;
deck.addEventListener('wheel', e => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  e.preventDefault(); wheelAcc += e.deltaX;
  const now = performance.now();
  if (Math.abs(wheelAcc) > 60 && now - wheelT > 350) { select(sel + Math.sign(wheelAcc)); wheelAcc = 0; wheelT = now; }
}, { passive: false });
deck.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { select(sel + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { select(sel - 1); e.preventDefault(); }
  if (e.key === 'Enter' || e.key === ' ') { toggleOpt(); e.preventDefault(); }
  if (e.key === '+') { openAdd(); e.preventDefault(); }
});
$('pkPrev').addEventListener('click', () => select(sel - 1));
$('pkNext').addEventListener('click', () => select(sel + 1));

// Servidor: pill que abre a lista no estilo do input-search
const srv = $('pkSrv'), srvBtn = $('pkSrvBtn'), srvList = $('pkSrvList');
function openSrv(o) { srvList.hidden = !o; srv.classList.toggle('open', o); srvBtn.setAttribute('aria-expanded', o); }
srvBtn.addEventListener('click', e => { e.stopPropagation(); openSrv(srvList.hidden); });
addEventListener('click', e => { if (!srv.contains(e.target)) openSrv(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') openSrv(false); });

const ambs = [$('pkAmbA'), $('pkAmbB')];
let ambI = 0;
function paintInfo() {
  const g = GAMES[sel];
  $('pkTitle').textContent = g.name;
  $('pkPage').textContent = sel + 1;
  $('pkSrvName').textContent = g.auto ? 'Auto · ' + REGIONS[g.region].n : REGIONS[g.region].n;
  // Automatic: a ExitLag escolhe o servidor de menor ping (no protótipo, o mais perto de quem joga) e mostra qual escolheu
  const best = bestRegion(g);
  $('pkSrvItems').innerHTML = `<div class="sl-item pk-auto" role="option" data-r="auto" aria-selected="${!!g.auto}"><span class="sl-name">Automatic</span><span class="t-var">Best route · ${REGIONS[best].n}</span><span class="pk-ms tnum">${estPing(best)} ms</span></div>`
    + g.regions.map(r => `<div class="sl-item" role="option" data-r="${r}" aria-selected="${!g.auto && r === g.region}"><span class="sl-name">${REGIONS[r].n}</span><span class="t-var">${REGIONS[r].c[2]}</span><span class="pk-ms tnum">${estPing(r)} ms</span></div>`).join('');
  $('pkSrvItems').querySelectorAll('.sl-item').forEach(el => el.addEventListener('click', () => {
    const r = el.dataset.r; g.auto = r === 'auto'; g.region = g.auto ? best : r;
    openSrv(false); paintInfo(); rebuild();
  }));
  paintCta();
}
function select(i) {
  i = ((i % N) + N) % N;
  const changed = i !== sel; sel = i;
  openSrv(false); layout(); paintInfo();
  ambI ^= 1; ambs[ambI].style.backgroundImage = `url('${GAMES[sel].img}')`; ambs[ambI].classList.add('on'); ambs[ambI ^ 1].classList.remove('on');
  if (changed || !routes) rebuild();
}

/* ---------- Adicionar jogo: dialog do protótipo com o input-search e a search-list ---------- */
const addMd = $('pkAdd'), addIn = $('pkAddIn'), addList = $('pkAddList'), mdOv = $('md-overlay');
mdOv.after(addMd); // o dialog vive junto do overlay do app, por cima de tudo
const srchIcon = document.querySelector('.search-wrap .search img');
if (srchIcon) $('pkAddIco').src = srchIcon.src;
let addReturn = null;
function renderAdd() {
  const q = addIn.value.trim().toLowerCase();
  const hits = CATALOG.filter(g => g.name.toLowerCase().includes(q));
  addList.innerHTML = hits.length
    ? hits.map(g => `<div class="sl-item" role="option" tabindex="-1" aria-selected="false" data-name="${g.name}"><span class="thumb-md" style="background-image:url('${g.img}')"></span><span class="sl-name">${g.name}</span><span class="t-var">PC</span></div>`).join('')
    : `<p class="pk-add-empty t-var">${CATALOG.length ? `No games match “${addIn.value.trim().replace(/[<&]/g, '')}”.` : 'Every game in this demo is already on your stage.'}</p>`;
}
function openAdd() {
  if (!addMd.hidden) return;
  addReturn = document.activeElement; addIn.value = ''; renderAdd();
  mdOv.hidden = addMd.hidden = false; void addMd.offsetWidth;
  mdOv.classList.add('show'); addMd.classList.add('show');
  document.querySelector('.content').inert = document.querySelector('.sidebar').inert = true;
  addIn.focus({ preventScroll: true });
}
function closeAdd() {
  if (addMd.hidden) return;
  mdOv.classList.remove('show'); addMd.classList.remove('show');
  document.querySelector('.content').inert = document.querySelector('.sidebar').inert = false;
  setTimeout(() => { if (!addMd.classList.contains('show')) { addMd.hidden = true; mdOv.hidden = true; } }, 220);
  addReturn && addReturn.focus({ preventScroll: true });
}
function addGame(name) {
  const at = CATALOG.findIndex(g => g.name === name);
  if (at < 0) return;
  const g = CATALOG.splice(at, 1)[0];
  g.state = 'off'; pickRegion(g);
  GAMES.push(g); cards.push(makeCard(g, GAMES.length - 1)); N = GAMES.length;
  $('pkTotal').textContent = N;
  closeAdd();
  select(N - 1);
  logMsg(`<b>${g.name}</b> added. Press Optimize to route it through ExitLag.`);
}
addIn.addEventListener('input', renderAdd);
addIn.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = addList.querySelector('.sl-item'); if (f) addGame(f.dataset.name); } });
addList.addEventListener('click', e => { const it = e.target.closest('.sl-item'); if (it) addGame(it.dataset.name); });
$('pkAddCancel').addEventListener('click', closeAdd);
$('pkAddBtn')?.addEventListener('click', openAdd);
addEventListener('keydown', e => { if (e.key === 'Escape' && !addMd.hidden) closeAdd(); });

/* ---------- Otimizar: o comportamento da ExitLag ---------- */
const cta = $('pkCta');
const fmtDur = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const onMsg = g => `Picked the <b>${g.lanes} fastest</b> of ${CANDS.length} possible routes. Your game goes out through all ${g.lanes} at once; the first packet to arrive wins.`;
// sem dados da rota da operadora (Gabriel, 07/10): nada de comparativo com a ISP, só o que a ExitLag mede
const IDLE = 'Not optimized. Optimize to route this game through ExitLag and measure it live.';
// ExitLag desligada na topbar: no lugar do Optimize, um aviso (pedido do Gabriel)
const offInfo = document.createElement('div'); offInfo.className = 'pk-offinfo'; offInfo.setAttribute('role', 'status');
offInfo.innerHTML = '<i class="dt"></i><span><b>ExitLag is off</b><span class="t-var">Turn it on in the top bar to optimize</span></span>';
cta.after(offInfo);
const elOff = () => $('app').classList.contains('el-off');
// mapa de rede rodando (fluxo passivo): no lugar do Optimize, o progresso do mapa; rotas não se configuram até ele terminar
const pmInfo = document.createElement('div'); pmInfo.className = 'pk-offinfo pk-pminfo'; pmInfo.setAttribute('role', 'status'); pmInfo.hidden = true;
pmInfo.innerHTML = '<i class="dt"></i><span><b>Mapping your network</b><span class="t-var">Optimize unlocks when the map is ready</span></span><span class="pm-p tnum" id="pmInfoP">0%</span>';
offInfo.after(pmInfo);
const pmBusy = () => !!pmap && !pmap.done;
function paintCta() {
  const g = GAMES[sel], off = elOff(), busy = pmBusy();
  cta.hidden = off || busy; offInfo.hidden = !off; pmInfo.hidden = off || !busy;
  srvBtn.disabled = busy; srv.dataset.tip = busy ? 'Server choice unlocks when the network map is ready' : ''; if (!busy) delete srv.dataset.tip;
  cta.className = 'btn pk-cta ' + (g.state === 'on' ? 'outlined' : g.state === 'testing' ? 'filled pk-busy' : 'filled');
  if (g.state === 'on') cta.innerHTML = `Stop<span class="tnum" id="pkCtaT">${fmtDur(time - g.since)}</span>`;
  else if (g.state === 'testing') cta.innerHTML = '<span class="loader-sm"></span>Testing routes';
  else cta.textContent = 'Optimize';
  const st = $('pkState');
  st.className = 'badge ' + (g.state === 'on' ? 'success' : off ? 'warning' : 'neutral');
  st.textContent = g.state === 'on' ? 'Optimized' : g.state === 'testing' ? 'Testing routes' : off ? 'ExitLag off' : busy ? 'Waiting for map' : 'Not optimized';
  $('pkLgXl').classList.toggle('off', g.state !== 'on');
  $('pkTele').classList.toggle('pk-idle', g.state === 'off'); // sem otimizar não há medição: some o bloco de números e rotas (pedido do Gabriel)
  layout();
}
function toggleOpt() {
  const g = GAMES[sel];
  if (elOff() || pmBusy()) return;
  if (g.state === 'testing') return;
  if (pmap) endPmap(); // mapa pronto: otimizar já fecha a pílula e devolve as rotas do jogo
  if (g.state === 'on') { g.state = 'off'; xlShow = 0; fail = null; logMsg(IDLE); paintCta(); return; }
  g.state = 'testing'; xlShow = 1; xlStart = time; logMsg(`Mapping ${CANDS.length} possible routes to the game server…`);
  paintCta();
  setTimeout(() => {
    if (g.state !== 'testing') return;
    g.state = 'on'; g.since = time; nextFail = time + 6 + Math.random() * 4;
    if (GAMES[sel] === g) logMsg(onMsg(g));
    paintCta();
  }, reduce ? 300 : 2600);
}
cta.addEventListener('click', toggleOpt);

const logT = $('pkLogT'), logTxt = $('pkLog');
function logMsg(html) {
  const d = new Date(); logT.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  logTxt.style.opacity = 0; setTimeout(() => { logTxt.innerHTML = html; logTxt.style.opacity = 1; }, 150);
}

/* ---------- Cena: globo ---------- */
THREE.ColorManagement.enabled = false;
const canvas = $('pkGl'), host = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const tilt = new THREE.Group(), globe = new THREE.Group();
tilt.add(globe); scene.add(tilt);
// Céu estrelado (V9): um único Points com cintilação no shader; tamanho fixo em px, sem textura
const stars = (() => {
  const N = 2600, pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 40 + Math.random() * 20, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(t) * s * r, u * r, Math.sin(t) * s * r - 20], i * 3); seed.set([Math.random(), Math.pow(Math.random(), 3)], i * 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: PR }, uOp: { value: 0 } },
    vertexShader: `attribute vec2 aSeed; uniform float uTime, uPR; varying float vA;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 1.8) + aSeed.x * 40.0);
        vA = (0.3 + 0.7 * aSeed.y) * tw; gl_PointSize = (1.0 + aSeed.y * 1.8) * uPR; }`,
    fragmentShader: `uniform float uOp; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.82, 0.88, 1.0), vA * uOp * (1.0 - smoothstep(0.15, 0.5, d))); }` });
  const p = new THREE.Points(g, m); p.renderOrder = -1; p.frustumCulled = false; p.visible = false; return p;
})();
scene.add(stars);
const C = { fog: new THREE.Color('#ebeced'), dim: new THREE.Color('#878d97'), route: new THREE.Color('#22eba3'), isp: new THREE.Color('#eb8322'), bad: new THREE.Color('#f52929'),
  deep: new THREE.Color('#07080b'), rim: new THREE.Color('#6f8fb8') };

globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), new THREE.ShaderMaterial({
  uniforms: { uDeep: { value: C.deep }, uRim: { value: C.rim } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uDeep; uniform vec3 uRim; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.-max(dot(vN,vV),0.); gl_FragColor = vec4(mix(uDeep, uRim, pow(f,5.)*.14), 1.); }`
})));
// Atmosfera difusa, sem borda dura (mesma da landing).
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.6, 96, 64), new THREE.ShaderMaterial({
  uniforms: { uRim: { value: C.rim }, uCenter: { value: new THREE.Vector3() } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uRim; uniform vec3 uCenter; varying vec3 vW;
  void main(){ vec3 rd = normalize(vW - cameraPosition); vec3 oc = uCenter - cameraPosition;
    float d = length(cross(rd, oc));
    float i = d > 1. ? exp(-max(d-1., 0.)*7.) : pow(clamp(d, 0., 1.), 10.);
    gl_FragColor = vec4(uRim*i*.26, 1.); }`
}));
atmo.renderOrder = 2; scene.add(atmo);

const raw = Uint8Array.from(atob(window.LAND || ''), c => c.charCodeAt(0));
const u16 = new Uint16Array(raw.buffer);
const nLand = u16.length / 2, landPos = new Float32Array(nLand * 3), landLL = [];
for (let i = 0; i < nLand; i++) { const lat = u16[i * 2] / 100 - 90, lon = u16[i * 2 + 1] / 100 - 180; landLL.push([lat, lon]); toV(lat, lon, 1.003).toArray(landPos, i * 3); }
const landGeo = new THREE.BufferGeometry(); landGeo.setAttribute('position', new THREE.BufferAttribute(landPos, 3));
const landMat = new THREE.ShaderMaterial({
  uniforms: { uSize: { value: 9 }, uPR: { value: PR }, uCol: { value: C.dim } }, transparent: true, depthWrite: false,
  vertexShader: `uniform float uSize; uniform float uPR; varying float vFace; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vFace = dot(normalize(normalMatrix*position), normalize(-mv.xyz)); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uCol; varying float vFace; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float a = smoothstep(.5,.2,d)*smoothstep(-.05,.45,vFace); gl_FragColor = vec4(uCol*(.55+.45*vFace), a*.9); }`
});
globe.add(new THREE.Points(landGeo, landMat));

// Rede ExitLag ao fundo: pontos de servidor piscando, discretos.
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const servers = Object.values(REGIONS).map(r => [r.c[0], r.c[1]]);
for (let i = 0; i < 240; i++) servers.push(landLL[Math.floor(rnd() * nLand)]);
const svPos = new Float32Array(servers.length * 3), svSeed = new Float32Array(servers.length);
servers.forEach((s, i) => { toV(s[0], s[1], 1.005).toArray(svPos, i * 3); svSeed[i] = rnd(); });
const svGeo = new THREE.BufferGeometry();
svGeo.setAttribute('position', new THREE.BufferAttribute(svPos, 3)); svGeo.setAttribute('aSeed', new THREE.BufferAttribute(svSeed, 1));
const svMat = new THREE.ShaderMaterial({
  uniforms: { uSize: { value: 20 }, uPR: { value: PR }, uTime: { value: 0 }, uCol: { value: C.route }, uOp: { value: 0.5 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uSize; uniform float uPR; attribute float aSeed; varying float vS; varying float vFace; void main(){ vS=aSeed; vec4 mv = modelViewMatrix*vec4(position,1.); vFace = dot(normalize(normalMatrix*position), normalize(-mv.xyz)); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uTime; uniform vec3 uCol; uniform float uOp; varying float vS; varying float vFace; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float tw = .5+.5*sin(uTime*1.6+vS*40.); float a = (smoothstep(.5,.0,d)*.35+smoothstep(.14,.0,d))*tw*uOp*smoothstep(0.,.3,vFace); gl_FragColor = vec4(uCol, a); }`
});
globe.add(new THREE.Points(svGeo, svMat));

/* ---------- Rotas ---------- */
const routeVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const routeFS = `uniform vec3 uCol; uniform vec3 uBad; uniform float uDraw; uniform float uOp; uniform float uFail; uniform float uTime; uniform float uSpeed; uniform float uHalo; uniform float uGain; uniform float uT0; uniform float uT1; uniform float uLen;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ float x = vUv.x; if(x>uDraw || uOp<=0.) discard;
  float edge = abs(dot(vN, vV));
  float shape = uHalo > .5 ? pow(edge, 3.)*.35 : .6 + .4*edge;
  float head = smoothstep(uDraw-.1, uDraw, x)*(1.-step(.999,uDraw));
  float ends = smoothstep(0., .03, x)*smoothstep(1., .97, x);
  float pulse = pow(1.-fract(uTime*uSpeed - x*2.), 8.);
  float flick = mix(1., .3+.7*step(.45, fract(sin(floor(uTime*12.)*91.7)*43758.5)), uFail);
  vec3 col = mix(uCol, uBad, uFail);
  // túnel ExitLag: da primeira bridge até a final a rota é o túnel; o acesso (você › bridge, final › servidor) fica mais fraco
  float tun = step(.001, uT1), inT = tun*step(uT0, x)*step(x, uT1);
  float a = uOp*shape*(.55 + .7*head + .6*pulse)*flick*(1.-.4*uFail)*mix(1., ends, .7)*uGain*mix(1., .5, tun*(1.-inT));
  gl_FragColor = vec4(col*(1.+.8*pulse+.6*head), a); }`;
const routeGroup = new THREE.Group(); globe.add(routeGroup);

/* ---------- Cabos submarinos (pedido do Gabriel) ----------
   Traçados aproximados de cabos reais, simplificados para o protótipo: pontos de pouso (cidade e código) e alguns pontos no mar.
   Ficam sempre no globo, bem fracos; quando uma rota ExitLag cruza o oceano, ela desce no ponto de pouso e segue pelo cabo. */
const CABLES = [
  { n: 'Seabras-1', a: [-23.96, -46.33, 'SSZ'], b: [40.15, -74.03, 'NJ'], w: [[-12, -32], [8, -44], [28, -64]] },
  { n: 'Monet', a: [-23.96, -46.33, 'SSZ'], b: [26.35, -80.08, 'BCT'], w: [[-3.6, -37.6], [12, -55], [22, -70]] },
  { n: 'EllaLink', a: [-3.72, -38.5, 'FOR'], b: [37.95, -8.87, 'SIE'], w: [[14, -28], [32, -16]] },
  { n: 'SACS', a: [-3.72, -38.5, 'FOR'], b: [-8.84, 13.23, 'LAD'], w: [[-6, -15]] },
  { n: 'MAREA', a: [36.85, -75.98, 'VAB'], b: [43.26, -2.93, 'BIO'], w: [[40, -50], [44, -20]] },
  { n: 'AEC-1', a: [40.8, -72.87, 'NYC'], b: [54.2, -9.2, 'KIL'], w: [[48, -45], [53, -22]] },
  { n: 'Grace Hopper', a: [40.8, -72.87, 'NYC'], b: [50.1, -5.5, 'BUD'], w: [[45, -45], [49, -20]] },
  { n: 'FASTER', a: [43.12, -124.4, 'BAN'], b: [34.95, 139.95, 'CHK'], w: [[46, -160], [40, 165]] },
  { n: 'Southern Cross', a: [33.86, -118.4, 'LAX'], b: [-33.87, 151.21, 'SYD'], w: [[21.3, -157.9], [-18, 178.5]] },
  { n: 'SEA-ME-WE 5', a: [1.35, 103.82, 'SIN'], b: [43.3, 5.37, 'MRS'], w: [[5.9, 95], [6, 80], [12.5, 45], [20, 38.5], [30, 32.5], [34, 25]] },
  { n: 'APG', a: [1.35, 103.82, 'SIN'], b: [34.95, 139.95, 'CHK'], w: [[10, 110], [22.3, 114.2], [30, 128]] },
  { n: 'Indigo', a: [1.35, 103.82, 'SIN'], b: [-33.87, 151.21, 'SYD'], w: [[-10, 110], [-31.95, 115.86], [-37, 130]] },
  { n: 'KJCN', a: [35.1, 129.04, 'PUS'], b: [33.6, 130.4, 'FUK'], w: [] }
].map(c => {
  const stops = [c.a, ...c.w, c.b].map(([la, lo]) => toV(la, lo)), pts = [];
  stops.forEach((v, k) => { if (!k) return; const p = stops[k - 1], ws = Math.max(p.angleTo(v), 1e-4), ss = Math.sin(ws), n = Math.max(4, Math.ceil(ws / 0.02));
    for (let i = k > 1 ? 1 : 0; i <= n; i++) { const u = i / n; pts.push(p.clone().multiplyScalar(Math.sin((1 - u) * ws) / ss).add(v.clone().multiplyScalar(Math.sin(u * ws) / ss)).normalize()); } });
  soften(pts, 4, 3); // curvas do cabo arredondadas nos pontos de passagem, sem quinas
  let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].angleTo(pts[i - 1]);
  return { ...c, pts, len, A: stops[0], B: stops[stops.length - 1] };
});
// cada cabo só aparece quando uma rota passa por ele (pedido do Gabriel): o traçado inteiro e os dois pousos acendem juntos
const cableGroup = new THREE.Group(); globe.add(cableGroup);
CABLES.forEach(c => {
  c.mat = new THREE.LineBasicMaterial({ color: '#6f8fb8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  c.pmat = new THREE.PointsMaterial({ color: '#9fb6d4', size: 0.014, transparent: true, opacity: 0, depthWrite: false });
  c.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.pts.map(v => v.clone().multiplyScalar(1.003))), c.mat);
  c.dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints([c.A, c.B].map(v => v.clone().multiplyScalar(1.004))), c.pmat);
  c.line.visible = c.dots.visible = false; cableGroup.add(c.line, c.dots); c.k = 0;
});
function frameCables(dt) {
  const want = new Map();
  if (routes && routeGroup.visible) [...routes.cand, ...routes.xl].forEach(r => {
    if (!r.cable) return; const on = r.u.uDraw.value >= r.nodes[0].t ? r.u.uOp.value : 0;
    want.set(r.cable, Math.max(want.get(r.cable) || 0, on));
  });
  CABLES.forEach(c => {
    c.k += ((want.get(c.n) || 0) - c.k) * (reduce ? 1 : Math.min(1, dt * 4));
    const v = c.k > 0.01; c.line.visible = c.dots.visible = v; if (!v) return;
    c.mat.opacity = 0.45 * c.k; c.pmat.opacity = 0.8 * c.k;
  });
}
// cabos que servem a uma rota: pouso perto de você, pouso perto do servidor, e desvio pequeno em relação ao caminho direto
function cableOptions(a, b) {
  const direct = a.angleTo(b), out = [];
  if (direct < 0.25) return out;
  CABLES.forEach(c => [[c.A, c.B, c.pts, c.a[2], c.b[2]], [c.B, c.A, [...c.pts].reverse(), c.b[2], c.a[2]]].forEach(([s, e, pts, sc, ec]) => {
    const d1 = a.angleTo(s), d2 = e.angleTo(b), cost = d1 + c.len + d2;
    if (c.len > 0.15 && d1 < direct * 0.5 && d2 < direct * 0.5 && cost < direct * 1.45) out.push({ c, pts, sc, ec, cost });
  }));
  return out.sort((x, y) => x.cost - y.cost);
}
const MAXL = 4;
// Faixas laterais das rotas ExitLag, de 2 a 4 rotas por jogo.
// Rotas candidatas que o teste mapeia (desvio lateral, altura); as 4 com melhor ping viram as rotas ExitLag.
const CANDS = [[-0.44, 0.9], [-0.32, 1.05], [-0.2, 1.2], [-0.07, 1.3], [0.07, 1.3], [0.2, 1.2], [0.32, 1.05], [0.44, 0.9]];
const seeded = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0) / 4294967296; };
const SHAPES = { 2: [[-0.18, 1.1], [0.18, 1.1]], 3: [[-0.28, 1.0], [0, 1.25], [0.28, 1.0]], 4: [[-0.3, 1.0], [-0.1, 1.2], [0.1, 1.2], [0.3, 1.0]] };
let routes = null, vS = new THREE.Vector3(), routeAngle = 1, routeKm = 0, buildT = -10;

function smoothPath(a, b, w, lateral, lift, n = 200) {
  const side = new THREE.Vector3().crossVectors(a, b).normalize(), sw = Math.sin(w), pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = Math.sin(Math.PI * u);
    const p = a.clone().multiplyScalar(Math.sin((1 - u) * w) / sw).add(b.clone().multiplyScalar(Math.sin(u * w) / sw));
    p.addScaledVector(side, lateral(u) * w).normalize();
    pts.push(p.multiplyScalar(1.004 + (0.02 + w * 0.2) * lift * s));
  }
  return pts;
}
let routeR = 1; // espessura relativa das rotas: afina quando a câmera chega perto
function makeRoute(pts, color, radius, speed, gain = 1, group = routeGroup, tun = null) {
  radius *= routeR * 0.5; // metade da espessura original (pedido do Gabriel)
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const uniforms = { uCol: { value: color }, uBad: { value: C.bad }, uDraw: { value: 0 }, uOp: { value: 0 }, uFail: { value: 0 }, uTime: { value: 0 }, uSpeed: { value: speed }, uGain: { value: gain }, uT0: { value: tun ? tun[0] : 0 }, uT1: { value: tun ? tun[1] : 0 }, uLen: { value: 1 } };
  for (const halo of [0, 1]) {
    const mat = new THREE.ShaderMaterial({ uniforms: { ...uniforms, uHalo: { value: halo } }, vertexShader: routeVS, fragmentShader: routeFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 300, halo ? radius * 4.5 : radius, 10, false), mat));
  }
  const len = curve.getLength(); uniforms.uLen.value = len;
  return { curve, u: uniforms, len };
}
// Salto entre dois nós: o arco sai e pousa tangente à superfície (perfil sem inclinação nas pontas), então dois saltos
// seguidos se emendam sem formar um V no nó (pedido do Gabriel: arcos saltando, mas sem quinas).
function arcHop(p, q, h, n) {
  const ws = Math.max(p.angleTo(q), 1e-4), ss = Math.sin(ws), out = [];
  for (let i = 0; i <= n; i++) { const u = i / n, s = Math.sin(Math.PI * u), e = s * s * (3 - 2 * s);
    out.push(p.clone().multiplyScalar(Math.sin((1 - u) * ws) / ss).add(q.clone().multiplyScalar(Math.sin(u * ws) / ss)).normalize().multiplyScalar(1.006 + (0.02 + ws * 0.25) * h * 1.1 * e)); }
  return out;
}
// arredonda a mudança de rumo nos nós (vista de cima) com uma média móvel curta; as pontas ficam presas
function soften(pts, r = 5, passes = 3) {
  const n = pts.length; if (n < 3) return pts;
  for (let it = 0; it < passes; it++) {
    const src = pts.map(v => v.clone());
    for (let i = 1; i < n - 1; i++) { const k = Math.min(r, i, n - 1 - i), acc = new THREE.Vector3(); let len = 0;
      for (let j = -k; j <= k; j++) { acc.add(src[i + j]); len += src[i + j].length(); }
      pts[i].copy(acc.normalize().multiplyScalar(len / (2 * k + 1))); }
  }
  return pts;
}
// Rota ExitLag de verdade (pedido do Gabriel): você entra numa bridge, o tráfego salta de bridge em bridge num túnel até
// uma final perto do servidor do jogo, e só então sai para o jogo. Cada nó é um ponto no mapa (cidade com servidor), e a rota
// é uma sequência de saltos entre eles, não uma curva só. Rotas longas passam por 2 bridges; curtas, por 1.
function tunnelPath(a, b, w, lat, lift, rnd, cab = null) {
  if (cab) return cablePath(a, b, cab, rnd);
  const side = new THREE.Vector3().crossVectors(a, b).normalize(), sw = Math.sin(w);
  const at = f => a.clone().multiplyScalar(Math.sin((1 - f) * w) / sw).add(b.clone().multiplyScalar(Math.sin(f * w) / sw)).addScaledVector(side, lat * 0.9 * Math.sin(Math.PI * f) * w).normalize();
  // nó encaixa na cidade mais próxima quando há uma perto (até ~600 km), para cair num lugar real do mapa
  const snap = v => { let best = null, bd = 1e9; for (const c of Object.values(CITIES)) { const d = v.angleTo(toV(c[0], c[1])); if (d < bd) { bd = d; best = c; } } return bd * 6371 < 600 ? toV(best[0], best[1]) : v; };
  const fr = w > 0.45 ? [0.28 + 0.08 * rnd(), 0.6 + 0.08 * rnd()] : [0.4 + 0.15 * rnd()];
  const nodes = fr.map(f => ({ v: snap(at(f)), kind: 0 }));
  nodes.push({ v: at(0.9 + 0.04 * rnd()), kind: 1 }); // final: perto do servidor, sem encaixar (fica entre a última bridge e o jogo)
  const seg = arcHop;
  const stops = [a, ...nodes.map(n => n.v), b], pts = [], ends = [];
  for (let k = 0; k < stops.length - 1; k++) { const sg = seg(stops[k], stops[k + 1], k === 0 || k === stops.length - 2 ? 0.2 : lift * 0.7, 60); pts.push(...(k ? sg.slice(1) : sg)); ends.push(pts.length - 1); }
  soften(pts);
  // posição dos nós ao longo da rota (comprimento de arco), para o shader, os pacotes e os marcadores
  let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); cum.push(L); }
  nodes.forEach((n, k) => { n.t = cum[ends[k]] / L; n.v = pts[ends[k]].clone().normalize(); n.c = nearCity(n.v); }); // ponto segue a linha suavizada
  return { pts, nodes, t0: nodes[0].t, t1: nodes[nodes.length - 1].t };
}
// rota pelo mar: você › bridge no pouso do cabo › o cabo, rente à superfície › bridge no outro pouso › final › servidor
function cablePath(a, b, cab, rnd) {
  const A = cab.pts[0], B = cab.pts[cab.pts.length - 1], w = a.angleTo(b), sw = Math.sin(w);
  const F = b.clone().lerp(B, 0.35 + 0.15 * rnd()).normalize(); // final entre o pouso e o servidor
  const hop = (p, q, h, n = 40) => arcHop(p, q, h, n);
  // rotas no mesmo cabo: afastadas de lado alguns km para aparecerem como fios paralelos
  const off = (cab.lane || 0) * 0.006 * (cab.lane % 2 ? 1 : -1), sea = cab.pts.map((v, i, arr) => { const q = arr[Math.min(i + 1, arr.length - 1)], p0 = arr[Math.max(i - 1, 0)];
    const sd = new THREE.Vector3().crossVectors(v, q.clone().sub(p0)).normalize(); return v.clone().addScaledVector(sd, off * Math.sin(Math.PI * i / (arr.length - 1))).normalize().multiplyScalar(1.006); });
  const parts = [hop(a, A, 0.2), sea, hop(B, F, 0.25), hop(F, b, 0.2)], pts = [], ends = [];
  parts.forEach((sg, k) => { pts.push(...(k ? sg.slice(1) : sg)); ends.push(pts.length - 1); });
  soften(pts);
  let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); cum.push(L); }
  const on = k => pts[ends[k]].clone().normalize();
  const nodes = [{ v: on(0), kind: 0, c: cab.sc, t: cum[ends[0]] / L }, { v: on(1), kind: 0, c: cab.ec, t: cum[ends[1]] / L }, { v: on(2), kind: 1, c: nearCity(F), t: cum[ends[2]] / L }];
  return { pts, nodes, t0: nodes[0].t, t1: nodes[2].t, cable: cab.c.n };
}
const nearCity = v => { let best = null, bd = 1e9; for (const c of Object.values(CITIES)) { const d = v.angleTo(toV(c[0], c[1])) * 6371; if (d < bd) { bd = d; best = c; } } return bd < 1400 ? best[3] : ''; };
function clearRoutes() { routeGroup.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); routeGroup.clear(); }

// Pacotes que correm pelas rotas. O mesmo pacote sai por todas as rotas ExitLag ao mesmo tempo.
const PK = 10, packetsN = PK * (1 + MAXL);
const pkPos = new Float32Array(packetsN * 3), pkCol = new Float32Array(packetsN * 3), pkA = new Float32Array(packetsN);
const pkGeo = new THREE.BufferGeometry();
pkGeo.setAttribute('position', new THREE.BufferAttribute(pkPos, 3).setUsage(THREE.DynamicDrawUsage));
pkGeo.setAttribute('aCol', new THREE.BufferAttribute(pkCol, 3).setUsage(THREE.DynamicDrawUsage));
pkGeo.setAttribute('aA', new THREE.BufferAttribute(pkA, 1).setUsage(THREE.DynamicDrawUsage));
const packets = new THREE.Points(pkGeo, new THREE.ShaderMaterial({
  uniforms: { uSize: { value: 34 }, uPR: { value: PR } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uSize; uniform float uPR; attribute vec3 aCol; attribute float aA; varying vec3 vC; varying float vA; void main(){ vC=aCol; vA=aA; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5||vA<=0.) discard; float a = (smoothstep(.5,.0,d)*.5 + smoothstep(.14,.0,d))*vA; gl_FragColor = vec4(vC*1.4, a); }`
}));
packets.frustumCulled = false; globe.add(packets);

const mkPos = new Float32Array(6);
const mkGeo = new THREE.BufferGeometry();
mkGeo.setAttribute('position', new THREE.BufferAttribute(mkPos, 3));
mkGeo.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array([...C.fog.toArray(), ...C.route.toArray()]), 3));
const mkMat = new THREE.ShaderMaterial({
  uniforms: { uSize: { value: 100 }, uPR: { value: PR }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uSize; uniform float uPR; attribute vec3 aCol; varying vec3 vC; void main(){ vC=aCol; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uTime; varying vec3 vC; void main(){ float d = length(gl_PointCoord-.5); float r = fract(uTime*.6); float ring = smoothstep(.03,.0,abs(d-r*.5))*(1.-r); float core = smoothstep(.09,.05,d); gl_FragColor = vec4(vC, ring*.8+core); }`
});
const markers = new THREE.Points(mkGeo, mkMat); markers.frustumCulled = false; globe.add(markers);

const frame0 = { yaw: 0, pitch: 0, dist: 4, chord: 1 }, cur = { yaw: 0, pitch: 0, dist: 6 };
let xlShow = 0, xlStart = -10;
// distância do planeta inteiro no Immersive: 6,45 deixa o globo 20% menor que os 5,2 de antes (pedido do Gabriel)
const FULL9 = 6.45, SCAN9 = 5.45;
let scan = null, offY9 = 0; // offY9: a varredura sobe o globo para a barra de status caber embaixo // varredura da biblioteca: ver "Biblioteca" mais abaixo
let pmap = null; // mapa de rede passivo dentro do app: ver "Mapa passivo" mais abaixo
let boot = null; // login e carregamento (network map): ver "Login e carregamento" mais abaixo

function rebuild() {
  const g = GAMES[sel], sv = REGIONS[g.region].c;
  vS = toV(sv[0], sv[1]);
  routeAngle = vO.angleTo(vS);
  // Jogador e servidor na mesma cidade: afasta o ponto do servidor ~200 km só no desenho, para a rota existir.
  if (routeAngle < 0.03) { vS = toV(sv[0] + 1.2, sv[1] + 1.4); routeAngle = vO.angleTo(vS); }
  routeKm = vO.angleTo(toV(sv[0], sv[1])) * 6371;
  clearRoutes();
  const w = routeAngle;
  // rotas que cruzam o mar: cada candidata pega um dos cabos possíveis; com um cabo só, metade das rotas vai por ele e metade por terra/ar
  const cabs = cableOptions(vO, vS), cabFor = k => !cabs.length ? null : cabs.length === 1 ? (k % 2 ? null : cabs[0]) : cabs[k % Math.min(cabs.length, 3)];
  frame0.chord = 2 * Math.sin(w / 2) * 1.45; frame0.dist = fitDist();
  routeR = Math.max((frame0.dist - 1) / 2, 0.12); // largura constante na tela (~2,5 px), perto ou longe: fina demais vira pontilhado
  routes = {
    isp: makeRoute(smoothPath(vO, vS, w, u => 0.62 * Math.sin(Math.PI * u) + 0.16 * Math.sin(3 * Math.PI * u), 0.35), C.isp, 0.0032, 0.35),
    cand: CANDS.map(([lat, lift], k) => { const t = tunnelPath(vO, vS, w, lat, lift, seeded(g.name + k), cabFor(k)); return { ...makeRoute(t.pts, C.dim, 0.0024, 0.6 + k * 0.03, 0.5, routeGroup, [t.t0, t.t1]), nodes: t.nodes, cable: t.cable }; }),
    xl: []
  };
  // ping simulado de cada candidata (desvio maior custa mais, mais um sorteio fixo por jogo e servidor); as melhores em ordem: Route 1 é a mais rápida
  const rnd = seeded(g.name + g.region);
  routes.pick = CANDS.map(([lat], k) => [k, Math.abs(lat) * 0.6 + rnd()]).sort((a, b) => a[1] - b[1]).slice(0, g.lanes).map(([k]) => k);
  // ExitLag atravessa o mar sempre por cabo: cada rota pega um cabo, revezando entre os melhores; no mesmo cabo, as rotas correm lado a lado
  routes.xl = routes.pick.map((k, i) => { const [lat, lift] = CANDS[k], nc = Math.min(cabs.length, 3), cb = nc ? { ...cabs[i % nc], lane: Math.floor(i / nc) } : null, t = tunnelPath(vO, vS, w, lat, lift, seeded(g.name + k), cb); return { ...makeRoute(t.pts, C.route, 0.0032, 0.8 + i * 0.05, 0.42, routeGroup, [t.t0, t.t1]), nodes: t.nodes, cable: t.cable }; });
  vO.clone().multiplyScalar(1.006).toArray(mkPos, 0); vS.clone().multiplyScalar(1.006).toArray(mkPos, 3);
  mkGeo.attributes.position.needsUpdate = true;
  const [mLat, mLon] = toLL(vO.clone().add(vS));
  frame0.yaw = (-mLon - 90) * D; frame0.pitch = clamp(mLat, -55, 55) * D;
  buildT = time;
  xlShow = g.state === 'on' || g.state === 'testing' ? 1 : 0; xlStart = time + 0.5;
  fail = null; nextFail = time + 5 + Math.random() * 4;
  baseXl = Math.round(8 + routeKm / 100 * 1.1); baseIsp = Math.round(baseXl * 1.5 + 14);
  hist.isp.length = hist.xl.length = 0; win.length = 0;
  for (let i = 0; i < HN; i++) sample(false);
  $('pkRoute').innerHTML = `${origin[3]} → ${sv[3]}<span class="t-var">${Math.round(routeKm).toLocaleString('en-US')} km</span>`;
  // um chip por rota: estado com ponto + texto (não só cor), ping suavizado, e passar o mouse acende a rota no globo
  $('pkLanes').innerHTML = Array.from({ length: g.lanes }, (_, i) => `<span class="pk-lane idle" data-i="${i}" tabindex="0" data-tip=""><i class="dt"></i><span class="nm">Route ${i + 1}</span><span class="v tnum">–</span></span>`).join('');
  laneEma.fill(0); fastLane = 0;
  $('pkLanes').querySelectorAll('.pk-lane').forEach(el => {
    const i = +el.dataset.i;
    el.addEventListener('pointerenter', () => { hoverLane = i; }); el.addEventListener('pointerleave', () => { hoverLane = -1; });
    el.addEventListener('focus', () => { hoverLane = i; }); el.addEventListener('blur', () => { hoverLane = -1; });
  });
  tagA.innerHTML = `${origin[2]}<span class="t-var">You</span>`;
  tagB.innerHTML = `${sv[2]} · ${sv[3]}<span class="t-var">Game server</span>`;
  logMsg(g.state === 'on' ? onMsg(g) : IDLE);
}

/* ---------- Telemetria simulada ---------- */
// Ping estimado pela distância (≈1 ms de ida e volta a cada 100 km de fibra). Operadora: rota mais longa, picos e perda.
// ExitLag: o mesmo pacote vai por todas as rotas; vale o que chega primeiro, então o pico de uma rota não aparece no resultado.
let baseXl = 40, baseIsp = 74, spike = 0, fail = null, nextFail = 0;
const HN = 140, hist = { isp: [], xl: [] }, win = [];
const laneNow = [0, 0, 0, 0], laneEma = [0, 0, 0, 0];
let fastLane = 0, hoverLane = -1;
function sample(on) {
  const L = GAMES[sel].lanes;
  spike = Math.max(0, spike - 1);
  if (Math.random() < 0.012) { spike = 6 + Math.random() * 10; }
  const isp = baseIsp * (1 + (Math.random() - 0.5) * 0.16) + (spike ? baseIsp * (0.35 + Math.random() * 0.5) : 0);
  const ispLost = Math.random() < (spike ? 0.18 : 0.008);
  let best = Infinity, allLost = true;
  for (let i = 0; i < L; i++) {
    const f = fail && fail.lane === i ? fail.k : 0;
    const p = baseXl * (1 + i * 0.035) + (Math.random() - 0.5) * 2.2 + f * baseXl * (0.6 + Math.random() * 0.9);
    const lost = Math.random() < 0.003 + f * 0.35;
    laneNow[i] = p;
    if (!lost) { allLost = false; best = Math.min(best, p); }
  }
  hist.isp.push(isp); hist.xl.push(best === Infinity ? baseXl : best);
  if (hist.isp.length > HN) { hist.isp.shift(); hist.xl.shift(); }
  win.push([ispLost, allLost]); if (win.length > 400) win.shift();
}
const jit = a => { const n = Math.min(40, a.length - 1); let s = 0; for (let i = a.length - n; i < a.length; i++) s += Math.abs(a[i] - a[i - 1]); return n > 0 ? s / n : 0; };
const avg = (a, n = 6) => { const s = a.slice(-n); return s.reduce((x, y) => x + y, 0) / s.length; };
const lossPct = k => win.length ? win.filter(w => w[k]).length / win.length * 100 : 0;
const f1 = v => v.toFixed(1);

function paintTele() {
  const g = GAMES[sel], on = g.state === 'on', L = g.lanes;
  const ip = avg(hist.isp), xp = avg(hist.xl), ij = jit(hist.isp), xj = jit(hist.xl), il = lossPct(0), xl = lossPct(1);
  // só medimos com a ExitLag ligada; antes disso não há número
  $('kPing').textContent = on ? Math.round(xp) : '–';
  $('kJit').textContent = on ? f1(xj) : '–';
  $('kLoss').textContent = on ? f1(xl) : '–';
  $('kDelta').style.display = 'none';
  $('kPingVs').innerHTML = on ? `Route ${fastLane + 1}, fastest now` : g.state === 'testing' ? 'Measuring…' : 'Optimize to measure';
  $('kJitVs').innerHTML = ''; $('kLossVs').innerHTML = '';
  const failing = on && fail && fail.k > 0.5;
  $('kRoutes').textContent = on ? (failing ? L - 1 : L) : 0;
  $('kRoutesOf').textContent = on ? '/' + L : '';
  $('kRoutesVs').textContent = on ? 'in parallel' : 'Not optimized';
  // rota mais rápida com histerese (troca só com 2 ms de vantagem), para o destaque não pular a cada leitura
  for (let i = 0; i < L; i++) laneEma[i] = laneEma[i] ? laneEma[i] * 0.7 + laneNow[i] * 0.3 : laneNow[i];
  const down = i => on && fail && fail.lane === i && fail.k > 0.3;
  let best = -1; for (let i = 0; i < L; i++) if (!down(i) && (best < 0 || laneEma[i] < laneEma[best])) best = i;
  if (down(fastLane) || fastLane >= L || (best >= 0 && laneEma[best] < laneEma[fastLane] - 2)) fastLane = Math.max(0, best);
  [...$('pkLanes').children].forEach((el, i) => {
    const st = !on ? 'idle' : down(i) ? 'bad' : i === fastLane ? 'fast' : 'ok';
    el.className = 'pk-lane ' + st;
    el.querySelector('.v').textContent = st === 'bad' ? 'Unstable' : on ? Math.round(laneEma[i]) + ' ms' : (g.state === 'testing' ? '…' : 'Standby');
    el.dataset.tip = st === 'fast' ? `Route ${i + 1} is the fastest now: its packets arrive first.`
      : st === 'ok' ? `Route ${i + 1} sends the same packets in parallel, as a backup.`
      : st === 'bad' ? `Route ${i + 1} is unstable. The other routes carry your game until it recovers.`
      : 'Optimize to send your game through this route.';
  });
  if (on) { const ct = $('pkCtaT'); if (ct) ct.textContent = fmtDur(time - g.since); }
}
const ispPath = $('pkIspPath'), xlPath = $('pkXlPath');
function drawChart() {
  const on = GAMES[sel].state === 'on', top = baseXl * 1.9;
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + ((i + HN - arr.length) / (HN - 1) * 498).toFixed(1) + ' ' + (32 - Math.min(v, top) / top * 31).toFixed(1)).join('');
  ispPath.setAttribute('d', ''); xlPath.setAttribute('d', on ? path(hist.xl) : '');
}

/* ---------- Rótulos no globo ---------- */
const tagA = document.createElement('div'), tagB = document.createElement('div');
tagA.className = tagB.className = 'pk-tag'; host.append(tagA, tagB);
const v3 = new THREE.Vector3(), camDir = new THREE.Vector3(), nrm = new THREE.Vector3();
function project(v) {
  v3.copy(v).multiplyScalar(1.02); globe.localToWorld(v3);
  camDir.copy(camera.position).sub(v3).normalize(); nrm.copy(v3).normalize();
  const face = nrm.dot(camDir);
  v3.project(camera); // a projeção já inclui o view offset
  return [(v3.x * 0.5 + 0.5) * vw, (-v3.y * 0.5 + 0.5) * vh, face];
}
// Cada rótulo vai para o lado de fora da rota, para os dois nunca se cobrirem.
let tagK = 0; // V9: some com a órbita aberta, para os nomes dos jogos não sobreporem as etiquetas
function placeTags(vis) {
  const a = project(vO), b = project(vS), aLeft = a[0] <= b[0];
  const put = (el, p, left, up) => {
    const y = clamp(p[1] + (up ? -40 : 4), headBottom, vh - bandBottom - 36); // fica na faixa livre, sem cobrir cabeçalho nem widget
    const x = clamp(p[0] + (left ? -12 : 12), bandLeft + (left ? 140 : 0), vw - bandRight - (left ? 0 : 140)); // fora dos painéis da versão
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)` + (left ? ' translateX(-100%)' : '');
    el.style.opacity = vis * clamp(p[2] * 4) * (isV7() && e7 > 0 ? 0 : 1) * (1 - tagK);
  };
  const near = Math.abs(a[1] - b[1]) < 60;
  tagA.style.opacity = 0; // sem a etiqueta "You" no globo da home (pedido do Gabriel); fica só a do servidor
  put(tagB, b, !aLeft, near ? b[1] < a[1] : true);
}

/* ---------- Ping da rota no hover (pedido do Gabriel) ----------
   Passar o mouse numa rota do globo mostra o ping dela; nas rotas ExitLag a rota também acende, como no chip do Route Monitoring. */
const rtip = document.createElement('div'); rtip.className = 'pk-tag pk-rtip'; host.append(rtip);
let rHover = null; // { kind: 'xl' | 'isp', i, x, y }
const hitPts = (r, n = 48) => { const out = [], d = r.u.uDraw.value; for (let k = 0; k <= n; k++) { const u = k / n; if (u > d) break; r.curve.getPointAt(u, v3); const p = project(v3.clone().multiplyScalar(1 / 1.02)); if (p[2] > -0.05) out.push(p); } return out; };
function routeAt(px, py) {
  if (!routes || boot || pmap || gDrag || (isV7() && (away7 || e7 > 0))) return null;
  const cands = [];
  if (xlShow) routes.xl.forEach((r, i) => cands.push(['xl', i, r]));
  let best = null, bd = 14 * 14; // até 14 px da linha
  for (const [kind, i, r] of cands) for (const [x, y] of hitPts(r)) { const d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = { kind, i, x: px, y: py }; } }
  return best;
}
function paintRtip() {
  if (!rHover) { rtip.style.opacity = 0; return; }
  const on = GAMES[sel].state === 'on', isp = rHover.kind === 'isp';
  const ms = isp ? Math.round(avg(hist.isp)) : Math.round(laneEma[rHover.i] || baseXl * (1 + rHover.i * 0.035));
  const down = !isp && on && fail && fail.lane === rHover.i && fail.k > 0.3;
  const name = isp ? 'ISP route' : `ExitLag · Route ${rHover.i + 1}`;
  const note = isp ? (on ? 'Without ExitLag' : 'Your current route') : down ? 'Unstable' : on && rHover.i === fastLane ? 'Fastest now' : on ? 'Backup in parallel' : 'Testing';
  rtip.className = 'pk-tag pk-rtip ' + (isp ? 'isp' : down ? 'bad' : 'xl');
  rtip.innerHTML = `<span class="rt-v"><i class="dt"></i>${name}<b class="tnum">${down ? '–' : ms + ' ms'}</b></span><span class="t-var">${note}</span>`;
  const x = clamp(rHover.x + 14, 8, vw - rtip.offsetWidth - 8), y = clamp(rHover.y - rtip.offsetHeight - 10, 8, vh - rtip.offsetHeight - 8);
  rtip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; rtip.style.opacity = 1;
}
let rtipLane = false; // o hover do globo só limpa o destaque que ele mesmo acendeu (os chips também usam hoverLane)
function setRHover(h) {
  rHover = h;
  if (h && h.kind === 'xl') { hoverLane = h.i; rtipLane = true; } else if (rtipLane) { hoverLane = -1; rtipLane = false; }
  canvas.style.cursor = h ? 'pointer' : '';
  paintRtip();
}
canvas.addEventListener('pointermove', e => {
  if (e.buttons) return;
  const b = canvas.getBoundingClientRect();
  setRHover(routeAt((e.clientX - b.left) * vw / b.width, (e.clientY - b.top) * vh / b.height));
});
canvas.addEventListener('pointerleave', () => setRHover(null));
setInterval(() => { if (rHover) paintRtip(); }, 250); // o ping muda ao vivo enquanto o mouse está parado na rota

/* ---------- Arrastar o globo ---------- */
let gDrag = null, dYaw = 0, dPitch = 0, lastDrag = -10;
canvas.addEventListener('pointerdown', e => { gDrag = [e.clientX, e.clientY, dYaw, dPitch]; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); });
// Sensibilidade pelo zoom: o ponto do globo sob o cursor acompanha o cursor (com a câmera perto, cada pixel gira bem menos).
const dragRad = () => (cur.dist - 1) * 2 * Math.tan(15 * D) / Math.max(1, vh);
canvas.addEventListener('pointermove', e => { if (!gDrag) return; const k = dragRad(); dYaw = gDrag[2] + (e.clientX - gDrag[0]) * k; dPitch = clamp(gDrag[3] + (e.clientY - gDrag[1]) * k, -0.9, 0.9); lastDrag = time; });
const endDrag = () => { if (!gDrag) return; gDrag = null; canvas.classList.remove('drag'); lastDrag = time; dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw)); };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
// duplo clique: volta à rota na hora
canvas.addEventListener('dblclick', () => { lastDrag = -10; });

/* ---------- Pós e tamanho ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.5, 0.3);
composer.addPass(bloom);
let vw = 1, vh = 1, bandCut = 0, bandSide = 0, bandLeft = 0, bandRight = 0, headBottom = 0, bandBottom = 0;
// Distância da câmera para a rota inteira caber na faixa livre do globo (entre o cabeçalho e o widget).
function fitDist() {
  if (boot) return boot.dist;
  if (how) return how.dist;
  if (isV7() && (away7 || e7 > 0.35)) return 4.8;
  if (isV8() && !isV9()) return 6;
  if (isV9() && (show9 || scan)) return FULL9; // órbita aberta: o planeta inteiro, com os jogos em volta // V8: o planeta inteiro no centro, com a órbita de jogos em volta // V7 na sidebar: o planeta inteiro na vaga
  const band = Math.max(140, Math.min(vw - bandSide, vh - bandCut) * 0.8), worldPerPx = 2 * Math.tan(15 * D) / vh;
  // a escala vale na superfície do globo (distância − 1): rotas curtas pedem a câmera bem perto
  const fit = 1 + frame0.chord / (band * worldPerPx);
  // V9 fechada: rota curta aproxima o globo (até 2,4, para ainda ler como planeta); rota longa fica no planeta inteiro
  return isV9() ? clamp(fit, 2.4, FULL9) : clamp(fit, 1.22, 7.5);
}
// 1 com a câmera longe; menor perto, para pontos e rotas manterem o tamanho na tela
const zoomK = d => clamp((d - 1) / 3, 0.08, 1);
function resize() {
  if (!canvas.clientWidth || !canvas.clientHeight) return; // canvas escondido (home fora de vista)
  vw = canvas.clientWidth; vh = canvas.clientHeight; // o próprio canvas: na V7 ele sai do palco e voa para a sidebar
  renderer.setSize(vw, vh, false); composer.setSize(vw, vh); composer.setPixelRatio(PR); bloom.resolution.set(vw / 2, vh / 2);
  const headH = host.querySelector('.pk-head').offsetHeight + 24;
  // Área livre do globo em cada versão: o que cobre o canvas à esquerda, à direita e embaixo.
  // V7: widget embaixo · V9: só o cabeçalho
  const v = $('app').dataset.v, teleW = $('pkTele').offsetWidth + 48, teleH = $('pkTele').offsetHeight + 48, lW = $('pkL').offsetWidth;
  const [sideW, leftW, botH] = v === '9' ? [0, 0, headH] : v === '8' ? [0, 0, headH] : [0, 0, teleH - 24];
  const offX = Math.round((sideW - leftW) / 2), offY = Math.round((botH - headH) / 2); camOff = [offX, offY];
  bandCut = botH + headH; bandSide = sideW + leftW; bandLeft = leftW; bandRight = sideW; headBottom = headH + 14; bandBottom = botH;
  camera.aspect = vw / vh; camera.setViewOffset(vw, vh, offX, offY, vw, vh); camera.updateProjectionMatrix();
  frame0.dist = fitDist();
}
new ResizeObserver(resize).observe(canvas);
addEventListener('pk:layout', () => { resize(); sizeDeck(); });

/* ---------- V7: globo da V1 na home; fora dela, vai para a sidebar ----------
   Saindo da home o canvas sai do palco (que some junto com a home) e voa até a vaga redonda da sidebar, acima da versão.
   A vaga é um link para a Home (o próprio protótipo trata data-goto="Home"). Na volta, o globo voa de volta e o canvas retorna ao palco. */
const isV7 = () => $('app').dataset.v === '7';
// raio do globo na tela, em px do canvas (câmera a cur.dist, fov 30°)
const globePxAt = d => Math.tan(Math.asin(1 / Math.max(d, 1.0001))) / Math.tan(15 * D) * vh / 2;
const globePx = () => globePxAt(cur.dist);
let away7 = false, e7 = 0, fly7 = null, camOff = [0, 0], gpStart7 = 0;
function frameV7(dt) {
  const inHost = canvas.parentElement === host;
  if (!isV7()) { if (!inHost) dock7(); if (away7) { away7 = false; $('app').classList.remove('pk-away'); resize(); } e7 = 0; return; }
  const away = $('view-home').hidden;
  if (away !== away7) {
    if (away) gpStart7 = globePx() * 1.06; // tamanho do globo na tela ao sair da home
    away7 = away; frame0.dist = fitDist();
    if (away) viewOff7(true);
    $('app').classList.toggle('pk-away', away); $('sbGlobe').tabIndex = away ? 0 : -1;
  }
  const a = $('app').getBoundingClientRect();
  if (!away) { // o palco está visível: o alvo é onde ele está agora (a home pode ter voltado com outra rolagem)
    const h = host.getBoundingClientRect();
    if (h.width) fly7 = { x: h.left - a.left, y: h.top - a.top, w: h.width, h: h.height };
    if (inHost) { e7 = 0; return; }
  }
  if (!fly7) return;
  if (inHost) { // começa o voo: o canvas vai para o .app com o mesmo tamanho
    $('app').append(canvas);
    Object.assign(canvas.style, { position: 'absolute', inset: 'auto', width: fly7.w + 'px', height: fly7.h + 'px', zIndex: 6, pointerEvents: 'none' });
  }
  // duração fixa (0,7 s) com entrada e saída suaves, em vez de aproximação exponencial que arrasta no fim e encaixa num pulo
  e7 = clamp(e7 + (away ? 1 : -1) * (reduce ? 1 : dt / (window.PK_FLY || 0.7))); // PK_FLY: só para testar em câmera lenta
  if (!away && e7 <= 0.35 && frame0.dist === 4.8) { frame0.dist = fitDist(); viewOff7(false); } // último terço da volta: já entra o enquadramento da rota
  if (!away && e7 === 0) return dock7();
  canvas.style.left = fly7.x + 'px'; canvas.style.top = fly7.y + 'px';
  const sl = $('sbGlobe').getBoundingClientRect(), off = viewOn7 ? camOff : [0, 0];
  const px = fly7.w / 2 - off[0], py = fly7.h / 2 - off[1], gp = globePx() * 1.06;
  const e = e7 < 0.5 ? 4 * e7 ** 3 : 1 - (-2 * e7 + 2) ** 3 / 2;
  // ida: o raio do globo na tela vai direto do tamanho da home ao da vaga, mesmo com a câmera se afastando ao mesmo tempo
  // (antes ele inchava no começo); volta: escala 1 no fim, para encaixar sem pulo
  const s = away && gpStart7 ? (gpStart7 + (sl.width / 2 - gpStart7) * e) / gp : 1 + ((sl.width / 2) / gp - 1) * e;
  const tx = (sl.left - a.left + sl.width / 2 - (fly7.x + px)) * e, ty = (sl.top - a.top + sl.height / 2 - (fly7.y + py)) * e;
  canvas.style.transformOrigin = `${px.toFixed(1)}px ${py.toFixed(1)}px`;
  canvas.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
  // recorte: círculo na sidebar; perto do palco ele se abre até o quadro inteiro e soma o degradê da esquerda da V1,
  // para o encaixe final não trocar de máscara num pulo
  // na ida a home já sumiu: o globo sai recortado em círculo desde o primeiro quadro (sem o fundo do canvas);
  // na volta o círculo se abre até o quadro inteiro para encaixar no palco
  // na volta o círculo só se abre no último quarto, quando o canvas já está sobre o palco (antes ele mostrava o quadro escuro no meio do caminho)
  // borda do círculo em degradê, rente ao globo: sem anel escuro do fundo do canvas em volta dele na sidebar
  const open = away ? 0 : clamp(1 - e7 / 0.25) ** 2, R1 = gp * 0.98;
  const rad = R1 + (Math.hypot(fly7.w, fly7.h) - R1) * open, soft = gp * 0.14 + 70 * open;
  // furo no lugar do Route Monitoring: no palco o widget fica por cima do globo; em voo o canvas está acima de tudo,
  // então o recorte tira a área do widget (convertida para o espaço do canvas, antes do transform)
  const t = $('pkTele').getBoundingClientRect(), cx0 = a.left + fly7.x, cy0 = a.top + fly7.y;
  const loc = (X, Y) => [(X - cx0 - tx - px) / s + px, (Y - cy0 - ty - py) / s + py];
  const [hx, hy] = loc(t.left, t.top), [hx2, hy2] = loc(t.right, t.bottom), hw = t.width ? hx2 - hx : 0, hh = t.width ? hy2 - hy : 0;
  const circle = `radial-gradient(circle at ${px.toFixed(1)}px ${py.toFixed(1)}px, #000 ${rad.toFixed(1)}px, transparent ${(rad + soft).toFixed(1)}px)`;
  // Longe do palco basta o círculo, numa camada só: máscara de várias camadas com composição não funciona em todo navegador
  // (no app do Gabriel ela era ignorada e o quadro escuro do canvas aparecia em volta do globo na sidebar)
  if (away || !t.width || e7 > 0.4) {
    ['webkitMaskSize', 'maskSize', 'webkitMaskPosition', 'maskPosition', 'webkitMaskRepeat', 'maskRepeat', 'webkitMaskComposite', 'maskComposite'].forEach(k => canvas.style[k] = '');
    canvas.style.webkitMaskImage = canvas.style.maskImage = circle; return;
  }
  const m = `${circle}, linear-gradient(90deg, rgba(0,0,0,${e.toFixed(3)}), #000 28%), linear-gradient(#000, #000)`;
  Object.assign(canvas.style, { webkitMaskImage: m, maskImage: m,
    webkitMaskSize: `auto, auto, ${hw.toFixed(1)}px ${hh.toFixed(1)}px`, maskSize: `auto, auto, ${hw.toFixed(1)}px ${hh.toFixed(1)}px`,
    webkitMaskPosition: `0 0, 0 0, ${hx.toFixed(1)}px ${hy.toFixed(1)}px`, maskPosition: `0 0, 0 0, ${hx.toFixed(1)}px ${hy.toFixed(1)}px`,
    webkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    webkitMaskComposite: 'source-in, source-out', maskComposite: 'intersect, subtract' });
}
// deslocamento da câmera da V1 (globo acima do widget); na sidebar o globo fica centrado
let viewOn7 = true;
function viewOff7(away) {
  viewOn7 = !away;
  camera.setViewOffset(vw, vh, away ? 0 : camOff[0], away ? 0 : camOff[1], vw, vh); camera.updateProjectionMatrix();
}
function dock7() {
  host.prepend(canvas); e7 = 0;
  ['position', 'inset', 'left', 'top', 'width', 'height', 'zIndex', 'transform', 'transformOrigin', 'webkitMask', 'mask', 'webkitMaskImage', 'maskImage', 'webkitMaskComposite', 'maskComposite', 'webkitMaskSize', 'maskSize', 'webkitMaskPosition', 'maskPosition', 'webkitMaskRepeat', 'maskRepeat', 'pointerEvents'].forEach(k => canvas.style[k] = '');
}

/* ---------- V8: globo no centro, jogos em órbita ----------
   Miniaturas dos jogos giram devagar numa elipse em volta do globo (para no hover); otimizados têm a bolinha verde.
   Clicar num jogo abre o painel à direita (nome, servidor, Optimize/Stop e Route Monitoring) e o globo desliza para a esquerda. */
const ICONS = { 'Fortnite': 'fortnite.png', 'Dota 2': 'dota-2.png', 'Overwatch 2': 'overwatch-2.png' };
const isV8 = () => ['8', '9'].includes($('app').dataset.v); // a V9 reaproveita a órbita da V8
const isV9 = () => $('app').dataset.v === '9';
let panel8 = false, off8 = 0, a8 = -Math.PI / 2, hover8 = false, how = null; // how: tela "How ExitLag works" aberta
const orbit = document.createElement('div'); orbit.className = 'pk-orbit'; orbit.setAttribute('role', 'listbox'); orbit.setAttribute('aria-label', 'Games');
const thumbs = GAMES.map((g, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-thumb'; b.setAttribute('role', 'option'); b.setAttribute('aria-label', g.name); b.dataset.tip = g.name;
  // ícone oficial quando há (Wikipedia); nos demais, recorte quadrado da arte da capa
  const ic = ICONS[g.name]; if (!ic) b.classList.add('crop');
  b.innerHTML = `<img src="${ic ? 'assets/icons/' + ic : g.img}" alt="" draggable="false">`;
  b.addEventListener('click', () => { if (sel === i && panel8) setPanel8(false); else { select(i); setPanel8(true); } });
  orbit.append(b); return b;
});
orbit.addEventListener('pointerenter', () => hover8 = true); orbit.addEventListener('pointerleave', () => hover8 = false);
$('pk').append(orbit);
function syncThumbs8() { thumbs.forEach((t, i) => { t.classList.toggle('on', GAMES[i].state === 'on'); t.setAttribute('aria-selected', i === sel && panel8 ? 'true' : 'false'); }); }
const close8 = document.createElement('button'); close8.type = 'button'; close8.className = 'icon-btn pk-close8'; close8.setAttribute('aria-label', 'Close details');
close8.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
close8.addEventListener('click', () => setPanel8(false));
document.querySelector('.pk-r1').append(close8);
function setPanel8(o) { panel8 = o; $('app').classList.toggle('pk-p8', o); syncThumbs8(); if (!o) openSrv(false); if (typeof promoCheck === 'function') promoCheck(); }
addEventListener('keydown', e => { if (e.key === 'Escape' && isV8() && panel8) setPanel8(false); });
syncThumbs8();
// V9: as capas ficam escondidas; só a do jogo em destaque aparece, parada na frente do globo.
// Com o mouse sobre o globo a órbita abre numa mola (raio cresce com leve overshoot) e as capas entram em cascata a partir do destaque.
let show9 = false, r9 = 0, v9 = 0, orbR = [1, 1, 0, 0];
$('pk').addEventListener('pointermove', e => {
  if (!isV9() || boot || scan || pmBusy() || tour || how) return;
  const b = canvas.getBoundingClientRect(), k = b.width / vw, [rx, ry, cx, cy] = orbR;
  const dx = (e.clientX - b.left) / k - cx, dy = (e.clientY - b.top) / k - cy, m = show9 ? 70 : 10;
  const inside = (dx / (rx + m)) ** 2 + (dy / (ry + m)) ** 2 < 1;
  if (inside !== show9) setShow9(inside);
});
$('pk').addEventListener('pointerleave', () => { if (isV9() && !tour) setShow9(false); });
const name9 = document.createElement('div'); name9.className = 'pk-name9'; name9.setAttribute('aria-hidden', 'true'); orbit.append(name9);
function setShow9(o) {
  show9 = o; $('app').classList.toggle('pk-show9', o); frame0.dist = fitDist();
  // cascata: abrindo, saem de trás do globo a partir dos vizinhos do destaque; fechando, voltam na ordem inversa
  const n = thumbs.length, now = performance.now(), dm = Math.floor(n / 2);
  thumbs.forEach((t, i) => { const d = Math.min((i - sel + n) % n, (sel - i + n) % n); at9[i] = now + (o ? (d - 1) * 60 : (dm - d) * 28); t.classList.toggle('show', o); });
}
// estado por capa: p = 0 escondida atrás do globo, 1 na órbita (mola); h = expansão no hover da própria capa
const p9 = thumbs.map(() => 0), pv9 = thumbs.map(() => 0), tg9 = thumbs.map(() => 0), at9 = thumbs.map(() => 0), h9 = thumbs.map(() => 0), hv9 = thumbs.map(() => 0);
let hov9 = -1;
// capas do fundo da órbita ficam atrás do globo e sobem no hover; enquanto sobem, o lugar de onde saíram continua valendo como hover
const base9 = thumbs.map(() => [0, 0, 0]);
const inBase9 = (i, e) => { const b = orbit.getBoundingClientRect(), k = b.width / vw, [x, y, hh] = base9[i]; return Math.abs((e.clientX - b.left) / k - x) < hh && Math.abs((e.clientY - b.top) / k - y) < hh; };
const unhov9 = () => { hov9 = -1; $('app').classList.remove('pk-hov9'); };
thumbs.forEach((t, i) => { t.addEventListener('pointerenter', () => { hov9 = i; $('app').classList.add('pk-hov9'); }); t.addEventListener('pointerleave', e => { if (hov9 === i && !inBase9(i, e)) unhov9(); }); });
$('pk').addEventListener('pointermove', e => { if (hov9 >= 0 && !thumbs[hov9].matches(':hover') && !inBase9(hov9, e)) unhov9(); });
// V9: menu do canto superior esquerdo abre e fecha a sidebar
const bar9 = document.createElement('div'); bar9.className = 'v9-bar';
bar9.innerHTML = '<button class="icon-btn v9-menu" type="button" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>';
const logo9 = document.querySelector('.sidebar .logo'); if (logo9) bar9.append(logo9.cloneNode(true));
$('app').append(bar9);
const menu9 = bar9.querySelector('.v9-menu');
// "How ExitLag works": leva para a landing do globo (pedido do Gabriel, 08/10), no canto inferior esquerdo
const how9 = document.createElement('button'); how9.type = 'button'; how9.className = 'icon-btn outlined v9-how'; // icon button só com a interrogação (Gabriel, 08/10)
how9.setAttribute('aria-label', 'How ExitLag works'); how9.dataset.tip = 'How ExitLag works';
how9.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.2 9.2a2.9 2.9 0 1 1 4.1 2.6c-.8.4-1.3 1.1-1.3 2v.6"/><circle cx="12" cy="17.6" r=".4" fill="currentColor"/></svg>';
how9.addEventListener('click', () => openHow());
$('app').append(how9);
menu9.addEventListener('click', () => { const o = !$('app').classList.contains('sb-open'); $('app').classList.toggle('sb-open', o); menu9.setAttribute('aria-expanded', o); });
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
function frameV8(dt) {
  const st = stars.material.uniforms, v9on = isV9();
  stars.visible = v9on || st.uOp.value > 0.01; st.uOp.value += ((v9on ? 1 : 0) - st.uOp.value) * Math.min(1, dt * 2.5); st.uTime.value += dt;
  if (!isV8()) { if (off8 || $('pkTele').style.top) { off8 = 0; bandRight = 0; $('pkTele').style.top = ''; resize(); } return; }
  const pw = $('pkL').offsetWidth + (v9on ? 48 : 32);
  // o globo e a órbita deslizam para a esquerda quando o painel abre
  const tgt = how ? -vw * 0.17 : panel8 ? pw / 2 : 0, k = reduce ? 1 : 1 - Math.exp(-dt * 6); // na tela explicativa o globo vai para a direita
  if (Math.abs(tgt - off8) > 0.3) { off8 += (tgt - off8) * k; camera.setViewOffset(vw, vh, off8, camOff[1], vw, vh); camera.updateProjectionMatrix(); }
  bandRight = panel8 ? pw : 0;
  $('pkTele').style.top = ($('pkL').offsetTop + $('pkL').offsetHeight) + 'px';
  tagK += ((v9on && (show9 || scan) ? 1 : 0) - tagK) * Math.min(1, dt * 8);
  const n = thumbs.length, step = Math.PI * 2 / n;
  if (v9on) {
    // o destaque vai para a frente (embaixo do globo) numa rotação suave
    a8 += wrapPi(Math.PI / 2 - sel * step - a8) * (reduce ? 1 : 1 - Math.exp(-dt * 5));
    // mola criticamente amortecida, um pouco abaixo do crítico para um leve respiro no fim
    const tr = show9 || scan ? 1 : 0;
    if (reduce) { r9 = tr; v9 = 0; } else { v9 += ((tr - r9) * 170 - v9 * 21) * dt; r9 += v9 * dt; }
  } else if (!hover8 && !panel8 && !reduce) a8 += dt * 0.035;
  // V9: a órbita usa o tamanho do planeta inteiro (5,2), para não mudar quando o globo aproxima numa rota curta; o recorte usa o tamanho real
  const gpR = globePx(), gp = v9on ? globePxAt(FULL9) : gpR, cx = vw / 2 - off8, cy = vh / 2 - camOff[1] - offY9;
  let ry = Math.min(gp * 1.32, vh / 2 - (v9on ? 128 + offY9 / 2 : 44)), rx = Math.min(Math.max(gp * 1.7, ry * 1.25), (vw - bandRight) / 2 - 44);
  orbR = [rx, ry, cx, cy];
  if (v9on) { const e0 = Math.min(1, (gp + 64) / ry), e = e0 + (1 - e0) * r9; rx *= e; ry *= e; } // fechada: o destaque fica logo abaixo do globo
  const now = performance.now(), lab = v9on && !scan ? (hov9 >= 0 ? hov9 : sel) : -1;
  thumbs.forEach((t, i) => {
    let a = a8 + i * step, x, y, sc;
    if (v9on) {
      if (scan) tg9[i] = scan.shown[i] ? 1 : 0; // varredura: cada jogo sai de trás do globo quando é encontrado
      else if (i === sel) tg9[i] = 1; else if (now >= at9[i]) tg9[i] = show9 ? 1 : 0;
      if (reduce) { p9[i] = tg9[i]; pv9[i] = 0; } else { pv9[i] += ((tg9[i] - p9[i]) * 95 - pv9[i] * 15) * dt; p9[i] = Math.max(0, p9[i] + pv9[i] * dt); }
      const th = i === hov9 ? 1 : 0;
      if (reduce) h9[i] = th; else { hv9[i] += ((th - h9[i]) * 260 - hv9[i] * 24) * dt; h9[i] += hv9[i] * dt; }
      // sai do centro (escondida pelo disco do globo) girando um pouco até o lugar na órbita
      const e = p9[i]; a -= (1 - Math.min(e, 1)) * 0.55;
      const sn = Math.sin(a), d = (sn + 1) / 2;
      // metade de trás mais baixa: as capas do fundo ficam atrás do globo, só o topo aparecendo acima dele (pedido do Gabriel)
      x = cx + Math.cos(a) * rx * e; y = cy + sn * (sn < 0 ? Math.min(ry, gp - 14) : ry) * e;
      sc = (0.82 + 0.18 * d) * (i === sel && !scan ? 1.18 + 0.5 * Math.max(r9, 0) : 1) * (scan ? scanBump(i) : 1) * (1 + (i === sel ? 0.15 : 0.42) * h9[i]); // aberta: o jogo do globo cresce para se destacar dos outros
      t.style.zIndex = i === hov9 ? 40 : i === sel ? 30 : 10 + Math.round(d * 10);
      t.style.visibility = e < 0.02 ? 'hidden' : '';
      if (t.dataset.tip) delete t.dataset.tip; // o nome vem no rótulo embaixo da capa
      // o disco do globo recorta a capa enquanto ela está atrás dele
      const w = t.offsetWidth, h = t.offsetHeight, r = gpR - 2;
      // metade de trás da órbita: a capa fica atrás do disco do globo; no hover sobe o bastante para sair inteira de trás dele
      const back = sn < 0 && i !== sel;
      base9[i] = [x, y, h * sc / 2];
      if (back) { const xn = Math.max(Math.abs(x - cx) - w * sc / 2, 0), top = xn < r ? cy - Math.sqrt(r * r - xn * xn) : Infinity; y -= Math.max(0, y + h * sc / 2 - top + 12) * Math.max(0, h9[i]); }
      if ((i !== sel || scan) && (p9[i] < 0.995 || back) && Math.hypot(Math.max(Math.abs(x - cx) - w * sc / 2, 0), Math.max(Math.abs(y - cy) - h * sc / 2, 0)) < r) {
        const m = `radial-gradient(circle at ${((cx - x) / sc + w / 2).toFixed(1)}px ${((cy - y) / sc + h / 2).toFixed(1)}px, transparent ${(r / sc - 1).toFixed(1)}px, #000 ${(r / sc + 1).toFixed(1)}px)`;
        t.style.webkitMaskImage = m; t.style.maskImage = m;
      } else if (t.style.maskImage) { t.style.webkitMaskImage = ''; t.style.maskImage = ''; }
    } else {
      const sn = Math.sin(a), d = (sn + 1) / 2; // d: 0 atrás (em cima), 1 na frente (embaixo)
      x = cx + Math.cos(a) * rx; y = cy + sn * ry;
      sc = (0.82 + 0.18 * d) * (t.getAttribute('aria-selected') === 'true' ? 1.18 : 1);
      t.style.zIndex = 10 + Math.round(d * 10);
      if (!t.dataset.tip) t.dataset.tip = GAMES[i].name;
      if (t.style.maskImage || t.style.visibility) { t.style.webkitMaskImage = ''; t.style.maskImage = ''; t.style.visibility = ''; }
    }
    t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
    t.classList.toggle('sel9', i === sel);
    // V9: nome sob a capa: o destaque fora do hover, ou a capa sob o mouse
    if (i === lab) { if (name9.textContent !== GAMES[i].name) name9.textContent = GAMES[i].name;
      name9.style.transform = `translate(${x.toFixed(1)}px, ${(y + t.offsetHeight * sc / 2 + 8).toFixed(1)}px) translateX(-50%)`; }
  });
}

/* ---------- Login e carregamento (network map) ----------
   Pedido do Gabriel: uma versão do login e do carregamento com a análise de rotas.
   Login sobre o mesmo globo do Immersive, girando devagar à direita; ao entrar, o formulário dá lugar ao network map:
   localiza você, traça rotas até as regiões de servidores, mede o ping de cada uma e escolhe as melhores.
   No fim o globo volta ao centro e a home do Immersive entra por cima, já com a rota do jogo em destaque. */
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const bootEl = document.createElement('div'); bootEl.className = 'boot'; bootEl.setAttribute('aria-live', 'polite');
bootEl.innerHTML = `
  <div class="boot-win"></div>
  <form class="boot-login" id="bootLogin" novalidate aria-labelledby="bootT">
    <div class="bl-brand"></div>
    <div class="bl-head"><h1 id="bootT">Welcome back</h1><p class="t-var">Sign in to keep your games stable.</p></div>
    <div class="bl-fields">
      <label class="bf"><span class="bf-l">Email</span><span class="bf-in"><input type="email" id="bootEmail" value="player@email.com" autocomplete="username" required></span></label>
      <label class="bf"><span class="bf-l">Password</span><span class="bf-in"><input type="password" id="bootPass" value="exitlag-demo" autocomplete="current-password" required><button class="icon-btn bf-eye" type="button" id="bootEye" aria-label="Show password" aria-pressed="false">${EYE}</button></span></label>
      <p class="bf-err" id="bootErr" hidden>Enter your email and password.</p>
    </div>
    <div class="bl-row"><span class="bl-rem"><button class="toggle on" type="button" role="switch" aria-checked="true" id="bootRem" aria-labelledby="bootRemL"><i></i></button><span id="bootRemL">Remember me</span></span><a class="link" href="#" id="bootForgot">Forgot password?</a></div>
    <button class="btn filled bl-go" type="submit">Sign in</button>
    <div class="bl-or"><span>or continue with</span></div>
    <div class="bl-social"><button class="btn outlined" type="button" data-sso>Google</button><button class="btn outlined" type="button" data-sso>Discord</button><button class="btn outlined" type="button" data-sso>Steam</button></div>
    <p class="bl-new t-var">New to ExitLag? <a class="link" href="#" id="bootTrial">Start your free trial</a></p>
  </form>
  <section class="boot-scan" aria-labelledby="bsT">
    <span class="badge neutral bs-badge"><span class="live-dot"></span>Network map</span>
    <div class="bs-head"><h2 id="bsT">Locating you</h2><p class="t-var" id="bsSub"></p></div>
    <div class="bs-bar" role="progressbar" aria-label="Route analysis" aria-valuemin="0" aria-valuemax="100"><i id="bsBar"></i></div>
    <ol class="bs-steps" id="bsSteps"><li>Locate you</li><li>Reach every continent</li><li>Measure each continent</li><li>Choose the best routes</li></ol>
    <div class="bs-list" id="bsList" role="list"></div>
    <button class="link bs-skip" type="button" id="bsSkip">Skip</button>
  </section>
  <div class="pk-tag boot-tag" id="bootTag"></div>`;
$('app').append(bootEl);
{ // marca e controles da janela vêm do próprio protótipo
  const lg = document.querySelector('.sidebar .logo'); if (lg) bootEl.querySelector('.bl-brand').append(lg.cloneNode(true));
  const win = document.querySelectorAll('.topbar .btn-group'); if (win.length) bootEl.querySelector('.boot-win').append(win[win.length - 1].cloneNode(true));
}
// o network map testa só os continentes (Gabriel, 07/10): um ponto de medição por continente
const CONTS = {
  sa: { n: 'South America', c: [-23.55, -46.63, 'Sao Paulo', 'SAO'] }, na: { n: 'North America', c: [39.04, -77.49, 'Ashburn', 'IAD'] },
  eu: { n: 'Europe', c: [50.11, 8.68, 'Frankfurt', 'FRA'] }, af: { n: 'Africa', c: [-26.2, 28.05, 'Johannesburg', 'JNB'] },
  as: { n: 'Asia', c: [1.35, 103.82, 'Singapore', 'SIN'] }, oc: { n: 'Oceania', c: [-33.87, 151.21, 'Sydney', 'SYD'] }
};
const bootRows = Object.entries(CONTS);
const contPing = k => Math.round(8 + vO.angleTo(toV(CONTS[k].c[0], CONTS[k].c[1])) * 6371 / 100 * 1.1);
// o que o mapa está medindo em cada continente: cada métrica fica um pedaço do tempo dele, com o valor ao vivo
const METRICS = [['Measuring ping', a => Math.round(a.ms * (0.85 + Math.random() * 0.3)) + ' ms'], ['Evaluating jitter', a => (0.6 + Math.random() * 3).toFixed(1) + ' ms jitter'],
  ['Checking packet loss', () => (Math.random() * 0.8).toFixed(1) + '% loss'], ['Tracing the hops', a => (6 + Math.floor(a.ms / 25)) + ' hops'], ['Testing route stability', () => 'holding steady']];
const metricAt = (a, e, dur) => METRICS[clamp(Math.floor(e / dur * METRICS.length), 0, METRICS.length - 1)];
$('bsList').innerHTML = bootRows.map(([k, r]) => `<div class="bs-row" role="listitem" data-r="${k}"><i class="dt"></i><span class="bs-n">${r.n}</span><span class="t-var">${r.c[2]}</span><span class="bs-ms tnum">–</span></div>`).join('');
const bootGroup = new THREE.Group(); globe.add(bootGroup);
$('bootEye').addEventListener('click', e => { const b = e.currentTarget, show = b.getAttribute('aria-pressed') !== 'true'; $('bootPass').type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });
$('bootRem').addEventListener('click', e => { const t = e.currentTarget, on = !t.classList.contains('on'); t.classList.toggle('on', on); t.setAttribute('aria-checked', on); });
['bootForgot', 'bootTrial'].forEach(id => $(id).addEventListener('click', e => e.preventDefault()));
bootEl.querySelectorAll('[data-sso]').forEach(b => b.addEventListener('click', () => scanBoot()));
$('bootLogin').addEventListener('submit', e => {
  e.preventDefault();
  const ok = /.+@.+\..+/.test($('bootEmail').value) && $('bootPass').value.length > 0;
  $('bootErr').hidden = ok; if (ok) scanBoot();
});
$('bsSkip').addEventListener('click', () => { if (boot && boot.phase === 'scan') boot.t = Math.max(boot.t, NM_END); });

// Fluxo principal (Gabriel, 08/10): Login › network map passivo › varredura de jogos › onboarding › home.
// Cada chip começa o fluxo naquela etapa e ele segue sozinho até a home.
const pressStep = st => vchips.forEach(c => c.setAttribute('aria-pressed', c.dataset.step === st ? 'true' : 'false'));
function startBoot() {
  if (boot) endBoot(); if (scan) endScan(); if (pmap) endPmap(); endTour();
  setV('9'); history.replaceState(null, '', '#login'); pressStep('login');
  setPanel8(false); setShow9(false); $('app').classList.remove('sb-open');
  // globo à direita, girando devagar, centrado em você
  const [lat, lon] = [origin[0], origin[1]];
  boot = { phase: 'login', t: 0, dist: FULL9, off: 0, yaw0: (-lon - 90) * D, pitch: clamp(lat, -55, 55) * D, // centrado onde a pessoa está (pedido do Gabriel)
     arcs: [], best: [] };
  $('app').dataset.boot = 'login'; $('app').classList.remove('boot-out');
  $('bootErr').hidden = true; $('bsBar').style.width = '0%';
  [...$('bsSteps').children].forEach(li => li.className = '');
  [...$('bsList').children].forEach(r => { r.className = 'bs-row'; r.querySelector('.bs-ms').textContent = '–'; });
  $('bsList').style.order = ''; bootRows.forEach((_, i) => $('bsList').children[i].style.order = i);
  frame0.dist = boot.dist;
  setTimeout(() => $('bootEmail').focus({ preventScroll: true }), 400);
}
function scanBoot() {
  if (!boot || boot.phase !== 'login') return;
  // o login não tem mais network map (Gabriel, 08/10): sai direto e o mapa roda depois, dentro do app
  boot.phase = 'out'; boot.out = 0; $('app').dataset.boot = 'out'; return;
  boot.phase = 'scan'; boot.t = 0; $('app').dataset.boot = 'scan';
  $('bsSub').textContent = '';
  // uma rota (arco) até cada região de servidores; o ping simulado é o mesmo da home (distância), com um pequeno sorteio
  const saveR = routeR; routeR = (SCAN9 - 1) / 2;
  boot.arcs = bootRows.map(([k, r], i) => {
    let v = toV(r.c[0], r.c[1]), w = vO.angleTo(v);
    if (w < 0.03) { v = toV(r.c[0] + 1.2, r.c[1] + 1.4); w = vO.angleTo(v); }
    const side = (i % 2 ? 1 : -1) * 0.12; // arcos baixos e levemente curvos, alternando o lado, para não virarem raios saindo do globo
    const a = makeRoute(smoothPath(vO, v, w, u => side * Math.sin(Math.PI * u), 0.3), C.dim.clone(), 0.0026, 0.5 + i * 0.03, 0.6, bootGroup);
    return { ...a, k, ms: contPing(k) + Math.round(Math.random() * 6), w };
  });
  routeR = saveR;
  // as melhores: as 3 de menor ping
  boot.best = [...boot.arcs].sort((a, b) => a.ms - b.ms).slice(0, 3).map(a => a.k);
  boot.dist = SCAN9; frame0.dist = boot.dist;
}
// sai do fluxo: limpa as rotas do mapa e devolve o globo à home
function endBoot(keepHash) {
  if (!boot) return;
  bootGroup.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); bootGroup.clear();
  boot = null; delete $('app').dataset.boot;
  camera.setViewOffset(vw, vh, off8, camOff[1], vw, vh); camera.updateProjectionMatrix();
  if (!keepHash && location.hash === '#login') history.replaceState(null, '', '#v' + $('app').dataset.v);
  vchips.forEach(c => c.setAttribute('aria-pressed', c.dataset.v === $('app').dataset.v ? 'true' : 'false'));
  rebuild(); frame0.dist = fitDist();
}
// o network map dura 42 s (Gabriel, 07/10): cada região é medida por ~3 s; Skip pula para o fim
const B_STEP = 5, NM_END = 42, BOOT_STEPS = [[0, 'Locating you'], [3, 'Reaching every continent'], [7, 'Measuring each continent'], [38, 'Choosing the best routes'], [NM_END, 'Ready']];
function frameBoot(dt) {
  routeGroup.visible = packets.visible = markers.visible = !boot && !scan && !pmap;
  if (!boot) return;
  boot.t += dt; const t = boot.t;
  tagA.style.opacity = tagB.style.opacity = 0;
  // globo à direita no login e no mapa; no fim volta ao centro
  const offT = boot.phase === 'out' ? 0 : -Math.round(vw * 0.15);
  boot.off += (offT - boot.off) * (reduce ? 1 : 1 - Math.exp(-dt * 3));
  camera.setViewOffset(vw, vh, off8 + boot.off, camOff[1], vw, vh); camera.updateProjectionMatrix();
  // rótulo "você" na sua cidade
  const tg = $('bootTag'), p = project(vO);
  tg.innerHTML = `${origin[2]}<span class="t-var">You</span>`;
  tg.style.transform = `translate(${Math.round(p[0] + 12)}px, ${Math.round(p[1] - 40)}px)`;
  tg.style.opacity = boot.phase !== 'out' ? clamp(p[2] * 4) * clamp((t - 0.4) / 0.4) : 0;
  if (boot.phase === 'login') {
    frame0.yaw = boot.yaw0 + (reduce ? 0 : Math.sin(time * 0.12) * 0.06); frame0.pitch = boot.pitch; // só respira, sem sair de você
    return;
  }
  // mapa: o globo para em você e afasta um pouco enquanto as rotas são medidas
  frame0.yaw = (-origin[1] - 90) * D; frame0.pitch = clamp(origin[0], -55, 55) * D;
  const st = BOOT_STEPS.filter(([s]) => t >= s).length - 1;
  if (boot.phase === 'scan') {
    if ($('bsT').textContent !== BOOT_STEPS[st][1]) $('bsT').textContent = BOOT_STEPS[st][1];
    const cur = st === 2 && boot.arcs.find((a, i) => t >= 7 + i * B_STEP && t < 7 + (i + 1) * B_STEP), now = cur && metricAt(cur, t - 7 - boot.arcs.indexOf(cur) * B_STEP, B_STEP);
    const sub = st === 0 ? `${origin[2]} · finding your location` : st === 1 ? '6 continents · 1,500+ servers' : cur ? `${now[0]} · ${CONTS[cur.k].n}` : st === 2 ? 'Sending test packets' : st === 3 ? 'Comparing ping, jitter and packet loss' : `${boot.best.length} best routes are ready`;
    if ($('bsSub').textContent !== sub) $('bsSub').textContent = sub;
    [...$('bsSteps').children].forEach((li, i) => li.className = i < st ? 'done' : i === st ? 'now' : '');
    const pr = clamp(t / NM_END); $('bsBar').style.width = (pr * 100).toFixed(1) + '%'; $('bsBar').parentElement.setAttribute('aria-valuenow', Math.round(pr * 100));
  }
  const rows = $('bsList').children;
  boot.arcs.forEach((a, i) => {
    const t0 = 3 + i * 0.6, tt = 7 + (i + 1) * B_STEP, isBest = boot.best.includes(a.k), row = rows[i];
    a.u.uTime.value = time;
    a.u.uDraw.value = reduce ? (t > t0 ? 1 : 0) : ease(clamp((t - t0) / 0.7));
    // traçada em cinza; medida, a melhor acende em verde e as outras recuam
    const tested = t >= tt, chosen = t >= 38;
    a.u.uCol.value.lerp(tested && isBest ? C.route : C.dim, Math.min(1, dt * 6));
    const fade = boot.phase === 'out' ? clamp(1 - boot.out / 0.6) : 1;
    a.u.uOp.value = (t < t0 ? 0 : chosen ? (isBest ? 1 : 0.18) : tested ? 0.8 : 0.6) * fade;
    a.u.uGain.value = chosen && isBest ? (a.k === boot.best[0] ? 1 : 0.55) : 0.5;
    if (boot.phase !== 'scan') return;
    const ms = row.querySelector('.bs-ms');
    if (t >= t0 && !tested) { row.className = 'bs-row testing'; ms.textContent = Math.round(a.ms * (0.6 + Math.random() * 0.9)) + ' ms'; }
    else if (tested) { const c = 'bs-row ' + (chosen ? (isBest ? 'best' : 'dim') : 'ok'); if (row.className !== c) { row.className = c; ms.textContent = a.ms + ' ms'; } }
  });
  // escolhidas: a lista reordena pelo ping, as melhores em cima
  if (boot.phase === 'scan' && t >= 38 && !boot.sorted) { boot.sorted = true; [...boot.arcs].sort((a, b) => a.ms - b.ms).forEach((a, o) => rows[boot.arcs.indexOf(a)].style.order = o); }
  if (boot.phase === 'scan' && t >= NM_END + 0.8) { boot.phase = 'out'; boot.out = 0; $('app').dataset.boot = 'out'; }
  if (boot.phase === 'out') {
    boot.out += dt;
    if (boot.out > 1.1) { $('app').classList.add('boot-out'); endBoot(); startPmap(); setTimeout(() => $('app').classList.remove('boot-out'), 1200); } // login › network map passivo
  }
}

/* ---------- Biblioteca: varredura de jogos (pedido do Gabriel) ----------
   Estado de carregamento quando o app procura jogos instalados e os adiciona à biblioteca.
   Sobre o Immersive: um radar gira em volta do globo, o contador no centro sobe, e cada jogo encontrado
   sai de trás do globo para a órbita (a mesma mola do hover). Embaixo, a pasta sendo lida e os launchers, um por vez.
   No fim a órbita fecha e a home segue normal, com a rota do jogo em destaque. Launchers, pastas e jogos são simulados. */
const LAUNCHERS = [
  ['Steam', 'C:\\Program Files (x86)\\Steam\\steamapps\\common', ['Throne and Liberty Global', 'Counter-Strike 2', 'Dota 2', 'PUBG: Battlegrounds', 'Naruto Shippuden: Ultimate Ninja Storm 4']],
  ['Epic Games', 'C:\\Program Files\\Epic Games', ['Fortnite', 'Rocket League']],
  ['Riot Client', 'C:\\Riot Games', ['League of Legends']],
  ['Battle.net', 'C:\\Program Files (x86)\\Battle.net', ['Overwatch 2']],
  ['EA app', 'C:\\Program Files\\EA Games', ['Apex Legends']],
  ['Ubisoft Connect', 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games', ["Tom Clancy's Rainbow Six Siege"]]
];
const JUNK = ['_CommonRedist', 'shadercache', 'workshop', 'Binaries\\Win64', 'Content\\Paks', 'Saved\\Config', 'Engine\\Plugins', 'redist', 'logs', 'downloading'];
const scanEl = document.createElement('div'); scanEl.className = 'scan';
scanEl.innerHTML = `
  <div class="scan-radar" aria-hidden="true"><i class="sr-sweep"></i><i class="sr-ring"></i><i class="sr-ring"></i></div>
  <div class="scan-burst" aria-hidden="true"><i></i><i></i></div>
  <div class="scan-core" aria-live="polite"><svg class="sc-ok" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><path d="M7.5 12.4l3 3 6-6.4"/></svg><span class="sc-k t-var" id="scK">Scanning your PC</span><span class="sc-n tnum" id="scN">0</span><span class="sc-l" id="scL">games found</span></div>
  <div class="scan-bar">
    <div class="sb-r1"><span class="sb-t" id="scT">Looking for game launchers</span><span class="sb-path tnum" id="scPath"></span><span class="sb-p tnum" id="scP">0%</span><button class="link sb-skip" type="button" id="scSkip">Skip</button></div>
    <div class="bs-bar"><i id="scBar"></i></div>
    <div class="sb-ls" id="scLs">${LAUNCHERS.map(([n]) => `<span class="sb-l"><i class="dt"></i>${n}<b class="tnum"></b></span>`).join('')}</div>
  </div>`;
$('pk').append(scanEl);
$('scSkip').addEventListener('click', () => { if (scan) scan.t = Math.max(scan.t, scan.end); });
// ordem de descoberta: launcher por launcher; jogos fora da lista ficam de fora da biblioteca nova
const SCAN_ORDER = LAUNCHERS.flatMap(([, , gs], li) => gs.map(n => [GAMES.findIndex(g => g.name === n), li])).filter(([i]) => i >= 0);
const L_DUR = 1.25, L_T0 = 0.9; // cada launcher: 1,25 s; antes, 0,9 s procurando launchers
function startScan() {
  if (boot) endBoot(true); if (scan) endScan(true); if (pmap) endPmap(); endTour();
  setV('9'); history.replaceState(null, '', '#scan'); pressStep('scan');
  setPanel8(false); setShow9(false); $('app').classList.remove('sb-open');
  thumbs.forEach((_, i) => { p9[i] = 0; pv9[i] = 0; tg9[i] = 0; });
  scan = { t: 0, shown: thumbs.map(() => false), n: 0, end: L_T0 + LAUNCHERS.length * L_DUR + 0.3, done: false, yaw: frame0.yaw };
  $('app').dataset.scan = 'on';
  [...$('scLs').children].forEach(el => { el.className = 'sb-l'; el.querySelector('b').textContent = ''; });
  frame0.dist = fitDist();
}
function endScan(keepHash, next) {
  if (!scan) return;
  scan = null; delete $('app').dataset.scan;
  if (!keepHash && location.hash === '#scan') history.replaceState(null, '', '#v' + $('app').dataset.v);
  vchips.forEach(c => c.setAttribute('aria-pressed', c.dataset.v === $('app').dataset.v ? 'true' : 'false'));
  rebuild(); frame0.dist = fitDist();
  if (next) setTimeout(() => startTour(), 900); // varredura › onboarding
}
let scanPathT = 0;
// onda de conclusão: cada capa cresce e volta, em ordem de distância do jogo em destaque
function scanBump(i) {
  if (!scan || !scan.done || reduce) return 1;
  const n = thumbs.length, d = Math.min((i - sel + n) % n, (sel - i + n) % n), tt = scan.t - scan.end - 0.35 - d * 0.07;
  return tt > 0 && tt < 0.45 ? 1 + 0.2 * Math.sin(Math.PI * tt / 0.45) : 1;
}
function frameScan(dt) {
  if (!scan) { if (offY9 > 0.3) { offY9 += (0 - offY9) * (reduce ? 1 : 1 - Math.exp(-dt * 4)); if (offY9 < 0.3) offY9 = 0; camera.setViewOffset(vw, vh, off8, camOff[1] + offY9, vw, vh); camera.updateProjectionMatrix(); } return; }
  scan.t += dt * (window.PK_SCANX || 1); const t = scan.t; // PK_SCANX: só para testar acelerado
  // o globo gira devagar enquanto procura
  frame0.yaw = scan.yaw + t * 0.25; frame0.pitch = 0.25;
  // radar centrado no globo, um pouco maior que ele
  offY9 += ((scan ? 56 : 0) - offY9) * (reduce ? 1 : 1 - Math.exp(-dt * 4));
  camera.setViewOffset(vw, vh, off8, camOff[1] + offY9, vw, vh); camera.updateProjectionMatrix();
  const gp = globePx(), cx = vw / 2 - off8, cy = vh / 2 - camOff[1] - offY9, rr = gp * 1.22;
  scanEl.style.setProperty('--cx', cx.toFixed(1) + 'px'); scanEl.style.setProperty('--cy', cy.toFixed(1) + 'px'); scanEl.style.setProperty('--rr', rr.toFixed(1) + 'px');
  const li = Math.floor((t - L_T0) / L_DUR), lt = (t - L_T0) / L_DUR - li;
  // jogos do launcher atual aparecem espalhados pela fatia de tempo dele
  SCAN_ORDER.forEach(([gi, l], k) => {
    const inL = SCAN_ORDER.filter(([, l2]) => l2 === l), pos = inL.findIndex(([g]) => g === gi);
    const at = L_T0 + l * L_DUR + L_DUR * (0.25 + 0.6 * (pos + 0.5) / inL.length);
    if (!scan.shown[gi] && t >= at) { scan.shown[gi] = true; scan.n++; scan.last = gi; scan.lastT = t; }
  });
  const done = t >= scan.end;
  [...$('scLs').children].forEach((el, i) => {
    const c = 'sb-l' + (done || i < li ? ' done' : i === li ? ' now' : '');
    if (el.className !== c) el.className = c;
    const n = SCAN_ORDER.filter(([gi, l]) => l === i && scan.shown[gi]).length;
    el.querySelector('b').textContent = i < li || done || n ? n : '';
  });
  $('scN').textContent = scan.n;
  const recent = scan.last != null && t - scan.lastT < 0.9;
  $('scL').textContent = done ? 'games added to your library' : recent ? GAMES[scan.last].name : scan.n === 1 ? 'game found' : 'games found';
  $('scL').classList.toggle('hit', recent && !done);
  $('scK').textContent = done ? 'Library ready' : 'Scanning your PC';
  const pr = clamp(t / scan.end);
  $('scBar').style.width = (pr * 100).toFixed(1) + '%'; $('scP').textContent = Math.round(pr * 100) + '%';
  if (done) { $('scT').textContent = `${scan.n} games added. Optimize any of them from the globe.`; $('scPath').textContent = ''; }
  else if (li < 0) { $('scT').textContent = 'Looking for game launchers'; if (t - scanPathT > 0.09) { scanPathT = t; $('scPath').textContent = ['C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\Users\\Player\\AppData\\Local', 'D:\\Games'][Math.floor(t * 8) % 4]; } }
  else if (li >= LAUNCHERS.length) { $('scT').textContent = 'Adding games to your library'; $('scPath').textContent = ''; } // depois do último launcher, antes do fim (antes travava aqui: LAUNCHERS[li] não existia)
  else {
    const [n, root, gs] = LAUNCHERS[li];
    $('scT').textContent = `Scanning ${n}`;
    if (t - scanPathT > 0.08) { scanPathT = t; const g = gs[Math.floor(lt * gs.length * 2) % gs.length]; $('scPath').textContent = `${root}\\${g.replace(/[:']/g, '')}\\${JUNK[Math.floor(Math.random() * JUNK.length)]}`; }
  }
  // conclusão: o círculo se fecha num pulso, o check se desenha, o número dá um pulo e as capas acenam em onda a partir do destaque;
  // depois o resumo recolhe e a home entra
  if (done && !scan.done) { scan.done = true; $('app').dataset.scan = 'done'; }
  if (t >= scan.end + 2.4 && $('app').dataset.scan === 'done') $('app').dataset.scan = 'out';
  if (t >= scan.end + 3.0) endScan(false, true);
}

/* ---------- Mapa passivo (pedido do Gabriel) ----------
   Versão do fluxo em que o network map não tem tela própria: depois do login e da varredura, ele roda dentro da home.
   Enquanto mede, o app funciona, mas rotas não se configuram: Optimize e servidor ficam travados, e na barra lateral só
   Home, Network Analyzer, PC Boost, Traffic Shaper e General Settings abrem. Uma pílula no topo mostra o progresso.
   Quando termina, as 3 melhores acendem, a pílula vira "Network map ready" e o resto destrava. */
const pmGroup = new THREE.Group(); globe.add(pmGroup);
const PM_OPEN = ['Home', 'Network Analyzer', 'PC Boost', 'Traffic Shaper', 'General Settings'];
const PM_DONE = 42, PM_END = 45, PM_STEP = 6; // o network map dura 42 s (Gabriel); depois, 3 s de "pronto" e passa para a varredura de jogos
const pmPill = document.createElement('div'); pmPill.className = 'pm-pill'; pmPill.setAttribute('role', 'status'); pmPill.setAttribute('aria-live', 'polite');
pmPill.innerHTML = `<span class="pm-ic" aria-hidden="true"><i class="pm-spin"></i><svg viewBox="0 0 16 16" fill="none"><path d="M4 8.3l2.6 2.6L12 5.4"/></svg></span>
  <span class="pm-tx"><b id="pmT">Mapping your network</b><span class="t-var" id="pmS"></span></span><span class="pm-pc tnum" id="pmP">0%</span><i class="pm-bar"><i id="pmBar"></i></i>`;
$('pk').append(pmPill);
// trava os itens da barra lateral que mexem em rotas; o clique é barrado antes do protótipo abrir a página
const navLock = () => [...document.querySelectorAll('.sidebar .nav-item')].filter(n => !PM_OPEN.includes(n.dataset.goto));
document.addEventListener('click', e => {
  const n = pmBusy() && e.target.closest('.sidebar .nav-item.pm-lock'); if (!n) return;
  e.stopPropagation(); e.preventDefault();
  n.classList.remove('pm-nope'); void n.offsetWidth; n.classList.add('pm-nope');
}, true);
function lockNav(on) {
  navLock().forEach(n => {
    n.classList.toggle('pm-lock', on); n.setAttribute('aria-disabled', on ? 'true' : 'false');
    if (on) n.dataset.tip = 'Available after the network map is ready'; else delete n.dataset.tip;
  });
}
function startPmap() {
  if (boot) endBoot(true); if (scan) endScan(true); if (pmap) endPmap(); endTour();
  setV('9'); setPanel8(false); setShow9(false); $('app').classList.remove('sb-open');
  // o mapa só começa com as rotas paradas: nada otimizado enquanto mede
  GAMES.forEach(g => { if (g.state !== 'off') g.state = 'off'; }); xlShow = 0; fail = null; logMsg(IDLE);
  const saveR = routeR; routeR = (FULL9 - 1) / 2;
  const arcs = bootRows.map(([k, r], i) => {
    let v = toV(r.c[0], r.c[1]), w = vO.angleTo(v);
    if (w < 0.03) { v = toV(r.c[0] + 1.2, r.c[1] + 1.4); w = vO.angleTo(v); }
    const side = (i % 2 ? 1 : -1) * 0.12;
    const a = makeRoute(smoothPath(vO, v, w, u => side * Math.sin(Math.PI * u), 0.3), C.dim.clone(), 0.0026, 0.5 + i * 0.03, 0.5, pmGroup);
    return { ...a, k, ms: contPing(k) + Math.round(Math.random() * 6) };
  });
  routeR = saveR;
  // ordem de teste: das mais perto para as mais longe, como um analisador faria
  const order = [...arcs].sort((a, b) => a.ms - b.ms);
  order.forEach((a, o) => { a.t0 = 0.8 + o * 0.32; a.tt = 3 + (o + 1) * PM_STEP; });
  lastCont = null; lastTested = 0;
  pmap = { t: 0, arcs, best: order.slice(0, 3).map(a => a.k), done: false };
  $('app').dataset.pmap = 'on'; lockNav(true); paintCta();
  history.replaceState(null, '', '#map'); pressStep('map');
}
function endPmap() {
  if (!pmap) return;
  const wasBusy = !pmap.done;
  pmGroup.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); pmGroup.clear();
  tilt.scale.set(1, 1, 1); tilt.rotation.y = 0; ball.visible = false;
  pmap = null; delete $('app').dataset.pmap; lockNav(false); paintCta();
  if (wasBusy) promo.armed = true; // saiu antes do fim (Skip ou outra versão): o mapa conta como pronto
  else if (!boot && !scan) setTimeout(() => { if (!boot && !scan && !pmap) startScan(); }, 0); // mapa terminou › varredura de jogos, que entra animada
  rebuild(); frame0.dist = fitDist();
}
let pmPaintT = 0;
/* ---------- Globo brincalhão durante o mapa passivo (pedido do Gabriel: entreter enquanto mede) ----------
   - Procurando você: o globo balança de um lado para o outro, como quem olha em volta.
   - A cada continente ele gira até ficar de frente para a rota e chega com um "boing" de gelatina.
   - Uma bolinha de pacote joga pingue-pongue entre você e o continente, e muda de jeito conforme a métrica:
     ping vai e volta rápido; jitter treme no caminho; perda de pacote às vezes estoura no meio e renasce em você;
     hops pula de estação em estação; estabilidade desliza calma, respirando.
   - Continente medido: o globo dá um pulinho. Melhores escolhidas: um giro de comemoração antes de voltar a você. */
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
ball.visible = false; globe.add(ball);
const bTmp = new THREE.Vector3(), bN = new THREE.Vector3();
let jelly = { t: -10, a: 0 }, lastCont = null, lastTested = 0;
const boing = a => { jelly = { t: time, a }; };
function framePlay(dt, t, chosen) {
  const now = pmap.arcs.find(a => t >= a.tt - PM_STEP && t < a.tt);
  // câmera: em você enquanto localiza; depois, de frente para o meio do caminho até o continente medido
  let yaw = (-origin[1] - 90) * D, pitch = clamp(origin[0], -40, 40) * D * 0.8;
  if (now && !reduce) { const c = CONTS[now.k].c, [la, lo] = toLL(vO.clone().add(toV(c[0], c[1]))); yaw = (-lo - 90) * D; pitch = clamp(la, -45, 45) * D * 0.8; }
  tilt.rotation.y = chosen && !reduce ? ease(clamp((t - (PM_DONE - 0.6)) / 1.6)) * Math.PI * 2 : 0; // giro de comemoração (uma volta inteira)
  frame0.yaw = yaw; frame0.pitch = pitch; frame0.dist = FULL9;
  // sem quiques (Gabriel não gostou): sem gelatina e sem a bolinha; fica a câmera virando para o continente e o giro final
  ball.visible = false; return;
  // bolinha de pacote (desligada)
  const m = metricAt(now, t - (now.tt - PM_STEP), PM_STEP)[0], tri = x => 1 - Math.abs(1 - 2 * (x % 1));
  let u = tri(time * 0.55), lift = 0, sc = 1, a = 1;
  if (m === 'Measuring ping') u = tri(time * 0.9);
  else if (m === 'Tracing the hops') { const n = 6, x = (time * 1.4) % (n * 2), k = Math.floor(x), f = x - k, p = k < n ? (k + ease(f)) / n : (2 * n - k - ease(f)) / n; u = p; lift = Math.sin(Math.PI * f) * 0.05; }
  else if (m === 'Checking packet loss') { const cyc = time * 0.5, f = cyc % 1, lost = Math.sin(Math.floor(cyc) * 7.3) > 0.2; u = f; if (lost && f > 0.55) { sc = Math.max(0, 1 - (f - 0.55) * 8) * (1 + 2 * clamp((f - 0.55) * 8)); a = Math.max(0, 1 - (f - 0.55) * 6); } }
  else if (m === 'Testing route stability') { u = 0.5 - 0.5 * Math.cos(time * 0.9); sc = 1 + 0.25 * Math.sin(time * 3); }
  now.curve.getPointAt(clamp(u), bTmp); bN.copy(bTmp).normalize();
  if (lift) bTmp.addScaledVector(bN, lift);
  if (m === 'Evaluating jitter') bTmp.add(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02));
  ball.position.copy(bTmp); ball.scale.setScalar(sc * (1 + 0.6 * Math.max(0, 1 - Math.min(u, 1 - u) * 12))); // incha um pouco ao bater nas pontas
  ball.material.opacity = a; ball.visible = a > 0.02;
}
function framePmap(dt) {
  pmGroup.visible = !!pmap;
  if (!pmap) return;
  pmap.t += dt * (window.PK_SCANX || 1); const t = pmap.t;
  const chosen = t >= PM_DONE - 0.6;
  framePlay(dt, t, chosen);
  pmap.arcs.forEach(a => {
    const isBest = pmap.best.includes(a.k), tested = t >= a.tt;
    a.u.uTime.value = time;
    a.u.uDraw.value = reduce ? (t > a.t0 ? 1 : 0) : ease(clamp((t - a.t0) / 0.8));
    a.u.uCol.value.lerp(tested && isBest && chosen ? C.route : C.dim, Math.min(1, dt * 6));
    // medindo, a rota pisca; medida, assenta; escolhidas, as outras recuam; no fim tudo some e volta a rota do jogo
    const testing = t >= a.tt - PM_STEP && !tested, out = clamp(1 - (t - (PM_END - 1.6)) / 1.2);
    a.u.uOp.value = (t < a.t0 ? 0 : chosen ? (isBest ? 0.9 : 0.12) : testing ? 0.55 + 0.35 * Math.sin(time * 9) : tested ? 0.6 : 0.3) * out;
    a.u.uGain.value = chosen && isBest ? (a.k === pmap.best[0] ? 1 : 0.5) : testing ? 0.6 : 0.35;
  });
  if (!pmap.done && t >= PM_DONE) {
    pmap.done = true; $('app').dataset.pmap = 'done'; lockNav(false); paintCta();
    promo.armed = true; promoCheck(); // mapa pronto: se os detalhes de um jogo já estão abertos, a oferta entra agora
    // fim do mapa (pedido do Gabriel): o globo pulsa, os jogos abrem em órbita por um instante e fecham, ficando só o destaque
    pulseGlobe();
    // sem abrir a órbita aqui: os jogos ainda não foram encontrados; o mapa passa direto para a varredura (Gabriel, 08/10)
  }
  if (time - pmPaintT > 0.1 || pmap.done) {
    pmPaintT = time;
    const now = pmap.arcs.find(a => t >= a.tt - PM_STEP && t < a.tt), b = pmap.arcs.find(a => a.k === pmap.best[0]);
    const m = now && metricAt(now, t - (now.tt - PM_STEP), PM_STEP);
    if (m && pmap.mk !== m[0] + now.k) { pmap.mk = m[0] + now.k; pmap.mv = m[1](now); } // valor sorteado uma vez por métrica, para dar para ler
    const T = pmap.done ? 'Network map ready' : t < 0.8 ? 'Locating you' : t < 3 ? 'Reaching every continent' : m ? m[0] : 'Choosing the best routes';
    const S = pmap.done ? (t > PM_DONE + 1.2 ? 'Next: finding your games' : `Best: ${CONTS[b.k].n} · ${b.ms} ms`) : t < 0.8 ? `${origin[2]} · in the background` : t < 3 ? '6 continents · Optimize unlocks when ready' : m ? `${CONTS[now.k].n} · ${pmap.mv}` : 'Comparing ping, jitter and packet loss';
    if ($('pmT').textContent !== T) $('pmT').textContent = T;
    if ($('pmS').textContent !== S) $('pmS').textContent = S;
    const pc = Math.round(clamp(t / PM_DONE) * 100) + '%';
    $('pmP').textContent = pc; $('pmInfoP').textContent = pc; $('pmBar').style.width = pc;
  }
  if (t >= PM_END - 1.4 && $('app').dataset.pmap === 'done') $('app').dataset.pmap = 'out';
  if (t >= PM_END) endPmap();
}

/* ---------- Oferta embaixo dos detalhes (pedido do Gabriel) ----------
   Gatilho: o mapa de rede terminou (o app já sabe como é a rota do jogador) e o jogador abre os detalhes de um jogo
   que não está otimizado. É o momento em que ele está olhando a própria rota ruim: a oferta usa os números dela.
   Aparece uma vez por sessão, 0,7 s depois do painel abrir; "Not now" ou otimizar o jogo fecha de vez. */
const promo = { armed: false, shown: false, closed: false, end: 0, timer: 0 };
const promoEl = document.createElement('section'); promoEl.className = 'banner pk-promo'; promoEl.setAttribute('aria-label', 'Offer'); promoEl.hidden = true;
{
  const bg = document.querySelector('#banner .slide:nth-child(2) .bg')?.style.backgroundImage || '', pic = document.querySelector('#banner .slide:nth-child(2) .pic')?.style.backgroundImage || '';
  promoEl.innerHTML = `<div class="creative"><div class="slide active"><div class="bg" style='background-image:${bg}'></div><div class="pic" style='background-image:${pic}'></div>
    <div class="body"><div><span class="badge success">25% OFF · <span class="tnum" id="prT">23:59:59</span></span><h3>Lock in the best route</h3><p class="desc" id="prD"></p>
    <span class="pr-acts"><button class="btn filled pr-go" type="button">Get 25% off</button><button class="link pr-no" type="button">Not now</button></span></div></div></div>
    <button class="icon-btn pr-x" type="button" aria-label="Close offer"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>`;
}
$('pk').append(promoEl);
const closePromo = () => { promo.closed = true; promoEl.classList.remove('in'); setTimeout(() => { promoEl.hidden = true; }, 300); };
promoEl.querySelector('.pr-x').addEventListener('click', closePromo);
promoEl.querySelector('.pr-no').addEventListener('click', closePromo);
promoEl.querySelector('.pr-go').addEventListener('click', e => { e.currentTarget.textContent = 'Opening checkout…'; setTimeout(closePromo, 900); });
function paintPromo() {
  const g = GAMES[sel], r = REGIONS[g.region].n;
  $('prD').innerHTML = `The network map found a <b class="tnum">${estPing(g.region)} ms</b> route to ${r}, with ${g.lanes} paths in parallel. Annual plan.`;
}
// chamado ao abrir/fechar os detalhes e quando o mapa termina
function promoCheck() {
  clearTimeout(promo.timer);
  const want = panel8 && isV9() && !promo.closed && promo.armed && !pmBusy();
  if (!want) { promoEl.classList.remove('in'); return; }
  if (promo.shown) { if (GAMES[sel].state === 'on') return closePromo(); paintPromo(); promoEl.hidden = false; requestAnimationFrame(() => promoEl.classList.add('in')); return; }
  if (GAMES[sel].state === 'on') return; // jogo já otimizado: não é a hora
  promo.timer = setTimeout(() => {
    if (!panel8 || promo.closed) return;
    promo.shown = true; promo.end = Date.now() + 24 * 3600e3 - 1000; paintPromo();
    promoEl.hidden = false; requestAnimationFrame(() => promoEl.classList.add('in'));
  }, reduce ? 0 : 700);
}
// fica logo abaixo da telemetria, com a mesma largura do painel; o relógio da oferta corre
setInterval(() => {
  if (promoEl.hidden) return;
  const tb = $('pkTele').getBoundingClientRect(), pb = promoEl.offsetParent.getBoundingClientRect(), k = pb.width / promoEl.offsetParent.offsetWidth || 1;
  Object.assign(promoEl.style, { top: ((tb.bottom - pb.top) / k + 12) + 'px', left: ((tb.left - pb.left) / k) + 'px', width: (tb.width / k) + 'px' });
  const s = Math.max(0, Math.floor((promo.end - Date.now()) / 1000)); $('prT').textContent = [s / 3600, s / 60 % 60, s % 60].map(x => String(Math.floor(x)).padStart(2, '0')).join(':');
  if (GAMES[sel].state === 'on' && promo.shown && !promo.closed) closePromo(); // otimizou: a oferta sai
}, 250);

/* ---------- ExitLag desligada (pedido do Gabriel) ----------
   Com o toggle da topbar desligado, o globo puxa para o laranja da operadora, bem de leve: borda e atmosfera,
   continentes e pontos de servidor; as rotas ExitLag somem e fica só a rota da operadora. */
let offK = 0, offPrev = 0;
const RIM0 = C.rim.clone(), ORANGE = new THREE.Color('#eb8322');
const landCol = C.dim.clone(), svCol = C.route.clone();
landMat.uniforms.uCol.value = landCol; svMat.uniforms.uCol.value = svCol;
// ligar a ExitLag: o globo acende em verde (borda, atmosfera, continentes) e um anel corre para fora; depois volta ao azul e para
const GREEN = C.route.clone(); let onT = -10;
const onRing = document.createElement('div'); onRing.className = 'pk-onring'; onRing.setAttribute('aria-hidden', 'true'); $('pk').append(onRing);
function frameOff(dt) {
  const off = $('app').classList.contains('el-off') ? 1 : 0;
  // desligar a ExitLag para as conexões ativas (como diz o diálogo do protótipo)
  if (off && !offPrev) { GAMES.forEach(g => { if (g.state === 'on' || g.state === 'testing') g.state = 'off'; }); xlShow = 0; fail = null; logMsg(IDLE); paintCta(); layout(); }
  if (!off && offPrev) { offK = 0; pulseGlobe(); }
  if (off !== offPrev) paintCta();
  offPrev = off;
  const pt = time - onT, p = reduce ? 0 : pt < 0.35 ? ease(pt / 0.35) : Math.max(0, 1 - (pt - 0.35) / 1.6) ** 1.6;
  if (offK === off && p === 0 && !onT0) return;
  onT0 = p > 0;
  if (offK !== off) { offK += (off - offK) * (reduce ? 1 : 1 - Math.exp(-dt * 3)); if (Math.abs(off - offK) < 0.002) offK = off; }
  C.rim.copy(RIM0).lerp(ORANGE, 0.55 * offK).lerp(GREEN, 0.75 * p);
  landCol.copy(C.dim).lerp(ORANGE, 0.32 * offK).lerp(GREEN, 0.45 * p);
  svCol.copy(C.route).lerp(ORANGE, offK);
  bloom.strength = 0.8 + 0.5 * p;
}
let onT0 = false;
// pulso verde do globo com o anel correndo para fora: ao ligar a ExitLag e quando o network map termina
function pulseGlobe() {
  onT = time; if (reduce) return;
  const gp = globePx(); onRing.style.cssText = `left:${(vw / 2 - off8).toFixed(1)}px; top:${(vh / 2 - camOff[1] - offY9).toFixed(1)}px; width:${(gp * 2).toFixed(1)}px; height:${(gp * 2).toFixed(1)}px`;
  onRing.classList.remove('go'); void onRing.offsetWidth; onRing.classList.add('go');
}

/* ---------- Nós do túnel: bridges e finals ----------
   Cada rota ExitLag mostra dois nós: a bridge (entrada, perto de você) e a final (saída, perto do servidor).
   Acendem quando a rota passa por eles ao ser traçada; a rota mais rápida ganha rótulos com a cidade de cada nó. */
const NPL = 3, NODEN = MAXL * NPL, ndPos = new Float32Array(NODEN * 3), ndA = new Float32Array(NODEN), ndF = new Float32Array(NODEN), ndK = new Float32Array(NODEN);
const ndGeo = new THREE.BufferGeometry();
ndGeo.setAttribute('position', new THREE.BufferAttribute(ndPos, 3).setUsage(THREE.DynamicDrawUsage));
ndGeo.setAttribute('aA', new THREE.BufferAttribute(ndA, 1).setUsage(THREE.DynamicDrawUsage));
ndGeo.setAttribute('aF', new THREE.BufferAttribute(ndF, 1).setUsage(THREE.DynamicDrawUsage));
ndGeo.setAttribute('aK', new THREE.BufferAttribute(ndK, 1).setUsage(THREE.DynamicDrawUsage));
const ndMat = new THREE.ShaderMaterial({
  uniforms: { uSize: { value: 120 }, uPR: { value: PR }, uCol: { value: C.route }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uSize; uniform float uPR; attribute float aA; attribute float aF; attribute float aK; varying float vA; varying float vF; varying float vK; void main(){ vA=aA; vF=aF; vK=aK; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uSize*(1.+.5*aF)*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
  // ponto no mapa: núcleo cheio, anel fino em volta e halo; a final tem o anel duplo. O clarão (vF) é a rota chegando no nó.
  fragmentShader: `uniform vec3 uCol; uniform float uTime; varying float vA; varying float vF; varying float vK; void main(){ if(vA<=0.) discard; float d = length(gl_PointCoord-.5);
    float core = smoothstep(.1,.07,d);
    float ring = smoothstep(.025,.0,abs(d-.2))*.8 + vK*smoothstep(.02,.0,abs(d-.3))*.5;
    float halo = smoothstep(.5,.0,d)*(.18 + .6*vF);
    float r = fract(uTime*.5 + vK*.5); float wave = smoothstep(.02,.0,abs(d-.2-r*.28))*(1.-r)*.5;
    gl_FragColor = vec4(mix(uCol, vec3(1.), .5*core + .3*vF), (core + ring + halo + wave)*vA); }`
});
const nodes = new THREE.Points(ndGeo, ndMat); nodes.frustumCulled = false; globe.add(nodes);
const ndTags = Array.from({ length: NPL }, () => { const el = document.createElement('div'); el.className = 'pk-tag pk-tag-node'; host.append(el); return el; });
function frameNodes() {
  ndMat.uniforms.uTime.value = time; ndMat.uniforms.uSize.value = 120 * Math.max(zoomK(cur.dist), 0.15);
  nodes.visible = routeGroup.visible;
  let fastShown = 0;
  for (let i = 0; i < MAXL; i++) {
    const r = routes && routes.xl[i];
    for (let k = 0; k < NPL; k++) {
      const n = i * NPL + k, nd = r && r.nodes[k];
      if (!nd) { ndA[n] = 0; continue; }
      nd.v.clone().multiplyScalar(1.008).toArray(ndPos, n * 3); ndK[n] = nd.kind;
      const d = r.u.uDraw.value, op = r.u.uOp.value * Math.min(1, 0.35 + r.u.uGain.value);
      ndA[n] = d >= nd.t ? op : 0; ndF[n] = d >= nd.t && d < 1 ? clamp(1 - (d - nd.t) * 4) : 0;
    }
    if (r && i === fastLane && GAMES[sel].state === 'on') fastShown = r.u.uOp.value;
  }
  ndGeo.attributes.position.needsUpdate = ndGeo.attributes.aA.needsUpdate = ndGeo.attributes.aF.needsUpdate = ndGeo.attributes.aK.needsUpdate = true;
  // rótulos dos nós da rota mais rápida: Bridge · cidade, Final · cidade
  // rótulos Bridge/Final retirados a pedido do Gabriel: os nós ficam só como pontos
  const r = routes && routes.xl[fastLane], vis = 0 * fastShown;
  ndTags.forEach((el, k) => {
    const nd = r && r.nodes[k];
    if (!nd || vis <= 0.01 || r.u.uDraw.value < nd.t) { el.style.opacity = 0; return; }
    const h = `${nd.kind ? 'Final' : 'Bridge'}${nd.c ? ` · ${nd.c}` : ''}`; if (el.textContent !== h) el.textContent = h;
    // rótulo do lado de fora da curva, para não encostar nas outras rotas nem nas etiquetas das pontas
    const p = project(nd.v), mid = project(vO.clone().add(vS).normalize()), left = p[0] < mid[0];
    // colado na etiqueta You / Game server: o rótulo sai, o ponto fica
    if ([vO, vS].some(e => { const q = project(e); return Math.hypot(q[0] - p[0], q[1] - p[1]) < 56; })) { el.style.opacity = 0; return; }
    el.style.transform = `translate(${Math.round(p[0] + (left ? -12 : 12))}px, ${Math.round(p[1] - 8)}px)` + (left ? ' translateX(-100%)' : '');
    el.style.opacity = vis * clamp(p[2] * 4);
  });
}

/* ---------- Loop ---------- */
let time = 0, lastT = performance.now(), lastS = 0, lastP = 0;
resize();
select(0);

const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function frame() {
  const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.05); lastT = now; time += dt;
  const g = GAMES[sel], on = g.state === 'on';
  frameTour(); frameHow(dt);

  // enquadramento suave; o arraste volta sozinho depois de 2,5 s
  if (!gDrag && time - lastDrag > 1.2) { const k = 1 - Math.exp(-dt * 3); dYaw += (0 - dYaw) * k; dPitch += (0 - dPitch) * k; }
  const kf = reduce ? 1 : 1 - Math.exp(-dt * (isV9() && show9 ? 7 : 2.6)); // V9: abrindo a órbita, o globo recua rápido
  cur.yaw += wrapA(frame0.yaw - cur.yaw) * kf; cur.pitch += (frame0.pitch - cur.pitch) * kf; cur.dist += (frame0.dist - cur.dist) * kf;
  globe.rotation.y = cur.yaw + dYaw + (reduce ? 0 : Math.sin(time * 0.15) * 0.03);
  tilt.rotation.x = cur.pitch + dPitch;
  camera.position.set(0, 0, cur.dist); camera.lookAt(0, 0, 0);
  const zk = zoomK(cur.dist);
  landMat.uniforms.uSize.value = 9 * Math.max(zk, 0.5); svMat.uniforms.uSize.value = 20 * Math.max(zk, 0.25);
  packets.material.uniforms.uSize.value = 34 * Math.max(zk, 0.12); mkMat.uniforms.uSize.value = 100 * Math.max(zk, 0.12);
  atmo.material.uniforms.uCenter.value.copy(tilt.position);

  const age = time - buildT, xa = time - xlStart;
  if (routes) {
    routes.isp.u.uDraw.value = reduce ? 1 : ease(clamp((age - 0.35) / 0.9));
    // linha da operadora fora da home (confundia, pedido do Gabriel); só a tela explicativa a mostra, para explicar o problema
    routes.isp.u.uOp.value = how ? how.ispK : 0; routes.isp.u.uTime.value = time;
    if (how && how.ispK > 0.01) routes.isp.u.uDraw.value = 1;
    const testing = g.state === 'testing';
    // teste: as candidatas cinza se espalham, depois somem e as 4 escolhidas acendem em verde sobre elas
    routes.cand.forEach((r, k) => {
      r.u.uTime.value = time;
      if (!testing) { r.u.uOp.value = 0; return; }
      r.u.uDraw.value = reduce ? 1 : ease(clamp((xa - k * 0.1) / 0.7));
      r.u.uOp.value = 0.6 * (1 - clamp((xa - (routes.pick.includes(k) ? 1.9 : 1.5)) / 0.5));
    });
    routes.xl.forEach((r, i) => {
      r.u.uDraw.value = !xlShow ? 0 : reduce ? 1 : testing ? ease(clamp((xa - 1.5 - i * 0.12) / 0.6)) : ease(clamp((xa - i * 0.3) / 0.8));
      r.u.uOp.value = xlShow * (1 - offK) * (how ? how.xlK : 1); r.u.uTime.value = time;
      r.u.uFail.value = fail && fail.lane === i ? fail.k : 0;
      // a mais rápida fica bem mais forte; passar o mouse num chip manda
      r.u.uGain.value = hoverLane >= 0 ? (hoverLane === i ? 0.95 : 0.12) : on ? (i === fastLane ? 1 : 0.22) : 0.42;
    });
  }
  // uma rota oscila de tempos em tempos: entra, segura, sai
  if (on && !fail && time > nextFail) { fail = { lane: Math.floor(Math.random() * g.lanes), t0: time, k: 0 }; logMsg(`<b>Route ${fail.lane + 1} wobbled.</b> Packets kept flowing through the other ${g.lanes - 1}, with no loss.`); }
  if (fail) {
    const e = time - fail.t0; fail.k = e < 0.3 ? e / 0.3 : e < 3 ? 1 : 1 - (e - 3) / 0.5;
    if (e > 3.5) { logMsg(`Route ${fail.lane + 1} is stable again and back in the group.`); fail = null; nextFail = time + 8 + Math.random() * 6; }
  }
  mkMat.uniforms.uTime.value = time; svMat.uniforms.uTime.value = time;

  // pacotes
  let j = 0;
  const putPk = (route, u, col, a) => { route.curve.getPointAt(clamp(u), v3); v3.toArray(pkPos, j * 3); col.toArray(pkCol, j * 3); pkA[j] = a; j++; };
  if (routes) {
    routes.xl.forEach((r, ri) => {
      const sp = 0.42 * (routes.xl[0].len / r.len), draw = r.u.uDraw.value;
      for (let i = 0; i < PK; i++) {
        // o pacote segura um instante em cada nó (encapsula na bridge, desencapsula na final) e acende ao passar
        const hold = 0.03, ns = r.nodes; let x = ((time * sp + i / PK) % 1) * (1 + ns.length * hold), u = x;
        for (let k = 0; k < ns.length; k++) { const t = ns[k].t + k * hold; if (x < t) { u = x - k * hold; break; } if (x < t + hold) { u = ns[k].t; break; } u = x - (k + 1) * hold; }
        u = clamp(u); let nodeK = 0; for (const nd of ns) nodeK = Math.max(nodeK, Math.exp(-(((u - nd.t) / 0.012) ** 2)));
        putPk(r, u, nodeK > 0.5 ? C.fog : C.route, u < draw && offK < 0.5 ? (fail && fail.lane === ri ? 1 - fail.k : 1) * (on && ri === fastLane ? 0.9 : on ? 0.3 : 0.55) * (1 + nodeK) : 0);
      }
    });
  }
  while (j < packetsN) pkA[j++] = 0;
  pkGeo.attributes.position.needsUpdate = pkGeo.attributes.aCol.needsUpdate = pkGeo.attributes.aA.needsUpdate = true;

  // telemetria: amostra a 10 Hz, números a 4 Hz para dar para ler
  if (time - lastS > 0.1) { lastS = time; sample(on); drawChart(); }
  if (time - lastP > 0.25) { lastP = time; paintTele(); }

  frameNodes(); frameCables(dt); frameV7(dt); frameV8(dt); frameBoot(dt); frameScan(dt); framePmap(dt); frameOff(dt);
  scene.updateMatrixWorld();
  placeTags(pmap ? 0 : clamp((age - 0.6) / 0.4));
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Onboarding da home: 4 passos com tooltips (pedido do Gabriel) ----------
   Abre sozinho na primeira chegada à home (depois do login e da varredura; no fluxo passivo, quando o mapa termina)
   e pelo chip "Onboarding" (#tour). Um recorte escurece o resto do app e destaca o alvo; o balão aponta para ele.
   1 jogos em órbita · 2 Optimize e servidor · 3 a rota no globo · 4 Route Monitoring. Esc pula, → avança. */
let tour = null;
const TOUR = [
  { t: 'Your games', d: 'Every game we found on your PC orbits the globe. Hover the globe to see them all, then click one to open it.',
    el: null, side: 'corner', pre: () => { setPanel8(false); setShow9(true); } },
  { t: 'Optimize', d: 'Optimize sends the game through the ExitLag network. We are turning it on for you now. Pick a server, or leave it on Automatic and we choose the best one.',
    el: () => document.querySelector('.pk-r2'), side: 'left', pre: () => { setShow9(false); if (GAMES[sel].state !== 'on') { const i = GAMES.findIndex(g => g.state === 'on'); if (i >= 0) select(i); } setPanel8(true);
      // primeira vez nada está otimizado: o tour liga o jogo em destaque, para os passos da rota e do Route Monitoring terem o que mostrar
      setTimeout(() => { if (tour && tour.i === 1 && GAMES[sel].state === 'off') toggleOpt(); }, 900); } },
  { t: 'Your route, live', d: 'The globe draws the path we found: from you, through bridges, to the game server. The brightest line is the fastest. Hover a line to see its ping.',
    el: 'globe', side: 'right' },
  { t: 'Route Monitoring', d: 'Ping, jitter and packet loss update every second while you play, for each route ExitLag keeps open.',
    el: () => $('pkTele'), side: 'left' }
];
const tourEl = document.createElement('div'); tourEl.className = 'tour'; tourEl.hidden = true;
tourEl.innerHTML = `<div class="tour-hole"></div>
  <div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourT" aria-describedby="tourD"><i class="tour-arrow"></i>
    <span class="tour-n tnum" id="tourN"></span><h3 class="tour-t" id="tourT"></h3><p class="tour-d" id="tourD"></p>
    <div class="tour-f"><span class="tour-dots" aria-hidden="true">${TOUR.map(() => '<i></i>').join('')}</span>
      <button class="link tour-skip" type="button">Skip</button><button class="btn filled tour-next" type="button"></button></div></div>`;
$('app').append(tourEl);
const tourHole = tourEl.querySelector('.tour-hole'), tourTip = tourEl.querySelector('.tour-tip'), tourArrow = tourEl.querySelector('.tour-arrow');
function startTour() {
  if (boot || scan || pmBusy() || !isV9()) return;
  $('app').classList.remove('sb-open'); openSrv(false);
  tour = { i: -1 }; tourEl.hidden = false; history.replaceState(null, '', '#tour'); pressStep('tour'); requestAnimationFrame(() => tourEl.classList.add('in'));
  tourStep(0);
}
function tourStep(i) {
  if (i >= TOUR.length) return endTour();
  tour.i = i; const s = TOUR[i];
  s.pre?.();
  $('tourN').textContent = `${i + 1} of ${TOUR.length}`; $('tourT').textContent = s.t; $('tourD').textContent = s.d;
  tourEl.querySelector('.tour-next').textContent = i === TOUR.length - 1 ? 'Got it' : 'Next';
  [...tourEl.querySelectorAll('.tour-dots i')].forEach((d, k) => d.classList.toggle('on', k === i));
  tourTip.classList.remove('show'); setTimeout(() => tourTip.classList.add('show'), 260); // o balão entra depois que o recorte chega no alvo
  tourEl.querySelector('.tour-next').focus({ preventScroll: true });
}
function endTour() {
  if (!tour) return;
  tour = null; tourEl.classList.remove('in'); tourTip.classList.remove('show');
  setTimeout(() => { if (!tour) tourEl.hidden = true; }, 300);
  setPanel8(false); setShow9(false);
  if (location.hash === '#tour') history.replaceState(null, '', '#v' + $('app').dataset.v);
  pressStep('home'); // onboarding › home
}
tourEl.querySelector('.tour-next').addEventListener('click', () => tourStep(tour.i + 1));
tourEl.querySelector('.tour-skip').addEventListener('click', endTour);
addEventListener('keydown', e => { if (!tour) return; if (e.key === 'Escape') { e.stopImmediatePropagation(); endTour(); } else if (e.key === 'ArrowRight') tourStep(tour.i + 1); else if (e.key === 'ArrowLeft' && tour.i > 0) tourStep(tour.i - 1); }, true);
// todo quadro: o alvo anda (painel abrindo, globo deslizando), então recorte e balão seguem
function frameTour() {
  if (!tour || tour.i < 0) return;
  const s = TOUR[tour.i], A = $('app').getBoundingClientRect();
  let x, y, w, h, round = false;
  tourEl.classList.toggle('free', !s.el); // passo sem destaque (Gabriel): só o balão, sem escurecer
  if (!s.el) { x = 0; y = 0; w = A.width; h = A.height; }
  else if (s.el === 'orbit') { // a órbita inteira (globo + capas), na elipse que ela ocupa
    const b = canvas.getBoundingClientRect(), k = b.width / vw, [rx, ry, ox, oy] = orbR, px = 36, py = 64; // em x mais justo, para o balão caber ao lado
    x = b.left - A.left + (ox - rx - px) * k; y = b.top - A.top + (oy - ry - py) * k; w = (rx + px) * 2 * k; h = (ry + py) * 2 * k; round = true;
  } else if (s.el === 'globe') {
    const b = canvas.getBoundingClientRect(), k = b.width / vw, r = globePx() * k * 1.02;
    x = b.left - A.left + (vw / 2 - off8) * k - r; y = b.top - A.top + (vh / 2 - camOff[1] - offY9) * k - r; w = h = 2 * r; round = true;
  } else {
    const el = s.el(); if (!el) return; const b = el.getBoundingClientRect(), pad = 8;
    x = b.left - A.left - pad; y = b.top - A.top - pad; w = b.width + 2 * pad; h = b.height + 2 * pad;
  }
  Object.assign(tourHole.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: round ? '50%' : '12px' });
  // balão do lado pedido; se não couber, vai para o lado oposto; sempre dentro do app com 16 px de margem
  const tw = tourTip.offsetWidth, th = tourTip.offsetHeight, gap = 16, m = 16, cx = x + w / 2, cy = y + h / 2;
  let side = s.side;
  if (side === 'corner') { tourTip.style.transform = `translate(${m}px, 72px)`; tourTip.dataset.side = side; return; } // a órbita ocupa quase o app todo: balão no canto livre, sem seta
  const fits = sd => sd === 'top' ? y - gap - th > m : sd === 'bottom' ? y + h + gap + th < A.height - m : sd === 'left' ? x - gap - tw > m : x + w + gap + tw < A.width - m;
  if (!fits(side)) side = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];
  let tx = side === 'left' ? x - gap - tw : side === 'right' ? x + w + gap : cx - tw / 2;
  let ty = side === 'top' ? y - gap - th : side === 'bottom' ? y + h + gap : cy - th / 2;
  tx = clamp(tx, m, A.width - m - tw); ty = clamp(ty, m, A.height - m - th);
  tourTip.style.transform = `translate(${tx}px, ${ty}px)`; tourTip.dataset.side = side;
  if (side === 'top' || side === 'bottom') { tourArrow.style.left = clamp(cx - tx, 20, tw - 20) + 'px'; tourArrow.style.top = ''; }
  else { tourArrow.style.top = clamp(cy - ty, 20, th - 20) + 'px'; tourArrow.style.left = ''; }
}

/* ---------- "How ExitLag works": tela explicativa (Gabriel, 08/10) ----------
   O conteúdo da landing do globo, adaptado para quem já está no app: sem teste grátis e sem comparar com a rota da
   operadora (a ExitLag não tem esses dados). Capítulos com scroll, como na landing; o globo da home fica à direita e
   cada capítulo mexe nele: gira, liga as rotas do jogo, derruba uma rota para mostrar a troca, afasta para a rede,
   abre a órbita de jogos. Ao fechar, tudo volta como estava. */
// Texto da landing (versão EN) preservado; só o que era conversão (teste grátis, sem cartão, instale) virou informação do app
const HOW = [
  { h: 'Reduce lag in your games.', p: 'ExitLag sends your game through several routes at once. If one wobbles, another delivers.', k: 'spin' },
  { h: 'Your ISP’s route wasn’t built for gaming.', p: 'It takes detours, crosses congested links and spikes mid-round. On screen, that means shots that don’t register and players that teleport.', k: 'isp' },
  { h: 'One packet. Many routes. At once.', p: 'ExitLag duplicates your game traffic across its own network and sends each copy down a different path. The first to arrive wins.',
    note: 'Not a VPN. Your IP and browsing stay as they are; only the game goes through ExitLag.', k: 'lanes' },
  { h: 'If one route wobbles, another has already delivered.', p: 'The switch happens without you noticing. Ping doesn’t jump, and the match is still decided by your aim.', k: 'fail' },
  { h: 'Almost 1,800 games. Yours is on the list.', p: 'Pick your game on the globe and ExitLag tunes the routes to its server.', k: 'games' },
  { h: 'On PC, iOS and Android.', plats: [['PC', 'Valorant, CS2, League of Legends, Fortnite and almost 1,800 games.'], ['iOS and Android', 'Free Fire, Roblox, CoD Mobile and more on your phone, on the same plan.'], ['Router', 'ExitLag right on your router. Testing with the first players.', 'BETA']], k: 'spin' },
  { h: 'Play your next match without lag.', p: 'Pick your game, press Optimize and watch your ping settle.', cta: true, k: 'lanes' }
];
const howEl = document.createElement('section'); howEl.className = 'how'; howEl.hidden = true; howEl.setAttribute('aria-label', 'How ExitLag works');
howEl.innerHTML = `<div class="how-top"><button class="icon-btn how-x" type="button" aria-label="Back to home" data-tip="Back to home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><span class="how-k">How ExitLag works</span></div>
  <div class="how-sc" tabindex="-1">${HOW.map((c, i) => `<div class="how-ch" data-i="${i}"><div class="how-c">
    ${i ? `<h2>${c.h}</h2>` : `<h1>${c.h}</h1>`}${c.p ? `<p class="how-p">${c.p}</p>` : ''}${c.note ? `<p class="how-note">${c.note}</p>` : ''}
    ${c.stats ? `<div class="how-stats">${c.stats.map(([n, l]) => `<div><strong class="tnum">${n}</strong><span>${l}</span></div>`).join('')}</div>` : ''}
    ${c.plats ? `<ul class="how-plats">${c.plats.map(([n, l, b]) => `<li><b>${n}${b ? ` <span class="badge">${b}</span>` : ''}</b><span>${l}</span></li>`).join('')}</ul>` : ''}
    ${c.cta ? `<div class="how-acts"><button class="btn filled how-go" type="button">Back to home</button><button class="btn outlined how-faq" type="button">FAQ</button></div>` : ''}
    ${i === 0 ? `<p class="how-hint">Scroll to see how</p>` : ''}</div></div>`).join('')}</div>
  <nav class="how-dots" aria-label="Chapters">${HOW.map((c, i) => `<button type="button" aria-label="${c.h}" data-tip="${c.h}" data-i="${i}"></button>`).join('')}</nav>
  <div class="how-hud" aria-hidden="true"><span class="tnum" id="howCo"></span><span class="tnum" id="howN"></span><i class="how-prog"><i id="howBar"></i></i></div>
  <div class="how-hud r" aria-hidden="true">1,500+ servers · ~1,800 games</div>`;
$('app').append(howEl);
const howSc = howEl.querySelector('.how-sc'), howChs = [...howEl.querySelectorAll('.how-ch')];
function openHow() {
  if (how || boot || scan || pmBusy() || tour) return;
  setPanel8(false); setShow9(false); openSrv(false); $('app').classList.remove('sb-open');
  how = { i: -1, sel, states: GAMES.map(g => g.state), dist: FULL9, yaw: frame0.yaw, spin: 0, isp: 0, ispK: 0, xl: 1, xlK: 1 };
  howEl.hidden = false; $('app').classList.add('how-on');
  requestAnimationFrame(() => howEl.classList.add('in'));
  howChapter(0); howSc.focus({ preventScroll: true });
  $('howCo').textContent = `LAT ${origin[0].toFixed(2).replace('-', '−')} · LON ${origin[1].toFixed(2).replace('-', '−')}`;
}
function closeHow() {
  if (!how) return;
  const h = how; how = null; howEl.classList.remove('in'); $('app').classList.remove('how-on');
  setTimeout(() => { if (!how) howEl.hidden = true; }, 400);
  setShow9(false); fail = null;
  // devolve o jogo e o estado de cada um como estavam antes da explicação
  GAMES.forEach((g, i) => { g.state = h.states[i]; }); if (sel !== h.sel) select(h.sel); else rebuild();
  paintCta(); frame0.dist = fitDist();
}
// liga o jogo em destaque só para a explicação (as rotas em paralelo precisam estar no globo)
function howOn() { const g = GAMES[sel]; if (g.state !== 'on') { g.state = 'on'; g.since = time; xlShow = 1; xlStart = time; nextFail = time + 60; paintCta(); } }
function howChapter(i) {
  if (!how || i === how.i) return;
  const prev = how.i; how.i = i; const c = HOW[i];
  howChs.forEach((el, k) => { el.classList.toggle('on', k === i); el.classList.toggle('past', k < i); });
  howEl.querySelectorAll('.how-dots button').forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
  $('howBar').style.width = (i / (HOW.length - 1) * 100) + '%';
  // transição do globo entre capítulos: um giro rápido na direção do avanço e um respiro de zoom (afasta e volta)
  if (prev >= 0 && !reduce) { frame0.yaw += Math.sign(i - prev) * 0.9; how.bump = time; }
  $('howN').textContent = `${String(i + 1).padStart(2, '0')} / ${String(HOW.length).padStart(2, '0')}`;
  setShow9(c.k === 'games');
  how.dist = c.k === 'net' ? FULL9 * 1.18 : FULL9; how.spin = c.k === 'spin' || c.k === 'net' ? 1 : 0;
  if (c.k === 'lanes' || c.k === 'fail' || c.k === 'games' || c.k === 'isp') howOn();
  // o problema: só a rota da operadora, laranja, dando voltas; nas rotas em paralelo ela fica fraquinha ao fundo, para comparar
  how.isp = c.k === 'isp' ? 0.95 : c.k === 'lanes' && i === 2 ? 0.22 : 0; how.xl = c.k === 'isp' ? 0 : 1;
  // no capítulo do problema as rotas da ExitLag (e os pacotes nelas) saem; voltando, elas se desenham de novo
  if (c.k === 'isp') xlShow = 0; else if (GAMES[sel].state === 'on' && !xlShow) { xlShow = 1; xlStart = time; }
  // uma das rotas oscila e as outras seguem entregando: a mesma troca que a home mostra ao vivo
  if (c.k === 'fail') { const g = GAMES[sel]; fail = null; how.nf = time + 0.8; }
  else if (fail) fail = null;
  frame0.dist = fitDist();
}
// um gesto = um capítulo (Gabriel: scrollava demais). A roda/trackpad acumula até um limiar e trava enquanto a transição roda.
const howGo = d => { if (!how) return; const n = clamp(how.i + d, 0, HOW.length - 1); if (n !== how.i) { how.lock = performance.now() + 900; howChapter(n); } };
let howAcc = 0, howAccT = 0;
howSc.addEventListener('wheel', e => {
  if (!how) return; e.preventDefault();
  const now = performance.now(); if (now - howAccT > 220) howAcc = 0; howAccT = now;
  if (now < (how.lock || 0)) { how.lock = Math.max(how.lock, now + 350); howAcc = 0; return; } // a inércia do trackpad não pula um segundo capítulo
  howAcc += e.deltaY; if (Math.abs(howAcc) > 24) { howGo(Math.sign(howAcc)); howAcc = 0; }
}, { passive: false });
let howY0 = null;
howSc.addEventListener('pointerdown', e => { howY0 = e.clientY; });
addEventListener('pointerup', e => { if (how && howY0 != null && Math.abs(e.clientY - howY0) > 40) howGo(e.clientY < howY0 ? 1 : -1); howY0 = null; });
howEl.querySelector('.how-dots').addEventListener('click', e => { const b = e.target.closest('button'); if (b && how) { how.lock = performance.now() + 750; howChapter(+b.dataset.i); } });
addEventListener('keydown', e => { if (!how) return; if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); howGo(1); } else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); howGo(-1); } });
howEl.querySelector('.how-x').addEventListener('click', closeHow);
howEl.querySelector('.how-go').addEventListener('click', closeHow);
addEventListener('keydown', e => { if (how && e.key === 'Escape') { e.stopImmediatePropagation(); closeHow(); } }, true);
function frameHow(dt) {
  if (!how) return;
  if (how.bump != null) { const b = clamp((time - how.bump) / 1.1); frame0.dist = how.dist * (1 + 0.16 * Math.sin(Math.PI * b)); if (b >= 1) how.bump = null; }
  const kk = Math.min(1, dt * 3); how.ispK += (how.isp - how.ispK) * kk; how.xlK += (how.xl - how.xlK) * kk;
  if (how.spin) frame0.yaw += dt * 0.12 * how.spin; // capítulos de visão geral: o planeta gira devagar
  else frame0.yaw += wrapA(how.yaw - frame0.yaw) * Math.min(1, dt * 2); // nos outros, de frente para a rota do jogo
  // capítulo da troca: uma rota oscila a cada ~5 s e as outras seguem entregando
  if (HOW[how.i]?.k === 'fail' && !fail && time > (how.nf || 0)) { const g = GAMES[sel]; fail = { lane: Math.min(1, g.lanes - 1), t0: time, k: 0 }; how.nf = time + 5; }
}

// Chips de versão acima do app: troca data-v no .app e guarda a escolha no #hash (#v1, #v2)
const vchips = [...document.querySelectorAll('.vchip')];
function setV(v) {
  const b = vchips.find(c => c.dataset.v === v && !c.disabled); if (!b) return;
  vchips.forEach(c => c.setAttribute('aria-pressed', c === b ? 'true' : 'false'));
  $('app').dataset.v = v;
  if (location.hash !== '#v' + v) history.replaceState(null, '', '#v' + v);
  dispatchEvent(new Event('pk:layout'));
}
vchips.forEach(c => c.addEventListener('click', () => {
  const st = c.dataset.step;
  if (st === 'login') return startBoot();
  if (st === 'map') return startPmap();
  if (st === 'scan') return startScan();
  endTour(); if (boot) endBoot(); if (scan) endScan(); if (pmap) endPmap(); setV('9');
  if (st === 'tour') return startTour();
  pressStep('home');
}));
if (/^#v\d+$/.test(location.hash)) setV(location.hash.slice(2));
if (location.hash === '#login') startBoot();
if (location.hash === '#scan') startScan();
if (/^#(map|passive)$/.test(location.hash)) startPmap();
if (location.hash === '#tour') setTimeout(startTour, 600);
