
/* ExitLag Analyzer: check-up sem login. Duas análises (hardware e rede), um relatório e o caminho para o teste grátis.
   Tudo o que é medido aqui é SIMULADO para o protótipo: as peças vêm de três perfis de PC e a rede é modelada pela
   distância (≈1,1 ms a cada 100 km de fibra), com desvio, perda e picos sorteados para a rota da operadora. */

const $ = id => document.getElementById(id);
const app = $('app');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms));
const icon = (id, cls = '') => `<svg class="i ${cls}"><use href="#i-${id}"/></svg>`;
const fmt = n => Math.round(n).toLocaleString('en-US');
// vetores na esfera sem depender do three (o globo carrega à parte e pode falhar sem derrubar o app)
const DEG = Math.PI / 180;
const V = (x, y, z) => ({ x, y, z,
  angleTo(o) { return Math.acos(clamp(this.x * o.x + this.y * o.y + this.z * o.z, -1, 1)); },
  clone() { return V(this.x, this.y, this.z); },
  multiplyScalar(k) { return V(this.x * k, this.y * k, this.z * k); },
  add(o) { return V(this.x + o.x, this.y + o.y, this.z + o.z); },
  cross(o) { return V(this.y * o.z - this.z * o.y, this.z * o.x - this.x * o.z, this.x * o.y - this.y * o.x); },
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; return V(this.x / l, this.y / l, this.z / l); },
  addScaledVector(o, k) { return V(this.x + o.x * k, this.y + o.y * k, this.z + o.z * k); } });
const toV = (lat, lon) => { const p = (90 - lat) * DEG, th = (lon + 180) * DEG; return V(-Math.sin(p) * Math.cos(th), Math.cos(p), Math.sin(p) * Math.sin(th)); };
const toLL = v => { const n = v.normalize(); const lat = 90 - Math.acos(n.y) / DEG; let lon = Math.atan2(n.z, -n.x) / DEG - 180; lon = ((lon % 360) + 540) % 360 - 180; return [lat, lon]; };

/* ---------- Origem: fuso do navegador (produção: geo IP). Teste com #tokyo, #london ---------- */
const CITIES = {
  'America/Sao_Paulo': [-23.55, -46.63, 'Sao Paulo', 'SAO'], 'America/Bahia': [-12.97, -38.5, 'Salvador', 'SSA'], 'America/Fortaleza': [-3.73, -38.52, 'Fortaleza', 'FOR'],
  'America/Recife': [-8.05, -34.88, 'Recife', 'REC'], 'America/Manaus': [-3.12, -60.02, 'Manaus', 'MAO'], 'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires', 'BUE'],
  'America/Santiago': [-33.45, -70.67, 'Santiago', 'SCL'], 'America/Lima': [-12.05, -77.04, 'Lima', 'LIM'], 'America/Bogota': [4.71, -74.07, 'Bogota', 'BOG'],
  'America/Mexico_City': [19.43, -99.13, 'Mexico City', 'MEX'], 'America/New_York': [40.71, -74.0, 'New York', 'NYC'], 'America/Chicago': [41.88, -87.63, 'Chicago', 'CHI'],
  'America/Denver': [39.74, -104.99, 'Denver', 'DEN'], 'America/Los_Angeles': [34.05, -118.24, 'Los Angeles', 'LAX'], 'America/Toronto': [43.65, -79.38, 'Toronto', 'YYZ'],
  'Europe/Lisbon': [38.72, -9.14, 'Lisbon', 'LIS'], 'Europe/London': [51.51, -0.13, 'London', 'LON'], 'Europe/Madrid': [40.42, -3.7, 'Madrid', 'MAD'],
  'Europe/Paris': [48.86, 2.35, 'Paris', 'PAR'], 'Europe/Berlin': [52.52, 13.4, 'Berlin', 'BER'], 'Europe/Warsaw': [52.23, 21.01, 'Warsaw', 'WAW'],
  'Europe/Istanbul': [41.01, 28.98, 'Istanbul', 'IST'], 'Europe/Moscow': [55.76, 37.62, 'Moscow', 'MOW'], 'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg', 'JNB'],
  'Asia/Dubai': [25.2, 55.27, 'Dubai', 'DXB'], 'Asia/Kolkata': [19.08, 72.88, 'Mumbai', 'BOM'], 'Asia/Singapore': [1.35, 103.82, 'Singapore', 'SIN'],
  'Asia/Manila': [14.6, 120.98, 'Manila', 'MNL'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo', 'TYO'], 'Asia/Seoul': [37.57, 126.98, 'Seoul', 'SEL'], 'Australia/Sydney': [-33.87, 151.21, 'Sydney', 'SYD']
};
// pontos de troca de tráfego por onde operadoras costumam desviar (só para o desenho do desvio)
const HUBS = [[25.76, -80.19, 'Miami', 'MIA'], [39.04, -77.49, 'Ashburn', 'IAD'], [32.78, -96.8, 'Dallas', 'DFW'], [-22.91, -43.17, 'Rio de Janeiro', 'RIO'], [-25.43, -49.27, 'Curitiba', 'CWB'],
  [-30.03, -51.23, 'Porto Alegre', 'POA'], [-19.92, -43.94, 'Belo Horizonte', 'BHZ'], [-15.79, -47.88, 'Brasilia', 'BSB'],
  [50.11, 8.68, 'Frankfurt', 'FRA'], [52.37, 4.9, 'Amsterdam', 'AMS'], [43.3, 5.37, 'Marseille', 'MRS'], [47.61, -122.33, 'Seattle', 'SEA'], [37.77, -122.42, 'San Francisco', 'SFO'], [22.32, 114.17, 'Hong Kong', 'HKG'], [34.69, 135.5, 'Osaka', 'OSA']];
const PLACES = [...Object.values(CITIES), ...HUBS];
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
const km = (a, b) => toV(a[0], a[1]).angleTo(toV(b[0], b[1])) * 6371;

/* ---------- Jogos detectados e servidores (simulado) ---------- */
const REGIONS = {
  br: ['Brazil', -23.55, -46.63, 'Sao Paulo', 'SAO'], nae: ['NA East', 39.04, -77.49, 'Ashburn', 'IAD'], nac: ['NA Central', 41.88, -87.63, 'Chicago', 'CHI'],
  naw: ['NA West', 34.05, -118.24, 'Los Angeles', 'LAX'], euw: ['EU West', 50.11, 8.68, 'Frankfurt', 'FRA'], eun: ['EU North', 59.33, 18.07, 'Stockholm', 'STO'],
  sea: ['Southeast Asia', 1.35, 103.82, 'Singapore', 'SIN'], jp: ['Japan', 35.68, 139.69, 'Tokyo', 'TYO'], kr: ['Korea', 37.57, 126.98, 'Seoul', 'SEL'], oce: ['Oceania', -33.87, 151.21, 'Sydney', 'SYD']
};
const A = 'assets/games/';
const GAMES = [
  { name: 'League of Legends', img: A + 'league-of-legends.jpg', regions: ['br', 'nac', 'euw', 'eun', 'kr', 'oce'] },
  { name: 'Counter-Strike 2', img: A + 'box-cs2.jpg', regions: ['br', 'nae', 'naw', 'euw', 'eun', 'sea'] },
  { name: 'Fortnite', img: A + 'fortnite.jpg', regions: ['br', 'nae', 'naw', 'euw', 'sea', 'oce'] },
  { name: 'Apex Legends', img: A + 'box-apex-legends.jpg', regions: ['br', 'nae', 'naw', 'euw', 'jp'] },
  { name: 'Dota 2', img: A + 'box-dota-2.jpg', regions: ['br', 'nae', 'euw', 'sea'] },
  { name: 'Rainbow Six Siege', img: A + 'box-rainbow-six-siege.jpg', regions: ['br', 'nae', 'euw', 'sea'] },
  { name: 'Overwatch 2', img: A + 'box-overwatch-2.jpg', regions: ['nac', 'euw', 'kr'] },
  { name: 'Rocket League', img: A + 'box-rocket-league.jpg', regions: ['br', 'nae', 'euw', 'oce'] }
];
const regLL = r => [REGIONS[r][1], REGIONS[r][2]];
const nearest = g => g.regions.reduce((b, r) => km(origin, regLL(r)) < km(origin, regLL(b)) ? r : b);

