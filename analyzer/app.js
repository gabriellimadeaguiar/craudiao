
/* ExitLag Analyzer: experiência de tela inteira, sem login até o fim. A análise roda de uma vez (PC e depois conexão),
   em seguida vêm os resultados com a oferta, e o fluxo termina no login.
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

/* ---------- Estado ---------- */
const S = { scene: 'entry', profile: 'mid', hw: null, net: null, offer: null, loginMode: 'signup', running: false, game: 0, region: null, runId: 0 };
try { const p = localStorage.getItem('xla-profile'); if (PROFILES[p]) S.profile = p; } catch { }
const sevRank = { critical: 0, warning: 1, success: 2 };
const sevLabel = { critical: 'Bottleneck', warning: 'Attention', success: 'Good' };
function hwResult() {
  const P = PROFILES[S.profile];
  return { tier: P.tier, parts: P.parts, upgrades: P.upgrades, findings: P.parts.filter(p => p.find).map(p => ({ ...p.find, src: 'PC' })) };
}
$('originName').textContent = origin[2];

/* ---------- Cenas ---------- */
function scene(name) {
  S.scene = name; app.dataset.scene = name;
  document.querySelectorAll('.scene').forEach(s => {
    const on = s.id === 's-' + name;
    if (on && !s.classList.contains('on')) { s.classList.remove('on'); void s.offsetWidth; }
    s.classList.toggle('on', on);
  });
  document.querySelectorAll('[data-jump]').forEach(b => b.setAttribute('aria-pressed', b.dataset.jump === name));
  if (!globe) return;
  if (name === 'intro') { clearTags(); globe.idle(6.45); globe.setShift(300); }
  if (name === 'entry') { clearTags(); globe.idle(5.6); globe.setShift(120); }
  if (name === 'login') { clearTags(); globe.idle(5.2); globe.setShift(0); }
}

/* ---------- Início: jogo e servidor que serão testados ---------- */
function renderPicker() {
  const g = GAMES[S.game], best = nearest(g);
  if (!S.region || !g.regions.includes(S.region)) S.region = best;
  $('gpCover').style.backgroundImage = `url('${g.img}')`;
  $('gpName').textContent = `${g.name} · ${REGIONS[S.region][0]}`;
  $('games').innerHTML = GAMES.map((x, i) => `<button type="button" data-g="${i}" aria-pressed="${i === S.game}" aria-label="${x.name}" title="${x.name}" style="background-image:url('${x.img}')"></button>`).join('');
  $('servers').innerHTML = g.regions.map(r => `<button class="chip" type="button" data-r="${r}" aria-pressed="${r === S.region}">${REGIONS[r][0]}${r === best ? ' · closest' : ''}</button>`).join('');
  $('games').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.game = +b.dataset.g; S.region = null; renderPicker(); }));
  $('servers').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.region = b.dataset.r; renderPicker(); }));
}
const openPicker = o => { $('picker').classList.toggle('open', o); $('gamePick').setAttribute('aria-expanded', o); };
$('gamePick').addEventListener('click', e => { e.stopPropagation(); openPicker(!$('picker').classList.contains('open')); });
document.addEventListener('click', e => { if (!e.target.isConnected || $('picker').contains(e.target) || e.target.closest('#gamePick')) return; openPicker(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') openPicker(false); });
$('start').addEventListener('click', () => { openPicker(false); runAll(); });

/* ---------- Análise: uma sequência só, PC e depois conexão ---------- */
let globe = null;
let tags = [];
function clearTags() { tags = []; $('gTags').innerHTML = ''; }
function addTag(v, html, cls = '') { const el = document.createElement('span'); el.className = 'gtag ' + cls; el.innerHTML = html; $('gTags').appendChild(el); const t = { v, el }; tags.push(t); return t; }
import('./globe.js').then(({ createGlobe }) => {
  globe = createGlobe($('globe'), origin);
  globe.setShift(S.scene === 'entry' ? 120 : 300, 0, true); if (S.scene === 'entry') globe.idle(5.6);
  globe.onFrame = () => { for (const t of tags) { const p = globe.screenOf(t.v); t.el.style.transform = `translate(${p.x}px, ${p.y}px)`; t.el.hidden = !p.visible || t.off; } };
}).catch(e => console.warn('Globe unavailable', e));

const ticker = (l, v = '') => { const t = $('ticker'); $('tkL').textContent = l; $('tkV').textContent = v; t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); };
const pbar = (id, f) => { $(id).querySelector('.bar i').style.width = (f * 100) + '%'; };
const live = id => S.runId === id; // uma nova execução (ou um salto pelos chips) cancela a anterior

// posição de cada peça em volta do anel: alternando esquerda e direita, em leve curva
function nodePos(i, n) {
  const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), rows = Math.ceil(n / 2);
  const y = 150 + k * ((810 - 150 - 170) / (rows - 1)), dy = (y + 34 - 405) / 250;
  const x = side < 0 ? 170 + 110 * (1 - dy * dy) : 1440 - 170 - 220 - 110 * (1 - dy * dy);
  return { x, y, side };
}
function countTo(el, to, ms = 900, dec = 0) {
  const t0 = performance.now(), from = 0;
  const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = (from + (to - from) * e).toFixed(dec); if (k < 1) requestAnimationFrame(f); };
  if (reduce) el.textContent = to.toFixed(dec); else requestAnimationFrame(f);
}

