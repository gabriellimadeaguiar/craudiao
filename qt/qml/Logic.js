.pragma library

/* Regras do analisador. A leitura do PC (HardwareProbe) e as medições de rede (LatencyProbe, TraceRoute) são reais;
   este arquivo transforma os números em diagnóstico: tipo de máquina, problemas, o que corrige cada um.
   O que NÃO é medido e vem marcado como estimativa na interface: o desempenho "com ExitLag" e os preços. */

var DEG = Math.PI / 180;
function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function km(a, b) {
    var la1 = a[0] * DEG, la2 = b[0] * DEG, dl = (b[1] - a[1]) * DEG;
    var c = Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(dl);
    return Math.acos(clamp(c, -1, 1)) * 6371;
}

// servidor a menos de ~250 km: o ponto vai um pouco para o lado só no desenho, para a rota aparecer no globo
function drawPoint(o, s) { return km(o, s) < 250 ? [s[0] + 2.2, s[1] + 2.6] : s; }

/* ---------- Origem: fuso horário do sistema (sem pedir permissão) ---------- */
var CITIES = {
    "America/Sao_Paulo": [-23.55, -46.63, "Sao Paulo", "SAO"], "America/Bahia": [-12.97, -38.5, "Salvador", "SSA"], "America/Fortaleza": [-3.73, -38.52, "Fortaleza", "FOR"],
    "America/Recife": [-8.05, -34.88, "Recife", "REC"], "America/Manaus": [-3.12, -60.02, "Manaus", "MAO"], "America/Argentina/Buenos_Aires": [-34.6, -58.38, "Buenos Aires", "BUE"],
    "America/Santiago": [-33.45, -70.67, "Santiago", "SCL"], "America/Lima": [-12.05, -77.04, "Lima", "LIM"], "America/Bogota": [4.71, -74.07, "Bogota", "BOG"],
    "America/Mexico_City": [19.43, -99.13, "Mexico City", "MEX"], "America/New_York": [40.71, -74.0, "New York", "NYC"], "America/Chicago": [41.88, -87.63, "Chicago", "CHI"],
    "America/Denver": [39.74, -104.99, "Denver", "DEN"], "America/Los_Angeles": [34.05, -118.24, "Los Angeles", "LAX"], "America/Toronto": [43.65, -79.38, "Toronto", "YYZ"],
    "Europe/Lisbon": [38.72, -9.14, "Lisbon", "LIS"], "Europe/London": [51.51, -0.13, "London", "LON"], "Europe/Madrid": [40.42, -3.7, "Madrid", "MAD"],
    "Europe/Paris": [48.86, 2.35, "Paris", "PAR"], "Europe/Berlin": [52.52, 13.4, "Berlin", "BER"], "Europe/Warsaw": [52.23, 21.01, "Warsaw", "WAW"],
    "Europe/Istanbul": [41.01, 28.98, "Istanbul", "IST"], "Europe/Moscow": [55.76, 37.62, "Moscow", "MOW"], "Africa/Johannesburg": [-26.2, 28.05, "Johannesburg", "JNB"],
    "Asia/Dubai": [25.2, 55.27, "Dubai", "DXB"], "Asia/Kolkata": [19.08, 72.88, "Mumbai", "BOM"], "Asia/Singapore": [1.35, 103.82, "Singapore", "SIN"],
    "Asia/Manila": [14.6, 120.98, "Manila", "MNL"], "Asia/Tokyo": [35.68, 139.69, "Tokyo", "TYO"], "Asia/Seoul": [37.57, 126.98, "Seoul", "SEL"], "Australia/Sydney": [-33.87, 151.21, "Sydney", "SYD"],
    // fusos do Windows (o QTimeZone devolve IANA, mas fica como rede de segurança)
    "E. South America Standard Time": [-23.55, -46.63, "Sao Paulo", "SAO"]
};
var FALLBACK = { America: "America/Sao_Paulo", Europe: "Europe/London", Africa: "Africa/Johannesburg", Asia: "Asia/Singapore", Australia: "Australia/Sydney" };
function originFor(tz) {
    if (CITIES[tz]) return CITIES[tz];
    var f = FALLBACK[(tz || "").split("/")[0]];
    return CITIES[f] || CITIES["America/Sao_Paulo"];
}

/* ---------- Regiões de jogo e onde medimos ----------
   A latência é medida até um data center da AWS na mesma região dos servidores do jogo (endpoint público do
   DynamoDB, porta 443). É a mesma técnica dos sites de "ping por região": mede a sua rota até aquela cidade. */