/* ---------- Ferramentas ExitLag ---------- */
const TOOLS = {
  route: { name: 'Route Optimizer', icon: 'route', pitch: 'Sends each packet over several routes at once and switches routes on its own when one gets worse.' },
  fps: { name: 'FPS Boost', icon: 'boost', pitch: 'Closes what competes with your game, switches Windows to a performance power plan and tunes system settings for games.' },
  ram: { name: 'RAM Cleaner', icon: 'broom', pitch: 'Frees memory held by apps you are not using, so the game has room before it starts stuttering.' },
  dns: { name: 'DNS Optimizer', icon: 'dns', pitch: 'Finds the fastest DNS server for you, so matchmaking, logins and game launchers answer sooner.' },
  multi: { name: 'Multi Internet', icon: 'multi', pitch: 'Uses two connections together, such as cable and mobile data, so one failing does not drop your match.' }
};

/* ---------- Perfis de PC (simulado; no app real vêm da leitura do Windows) ---------- */
const PART_ICON = { os: 'windows', cpu: 'cpu', gpu: 'gpu', ram: 'ram', disk: 'disk', display: 'display', net: 'wifi', bg: 'list', power: 'power', dns: 'dns' };
const OK = (label = 'Good') => ({ st: 'success', stl: label });
const PROFILES = {
  low: {
    wifi: true,
    parts: [
      { k: 'os', lbl: 'System', val: 'Windows 10 Home 22H2', sub: 'Support ends soon · updates pending', ...OK('Up to date') },
      { k: 'cpu', lbl: 'Processor', val: 'Intel Core i5-4460', sub: '4 cores · 4 threads · 3.2 GHz · 2014', st: 'warning', stl: 'Aging',
        find: { sev: 'warning', t: 'Processor is near its limit', d: 'Four threads fill up fast in modern games. Closing what runs in the background gives the game the cores back.', fix: ['fps'] } },
      { k: 'gpu', lbl: 'Graphics card', val: 'NVIDIA GeForce GTX 750 Ti', sub: '2 GB GDDR5 · 2014 · driver 472.12 (2021)', st: 'critical', stl: 'Outdated',
        find: { sev: 'critical', t: 'Graphics card is the main bottleneck', d: 'With 2 GB of video memory, recent games drop below 40 fps even on low settings. Tuning helps a little; a new card fixes it.', fix: ['fps', { free: 'Upgrade suggested below' }] } },
      { k: 'ram', lbl: 'Memory', val: '8 GB DDR3 1600 MHz', sub: '6.9 GB in use right now (86%)', st: 'critical', stl: 'Almost full',
        find: { sev: 'critical', t: 'Memory is almost full', d: 'At 86% in use, Windows starts swapping to disk while you play, which shows up as sudden stutters.', fix: ['ram'] } },
      { k: 'disk', lbl: 'Storage', val: '1 TB hard drive · 7200 rpm', sub: '93% full · games load from a spinning disk', st: 'warning', stl: 'Slow',
        find: { sev: 'warning', t: 'Games load from a slow, nearly full disk', d: 'Long loading screens and textures popping in late. Freeing space helps; an SSD solves it.', fix: [{ free: 'Free up 50 GB' }] } },
      { k: 'display', lbl: 'Display', val: '1920 × 1080 · 60 Hz', sub: 'Running at the monitor\'s top refresh rate', ...OK() },
      { k: 'net', lbl: 'Network adapter', val: 'Wi-Fi 4 · 2.4 GHz', sub: 'Signal 58% · 72 Mbps link', st: 'warning', stl: 'Unstable',
        find: { sev: 'warning', t: 'Weak 2.4 GHz Wi-Fi', d: 'A crowded 2.4 GHz channel adds jitter and drops. A cable is the free fix; Multi Internet keeps you online if Wi-Fi drops.', fix: ['multi', { free: 'Use a network cable' }] } },
      { k: 'bg', lbl: 'Background apps', val: '64 processes · 11 start with Windows', sub: 'Updaters and launchers use 18% CPU while idle', st: 'warning', stl: 'Heavy',
        find: { sev: 'warning', t: 'Too much running in the background', d: '11 apps start with Windows and keep using CPU and memory while you play.', fix: ['fps'] } },
      { k: 'power', lbl: 'Power plan', val: 'Balanced', sub: 'CPU slows down to save energy', st: 'warning', stl: 'Not for games',
        find: { sev: 'warning', t: 'Windows is saving power while you play', d: 'The Balanced plan lowers CPU clocks between frames, which costs fps on a CPU this old.', fix: ['fps'] } },
      { k: 'dns', lbl: 'DNS', val: 'Provider default', sub: '41 ms per lookup', st: 'warning', stl: 'Slow',
        find: { sev: 'warning', t: 'Slow DNS', d: 'Each lookup takes 41 ms. You notice it in launchers, logins and matchmaking.', fix: ['dns'] } }
    ],
    tier: { name: 'Low end', score: 27, verdict: 'Plays lighter games like League of Legends well. Newer shooters will struggle, mostly because of the graphics card.' },
    upgrades: [
      { part: 'Graphics card', icon: 'gpu', name: 'NVIDIA GeForce RTX 3050 6 GB', why: 'Replaces your GTX 750 Ti. Fits your power supply and case.', gain: 'About 3× the fps in Fortnite and CS2', price: 169, was: 199 },
      { part: 'Memory', icon: 'ram', name: '16 GB DDR3 1600 MHz kit (2 × 8 GB)', why: 'Doubles your memory. Same type your motherboard uses.', gain: 'Ends the swapping stutters', price: 34, was: 42 }
    ]
  },
  mid: {
    wifi: true,
    parts: [
      { k: 'os', lbl: 'System', val: 'Windows 11 Home 23H2', sub: 'Game Mode on', ...OK('Up to date') },
      { k: 'cpu', lbl: 'Processor', val: 'AMD Ryzen 5 3600', sub: '6 cores · 12 threads · 3.6 GHz · 2019', ...OK() },
      { k: 'gpu', lbl: 'Graphics card', val: 'NVIDIA GeForce GTX 1660 SUPER', sub: '6 GB GDDR6 · 2019 · driver 551.23', st: 'warning', stl: 'Aging',
        find: { sev: 'warning', t: 'Graphics card is getting old', d: 'Good for 1080p on medium. At your 1440p resolution it holds most games under 60 fps.', fix: [{ free: 'Upgrade suggested below' }] } },
      { k: 'ram', lbl: 'Memory', val: '16 GB DDR4 3200 MHz', sub: '11.5 GB in use right now (72%)', st: 'warning', stl: 'Busy',
        find: { sev: 'warning', t: 'Memory is busy before the game starts', d: '11.5 GB in use with no game open. Browsers and launchers hold memory the game will need.', fix: ['ram'] } },
      { k: 'disk', lbl: 'Storage', val: '500 GB NVMe SSD', sub: '81% full', ...OK() },
      { k: 'display', lbl: 'Display', val: '2560 × 1440 · running at 60 Hz', sub: 'Your monitor supports 144 Hz', st: 'critical', stl: 'Misconfigured',
        find: { sev: 'critical', t: 'Your 144 Hz monitor is set to 60 Hz', d: 'Windows is showing less than half the frames your monitor can. Change it in Display settings > Advanced display.', fix: [{ free: 'Free fix: set to 144 Hz' }] } },
      { k: 'net', lbl: 'Network adapter', val: 'Wi-Fi 5 · 5 GHz', sub: 'Signal 74% · 433 Mbps link', st: 'warning', stl: 'Wi-Fi',
        find: { sev: 'warning', t: 'Playing over Wi-Fi', d: 'Wi-Fi adds a few ms of variation to every packet. A cable is the free fix; Multi Internet keeps you online if Wi-Fi drops.', fix: ['multi', { free: 'Use a network cable' }] } },
      { k: 'bg', lbl: 'Background apps', val: '48 processes · 7 start with Windows', sub: 'Overlays and launchers use 9% CPU while idle', st: 'warning', stl: 'Busy',
        find: { sev: 'warning', t: 'Overlays and launchers running', d: 'Seven apps start with Windows, and three of them draw overlays on top of your game.', fix: ['fps'] } },
      { k: 'power', lbl: 'Power plan', val: 'Balanced', sub: 'CPU slows down to save energy', st: 'warning', stl: 'Not for games',
        find: { sev: 'warning', t: 'Windows is saving power while you play', d: 'The Balanced plan lowers CPU clocks between frames and adds small frame-time spikes.', fix: ['fps'] } },
      { k: 'dns', lbl: 'DNS', val: 'Provider default', sub: '34 ms per lookup', st: 'warning', stl: 'Slow',
        find: { sev: 'warning', t: 'Slow DNS', d: 'Each lookup takes 34 ms. You notice it in launchers, logins and matchmaking.', fix: ['dns'] } }
    ],
    tier: { name: 'Mid range', score: 58, verdict: 'A solid gaming PC for 1080p. The graphics card holds it back at 1440p, and two settings are costing you frames right now.' },
    upgrades: [
      { part: 'Graphics card', icon: 'gpu', name: 'NVIDIA GeForce RTX 4060 8 GB', why: 'Replaces your GTX 1660 SUPER. Fits your power supply and case.', gain: 'About 2× the fps at 1440p', price: 289, was: 329 }
    ]
  },
  high: {
    wifi: false,
    parts: [
      { k: 'os', lbl: 'System', val: 'Windows 11 Pro 24H2', sub: 'Game Mode on', ...OK('Up to date') },
      { k: 'cpu', lbl: 'Processor', val: 'AMD Ryzen 7 7800X3D', sub: '8 cores · 16 threads · 4.2 GHz · 2023', ...OK('Excellent') },
      { k: 'gpu', lbl: 'Graphics card', val: 'NVIDIA GeForce RTX 4070 SUPER', sub: '12 GB GDDR6X · 2024 · driver 566.36', ...OK('Excellent') },
      { k: 'ram', lbl: 'Memory', val: '32 GB DDR5 6000 MHz', sub: '13.1 GB in use right now (41%)', ...OK() },
      { k: 'disk', lbl: 'Storage', val: '2 TB NVMe SSD · PCIe 4.0', sub: '46% full', ...OK() },
      { k: 'display', lbl: 'Display', val: '2560 × 1440 · 240 Hz', sub: 'Running at the monitor\'s top refresh rate', ...OK() },
      { k: 'net', lbl: 'Network adapter', val: 'Ethernet · 2.5 Gbps', sub: 'Cable connected · 1 Gbps link', ...OK() },
      { k: 'bg', lbl: 'Background apps', val: '71 processes · 14 start with Windows', sub: 'RGB, capture and chat apps use 6% CPU while idle', st: 'warning', stl: 'Busy',
        find: { sev: 'warning', t: 'Many apps start with Windows', d: '14 startup apps, including RGB and capture tools, add small frame-time spikes during play.', fix: ['fps'] } },
      { k: 'power', lbl: 'Power plan', val: 'High performance', sub: 'CPU runs at full speed', ...OK() },
      { k: 'dns', lbl: 'DNS', val: 'Provider default', sub: '29 ms per lookup', st: 'warning', stl: 'Slow',
        find: { sev: 'warning', t: 'Slow DNS', d: 'Each lookup takes 29 ms. You notice it in launchers, logins and matchmaking.', fix: ['dns'] } }
    ],
    tier: { name: 'High end', score: 91, verdict: 'Your PC is not what holds you back. If you still feel lag, it comes from the route to the game server.' },
    upgrades: []
  }
};