async function runAll() {
  const id = ++S.runId;
  S.running = true; S.hw = S.net = null;
  app.classList.remove('net-on', 'xl-on');
  ['ps1', 'ps2'].forEach(p => { $(p).classList.remove('on', 'done'); pbar(p, 0); });
  $('finale').classList.remove('show');
  $('core').classList.remove('done'); $('coreFill').style.strokeDashoffset = 936;
  $('coreMid').innerHTML = `<span class="small t-var">Getting ready</span>`;
  $('nodes').innerHTML = ''; $('wires').innerHTML = '';
  scene('scan');
  if (globe) { clearTags(); globe.idle(6.45); globe.setShift(0); }
  await wait(900); if (!live(id)) return;

  // 1 · PC: cada peça é lida no anel e sai voando para a sua posição
  $('ps1').classList.add('on');
  const P = PROFILES[S.profile], n = P.parts.length;
  for (let i = 0; i < n; i++) {
    const p = P.parts[i], pos = nodePos(i, n);
    const ic = PART_ICON[p.k] === 'wifi' && !P.wifi ? 'cable' : PART_ICON[p.k];
    $('coreMid').innerHTML = `<span class="ic pop">${icon(ic)}</span><span class="small t-var">Reading</span><b class="t-em">${p.lbl}</b>`;
    ticker(`Reading ${p.lbl.toLowerCase()}`, '');
    await wait(520); if (!live(id)) return;
    $('tkV').textContent = p.val;
    const node = document.createElement('div');
    node.className = `node ${p.st}`; node.style.left = pos.x + 'px'; node.style.top = pos.y + 'px';
    node.innerHTML = `<span class="lb"><span class="dot"></span>${p.lbl}</span><span class="v">${p.val}</span><span class="s">${p.st === 'success' ? p.sub : p.stl + ' · ' + p.sub}</span>`;
    $('nodes').appendChild(node);
    // fio do anel até a peça
    const cx = 720, cy = 405, ex = pos.side < 0 ? pos.x + 220 : pos.x, ey = pos.y + 34, ang = Math.atan2(ey - cy, ex - cx), sx = cx + Math.cos(ang) * 160, sy = cy + Math.sin(ang) * 160;
    $('wires').insertAdjacentHTML('beforeend', `<path class="${p.st}" d="M${sx.toFixed(0)} ${sy.toFixed(0)} C ${(sx + ex) / 2} ${sy}, ${(sx + ex) / 2} ${ey}, ${ex} ${ey}"/>`);
    requestAnimationFrame(() => { node.classList.add('in'); $('wires').lastElementChild.classList.add('in'); });
    $('coreFill').style.strokeDashoffset = 936 * (1 - (i + 1) / n);
    pbar('ps1', (i + 1) / n);
    await wait(560); if (!live(id)) return;
  }
  S.hw = hwResult();
  $('core').classList.add('done');
  $('coreMid').innerHTML = `<span class="score tnum" id="coreScore">0</span><span class="tier">${S.hw.tier.name}</span><span class="small t-var">${S.hw.findings.length} things to improve</span>`;
  countTo($('coreScore'), S.hw.tier.score, 1100);
  ticker('Your PC', `${S.hw.tier.name} · ${S.hw.tier.score} / 100`);
  $('ps1').classList.add('done');
  await wait(2200); if (!live(id)) return;

  // 2 · Conexão: o anel some, o globo entra e a rota é medida duas vezes
  $('ps2').classList.add('on');
  const g = GAMES[S.game], m = simulate(g, S.region || nearest(g));
  $('hwMini').innerHTML = `<span class="sc tnum">${S.hw.tier.score}</span><span><span class="small t-var">Your PC</span><br><b class="t-em">${S.hw.tier.name}</b></span>`;
  $('routeLbl').innerHTML = `<span class="small t-var">${g.name} · ${REGIONS[m.r][0]} server</span><b>${origin[2]} → ${m.srv[2]}</b><span class="small t-var tnum">${fmt(m.direct)} km</span>`;
  ['mPingI', 'mJitI', 'mLossI', 'mSpkI', 'mPingX', 'mJitX', 'mLossX', 'mSpkX'].forEach(k => $(k).textContent = '–');
  $('pIsp').setAttribute('d', ''); $('pXl').setAttribute('d', '');
  app.classList.add('net-on');
  ticker('Locating you', origin[2]);
  let R = null;
  if (globe) { globe.setShift(220); R = globe.setRoute({ server: m.srv, ispVia: [m.hub], xl: m.xl.map(x => x.via) }); globe.scan(true);
    addTag(globe.vO, `${origin[2]} <span class="t-var">You</span>`, 'below'); addTag(R.vS, `${m.srv[2]} <span class="t-var">Game server</span>`); }
  await wait(1200); if (!live(id)) return;
  globe && globe.showIsp(true);
  ticker('Tracing your route to', `${m.srv[2]} · as it is today`);

  const T1 = 10, T2 = 8, DT = 0.12, nI = Math.round(T1 / DT), nX = Math.round(T2 / DT);
  const sI = [], sX = [], fI = sampler(m, 'isp'), fX = sampler(m, 'xl');
  let badTag = null;
  for (let i = 0; i < nI; i++) {
    const t = i * DT; sI.push(fI(t));
    if (t > 4 && !badTag) { globe && globe.ispFail(1, 1); if (R) badTag = addTag(R.isp.v[1], `${m.hub[2]} <b>packet loss</b>`, 'bad'); ticker('Packet loss found at', `${m.hub[2]} · your provider's exchange`); }
    if (i % 3 === 0) { const st = stats(sI); $('mPingI').textContent = Math.round(st.avg); $('mJitI').textContent = st.jit.toFixed(1) + ' ms'; $('mLossI').textContent = st.loss.toFixed(1) + '%'; $('mLossI').classList.toggle('bad', st.loss > 0.4); $('mSpkI').textContent = st.spikes; drawLine(sI, sX, nI, nX); if (badTag) badTag.el.innerHTML = `${m.hub[2]} <b>${st.loss.toFixed(1)}% loss</b>`; }
    pbar('ps2', (i + 1) / (nI + nX) * 0.95);
    await wait(DT * 1000); if (!live(id)) return;
  }
  app.classList.add('xl-on');
  if (globe) { globe.dimIsp(0.3); globe.ispFail(0.35, 1); globe.showXl(true); }
  if (badTag) badTag.off = true;
  if (R && R.xl[0].v.length > 2) addTag(R.xl[0].v[1], `Bridge <span class="t-var">${m.xl[0].bridge || ''}</span>`);
  ticker('Same route through ExitLag', '3 routes carrying every packet');
  for (let i = 0; i < nX; i++) {
    const t = i * DT; sX.push(fX(t));
    if (i % 3 === 0) { const st = stats(sX); $('mPingX').textContent = Math.round(st.avg); $('mJitX').textContent = st.jit.toFixed(1) + ' ms'; $('mLossX').textContent = st.loss.toFixed(1) + '%'; $('mSpkX').textContent = st.spikes; drawLine(sI, sX, nI, nX); }
    pbar('ps2', (nI + i + 1) / (nI + nX) * 0.95 + 0.05 * (i + 1) / nX);
    await wait(DT * 1000); if (!live(id)) return;
  }
  drawLine(sI, sX, nI, nX);
  globe && globe.scan(false);
  S.net = netResult(m, sI, sX);
  $('ps2').classList.add('done');
  ticker('Putting your results together', '');
  await wait(600); if (!live(id)) return;
  $('finale').classList.add('show');
  await wait(1300); if (!live(id)) return;
  S.running = false;
  showResults();
}
function drawLine(sI, sX, nI, nX) {
  const all = [...sI, ...sX].filter(s => !s.lost).map(s => s.v), top = Math.max(60, Math.ceil(Math.max(...all, 1) * 1.15 / 20) * 20);
  $('axTop').textContent = top + ' ms';
  const W = 1248, H = 72, N = nI + nX, x = i => i / (N - 1) * W, y = v => H - v / top * (H - 4);
  const path = (arr, off) => { let d = '', pen = false; arr.forEach((s, i) => { if (s.lost) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i + off).toFixed(1) + ' ' + y(s.v).toFixed(1); pen = true; }); return d; };
  $('pIsp').setAttribute('d', path(sI, 0)); $('pXl').setAttribute('d', path(sX, nI));
}