var REGIONS = {
    br:  { name: "Brazil",         city: "Sao Paulo",   code: "GRU", lat: -23.55, lon: -46.63,  host: "dynamodb.sa-east-1.amazonaws.com" },
    nae: { name: "NA East",        city: "Ashburn",     code: "IAD", lat: 39.04,  lon: -77.49,  host: "dynamodb.us-east-1.amazonaws.com" },
    nac: { name: "NA Central",     city: "Ohio",        code: "CMH", lat: 39.96,  lon: -83.0,   host: "dynamodb.us-east-2.amazonaws.com" },
    naw: { name: "NA West",        city: "Oregon",      code: "PDX", lat: 45.84,  lon: -119.7,  host: "dynamodb.us-west-2.amazonaws.com" },
    euw: { name: "EU West",        city: "Frankfurt",   code: "FRA", lat: 50.11,  lon: 8.68,    host: "dynamodb.eu-central-1.amazonaws.com" },
    eun: { name: "EU North",       city: "Stockholm",   code: "ARN", lat: 59.33,  lon: 18.07,   host: "dynamodb.eu-north-1.amazonaws.com" },
    sea: { name: "Southeast Asia", city: "Singapore",   code: "SIN", lat: 1.35,   lon: 103.82,  host: "dynamodb.ap-southeast-1.amazonaws.com" },
    jp:  { name: "Japan",          city: "Tokyo",       code: "NRT", lat: 35.68,  lon: 139.69,  host: "dynamodb.ap-northeast-1.amazonaws.com" },
    kr:  { name: "Korea",          city: "Seoul",       code: "ICN", lat: 37.57,  lon: 126.98,  host: "dynamodb.ap-northeast-2.amazonaws.com" },
    oce: { name: "Oceania",        city: "Sydney",      code: "SYD", lat: -33.87, lon: 151.21,  host: "dynamodb.ap-southeast-2.amazonaws.com" }
};
// país de cada região (bandeira no seletor de servidor: :/flags/<país>.png, gerada por tools/make_flags.py)
var REGION_COUNTRY = { br: "br", nae: "us", nac: "us", naw: "us", euw: "de", eun: "se", sea: "sg", jp: "jp", kr: "kr", oce: "au" };
function flagFor(regionId) { return "qrc:/flags/" + (REGION_COUNTRY[regionId] || "us") + ".png"; }
// quantas rotas ExitLag cada jogo usa em paralelo (2 a 4, como no protótipo)
function lanesFor(gameId) { var h = 0; for (var i = 0; i < gameId.length; i++) h = (h * 31 + gameId.charCodeAt(i)) % 997; return 2 + h % 3; }

// network map pós-login: um ponto por continente
var CONTINENTS = [
    { name: "South America", city: "Sao Paulo", lat: -23.55, lon: -46.63, host: "dynamodb.sa-east-1.amazonaws.com" },
    { name: "North America", city: "Ashburn",   lat: 39.04,  lon: -77.49, host: "dynamodb.us-east-1.amazonaws.com" },
    { name: "Europe",        city: "Frankfurt", lat: 50.11,  lon: 8.68,   host: "dynamodb.eu-central-1.amazonaws.com" },
    { name: "Africa",        city: "Cape Town", lat: -33.92, lon: 18.42,  host: "dynamodb.af-south-1.amazonaws.com" },
    { name: "Asia",          city: "Tokyo",     lat: 35.68,  lon: 139.69, host: "dynamodb.ap-northeast-1.amazonaws.com" },
    { name: "Oceania",       city: "Sydney",    lat: -33.87, lon: 151.21, host: "dynamodb.ap-southeast-2.amazonaws.com" }
];