/* ---------- Estado ---------- */
const S = { view: 'hardware', profile: 'mid', hw: null, net: null, seen: false, offer: null, running: null, game: 0, region: null, focusTool: null };
try { const p = localStorage.getItem('xla-profile'); if (PROFILES[p]) S.profile = p; } catch { }

/* ---------- Navegação: fluxo linear ----------
   Hardware › Rede › Resultados › Plano › Login (fim). Cada etapa abre quando a anterior termina. */
const STEPS = ['hardware', 'network', 'results', 'plan', 'login'];
const TITLES = { hardware: ['Hardware analysis', 'Step 1 of 3'], network: ['Network analysis', 'Step 2 of 3'], results: ['Your results', 'Step 3 of 3'], plan: ['Choose a plan', 'Get ExitLag'], login: ['Log in', 'Get ExitLag'] };
const NEED = { network: () => !!S.hw, results: () => !!(S.hw && S.net), plan: () => S.seen, login: () => !!S.offer };
const BLOCK = { network: 'Finish the hardware analysis first.', results: 'Finish the network analysis first.', plan: 'See your results first.', login: 'Choose a plan first.' };
const reachable = v => !NEED[v] || NEED[v]();
function go(view) {
  if (S.running && view !== S.running) { toast('Analysis in progress', 'Wait for it to finish, it only takes a few seconds.'); return; }
  if (!reachable(view)) { toast('One step at a time', BLOCK[view]); return; }
  S.view = view; app.dataset.view = view;
  if (view === 'results') S.seen = true;
  document.querySelectorAll('.view').forEach(v => { const on = v.id === 'view-' + view; if (on && v.hidden) { v.hidden = false; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); } else if (!on) v.hidden = true; });
  document.querySelectorAll('[data-jump]').forEach(b => b.setAttribute('aria-pressed', b.dataset.jump === view));
  $('tbTitle').textContent = TITLES[view][0]; $('tbCrumb').textContent = TITLES[view][1];
  $('main').scrollTop = 0;
  if (view === 'network' && !S.running) { if (S.net) renderNetDone(true); else { showNetStage('setup'); globe && globe.idle(); } }
  if (view === 'login') { globe && globe.idle(); globe && globe.scan(false); clearTags(); renderLogin(); }
  if (view === 'results') renderReport();
  if (view === 'plan') renderPlan();
  if (view === 'hardware' && !S.running) renderParts();
  markNav();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const j = e.target.closest('[data-jump]'); if (j) { jump(j.dataset.jump); return; }
  const t = e.target.closest('[data-tool]'); if (t) { toolAction(t.dataset.tool); return; }
});
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.click(); } }));
// quem já é assinante pula direto para o login
$('signIn').addEventListener('click', () => { if (S.running) return; S.offer = S.offer || 'login'; S.loginMode = 'login'; go('login'); });

// chips do protótipo: pulam direto para uma etapa, preenchendo as anteriores com resultados simulados
function jump(view) {
  if (S.running) return;
  const k = STEPS.indexOf(view);
  if (k >= 1 && !S.hw) S.hw = hwResult();
  if (k >= 2 && !S.net) S.net = netResult(simulate(GAMES[S.game], S.region || nearest(GAMES[S.game])));
  if (k >= 3) S.seen = true;
  if (k >= 4 && !S.offer) S.offer = 'trial';
  if (view === 'login') S.loginMode = S.offer === 'login' ? 'login' : 'signup';
  go(view);
}
document.querySelectorAll('[data-profile]').forEach(b => b.addEventListener('click', () => {
  if (S.running) return;
  S.profile = b.dataset.profile; try { localStorage.setItem('xla-profile', S.profile); } catch { }
  document.querySelectorAll('[data-profile]').forEach(x => x.setAttribute('aria-pressed', x === b));
  // trocar de PC refaz o resultado de hardware (e o de rede, que depende do adaptador) sem voltar o fluxo
  if (S.hw) S.hw = hwResult();
  if (S.net) S.net = netResult(simulate(GAMES[S.game], S.region || nearest(GAMES[S.game])));
  markNav(); renderParts();
  if (S.view === 'results') renderReport();
  if (S.view === 'plan') renderPlan();
  if (S.view === 'network' && S.net) renderNetDone(true);
  toast('Simulated PC changed', `${PROFILES[S.profile].tier.name}. Run the hardware analysis again to watch it being read.`);
}));
document.querySelectorAll('[data-profile]').forEach(x => x.setAttribute('aria-pressed', x.dataset.profile === S.profile));