/* ---------- Resultados e oferta ---------- */
const PLANS = [{ id: 'm', n: 'Monthly', p: 6.49, sub: 'Billed every month' }, { id: 'q', n: 'Quarterly', p: 5.66, sub: '$16.99 every 3 months' }, { id: 'y', n: 'Yearly', p: 4.99, sub: '$59.88 per year', best: true }];
let pick = 'trial', io = null;
const tagHTML = f => (f.fix || []).map(x => typeof x === 'string' ? `<span class="tag">${icon(TOOLS[x].icon, 'xs')}${TOOLS[x].name}</span>` : `<span class="tag free">${x.free}</span>`).join('');
const probHTML = f => `<div class="prob rs"><span class="sev ${f.sev}"></span><div class="txt"><div class="t"><b>${f.t}</b><span class="badge ${f.sev}">${sevLabel[f.sev]}</span></div><p class="d">${f.d}</p><div class="fx">${tagHTML(f)}</div></div></div>`;

function showResults() {
  const H = S.hw, N = S.net, I = N.I, X = N.X;
  const all = [...N.findings, ...H.findings].sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
  const fixable = all.filter(f => (f.fix || []).some(x => typeof x === 'string')).length;
  const crit = all.filter(f => f.sev === 'critical').length;
  const netCrit = N.findings.some(f => f.sev === 'critical'), hwCrit = H.findings.some(f => f.sev === 'critical');
  const head = H.tier.score >= 75 ? 'Your PC is ready. Your connection isn\'t.' : netCrit && hwCrit ? 'Your PC and your connection are both holding you back.' : netCrit ? 'Your connection is what\'s costing you.' : 'Your PC is what\'s holding you back.';
  const count = {}; all.forEach(f => (f.fix || []).forEach(x => { if (typeof x === 'string') count[x] = (count[x] || 0) + 1; }));
  const pct = (a, b) => a > 0 ? Math.round((1 - b / a) * 100) : 0;
  const rows = [
    ['Average ping', I.avg, X.avg, v => `${Math.round(v)} ms`, `−${pct(I.avg, X.avg)}%`],
    ['Jitter', I.jit, X.jit, v => `${v.toFixed(1)} ms`, `−${pct(I.jit, X.jit)}%`],
    ['Packet loss', I.loss, X.loss, v => `${v.toFixed(1)}%`, X.loss < 0.05 ? 'Gone' : `−${pct(I.loss, X.loss)}%`],
    ['Lag spikes', I.spikes, X.spikes, v => `${v}`, X.spikes === 0 ? 'None' : `${I.spikes - X.spikes} fewer`]
  ];
  const ups = H.upgrades;
  $('res').innerHTML = `
    <div class="res-hero">
      <span class="eyebrow rs">Your results · ${N.game.name} · ${origin[2]} → ${N.m.srv[2]}</span>
      <h1 class="rs" id="resTitle">${head}</h1>
      <p class="body-lg rs">We found ${all.length} problems. ExitLag fixes ${fixable} of them, starting with ${all[0] ? all[0].t.charAt(0).toLowerCase() + all[0].t.slice(1) : 'your route'}.</p>
    </div>
    <div class="stats">
      <div class="stat rs"><span class="k">Your PC</span><span class="n"><span class="tnum" data-count="${H.tier.score}">0</span><small>/ 100</small></span><span class="sub"><b class="t-em" style="color:var(--on-surface)">${H.tier.name}.</b> ${H.tier.verdict}</span><span class="meter-bar"><i data-w="${H.tier.score}"></i></span></div>
      <div class="stat rs"><span class="k">Ping to ${N.m.srv[2]}</span><span class="n"><span class="tnum" data-count="${Math.round(I.avg)}">0</span><span class="arrow">→</span><span class="tnum" data-count="${Math.round(X.avg)}">0</span><small>ms</small></span><span class="sub">Measured on your route, first as it is today and then through ExitLag. Stability ${I.score} → ${X.score} out of 100.</span><span class="meter-bar"><i data-w="${X.score}"></i></span></div>
      <div class="stat rs"><span class="k">Problems found</span><span class="n"><span class="tnum" data-count="${all.length}">0</span></span><span class="sub">${crit} bottleneck${crit === 1 ? '' : 's'}. ExitLag fixes ${fixable}; the others have a free fix or need new hardware.</span><span class="meter-bar"><i data-w="${Math.round(fixable / Math.max(all.length, 1) * 100)}"></i></span></div>
    </div>
    <div class="sec">
      <div class="sec-h rs"><h2>Same route, before and after.</h2><span class="small t-var">Measured a minute ago · ${fmt(N.m.direct)} km</span></div>
      <div class="ba rs">
        <span class="hd">Measured</span><span class="legend small t-var"><span><span class="dot isp"></span>Your connection</span><span><span class="dot xl"></span>Through ExitLag</span></span><span class="hd" style="text-align:right">Change</span>
        ${rows.map(([nm, a, b, f, gain]) => { const mx = Math.max(a, b, 0.0001); return `<span class="m">${nm}</span><span class="bars"><span class="b isp"><i data-w="${Math.max(a / mx * 100, 1)}"></i><span class="tnum">${f(a)}</span></span><span class="b xl"><i data-w="${Math.max(b / mx * 100, 1)}"></i><span class="tnum">${f(b)}</span></span></span><span class="g tnum">${gain}</span>`; }).join('')}
      </div>
    </div>
    <div class="sec">
      <div class="sec-h rs"><h2>What's holding you back.</h2><span class="small t-var">Most impact first</span></div>
      <div class="probs">
        <div class="pcol"><div class="hd rs">${icon('net', 'sm')}<b>Your connection</b><span class="small t-var">${N.findings.length} found</span></div>${N.findings.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]).map(probHTML).join('')}</div>
        <div class="pcol"><div class="hd rs">${icon('pc', 'sm')}<b>Your PC</b><span class="small t-var">${H.findings.length} found</span></div>${[...H.findings].sort((a, b) => sevRank[a.sev] - sevRank[b.sev]).map(probHTML).join('')}</div>
      </div>
    </div>
    ${ups.length ? `<div class="sec"><div class="sec-h rs"><h2>One upgrade worth making.</h2><span class="badge neutral">Partner offer</span></div>
      ${ups.map(u => `<div class="upg rs"><div class="art">${icon(u.icon)}</div><div class="txt"><span class="small t-var">${u.part}</span><b class="t-em" style="font-size:18px;line-height:24px">${u.name}</b><span class="body t-var">${u.why} ${u.gain}.</span></div><div class="pr"><b class="tnum">$${u.price}</b><s class="tnum">$${u.was}</s><button class="btn outlined" type="button" data-offer="${u.name}">See offer</button></div></div>`).join('')}
      <p class="small t-var rs">Optimization can't make up for a part this old. We picked the best price we found today at our partner store.</p></div>` : ''}
    <div class="offer-sec rs" id="offer">
      <div class="offer-l">
        <span class="eyebrow">ExitLag</span>
        <h2>Fix ${fixable} of the ${all.length} problems we found.</h2>
        <p class="body-lg">Start with your route to ${N.m.srv[2]}: ${Math.round(I.avg)} → ${Math.round(X.avg)} ms and no packet loss, as measured a minute ago. Every tool is in every plan.</p>
        <div class="tools">${Object.keys(TOOLS).sort((a, b) => (count[b] || 0) - (count[a] || 0)).map(k => `<div class="tool${count[k] ? '' : ' dim'}"><span class="ic">${icon(TOOLS[k].icon, 'sm')}</span><span class="txt"><b>${TOOLS[k].name}${count[k] ? `<span class="badge neutral tnum">${count[k]} fix${count[k] > 1 ? 'es' : ''}</span>` : ''}</b><span class="small t-var">${TOOLS[k].pitch}</span></span></div>`).join('')}</div>
      </div>
      <div class="offer-r">
        <button class="offer" type="button" data-pick="trial"><span class="top"><b>3-day free trial</b><span class="badge success">Start here</span></span><span class="small t-var">Every tool, no charge for 3 days. Pick a plan when it ends.</span></button>
        ${PLANS.map(p => `<button class="plan" type="button" data-pick="${p.id}"><span class="nm"><span class="t-em">${p.n}</span><span class="small t-var">${p.sub}</span></span>${p.best ? '<span class="badge success">Best value</span>' : ''}<span class="pr"><b class="tnum">$${p.p}</b><span class="small t-var">/mo</span></span></button>`).join('')}
        <button class="btn filled block" type="button" id="offerGo">Start free trial</button>
        <p class="small t-var">Prototype: example prices. You'll create your account next.</p>
      </div>
    </div>`;
  $('dockTxt').innerHTML = `ExitLag fixes <b>${fixable} of the ${all.length}</b> problems we found.`;
  $('res').querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => setPick(b.dataset.pick)));
  $('offerGo').addEventListener('click', () => { S.offer = pick; S.loginMode = 'signup'; renderLogin(); scene('login'); });
  setPick(pick);
  $('s-results').scrollTop = 0;
  app.classList.remove('net-on', 'xl-on'); clearTags(); if (globe) { globe.scan(false); globe.idle(6.45); }
  scene('results');
  // revela cada bloco quando entra na tela: sobe, conta os números e enche as barras
  const reveal = el => { if (el.classList.contains('seen')) return; el.classList.add('seen'); el.querySelectorAll('[data-count]').forEach(c => countTo(c, +c.dataset.count, 1200)); el.querySelectorAll('[data-w]').forEach(b => b.style.width = b.dataset.w + '%'); };
  if (io) io.disconnect();
  const items = [...$('res').querySelectorAll('.rs')];
  items.forEach((el, k) => el.style.transitionDelay = (k < 6 ? k * 90 : 0) + 'ms');
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { reveal(e.target); if (e.target.id !== 'offer') io.unobserve(e.target); } if (e.target.id === 'offer') $('dock').classList.toggle('hide', e.isIntersecting); }), { root: $('s-results'), threshold: 0.15 });
    items.forEach(el => io.observe(el));
  } else items.forEach(reveal);
}
function setPick(id) {
  pick = id;
  $('res').querySelectorAll('[data-pick]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pick === id));
  const p = PLANS.find(x => x.id === id);
  if ($('offerGo')) $('offerGo').textContent = p ? `Subscribe · $${p.p}/mo` : 'Start free trial';
}
$('dockGo').addEventListener('click', () => { const s = $('s-results'), o = $('offer'); s.scrollTo({ top: o.offsetTop - (s.clientHeight - o.offsetHeight) / 2, behavior: reduce ? 'auto' : 'smooth' }); });
document.addEventListener('click', e => { const o = e.target.closest('[data-offer]'); if (o) toast('Opens the partner store', `${o.dataset.offer}, at the best price found today. Link not active in the prototype.`); });

/* ---------- Login: fim do fluxo ---------- */
function renderLogin() {
  const p = PLANS.find(x => x.id === S.offer), signup = S.loginMode !== 'login';
  $('lgForm').hidden = false; $('lgDone').hidden = true; $('lgHead').hidden = false; $('lgErr').textContent = '';
  $('lgPlan').hidden = !S.offer;
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
  $('lgForm').hidden = true; $('lgHead').hidden = true; const d = $('lgDone'); d.hidden = false; d.classList.remove('in'); void d.offsetWidth; d.classList.add('in');
  const p = PLANS.find(x => x.id === S.offer);
  $('lgDoneTxt').textContent = `${how}${p ? ` ${p.n} plan active.` : ' Your 3-day free trial is on.'} Opening ExitLag: first we map your network, then find your games.`;
  openHome();
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

/* ---------- Entrada: login de quem já assina, ou o check-up para quem é novo ---------- */
$('enCheck').addEventListener('click', () => scene('intro'));
$('introLogin').addEventListener('click', () => scene('entry'));
// depois do login, o app segue para o fluxo pós-login do protótipo da home: network map › varredura de jogos › onboarding › home
function openHome() { setTimeout(() => { app.classList.add('leaving'); setTimeout(() => { location.href = 'home.html#map'; }, reduce ? 0 : 600); }, reduce ? 0 : 1600); }
function enDone() { $('enForm').hidden = true; document.querySelector('.en-head').hidden = true; const d = $('enDone'); d.hidden = false; d.classList.remove('in'); void d.offsetWidth; d.classList.add('in'); openHome(); }
$('enForm').addEventListener('submit', e => {
  e.preventDefault();
  const em = $('enEmail'), pw = $('enPass');
  const bad = [[em, !/^\S+@\S+\.\S+$/.test(em.value), 'Enter the email you use for ExitLag.'], [pw, !pw.value, 'Enter your password.']];
  bad.forEach(([el, b]) => el.parentElement.classList.toggle('bad', b));
  const first = bad.find(x => x[1]);
  if (first) { $('enErr').textContent = first[2]; first[0].focus(); return; }
  $('enErr').textContent = ''; enDone();
});
$('enGoogle').addEventListener('click', enDone);
$('enForgot').addEventListener('click', () => toast('Reset your password', 'We send a reset link to your email. Not active in the prototype.'));

/* ---------- Chips do protótipo ---------- */
function fill() { if (!S.hw) S.hw = hwResult(); if (!S.net) S.net = netResult(simulate(GAMES[S.game], S.region || nearest(GAMES[S.game]))); }
function jump(name) {
  S.runId++; S.running = false; $('finale').classList.remove('show');
  if (name === 'intro' || name === 'entry') { app.classList.remove('net-on', 'xl-on'); scene(name); return; }
  if (name === 'scan') { runAll(); return; }
  fill();
  if (name === 'results') { app.classList.remove('net-on', 'xl-on'); globe && globe.scan(false); showResults(); return; }
  if (name === 'login') { app.classList.remove('net-on', 'xl-on'); if (!S.offer) S.offer = pick; S.loginMode = 'signup'; renderLogin(); scene('login'); }
}
document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => jump(b.dataset.jump)));
document.querySelectorAll('[data-profile]').forEach(b => b.addEventListener('click', () => {
  S.profile = b.dataset.profile; try { localStorage.setItem('xla-profile', S.profile); } catch { }
  document.querySelectorAll('[data-profile]').forEach(x => x.setAttribute('aria-pressed', x === b));
  if (S.scene === 'scan' && S.running) { runAll(); return; }
  if (S.hw) S.hw = hwResult();
  if (S.net) S.net = netResult(simulate(GAMES[S.game], S.region || nearest(GAMES[S.game])));
  if (S.scene === 'results') showResults();
  toast('Simulated PC changed', PROFILES[S.profile].tier.name);
}));
document.querySelectorAll('[data-profile]').forEach(x => x.setAttribute('aria-pressed', x.dataset.profile === S.profile));

/* ---------- Snackbar ---------- */
let snackT = 0;
function toast(t, d) {
  const s = $('snack'); $('snackT').textContent = t; $('snackD').textContent = d || '';
  s.hidden = false; requestAnimationFrame(() => s.classList.add('show'));
  clearTimeout(snackT); snackT = setTimeout(() => { s.classList.remove('show'); setTimeout(() => s.hidden = true, 300); }, 3600);
}

/* ---------- Início ---------- */
renderPicker();
const h = location.hash.slice(1);
if (['intro', 'scan', 'results', 'login'].includes(h)) jump(h); else scene('entry');