// network map: destinos medidos de verdade (data centers da AWS, endpoint público do DynamoDB, porta 443).
// O mapa dispara uma linha para cada um e, no fim, fica com o melhor de cada continente.
function aws(r) { return "dynamodb." + r + ".amazonaws.com"; }
var MAP_POINTS = [
    { cont: "South America", city: "Sao Paulo",     lat: -23.55, lon: -46.63,  host: aws("sa-east-1") },
    { cont: "North America", city: "Virginia",      lat: 39.04,  lon: -77.49,  host: aws("us-east-1") },
    { cont: "North America", city: "Ohio",          lat: 39.96,  lon: -83.0,   host: aws("us-east-2") },
    { cont: "North America", city: "California",    lat: 37.35,  lon: -121.96, host: aws("us-west-1") },
    { cont: "North America", city: "Oregon",        lat: 45.84,  lon: -119.7,  host: aws("us-west-2") },
    { cont: "North America", city: "Montreal",      lat: 45.5,   lon: -73.57,  host: aws("ca-central-1") },
    { cont: "North America", city: "Mexico",        lat: 20.59,  lon: -100.39, host: aws("mx-central-1") },
    { cont: "Europe",        city: "Dublin",        lat: 53.35,  lon: -6.26,   host: aws("eu-west-1") },
    { cont: "Europe",        city: "London",        lat: 51.51,  lon: -0.13,   host: aws("eu-west-2") },
    { cont: "Europe",        city: "Paris",         lat: 48.86,  lon: 2.35,    host: aws("eu-west-3") },
    { cont: "Europe",        city: "Frankfurt",     lat: 50.11,  lon: 8.68,    host: aws("eu-central-1") },
    { cont: "Europe",        city: "Stockholm",     lat: 59.33,  lon: 18.07,   host: aws("eu-north-1") },
    { cont: "Europe",        city: "Milan",         lat: 45.46,  lon: 9.19,    host: aws("eu-south-1") },
    { cont: "Europe",        city: "Madrid",        lat: 40.42,  lon: -3.7,    host: aws("eu-south-2") },
    { cont: "Africa",        city: "Cape Town",     lat: -33.92, lon: 18.42,   host: aws("af-south-1") },
    { cont: "Middle East",   city: "Bahrain",       lat: 26.07,  lon: 50.56,   host: aws("me-south-1") },
    { cont: "Middle East",   city: "Dubai",         lat: 25.2,   lon: 55.27,   host: aws("me-central-1") },
    { cont: "Middle East",   city: "Tel Aviv",      lat: 32.09,  lon: 34.78,   host: aws("il-central-1") },
    { cont: "Asia",          city: "Tokyo",         lat: 35.68,  lon: 139.69,  host: aws("ap-northeast-1") },
    { cont: "Asia",          city: "Seoul",         lat: 37.57,  lon: 126.98,  host: aws("ap-northeast-2") },
    { cont: "Asia",          city: "Osaka",         lat: 34.69,  lon: 135.5,   host: aws("ap-northeast-3") },
    { cont: "Asia",          city: "Singapore",     lat: 1.35,   lon: 103.82,  host: aws("ap-southeast-1") },
    { cont: "Asia",          city: "Jakarta",       lat: -6.21,  lon: 106.85,  host: aws("ap-southeast-3") },
    { cont: "Asia",          city: "Mumbai",        lat: 19.08,  lon: 72.88,   host: aws("ap-south-1") },
    { cont: "Asia",          city: "Hong Kong",     lat: 22.32,  lon: 114.17,  host: aws("ap-east-1") },
    { cont: "Oceania",       city: "Sydney",        lat: -33.87, lon: 151.21,  host: aws("ap-southeast-2") },
    { cont: "Oceania",       city: "Melbourne",     lat: -37.81, lon: 144.96,  host: aws("ap-southeast-4") }
];

/* ---------- Catálogo de jogos (capas no recurso :/games) ---------- */
var G = "qrc:/games/";
var CATALOG = {
    lol:      { name: "League of Legends", img: G + "league-of-legends.jpg", regions: ["br", "nac", "euw", "eun", "kr", "oce"] },
    cs2:      { name: "Counter-Strike 2", img: G + "box-cs2.jpg", regions: ["br", "nae", "naw", "euw", "eun", "sea"] },
    fortnite: { name: "Fortnite", img: G + "fortnite.jpg", regions: ["br", "nae", "naw", "euw", "sea", "oce"] },
    apex:     { name: "Apex Legends", img: G + "box-apex-legends.jpg", regions: ["br", "nae", "naw", "euw", "jp"] },
    dota2:    { name: "Dota 2", img: G + "box-dota-2.jpg", regions: ["br", "nae", "euw", "sea"] },
    r6:       { name: "Rainbow Six Siege", img: G + "box-rainbow-six-siege.jpg", regions: ["br", "nae", "euw", "sea"] },
    ow2:      { name: "Overwatch 2", img: G + "box-overwatch-2.jpg", regions: ["nac", "euw", "kr"] },
    rl:       { name: "Rocket League", img: G + "box-rocket-league.jpg", regions: ["br", "nae", "euw", "oce"] },
    pubg:     { name: "PUBG: Battlegrounds", img: G + "box-pubg.jpg", regions: ["nae", "euw", "kr", "sea"] },
    tarkov:   { name: "Escape from Tarkov", img: G + "box-tarkov.jpg", regions: ["nae", "naw", "euw", "eun", "sea"] },
    destiny2: { name: "Destiny 2", img: G + "box-destiny-2.jpg", regions: ["nae", "euw", "jp"] },
    elden:    { name: "Elden Ring", img: G + "box-elden-ring.jpg", regions: ["nae", "euw", "jp"] },
    dbd:      { name: "Dead by Daylight", img: G + "box-dead-by-daylight.jpg", regions: ["br", "nae", "euw", "sea"] },
    warframe: { name: "Warframe", img: G + "box-warframe.jpg", regions: ["nae", "euw", "sea"] },
    poe2:     { name: "Path of Exile 2", img: G + "box-poe2.jpg", regions: ["nae", "euw", "sea"] },
    ark:      { name: "ARK: Survival Evolved", img: G + "box-ark.jpg", regions: ["nae", "euw", "sea"] },
    wow:      { name: "World of Warcraft", img: G + "box-wow.jpg", regions: ["nae", "euw", "kr"] },
    naruto:   { name: "Naruto Shippuden: Ultimate Ninja Storm 4", img: G + "box-naruto-storm-4.jpg", regions: ["nae", "euw", "jp"] },
    tl:       { name: "Throne and Liberty", img: G + "throne-and-liberty.jpg", regions: ["nae", "naw", "euw", "br"] }
};
// ícones de app com cantos arredondados (gerados por tools/make_icons.py; os reais quando há, senão um recorte da capa)
function iconFor(id) { return CATALOG[id] ? "qrc:/icons/" + id + ".png" : ""; }
// sem jogos achados no PC: os mais jogados, para a análise não travar
var POPULAR = ["lol", "cs2", "fortnite", "apex", "dota2", "r6", "ow2", "rl"];
function nearestRegion(gameId, origin) {
    var rs = CATALOG[gameId].regions, best = rs[0];
    for (var i = 1; i < rs.length; i++) if (km(origin, [REGIONS[rs[i]].lat, REGIONS[rs[i]].lon]) < km(origin, [REGIONS[best].lat, REGIONS[best].lon])) best = rs[i];
    return best;
}