function markNav() {
  const ok = `<span class="done">${icon('check', 'xs')}</span>`, lock = icon('lock', 'xs');
  const done = { hardware: !!S.hw, network: !!S.net, results: S.seen && S.view !== 'results', plan: !!S.offer && S.view !== 'plan', login: false };
  document.querySelectorAll('.nav-item[data-go]').forEach(n => {
    const v = n.dataset.go, on = v === S.view, can = reachable(v);
    n.classList.toggle('sel', on); on ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current');
    n.setAttribute('aria-disabled', !can);
    const st = n.querySelector('.nav-st');
    st.innerHTML = S.running === v ? '<span class="spin"></span>' : done[v] ? ok : !can ? lock : '';
  });
}

/* ---------- Análise de hardware ---------- */
const sevRank = { critical: 0, warning: 1, success: 2 };
const sevLabel = { critical: 'Bottleneck', warning: 'Attention', success: 'Good' };
function hwResult() {
  const P = PROFILES[S.profile];
  return { tier: P.tier, parts: P.parts, upgrades: P.upgrades, findings: P.parts.filter(p => p.find).map(p => ({ ...p.find, src: 'PC', part: p.lbl })) };
}
function fixChips(fix) {
  return (fix || []).map(f => typeof f === 'string'
    ? `<button class="tool-chip" type="button" data-tool="${f}" data-tip="${TOOLS[f].pitch}">${icon(TOOLS[f].icon, 'xs')}${TOOLS[f].name}<span class="lock">${icon('lock', 'xs')}</span></button>`
    : `<span class="tool-chip free">${f.free}</span>`).join('');
}
const findHTML = (f, src) => `<div class="find"><span class="sev ${f.sev}"></span><div class="txt">
  <div class="ttl"><b>${f.t}</b>${src ? `<span class="badge neutral">${src}</span>` : ''}<span class="badge ${f.sev}">${sevLabel[f.sev]}</span></div>
  <p class="desc">${f.d}</p><div class="fixes">${fixChips(f.fix)}</div></div></div>`;
const upHTML = u => `<div class="upgrade"><div class="art">${icon(u.icon)}</div><div class="txt">
  <span class="small t-var">${u.part}</span><b class="t-em">${u.name}</b><span class="small t-var">${u.why}</span>
  <span class="small">${u.gain}</span>
  <div class="row"><span class="price"><b class="tnum">$${u.price}</b><s class="tnum">$${u.was}</s></span><span class="grow"></span>
  <a class="btn outlined" href="#" data-offer="${u.name}">See offer</a></div></div></div>`;
document.addEventListener('click', e => { const o = e.target.closest('[data-offer]'); if (o) { e.preventDefault(); toast('Opens the partner store', `${o.dataset.offer}, at the best price found today. Link not active in the prototype.`); } });

function renderParts() {
  const P = PROFILES[S.profile], done = !!S.hw;
  $('parts').querySelectorAll('.part').forEach(p => p.remove());
  $('parts').insertAdjacentHTML('beforeend', P.parts.map((p, i) => `<div class="part" data-i="${i}">
    <span class="pic">${icon(PART_ICON[p.k] === 'wifi' && !P.wifi ? 'cable' : PART_ICON[p.k])}</span>
    <span class="txt"><span class="lbl">${p.lbl}</span>${done ? `<span class="val">${p.val}</span><span class="sub">${p.sub}</span>` : '<span class="val"><span class="sk" style="width:220px"></span></span><span class="sub"><span class="sk" style="width:150px;height:12px"></span></span>'}</span>
    <span class="st">${done ? `<span class="badge ${p.st}">${p.stl}</span>` : '<span class="small t-var">Waiting</span>'}</span></div>`).join(''));
  $('partsCount').textContent = done ? `${P.parts.length} checked` : `${P.parts.length} to check`;
  const R = S.hw;
  $('hwStatus').textContent = R ? 'Done · just now' : 'Not run yet';
  $('hwAgain').hidden = !R;
  $('hwProg').hidden = true;
  if (!R) {
    setTier(null);
    $('hwFind').innerHTML = `<p class="body t-var">Findings show up here as each part is read.</p><button class="btn filled" type="button" id="hwStart" style="align-self:flex-start">Run hardware analysis</button>`;
    $('hwStart').addEventListener('click', runHardware);
    $('hwFindCount').textContent = ''; $('upW').hidden = true; $('hwNext').hidden = true; $('hwCont').hidden = true;
  } else {
    setTier(R.tier);
    paintHwFindings(R.findings);
    paintUpgrades(R.upgrades);
    paintHwNext();
  }
}
function setTier(t) {
  const band = t ? (t.score < 40 ? 0 : t.score < 75 ? 1 : 2) : -1;
  $('tierName').textContent = t ? t.name : '–';
  $('tierScore').textContent = t ? t.score : '–';
  $('tierMk').style.left = (t ? t.score : 0) + '%';
  $('tierMk').style.opacity = t ? 1 : 0;
  document.querySelectorAll('#tier [data-b]').forEach(el => el.classList.toggle('on', +el.dataset.b === band));
  $('tierBadge').textContent = t ? 'Measured' : 'Waiting'; $('tierBadge').className = 'badge ' + (t ? 'success' : 'neutral');
  $('tierVerdict').textContent = t ? t.verdict : 'Run the analysis to see where your PC stands.';
}
function paintHwFindings(list) {
  const sorted = [...list].sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
  $('hwFind').innerHTML = sorted.length ? sorted.map(f => findHTML(f)).join('') : '<p class="body t-var">Nothing to fix on this PC.</p>';
  const c = sorted.filter(f => f.sev === 'critical').length;
  $('hwFindCount').textContent = `${sorted.length} found${c ? ` · ${c} bottleneck${c > 1 ? 's' : ''}` : ''}`;
}
function paintUpgrades(ups) { $('upW').hidden = !ups.length; $('upList').innerHTML = ups.map(upHTML).join(''); }
function paintHwNext() {
  $('hwNext').hidden = false; $('hwIntro').hidden = true; $('hwCont').hidden = false;
  $('hwNextTxt').textContent = S.hw.tier.score >= 75 ? 'Your PC is ready. If games still lag, the route to the server is the next place to look.' : 'Lag also comes from the route to the game server. Test it next.';
}
async function runHardware() {
  if (S.running) return;
  S.running = 'hardware'; S.hw = null; markNav(); renderParts();
  const P = PROFILES[S.profile];
  $('hwFind').innerHTML = ''; $('hwStatus').textContent = 'Reading your PC…'; $('hwProg').hidden = false; $('hwAgain').hidden = true;
  const prog = $('hwProg').firstElementChild; prog.style.width = '0%';
  const found = [];
  for (let i = 0; i < P.parts.length; i++) {
    const p = P.parts[i], row = $('parts').querySelector(`.part[data-i="${i}"]`);
    row.classList.add('reading'); row.querySelector('.st').innerHTML = '<span class="small t-var">Reading</span>';
    $('hwStatus').textContent = `Reading ${p.lbl.toLowerCase()} · ${i + 1} of ${P.parts.length}`;
    await wait(950 + Math.random() * 500);
    row.classList.remove('reading'); row.classList.add('in');
    row.querySelector('.val').textContent = p.val; row.querySelector('.sub').textContent = p.sub;
    row.querySelector('.st').innerHTML = `<span class="badge ${p.st}">${p.stl}</span>`;
    prog.style.width = ((i + 1) / P.parts.length * 100) + '%';
    if (p.find) { found.push({ ...p.find, src: 'PC', part: p.lbl }); const d = document.createElement('div'); d.innerHTML = findHTML(p.find); const el = d.firstElementChild; el.classList.add('in'); $('hwFind').appendChild(el); $('hwFindCount').textContent = `${found.length} found`; }
  }
  $('hwStatus').textContent = 'Working out your machine type…';
  await wait(700);
  S.hw = hwResult(); S.running = null;
  setTier(S.hw.tier); paintHwFindings(S.hw.findings);
  await wait(500);
  paintUpgrades(S.hw.upgrades); paintHwNext();
  $('hwStatus').textContent = 'Done · just now'; $('hwAgain').hidden = false; $('hwProg').hidden = true; $('partsCount').textContent = `${P.parts.length} checked`;
  markNav();
}
$('hwAgain').addEventListener('click', runHardware);