/* ---------- Ferramentas e planos ---------- */
var TOOLS = {
    route: { name: "Route Optimizer", icon: "route", pitch: "Sends each packet over several routes at once and switches routes on its own when one gets worse." },
    fps:   { name: "FPS Boost", icon: "boost", pitch: "Closes what competes with your game, switches Windows to a performance power plan and tunes system settings for games." },
    ram:   { name: "RAM Cleaner", icon: "broom", pitch: "Frees memory held by apps you are not using, so the game has room before it starts stuttering." },
    dns:   { name: "DNS Optimizer", icon: "dns", pitch: "Finds the fastest DNS server for you, so matchmaking, logins and game launchers answer sooner." },
    multi: { name: "Multi Internet", icon: "multi", pitch: "Uses two connections together, such as cable and mobile data, so one failing does not drop your match." }
};
var TOOL_ORDER = ["route", "fps", "ram", "dns", "multi"];
var PLANS = [
    { id: "m", n: "Monthly", p: 6.49, sub: "Billed every month" },
    { id: "q", n: "Quarterly", p: 5.66, sub: "$16.99 every 3 months" },
    { id: "y", n: "Yearly", p: 4.99, sub: "$59.88 per year", best: true }
];

/* ---------- Hardware ---------- */
var SEV_RANK = { critical: 0, warning: 1, success: 2, neutral: 3 };
var SEV_LABEL = { critical: "Bottleneck", warning: "Attention", success: "Good", neutral: "Not read" };

// força relativa da placa de vídeo para jogos (0–100), pelo nome; aproximação por geração e faixa
function gpuScore(name) {
    var n = (name || "").toUpperCase();
    var table = [
        [/RTX\s*50\d0/, 98], [/RTX\s*40(80|90)/, 96], [/RTX\s*4070/, 88], [/RTX\s*4060/, 75], [/RTX\s*30(80|90)/, 88], [/RTX\s*3070/, 80], [/RTX\s*3060/, 70], [/RTX\s*3050/, 55],
        [/RTX\s*20(80|70)/, 66], [/RTX\s*2060/, 58], [/RX\s*9\d{3}/, 92], [/RX\s*79\d0/, 92], [/RX\s*7[78]\d0/, 85], [/RX\s*76\d0/, 70], [/RX\s*6[89]\d0/, 85], [/RX\s*67\d0/, 75], [/RX\s*66\d0/, 65],
        [/RX\s*6[45]\d0/, 42], [/RX\s*5[67]\d0/, 55], [/RX\s*5[45]\d0/, 38], [/RX\s*5[0-9]0\b/, 30], [/GTX\s*16[56]0/, 45], [/GTX\s*1080/, 52], [/GTX\s*1070/, 46], [/GTX\s*1060/, 38],
        [/GTX\s*105\d/, 28], [/GTX\s*9\d0/, 20], [/GTX\s*7\d0/, 12], [/ARC.*A7\d0/, 66], [/ARC.*A5\d0/, 48], [/ARC.*A3\d0/, 32], [/ARC\b/, 40],
        [/IRIS\s*XE/, 18], [/UHD|HD GRAPHICS/, 10], [/RADEON\(TM\)\s*GRAPHICS|VEGA/, 20], [/RADEON\s*7[68]0M/, 34]
    ];
    for (var i = 0; i < table.length; i++) if (table[i][0].test(n)) return table[i][1];
    return n ? 40 : 0;
}
function cpuScore(c) {
    if (!c || !c.threads) return 0;
    var t = c.threads, s = t <= 4 ? 25 : t <= 6 ? 40 : t <= 8 ? 55 : t <= 12 ? 70 : t <= 16 ? 85 : 95;
    var n = (c.name || "").toUpperCase();
    if (/X3D|I9-|RYZEN 9|CORE.*ULTRA 9/.test(n)) s += 5;
    if (/CELERON|PENTIUM|ATHLON|FX-|A\d-|I[357]-[2-7]\d{3}\b/.test(n)) s -= 15;
    return clamp(s, 5, 100);
}
function ramScore(gb) { return gb <= 4 ? 15 : gb <= 8 ? 40 : gb <= 16 ? 70 : gb <= 32 ? 90 : 100; }
var MEMTYPE = { 20: "DDR", 21: "DDR2", 24: "DDR3", 26: "DDR4", 34: "DDR5", 35: "LPDDR5" };
var POWER = { "381b4222-f694-41f0-9685-ff5bb260df2e": "Balanced", "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c": "High performance",
              "a1841308-3541-4fab-bc81-f71556f20b4a": "Power saver", "e9a42b02-d5df-448d-aa00-03f14749eb61": "Ultimate Performance" };

function part(k, icon, lbl, val, sub, st, stl, find) { return { k: k, icon: icon, lbl: lbl, val: val, sub: sub, st: st, stl: stl, find: find || null }; }
function finding(sev, t, d, fix) { return { sev: sev, t: t, d: d, fix: fix }; }

function analyzeHardware(raw) {
    raw = raw || {};
    var parts = [], ups = [];
    var os = raw.os || {}, cpu = raw.cpu || {}, gpus = raw.gpus || [], gpu = gpus[0] || {}, mem = raw.mem || {}, disk = raw.disk || {}, net = raw.net || null;
    var na = function (k, icon, lbl) { return part(k, icon, lbl, "Not available on this system", "Reading needs Windows", "neutral", "Not read"); };

    // Sistema
    if (os.caption) {
        var win10 = /Windows 10/.test(os.caption);
        parts.push(part("os", "windows", "System", os.caption.replace("Microsoft ", "") + (os.display ? " " + os.display : ""), "Build " + (os.build || os.version || ""),
            win10 ? "warning" : "success", win10 ? "Support ended" : "Up to date",
            win10 ? finding("warning", "Windows 10 no longer gets security updates", "Microsoft ended Windows 10 support in October 2025. Newer drivers and anti-cheat updates target Windows 11 first.", [{ free: "Upgrade to Windows 11" }]) : null));
    } else parts.push(na("os", "windows", "System"));

    // Processador
    var cs = cpuScore(cpu);
    if (cpu.name) {
        var cw = cs < 40;
        parts.push(part("cpu", "cpu", "Processor", cpu.name, cpu.cores + " cores · " + cpu.threads + " threads" + (cpu.mhz ? " · " + (cpu.mhz / 1000).toFixed(1) + " GHz" : ""),
            cw ? "warning" : "success", cw ? "Near its limit" : cs >= 85 ? "Excellent" : "Good",
            cw ? finding("warning", "Processor is near its limit", "With " + cpu.threads + " threads, modern games fill it up fast. Closing what runs in the background gives the game the cores back.", ["fps"]) : null));
    } else parts.push(na("cpu", "cpu", "Processor"));

    // Placa de vídeo
    var gs = gpuScore(gpu.name);
    var vram = 0;
    (raw.gpuMem || []).forEach(function (b) { vram = Math.max(vram, b); });
    if (!vram && gpu.ram) vram = gpu.ram;
    var vramGb = vram ? Math.round(vram / 1073741824) : 0;
    if (gpu.name) {
        var gst = gs < 30 ? "critical" : gs < 55 ? "warning" : "success";
        var drvDays = gpu.driverDate ? Math.round((Date.now() - Date.parse(gpu.driverDate)) / 86400000) : 0;
        parts.push(part("gpu", "gpu", "Graphics card", gpu.name, (vramGb ? vramGb + " GB · " : "") + "driver " + (gpu.driver || "?") + (gpu.driverDate ? " (" + gpu.driverDate.slice(0, 4) + ")" : ""),
            gst, gs < 30 ? "Outdated" : gs < 55 ? "Aging" : gs >= 85 ? "Excellent" : "Good",
            gs < 30 ? finding("critical", "Graphics card is the main bottleneck", "Recent games will drop below 40 fps even on low settings with this card. Tuning helps a little; a new card fixes it.", ["fps", { free: "Upgrade suggested below" }])
                    : gs < 55 ? finding("warning", "Graphics card is getting old", "Fine for esports titles at 1080p. Newer games will need medium or low settings.", [{ free: "Upgrade suggested below" }]) : null));
        if (drvDays > 365) parts[parts.length - 1].find2 = finding("warning", "Graphics driver is " + Math.round(drvDays / 30) + " months old", "New drivers fix stutter and add optimizations for recent games.", [{ free: "Update your driver" }]);
        if (gs < 30) ups.push({ part: "Graphics card", icon: "gpu", name: "NVIDIA GeForce RTX 3050 6 GB", why: "Replaces your " + gpu.name + ".", gain: "Around 3× the frames in current games", price: 169, was: 199 });
        else if (gs < 55) ups.push({ part: "Graphics card", icon: "gpu", name: "NVIDIA GeForce RTX 4060 8 GB", why: "Replaces your " + gpu.name + ".", gain: "Around 2× the frames at 1080p and 1440p", price: 289, was: 329 });
    } else parts.push(na("gpu", "gpu", "Graphics card"));

    // Memória
    var totalGb = os.totalKb ? os.totalKb / 1048576 : 0, used = os.totalKb ? (os.totalKb - os.freeKb) / os.totalKb : 0;
    var gbR = Math.round(totalGb);
    var rs = ramScore(gbR || 8);
    if (totalGb) {
        var typ = MEMTYPE[mem.type] || "";
        var rst = gbR < 8 || used > 0.85 ? "critical" : used > 0.7 || gbR <= 8 ? "warning" : "success";
        parts.push(part("ram", "ram", "Memory", gbR + " GB" + (typ ? " " + typ : "") + (mem.speed ? " " + mem.speed + " MHz" : ""), (used * totalGb).toFixed(1) + " GB in use right now (" + Math.round(used * 100) + "%)",
            rst, used > 0.85 ? "Almost full" : used > 0.7 ? "Busy" : gbR <= 8 ? "Low" : "Good",
            used > 0.85 ? finding("critical", "Memory is almost full", "At " + Math.round(used * 100) + "% in use, Windows starts swapping to disk while you play, which shows up as sudden stutters.", ["ram"])
              : used > 0.7 ? finding("warning", "Memory is busy before the game starts", Math.round(used * 100) + "% in use with the game closed. Browsers and launchers hold memory the game will need.", ["ram"])
              : gbR <= 8 ? finding("warning", "8 GB of memory is tight for current games", "Most new games ask for 16 GB. With 8 GB the game shares memory with everything else.", ["ram", { free: "Upgrade suggested below" }]) : null));
        if (gbR <= 8) ups.push({ part: "Memory", icon: "ram", name: "16 GB " + (typ || "DDR4") + " kit (2 × 8 GB)", why: "Doubles your memory. Same type your motherboard uses.", gain: "Ends the swapping stutters", price: typ === "DDR5" ? 59 : typ === "DDR3" ? 34 : 39, was: typ === "DDR5" ? 72 : typ === "DDR3" ? 42 : 48 });
    } else parts.push(na("ram", "ram", "Memory"));

    // Disco do sistema
    if (disk.size) {
        var hdd = /HDD/i.test(disk.media), nvme = /NVMe/i.test(disk.bus), freeP = disk.free / disk.size;
        var sizeGb = disk.size / 1e9, sizeTxt = sizeGb >= 1000 ? (sizeGb / 1000).toFixed(1) + " TB" : Math.round(sizeGb) + " GB";
        parts.push(part("disk", "disk", "Storage", sizeTxt + " " + (nvme ? "NVMe SSD" : hdd ? "hard drive" : /SSD/i.test(disk.media) ? "SSD" : "drive"), Math.round((1 - freeP) * 100) + "% full" + (disk.name ? " · " + disk.name : ""),
            hdd || freeP < 0.1 ? "warning" : "success", hdd ? "Slow" : freeP < 0.1 ? "Almost full" : "Good",
            hdd ? finding("warning", "Windows runs from a hard drive", "Long loading screens and textures popping in late. An SSD solves it.", [{ free: "Move games to an SSD" }])
                : freeP < 0.1 ? finding("warning", "System drive is almost full", "Less than 10% free slows down updates, shader caches and Windows itself.", [{ free: "Free up space" }]) : null));
    } else parts.push(na("disk", "disk", "Storage"));

    // Monitor
    if (gpu.width) {
        var hz = gpu.hz || 60, maxHz = raw.monitorMaxHz || 0, mis = maxHz > hz + 5;
        parts.push(part("display", "display", "Display", gpu.width + " × " + gpu.height + " · " + (mis ? "running at " : "") + hz + " Hz", mis ? "Your monitor supports " + maxHz + " Hz" : "Running at the monitor's top refresh rate",
            mis ? "critical" : "success", mis ? "Misconfigured" : "Good",
            mis ? finding("critical", "Your " + maxHz + " Hz monitor is set to " + hz + " Hz", "Windows is showing fewer frames than your monitor can. Change it in Settings › Display › Advanced display.", [{ free: "Free fix: set to " + maxHz + " Hz" }]) : null));
    } else parts.push(na("display", "display", "Display"));

    // Adaptador de rede
    var wifi = false;
    if (net) {
        wifi = /802\.11|Wireless|Wi-?Fi/i.test(net.media + " " + net.desc);
        if (wifi) {
            var weak = net.signal && net.signal < 60;
            parts.push(part("net", "wifi", "Network adapter", "Wi-Fi" + (net.radio ? " · " + net.radio : "") + (net.band ? " · " + net.band : ""), (net.signal ? "Signal " + net.signal + "%" : "Signal unknown") + (net.speed ? " · " + net.speed + " link" : ""),
                "warning", weak ? "Weak signal" : "Wi-Fi",
                finding("warning", weak ? "Weak Wi-Fi signal" : "Playing over Wi-Fi", "Wi-Fi adds variation to every packet" + (weak ? ", and at " + net.signal + "% signal it also drops some" : "") + ". A cable is the free fix; Multi Internet keeps you online if Wi-Fi drops.", ["multi", { free: "Use a network cable" }])));
        } else parts.push(part("net", "cable", "Network adapter", "Ethernet" + (net.speed ? " · " + net.speed : ""), net.desc || "Cable connected", "success", "Good"));
    } else parts.push(na("net", "wifi", "Network adapter"));

    // Segundo plano
    if (raw.processes) {
        var heavy = (raw.startup || 0) >= 8 || raw.processes > 220;
        parts.push(part("bg", "list", "Background apps", raw.processes + " processes · " + (raw.startup || 0) + " start with Windows", heavy ? "Launchers, updaters and overlays compete for CPU" : "A light load",
            heavy ? "warning" : "success", heavy ? "Heavy" : "Good",
            heavy ? finding("warning", "Too much starts with Windows", (raw.startup || 0) + " apps start with Windows and keep using CPU and memory while you play.", ["fps"]) : null));
    } else parts.push(na("bg", "list", "Background apps"));

    // Plano de energia (+ Modo de Jogo)
    if (raw.powerGuid || raw.powerName) {
        var pname = POWER[(raw.powerGuid || "").toLowerCase()] || raw.powerName || "Custom";
        var saving = pname === "Balanced" || pname === "Power saver";
        var gmOff = raw.gameMode === 0;
        parts.push(part("power", "power", "Power plan", pname + (gmOff ? " · Game Mode off" : ""), saving ? "CPU slows down to save energy" : "CPU runs at full speed",
            saving || gmOff ? "warning" : "success", saving ? "Not for games" : gmOff ? "Game Mode off" : "Good",
            saving ? finding("warning", "Windows is saving power while you play", "The " + pname + " plan lowers CPU clocks between frames and adds small frame-time spikes.", ["fps"])
                   : gmOff ? finding("warning", "Windows Game Mode is off", "Game Mode keeps Windows Update and background tasks out of the way while a game runs.", [{ free: "Turn on Game Mode" }]) : null));
    } else parts.push(na("power", "power", "Power plan"));

    // DNS
    if (raw.dnsMs !== undefined) {
        var slow = raw.dnsMs > 25;
        parts.push(part("dns", "dns", "DNS", (raw.dns && raw.dns.length ? raw.dns[0] : "System resolver"), Math.round(raw.dnsMs) + " ms per lookup",
            slow ? "warning" : "success", slow ? "Slow" : "Good",
            slow ? finding("warning", "Slow DNS", "Each lookup takes " + Math.round(raw.dnsMs) + " ms. You notice it in launchers, logins and matchmaking.", ["dns"]) : null));
    } else parts.push(na("dns", "dns", "DNS"));

    var score = Math.round(0.45 * (gs || 40) + 0.3 * (cs || 50) + 0.25 * rs);
    var tierName = score < 40 ? "Low end" : score < 75 ? "Mid range" : "High end";
    var weakest = gs && gs < 55 ? "the graphics card" : cs && cs < 40 ? "the processor" : gbR && gbR <= 8 ? "memory" : "";
    var verdict = score >= 75 ? "Your PC is not what holds you back. If you still feel lag, it comes from the route to the game server."
                : score >= 40 ? "A solid gaming PC for 1080p" + (weakest ? ", held back mostly by " + weakest : "") + "."
                : "Plays lighter games well. Newer games will struggle" + (weakest ? ", mostly because of " + weakest : "") + ".";
    var findings = [];
    parts.forEach(function (p) { if (p.find) findings.push(Object.assign({ src: "PC" }, p.find)); if (p.find2) findings.push(Object.assign({ src: "PC" }, p.find2)); });
    return { parts: parts, tier: { name: tierName, score: score, verdict: verdict }, upgrades: ups, findings: findings, wifi: wifi, source: raw.source || "" };
}