/* ---------- Análise de rede ---------- */
let gameSel = 0;
function renderGames() {
  $('games').innerHTML = GAMES.map((g, i) => `<button class="game" type="button" data-g="${i}" aria-pressed="${i === gameSel}"><span class="cv" style="background-image:url('${g.img}')"></span><span class="nm">${g.name}</span></button>`).join('');
  $('games').querySelectorAll('.game').forEach(b => b.addEventListener('click', () => { gameSel = +b.dataset.g; S.region = null; renderGames(); }));
  const g = GAMES[gameSel], best = nearest(g), reg = S.region && g.regions.includes(S.region) ? S.region : best;
  S.region = reg;
  $('servers').innerHTML = g.regions.map(r => `<button class="pill" type="button" data-r="${r}" aria-pressed="${r === reg}">${REGIONS[r][0]}${r === best ? ' <span class="t-var">· closest</span>' : ''}</button>`).join('');
  $('servers').querySelectorAll('.pill').forEach(b => b.addEventListener('click', () => { S.region = b.dataset.r; renderGames(); }));
}
function showNetStage(s) {
  $('netSetup').hidden = s !== 'setup'; $('netLive').hidden = s !== 'live'; $('netDone').hidden = s !== 'done';
  $('netLiveBadge').hidden = s !== 'live';
  if (s === 'setup') { renderGames(); $('routeLbl').textContent = ''; clearTags(); }
}

// Modelo da rota (simulado): a operadora desvia por um ponto de troca e perde pacotes nele; a ExitLag vai por 3 rotas
// com bridges perto da linha reta até o servidor.
function simulate(g, r) {
  const srv = [REGIONS[r][1], REGIONS[r][2], REGIONS[r][3], REGIONS[r][4]];
  const direct = Math.max(km(origin, srv), 1);
  const want = Math.max(650, direct * 0.32);
  const hub = PLACES.filter(p => p[3] !== origin[3] && p[3] !== srv[3])
    .map(p => ({ p, extra: km(origin, p) + km(p, srv) - direct })).filter(x => x.extra > 120)
    .sort((a, b) => Math.abs(a.extra - want) - Math.abs(b.extra - want))[0]?.p || HUBS[0];
  const ispKm = km(origin, hub) + km(hub, srv);
  // bridges ExitLag: pontos ao longo do caminho direto, deslocados de lado e encaixados na cidade mais próxima
  const vS = toV(srv[0], srv[1]), w = Math.max(vO.angleTo(vS), 0.02);
  const along = (f, lat) => { const a = vO.clone().multiplyScalar(Math.sin((1 - f) * w)).add(vS.clone().multiplyScalar(Math.sin(f * w))).normalize(); const side = vO.clone().cross(vS).normalize(); return a.addScaledVector(side, lat * w).normalize(); };
  const snap = (v, max) => { let best = null, bd = 1e9; for (const p of PLACES) { const d = v.angleTo(toV(p[0], p[1])) * 6371; if (d < bd) { bd = d; best = p; } } return bd < max ? best : [...toLL(v), '', '']; };
  const long = direct > 1500;
  const xl = [-0.16, 0.12, 0.3].map((lat, k) => {
    const br = long ? snap(along(0.4 + k * 0.06, lat), direct * 0.18) : [...toLL(along(0.45, lat * 2.5)), '', ''];
    const fi = [...toLL(along(0.86, lat * 0.4)), '', ''];
    const fiName = snap(along(0.86, lat * 0.4), 900)[2] || srv[2];
    return { via: [br, fi], bridge: br[2] || nearName(br), final: fiName };
  });
  const xlKm = direct * 1.04 + 40;
  const prof = PROFILES[S.profile];
  const wifiJ = prof.wifi ? (S.profile === 'low' ? 4 : 2) : 0;
  return { g, r, srv, hub, direct, ispKm, xl, wifiJ,
    ispBase: Math.round(10 + ispKm / 100 * 1.15 + (prof.wifi ? 4 : 1)), xlBase: Math.round(8 + xlKm / 100 * 1.0 + (prof.wifi ? 3 : 1)),
    loss: 1.8 + Math.random() * 1.4 };
}
function nearName(p) { let best = '', bd = 1e9; for (const c of PLACES) { const d = km(p, c); if (d < bd) { bd = d; best = c[2]; } } return bd < 1200 ? best : 'ExitLag node'; }

// amostras de ping: operadora com variação, picos e perda; ExitLag com variação pequena (vale o pacote que chega primeiro)
function sampler(m, kind) {
  let spikeLeft = 0, spikeAmt = 0;
  return t => {
    if (kind === 'isp') {
      if (spikeLeft <= 0 && Math.random() < 0.035 && t > 1.5) { spikeLeft = 2 + Math.floor(Math.random() * 3); spikeAmt = m.ispBase * (0.9 + Math.random() * 1.2) + 30; }
      let v = m.ispBase + (Math.random() - 0.5) * (8 + m.wifiJ * 2) + Math.sin(t * 1.7) * 3;
      if (spikeLeft > 0) { v += spikeAmt * (spikeLeft > 1 ? 1 : 0.5); spikeLeft--; }
      const lost = t > 2.5 && Math.random() < m.loss / 100 * 1.6;
      return { v: Math.max(4, v), lost };
    }
    const v = m.xlBase + (Math.random() - 0.5) * (2.4 + m.wifiJ * 1.2);
    return { v: Math.max(3, v), lost: Math.random() < 0.0008 };
  };
}
function stats(samples) {
  const ok = samples.filter(s => !s.lost).map(s => s.v);
  const avg = ok.reduce((a, b) => a + b, 0) / Math.max(ok.length, 1);
  let jit = 0; for (let i = 1; i < ok.length; i++) jit += Math.abs(ok[i] - ok[i - 1]); jit /= Math.max(ok.length - 1, 1);
  const sorted = [...ok].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 0;
  let spikes = 0, inSpike = false; for (const v of ok) { const s = v > med * 1.5 && v > med + 25; if (s && !inSpike) spikes++; inSpike = s; }
  const loss = samples.filter(s => s.lost).length / Math.max(samples.length, 1) * 100;
  const score = Math.round(clamp(100 - jit * 1.6 - loss * 6 - spikes * 3 - Math.max(0, avg - 60) * 0.08, 12, 99));
  return { avg, jit, loss, spikes, score, max: Math.max(...ok, 1) };
}
// resultado completo sem rodar a animação (chips do protótipo e troca de perfil)
function netResult(m, sI, sX) {
  if (!sI) { const fI = sampler(m, 'isp'), fX = sampler(m, 'xl'); sI = []; sX = []; for (let t = 0; t < 10; t += 0.12) sI.push(fI(t)); for (let t = 0; t < 8; t += 0.12) sX.push(fX(t)); }
  const I = stats(sI), X = stats(sX);
  const extra = m.ispKm - m.direct, extraMs = Math.round(extra / 100 * 1.15);
  const F = [];
  if (extra > 300) F.push({ sev: extra > m.direct * 0.25 ? 'critical' : 'warning', t: `Your route detours through ${m.hub[2]}`, d: `Your provider sends game traffic through ${m.hub[2]} before ${m.srv[2]}, about ${fmt(extra)} km out of the way. That adds roughly ${extraMs} ms to every packet.`, fix: ['route'] });
  if (I.loss > 0.4) F.push({ sev: I.loss > 1.5 ? 'critical' : 'warning', t: `${I.loss.toFixed(1)}% packet loss at ${m.hub[2]}`, d: 'Lost packets show up as rubber-banding, shots that don\'t register and players teleporting. It starts at your provider\'s exchange, not on your PC.', fix: ['route'] });
  if (I.spikes > 0) F.push({ sev: I.spikes > 2 ? 'critical' : 'warning', t: `${I.spikes} lag spike${I.spikes > 1 ? 's' : ''} in 10 seconds`, d: `Ping jumped as high as ${Math.round(I.max)} ms. In a match that's a freeze right when you need to react.`, fix: ['route'] });
  if (I.jit > 6) F.push({ sev: 'warning', t: `Unsteady ping (jitter ${I.jit.toFixed(1)} ms)`, d: 'Ping keeps moving up and down, so the game can\'t predict where other players are. Aim feels inconsistent.', fix: ['route'] });
  if (m.wifiJ) F.push({ sev: 'warning', t: 'Wi-Fi adds jitter on top of the route', d: `Even through ExitLag, Wi-Fi leaves about ${X.jit.toFixed(1)} ms of variation. A network cable removes it for free.`, fix: ['multi', { free: 'Use a network cable' }] });
  return { m, game: m.g, I, X, sI, sX, findings: F.map(f => ({ ...f, src: 'Network' })), extra };
}