/* ---------- Rede ---------- */
function stats(samples) {
    var ok = [], lost = 0;
    samples.forEach(function (s) { if (s.lost) lost++; else ok.push(s.v); });
    var avg = ok.reduce(function (a, b) { return a + b; }, 0) / Math.max(ok.length, 1);
    var jit = 0; for (var i = 1; i < ok.length; i++) jit += Math.abs(ok[i] - ok[i - 1]); jit /= Math.max(ok.length - 1, 1);
    var sorted = ok.slice().sort(function (a, b) { return a - b; }), med = sorted[Math.floor(sorted.length / 2)] || 0;
    var spikes = 0, inS = false; ok.forEach(function (v) { var s = v > med * 1.5 && v > med + 25; if (s && !inS) spikes++; inS = s; });
    var loss = lost / Math.max(samples.length, 1) * 100;
    var score = Math.round(clamp(100 - jit * 1.6 - loss * 6 - spikes * 3 - Math.max(0, avg - 60) * 0.08, 5, 99));
    return { avg: avg, jit: jit, loss: loss, spikes: spikes, score: score, max: ok.length ? Math.max.apply(null, ok) : 0, min: sorted[0] || 0, n: samples.length };
}
// o mínimo que a física permite: ~1 ms de ida e volta a cada 100 km de fibra, mais o acesso da última milha
function baselineMs(distanceKm) { return distanceKm / 100 + 4; }
// ESTIMATIVA (não medida): rota direta sem desvio e com várias rotas ao mesmo tempo
function xlEstimate(I, distanceKm, wifi) {
    var base = baselineMs(distanceKm) * 1.08 + 3 + (wifi ? 2 : 0);
    var avg = Math.min(I.avg, Math.max(base, I.min * 0.98));
    var jit = Math.max(wifi ? 1.6 : 0.8, I.jit * 0.3);
    var X = { avg: avg, jit: jit, loss: 0, spikes: 0, max: avg + jit * 3, min: avg - jit, estimated: true };
    X.score = Math.round(clamp(100 - X.jit * 1.6 - Math.max(0, avg - 60) * 0.08, 5, 99));
    return X;
}
function analyzeNetwork(I, distanceKm, hops, wifi, regionCity) {
    var F = [], base = baselineMs(distanceKm), extra = I.avg - base;
    if (I.n === 0 || I.avg === 0) return [finding("critical", "The server didn't answer", "We couldn't reach " + regionCity + " from this PC. Check your connection or firewall.", [])];
    if (extra > 15 && extra > base * 0.3)
        F.push(finding(extra > 40 ? "critical" : "warning", "Your route is " + Math.round(extra) + " ms slower than the distance needs",
            "Reaching " + regionCity + " (" + fmt(distanceKm) + " km away) should take about " + Math.round(base) + " ms. Your provider's route takes " + Math.round(I.avg) + " ms, which usually means a detour or a congested exchange on the way.", ["route"]));
    if (I.loss > 0.4) {
        var at = "";
        if (hops && hops.length) {
            for (var i = 0; i < hops.length; i++) {
                var h = hops[i];
                if (h.address && h.lost > 0 && hops.slice(i + 1).every(function (x) { return !x.address || x.lost > 0; })) { at = " starting at hop " + h.ttl + (h.name ? " (" + h.name + ")" : " (" + h.address + ")"); break; }
            }
        }
        F.push(finding(I.loss > 1.5 ? "critical" : "warning", I.loss.toFixed(1) + "% packet loss" + at, "Lost packets show up as rubber-banding, shots that don't register and players teleporting.", ["route"]));
    }
    if (I.spikes > 0) F.push(finding(I.spikes > 2 ? "critical" : "warning", I.spikes + " lag spike" + (I.spikes > 1 ? "s" : "") + " during the test", "Ping jumped as high as " + Math.round(I.max) + " ms. In a match that's a freeze right when you need to react.", ["route"]));
    if (I.jit > 6) F.push(finding("warning", "Unsteady ping (jitter " + I.jit.toFixed(1) + " ms)", "Ping keeps moving up and down, so the game can't predict where other players are. Aim feels inconsistent.", ["route"]));
    if (wifi) F.push(finding("warning", "Wi-Fi adds jitter on top of the route", "Even on a good route, Wi-Fi leaves a few ms of variation. A network cable removes it for free.", ["multi", { free: "Use a network cable" }]));
    return F.map(function (f) { return Object.assign({ src: "Network" }, f); });
}
function headline(hw, netF) {
    var netCrit = netF.some(function (f) { return f.sev === "critical"; }), hwCrit = hw.findings.some(function (f) { return f.sev === "critical"; });
    if (hw.tier.score >= 75 && netF.length) return "Your PC is ready. Your connection isn't.";
    if (netCrit && hwCrit) return "Your PC and your connection are both holding you back.";
    if (netCrit) return "Your connection is what's costing you.";
    if (hwCrit) return "Your PC is what's holding you back.";
    return netF.length + hw.findings.length ? "A few things are costing you frames and ping." : "Your setup is in good shape.";
}
function fixCounts(findings) {
    var c = {};
    findings.forEach(function (f) { (f.fix || []).forEach(function (x) { if (typeof x === "string") c[x] = (c[x] || 0) + 1; }); });
    return c;
}
function fixable(findings) { return findings.filter(function (f) { return (f.fix || []).some(function (x) { return typeof x === "string"; }); }).length; }