let globe = null;

/* rótulos sobre o globo (posição atualizada a cada quadro) */
let tags = [];
function clearTags() { tags = []; $('gTags').innerHTML = ''; }
function addTag(v, html, cls = '') { const el = document.createElement('span'); el.className = 'gtag ' + cls; el.innerHTML = html; $('gTags').appendChild(el); const t = { v, el }; tags.push(t); return t; }
// globo carregado à parte: sem WebGL ou sem a CDN, as análises seguem funcionando, só sem o mapa
import('./globe.js').then(({ createGlobe }) => {
  globe = createGlobe($('globe'), origin);
  globe.onFrame = () => {
    if (S.view !== 'network') return;
    for (const t of tags) { const p = globe.screenOf(t.v); t.el.style.transform = `translate(${p.x}px, ${p.y}px)`; t.el.hidden = !p.visible || t.off; }
  };
  if (S.view === 'network' && S.net) renderNetDone(true);
}).catch(e => { console.warn('Globe unavailable', e); app.classList.add('no-globe'); });

function drawChart(sI, sX, nI, nX) {
  const all = [...sI, ...sX].filter(s => !s.lost).map(s => s.v), top = Math.max(60, Math.ceil(Math.max(...all, 1) * 1.15 / 20) * 20);
  $('axTop').textContent = top + ' ms';
  const W = 372, H = 72, N = nI + nX, x = i => i / (N - 1) * W, y = v => H - v / top * (H - 8);
  const path = (arr, off) => { let d = '', pen = false; arr.forEach((s, i) => { if (s.lost) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i + off).toFixed(1) + ' ' + y(s.v).toFixed(1); pen = true; }); return d; };
  $('pIsp').setAttribute('d', path(sI, 0)); $('pXl').setAttribute('d', path(sX, nI));
}
const setK = (id, v, unit = '', dec = 0) => { $(id).innerHTML = (v == null ? '–' : v.toFixed(dec)) + (unit ? `<small>${unit}</small>` : ''); };
function hopRow(n, h, ms, ls, bad) { return `<div class="hop in${bad ? ' bad' : ''}"><span class="n tnum">${n}</span><span class="h">${h}</span><span class="ms tnum">${ms}</span><span class="ls tnum">${ls}</span></div>`; }

async function runNetwork() {
  if (S.running) return;
  const g = GAMES[gameSel], m = simulate(g, S.region || nearest(g));
  S.running = 'network'; S.game = gameSel; markNav();
  showNetStage('live');
  ['kPingX', 'kJitX', 'kLossX', 'kSpkX'].forEach(id => $(id).hidden = true);
  ['kPingI', 'kJitI', 'kLossI', 'kSpkI'].forEach(id => setK(id, null, id === 'kSpkI' ? '' : id === 'kLossI' ? '%' : 'ms'));
  document.querySelectorAll('.phase').forEach(p => { p.classList.remove('on'); p.style.setProperty('--p', '0%'); });
  $('pIsp').setAttribute('d', ''); $('pXl').setAttribute('d', '');
  $('routeLbl').innerHTML = `${origin[3]} → ${m.srv[4] || m.srv[3]}<span class="t-var">${g.name} · ${REGIONS[m.r][0]} · ${fmt(m.direct)} km</span>`;
  $('hopsTitle').textContent = 'Your route, hop by hop';
  $('hops').innerHTML = '';
  clearTags();
  let R = null;
  if (globe) { R = globe.setRoute({ server: m.srv, ispVia: [m.hub], xl: m.xl.map(x => x.via) }); globe.scan(true); }
  if (R) { addTag(globe.vO, `${origin[2]} <span class="t-var">You</span>`, 'below'); addTag(R.vS, `${m.srv[2]} <span class="t-var">Game server</span>`); }
  await wait(900);
  if (globe) globe.showIsp(true);

  // fase 1: conexão atual
  const ph = k => document.querySelector(`.phase[data-ph="${k}"]`);
  ph(0).classList.add('on');
  const T1 = 10, T2 = 8, DT = 0.12, nI = Math.round(T1 / DT), nX = Math.round(T2 / DT);
  const sI = [], sX = [], fI = sampler(m, 'isp'), fX = sampler(m, 'xl');
  const hubMs = Math.round(12 + km(origin, m.hub) / 100 * 1.15);
  const hopsI = [
    [1, `Your router · ${PROFILES[S.profile].wifi ? 'Wi-Fi' : 'cable'}`, PROFILES[S.profile].wifi ? 3 : 1],
    [2, `Provider gateway · ${origin[2]}`, 7], [3, `Provider backbone · ${origin[2]}`, 11],
    [4, `Exchange · ${m.hub[2]}`, hubMs, true], [5, `Transit · ${m.hub[2]}`, hubMs + 3], [6, `Game server · ${m.srv[2]}`, m.ispBase]
  ];
  let badTag = null, hopShown = 0;
  for (let i = 0; i < nI; i++) {
    const t = i * DT, s = fI(t); sI.push(s);
    // saltos aparecem ao longo da fase, como num traceroute
    while (hopShown < hopsI.length && t >= hopShown * 1.3) { const h = hopsI[hopShown]; $('hops').insertAdjacentHTML('beforeend', hopRow(h[0], h[1], h[2] + ' ms', '–', false)); hopShown++; }
    if (t > 4 && !badTag) {
      // perda aparece no ponto de troca: a rota pisca em vermelho só ali
      if (globe) globe.ispFail(1, 1);
      if (R) badTag = addTag(R.isp.v[1], `${m.hub[2]} <b>packet loss</b>`, 'bad');
      const row = $('hops').children[3]; if (row) { row.classList.add('bad'); }
    }
    if (badTag) { const st = stats(sI); const row = $('hops').children[3]; if (row) row.querySelector('.ls').textContent = st.loss.toFixed(1) + '%'; badTag.el.innerHTML = `${m.hub[2]} <b>${st.loss.toFixed(1)}% loss</b>`; }
    if (i % 3 === 0) { const st = stats(sI); setK('kPingI', st.avg, 'ms'); setK('kJitI', st.jit, 'ms', 1); setK('kLossI', st.loss, '%', 1); setK('kSpkI', st.spikes); drawChart(sI, sX, nI, nX); }
    ph(0).style.setProperty('--p', ((i + 1) / nI * 100) + '%');
    await wait(DT * 1000);
  }
  const hops = $('hops'); [...hops.children].forEach((r, k) => { if (k === 5) r.querySelector('.ls').textContent = stats(sI).loss.toFixed(1) + '%'; else if (k !== 3) r.querySelector('.ls').textContent = '0%'; });

  // fase 2: com ExitLag
  ph(1).classList.add('on');
  if (globe) { globe.dimIsp(0.3); globe.ispFail(0.35, 1); globe.showXl(true); }
  if (badTag) badTag.off = true;
  ['kPingX', 'kJitX', 'kLossX', 'kSpkX'].forEach(id => $(id).hidden = false);
  $('hopsTitle').textContent = 'ExitLag route 1 of 3';
  const x0 = m.xl[0];
  const hopsX = [[1, `Your router · ${PROFILES[S.profile].wifi ? 'Wi-Fi' : 'cable'}`, PROFILES[S.profile].wifi ? 3 : 1], [2, `ExitLag bridge · ${x0.bridge || origin[2]}`, Math.round(m.xlBase * 0.3)],
    [3, 'ExitLag tunnel', Math.round(m.xlBase * 0.7)], [4, `ExitLag final · ${x0.final}`, Math.round(m.xlBase * 0.9)], [5, `Game server · ${m.srv[2]}`, m.xlBase]];
  $('hops').innerHTML = '';
  if (R && globe) { const n = R.xl[0].v; if (n.length > 2) addTag(n[1], `Bridge <span class="t-var">${x0.bridge || ''}</span>`); }
  hopShown = 0;
  for (let i = 0; i < nX; i++) {
    const t = i * DT, s = fX(t); sX.push(s);
    while (hopShown < hopsX.length && t >= 0.8 + hopShown * 1.1) { const h = hopsX[hopShown]; $('hops').insertAdjacentHTML('beforeend', hopRow(h[0], h[1], h[2] + ' ms', '0%', false)); hopShown++; }
    if (hopShown === hopsX.length && !$('hops').querySelector('.more')) $('hops').insertAdjacentHTML('beforeend', `<div class="hop in more"><span></span><span class="h t-var">+ 2 more routes in parallel</span><span></span><span></span></div>`);
    if (i % 3 === 0) { const st = stats(sX); setK('kPingX', st.avg, 'ms'); setK('kJitX', st.jit, 'ms', 1); setK('kLossX', st.loss, '%', 1); setK('kSpkX', st.spikes); drawChart(sI, sX, nI, nX); }
    ph(1).style.setProperty('--p', ((i + 1) / nX * 100) + '%');
    await wait(DT * 1000);
  }
  drawChart(sI, sX, nI, nX);
  ph(2).classList.add('on'); ph(2).style.setProperty('--p', '100%');
  await wait(900);
  if (globe) globe.scan(false);
  S.net = netResult(m, sI, sX); S.running = null; markNav();
  renderNetDone(false);
  if (S.hw) $('hwNext').hidden = true;
}
function renderNetDone(rebuild) {
  const N = S.net, I = N.I, X = N.X;
  showNetStage('done');
  $('routeLbl').innerHTML = `${origin[3]} → ${N.m.srv[4] || N.m.srv[3]}<span class="t-var">${N.game.name} · ${REGIONS[N.m.r][0]} · ${fmt(N.m.direct)} km</span>`;
  const pct = (a, b) => a > 0 ? `${Math.round((1 - b / a) * 100)}% lower` : '';
  const rows = [
    ['Average ping', `${Math.round(I.avg)} ms`, `${Math.round(X.avg)} ms`, pct(I.avg, X.avg)],
    ['Jitter', `${I.jit.toFixed(1)} ms`, `${X.jit.toFixed(1)} ms`, pct(I.jit, X.jit)],
    ['Packet loss', `${I.loss.toFixed(1)}%`, `${X.loss.toFixed(1)}%`, X.loss < I.loss ? 'Gone' : ''],
    ['Lag spikes', `${I.spikes}`, `${X.spikes}`, X.spikes < I.spikes ? `${I.spikes - X.spikes} fewer` : ''],
    ['Stability', `${I.score} / 100`, `${X.score} / 100`, `+${X.score - I.score}`]
  ];
  $('cmpBody').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td class="tnum">${r[1]}</td><td class="tnum">${r[2]}</td><td class="gain tnum">${r[3]}</td></tr>`).join('');
  $('netFind').innerHTML = N.findings.map(f => findHTML(f)).join('') || '<p class="body t-var">No problems found on this route.</p>';
  $('netFindCount').textContent = `${N.findings.length} found`;
  // globo no estado final: as duas rotas visíveis, a da operadora apagada com o ponto de perda marcado
  if (globe && rebuild && S.view === 'network') {
    const R = globe.setRoute({ server: N.m.srv, ispVia: [N.m.hub], xl: N.m.xl.map(x => x.via) });
    globe.showIsp(true); globe.showXl(true); globe.dimIsp(0.3); globe.ispFail(0.35, 1);
    clearTags(); addTag(globe.vO, `${origin[2]} <span class="t-var">You</span>`, 'below'); addTag(R.vS, `${N.m.srv[2]} <span class="t-var">Game server</span>`);
    addTag(R.isp.v[1], `${N.m.hub[2]} <b>${I.loss.toFixed(1)}% loss</b>`, 'bad');
  }
}
$('netRun').addEventListener('click', runNetwork);
$('netAgain').addEventListener('click', () => { S.net = null; markNav(); showNetStage('setup'); globe && globe.idle(); });

/* ---------- Relatório ---------- */
const ring = (v, label) => { const c = 2 * Math.PI * 38, off = c * (1 - v / 100); return `<div class="ring"><svg viewBox="0 0 88 88"><circle class="bg" cx="44" cy="44" r="38"/><circle class="fg" cx="44" cy="44" r="38" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-off="${off.toFixed(1)}"/></svg><span class="val tnum">${label}</span></div>`; };
function renderReport() {
  const H = S.hw, N = S.net;
  $('rpEmpty').hidden = !!(H || N); $('rpBody').hidden = !(H || N);
  $('rpWhen').textContent = H || N ? `${[H && 'PC', N && 'Network'].filter(Boolean).join(' and ')} analyzed today` : '';
  if (!H && !N) return;
  const findings = [...(H ? H.findings : []), ...(N ? N.findings : [])].sort((a, b) => sevRank[a.sev] - sevRank[b.sev] || (a.src === 'Network' ? -1 : 1));
  const crit = findings.filter(f => f.sev === 'critical').length;
  const fixable = findings.filter(f => (f.fix || []).some(x => typeof x === 'string')).length;
  const card = (title, body) => `<div class="widget"><div class="score-card">${body}</div></div>`;
  $('rpTop').innerHTML = [
    H ? card('', `${ring(H.tier.score, H.tier.score)}<div class="txt"><span class="small t-var">Your PC</span><b class="h2">${H.tier.name}</b><span class="small t-var">${H.findings.length} things to improve</span></div>`)
      : card('', `<div class="txt"><span class="small t-var">Your PC</span><b class="h3">Not analyzed yet</b><button class="btn outlined" type="button" data-go="hardware" style="align-self:flex-start;margin-top:8px">Run hardware analysis</button></div>`),
    N ? card('', `${ring(N.I.score, N.I.score)}<div class="txt"><span class="small t-var">Connection stability · ${N.game.name}</span><b class="h2">${N.I.score < 50 ? 'Unstable' : N.I.score < 75 ? 'Shaky' : 'Steady'}</b><span class="small t-var">With ExitLag: ${N.X.score} / 100 · ${Math.round(N.I.avg)} → ${Math.round(N.X.avg)} ms</span></div>`)
      : card('', `<div class="txt"><span class="small t-var">Your connection</span><b class="h3">Not tested yet</b><button class="btn outlined" type="button" data-go="network" style="align-self:flex-start;margin-top:8px">Run network analysis</button></div>`),
    card('', `<div class="txt"><span class="small t-var">Problems found</span><b class="h2 tnum">${findings.length}</b><span class="small t-var">${crit} bottleneck${crit === 1 ? '' : 's'} · ${fixable} fixable with ExitLag</span></div>`)
  ].join('');
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('#rpTop .fg').forEach(c => c.style.strokeDashoffset = c.dataset.off)));
  $('rpFind').innerHTML = findings.map(f => findHTML(f, f.src)).join('');
  // ferramentas que resolvem o que foi encontrado, com o efeito esperado em números quando há medida
  const count = {}; findings.forEach(f => (f.fix || []).forEach(x => { if (typeof x === 'string') count[x] = (count[x] || 0) + 1; }));
  const effect = {
    route: N ? `Ping ${Math.round(N.I.avg)} → ${Math.round(N.X.avg)} ms, loss ${N.I.loss.toFixed(1)}% → ${N.X.loss.toFixed(1)}% (measured)` : TOOLS.route.pitch,
    fps: H ? `Closes ${((H.parts.find(p => p.k === 'bg') || {}).val || '').match(/(\d+) start/)?.[1] || 'the'} startup apps and sets a performance power plan` : TOOLS.fps.pitch,
    ram: H ? `Frees memory held by idle apps · ${((H.parts.find(p => p.k === 'ram') || {}).sub || '').match(/\d+%/)?.[0] || ''} in use now` : TOOLS.ram.pitch,
    dns: H ? `Lookups ${(H.parts.find(p => p.k === 'dns') || {}).sub?.split(' ')[0] || '30'} → about 10 ms (estimated)` : TOOLS.dns.pitch,
    multi: 'Keeps the match alive if your Wi-Fi drops'
  };
  const order = Object.keys(count).sort((a, b) => count[b] - count[a]);
  $('rpFix').innerHTML = order.map(k => `<div class="fix-row"><span class="ic">${icon(TOOLS[k].icon)}</span><span class="txt"><b>${TOOLS[k].name}</b><span class="small t-var">${effect[k]}</span></span><span class="badge neutral tnum">${count[k]} fix${count[k] > 1 ? 'es' : ''}</span></div>`).join('')
    || '<p class="body t-var">Nothing here needs ExitLag.</p>';
  const ups = H ? H.upgrades : [];
  $('rpUp').hidden = !ups.length; $('rpUpList').innerHTML = ups.map(upHTML).join('');
}

/* ---------- Plano (CTA) ---------- */
const PLANS = [{ id: 'm', n: 'Monthly', p: 6.49, sub: 'Billed every month' }, { id: 'q', n: 'Quarterly', p: 5.66, sub: '$16.99 every 3 months' }, { id: 'y', n: 'Yearly', p: 4.99, sub: '$59.88 per year', best: true }];
let pick = 'trial';
function renderPlan() {
  const all = [...(S.hw ? S.hw.findings : []), ...(S.net ? S.net.findings : [])];
  const count = {}; all.forEach(f => (f.fix || []).forEach(x => { if (typeof x === 'string') count[x] = (count[x] || 0) + 1; }));
  const n = all.filter(f => (f.fix || []).some(x => typeof x === 'string')).length;
  $('plHead').textContent = n ? `Fix ${n} of the ${all.length} problems we found.` : 'Play without lag.';
  $('plDesc').textContent = S.net ? `Starting with your route to ${S.net.m.srv[2]}: ${Math.round(S.net.I.avg)} → ${Math.round(S.net.X.avg)} ms and no packet loss, as measured a minute ago. Every tool below is in every plan.` : 'Every tool below is included in every plan.';
  $('plEyebrow').textContent = S.focusTool ? `${TOOLS[S.focusTool].name} is included in every plan` : 'Based on your results';
  const order = Object.keys(TOOLS).sort((a, b) => (count[b] || 0) - (count[a] || 0));
  $('plFixes').innerHTML = order.map(k => `<div class="pl-fix${count[k] ? '' : ' dim'}"><span class="ic">${icon(TOOLS[k].icon)}</span><span class="txt"><b>${TOOLS[k].name}${count[k] ? `<span class="badge neutral tnum">${count[k]} fix${count[k] > 1 ? 'es' : ''}</span>` : ''}</b><span class="small t-var">${TOOLS[k].pitch}</span></span></div>`).join('');
  $('plans').innerHTML = PLANS.map(p => `<button class="plan" type="button" data-plan="${p.id}" aria-pressed="${p.id === pick}"><span class="nm"><span class="t-em">${p.n}</span><span class="small t-var">${p.sub}</span></span>${p.best ? '<span class="badge success">Best value</span>' : ''}<span class="pr"><b class="tnum">$${p.p}</b><span class="small t-var">/mo</span></span></button>`).join('');
  $('plans').querySelectorAll('.plan').forEach(b => b.addEventListener('click', () => setPick(b.dataset.plan)));
  setPick(pick);
}
function setPick(id) {
  pick = id;
  $('offTrial').setAttribute('aria-pressed', id === 'trial');
  $('plans').querySelectorAll('.plan').forEach(x => x.setAttribute('aria-pressed', x.dataset.plan === id));
  const p = PLANS.find(x => x.id === id);
  $('plGo').textContent = p ? `Subscribe · $${p.p}/mo` : 'Start free trial';
}
$('offTrial').addEventListener('click', () => setPick('trial'));
$('plGo').addEventListener('click', () => { S.offer = pick; S.loginMode = 'signup'; go('login'); });

/* ---------- Login: fim do fluxo ---------- */
function renderLogin() {
  const p = PLANS.find(x => x.id === S.offer), signup = S.loginMode !== 'login';
  $('lgForm').hidden = false; $('lgDone').hidden = true; document.querySelector('.lg-head').hidden = false; $('lgErr').textContent = '';
  $('lgPlan').hidden = S.offer === 'login';
  $('lgPlan').textContent = p ? `${p.n} plan · $${p.p}/mo` : '3-day free trial';
  $('lgTitle').textContent = signup ? 'Create your account' : 'Log in to ExitLag';
  $('lgDesc').textContent = signup ? 'Your results come with you, so ExitLag can start fixing them right away.' : 'Your results from this check-up come with you.';
  $('lgPass').autocomplete = signup ? 'new-password' : 'current-password';
  $('lgSubmit').textContent = signup ? (p ? 'Create account and subscribe' : 'Create account and start trial') : 'Log in';
  $('lgSwitchTxt').textContent = signup ? 'Already have an account?' : 'New to ExitLag?';
  $('lgSwitch').textContent = signup ? 'Log in' : 'Create an account';
}
$('lgSwitch').addEventListener('click', () => { S.loginMode = S.loginMode === 'login' ? 'signup' : 'login'; renderLogin(); });
function finishLogin(how) {
  $('lgForm').hidden = true; document.querySelector('.lg-head').hidden = true; const d = $('lgDone'); d.hidden = false; d.classList.remove('in'); void d.offsetWidth; d.classList.add('in');
  const p = PLANS.find(x => x.id === S.offer);
  $('lgDoneTxt').textContent = `${how}${p ? ` ${p.n} plan active.` : S.offer === 'trial' ? ' Your 3-day free trial is on.' : ''} This is where the prototype ends: in the app, ExitLag opens and applies the fixes from your results.`;
  markNav();
}
$('lgForm').addEventListener('submit', e => {
  e.preventDefault();
  const em = $('lgEmail'), pw = $('lgPass');
  const bad = [[em, !/^\S+@\S+\.\S+$/.test(em.value), 'Enter a valid email address.'], [pw, pw.value.length < 8, 'Use at least 8 characters for your password.']];
  bad.forEach(([el, b]) => el.parentElement.classList.toggle('bad', b));
  const first = bad.find(x => x[1]);
  if (first) { $('lgErr').textContent = first[2]; first[0].focus(); return; }
  finishLogin(S.loginMode === 'login' ? 'Logged in.' : 'Account created.');
});
$('lgGoogle').addEventListener('click', () => finishLogin('Signed in with Google.'));
$('lgRestart').addEventListener('click', () => { S.hw = S.net = S.offer = null; S.seen = false; S.focusTool = null; pick = 'trial'; $('lgEmail').value = $('lgPass').value = ''; showNetStage('setup'); $('hwIntro').hidden = false; go('hardware'); });

// ferramenta travada: explica o que faz e, depois dos resultados, leva ao plano
function toolAction(id) {
  if (reachable('plan')) { S.focusTool = id; go('plan'); return; }
  toast(`${TOOLS[id].name} is part of ExitLag`, `${TOOLS[id].pitch} Finish the check-up to unlock it.`);
}

/* ---------- Snackbar e tooltip ---------- */
let snackT = 0;
function toast(t, d) {
  const s = $('snack'); $('snackT').textContent = t; $('snackD').textContent = d || '';
  s.hidden = false; requestAnimationFrame(() => s.classList.add('show'));
  const bar = $('snackBar'); bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = 'transform 4000ms linear'; bar.style.transform = 'scaleX(0)'; }));
  clearTimeout(snackT); snackT = setTimeout(() => { s.classList.remove('show'); setTimeout(() => s.hidden = true, 250); }, 4000);
}
const tip = $('tip');
document.addEventListener('pointerover', e => {
  const el = e.target.closest('[data-tip]'); if (!el) { tip.classList.remove('show'); return; }
  tip.textContent = el.dataset.tip;
  const r = el.getBoundingClientRect(), a = app.getBoundingClientRect(), sc = a.width / app.offsetWidth;
  tip.style.left = Math.min((r.left - a.left) / sc, 1440 - 270) + 'px'; tip.style.top = ((r.bottom - a.top) / sc + 8) + 'px';
  tip.classList.add('show');
});

/* ---------- Início ---------- */
markNav(); renderParts(); renderGames();
const h = location.hash.slice(1);
if (TITLES[h]) jump(h); else go('hardware');
