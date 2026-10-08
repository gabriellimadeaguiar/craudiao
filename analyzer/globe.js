import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* Globo do analisador: mesma linguagem do globo da home (pontos de terra, atmosfera difusa, rede ExitLag piscando,
   rotas em tubo com halo e pacotes). Aqui ele mostra duas coisas lado a lado:
   - a rota da operadora (laranja), salto a salto, com o desvio que ela faz até o servidor;
   - as rotas ExitLag (verde): você › bridge › túnel › final › servidor, várias ao mesmo tempo (multipath). */

const D = Math.PI / 180;
export const toV = (lat, lon, r = 1) => { const p = (90 - lat) * D, th = (lon + 180) * D; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(th), r * Math.cos(p), r * Math.sin(p) * Math.sin(th)); };
export const toLL = v => { const n = v.clone().normalize(); const lat = 90 - Math.acos(n.y) / D; let lon = Math.atan2(n.z, -n.x) / D - 180; lon = ((lon % 360) + 540) % 360 - 180; return [lat, lon]; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x * x * (3 - 2 * x);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createGlobe(canvas, origin) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const PR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x0b0c0f, 1); // mesma cor do surface: o bloom devolve fundo opaco
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const tilt = new THREE.Group(), globe = new THREE.Group();
  tilt.add(globe); scene.add(tilt);

  const C = { dim: new THREE.Color('#878d97'), route: new THREE.Color('#22eba3'), isp: new THREE.Color('#eb8322'), bad: new THREE.Color('#f52929'),
    deep: new THREE.Color('#07080b'), rim: new THREE.Color('#6f8fb8'), fog: new THREE.Color('#ebeced') };

  // céu estrelado leve
  const stars = (() => {
    const N = 2200, pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 40 + Math.random() * 20, s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(t) * s * r, u * r, Math.sin(t) * s * r - 20], i * 3); seed.set([Math.random(), Math.pow(Math.random(), 3)], i * 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: PR } },
      vertexShader: `attribute vec2 aSeed; uniform float uTime, uPR; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 1.8) + aSeed.x * 40.0);
          vA = (0.25 + 0.6 * aSeed.y) * tw; gl_PointSize = (1.0 + aSeed.y * 1.6) * uPR; }`,
      fragmentShader: `varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.82, 0.88, 1.0), vA * (1.0 - smoothstep(0.15, 0.5, d))); }` });
    const p = new THREE.Points(g, m); p.renderOrder = -1; p.frustumCulled = false; return p;
  })();
  scene.add(stars);

  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uDeep: { value: C.deep }, uRim: { value: C.rim } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uDeep; uniform vec3 uRim; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.-max(dot(vN,vV),0.); gl_FragColor = vec4(mix(uDeep, uRim, pow(f,5.)*.14), 1.); }`
  })));
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

  // pontos de terra (land.js, mesmo arquivo da landing e da home)
  const raw = Uint8Array.from(atob(window.LAND || ''), c => c.charCodeAt(0));
  const u16 = new Uint16Array(raw.buffer);
  const nLand = u16.length / 2, landPos = new Float32Array(nLand * 3), landLL = [];
  for (let i = 0; i < nLand; i++) { const lat = u16[i * 2] / 100 - 90, lon = u16[i * 2 + 1] / 100 - 180; landLL.push([lat, lon]); toV(lat, lon, 1.003).toArray(landPos, i * 3); }
  const landGeo = new THREE.BufferGeometry(); landGeo.setAttribute('position', new THREE.BufferAttribute(landPos, 3));
  const landMat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 9 }, uPR: { value: PR }, uCol: { value: C.dim }, uScan: { value: -2 }, uScanW: { value: 14 }, uScanCol: { value: C.route } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float uSize; uniform float uPR; varying float vFace; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vFace = dot(normalize(normalMatrix*position), normalize(-mv.xyz)); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    // uScan: faixa de varredura que desce o globo enquanto a rede é medida (latitude normalizada 1 → -1)
    fragmentShader: `uniform vec3 uCol; uniform vec3 uScanCol; uniform float uScan; uniform float uScanW; varying float vFace; varying vec3 vP; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
      float a = smoothstep(.5,.2,d)*smoothstep(-.05,.45,vFace);
      float s = uScan > -1.5 ? exp(-pow((normalize(vP).y - uScan)*uScanW, 2.)) : 0.;
      gl_FragColor = vec4(mix(uCol*(.55+.45*vFace), uScanCol, s*.45), a*(.9 + s*.2)); }`
  });
  globe.add(new THREE.Points(landGeo, landMat));

  // rede ExitLag ao fundo: pontos piscando, discretos
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const servers = []; for (let i = 0; i < 240; i++) servers.push(landLL[Math.floor(rnd() * nLand)]);
  const svPos = new Float32Array(servers.length * 3), svSeed = new Float32Array(servers.length);
  servers.forEach((s, i) => { toV(s[0], s[1], 1.005).toArray(svPos, i * 3); svSeed[i] = rnd(); });
  const svGeo = new THREE.BufferGeometry();
  svGeo.setAttribute('position', new THREE.BufferAttribute(svPos, 3)); svGeo.setAttribute('aSeed', new THREE.BufferAttribute(svSeed, 1));
  const svMat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 20 }, uPR: { value: PR }, uTime: { value: 0 }, uCol: { value: C.route }, uOp: { value: 0.35 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uSize; uniform float uPR; attribute float aSeed; varying float vS; varying float vFace; void main(){ vS=aSeed; vec4 mv = modelViewMatrix*vec4(position,1.); vFace = dot(normalize(normalMatrix*position), normalize(-mv.xyz)); gl_PointSize = uSize*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCol; uniform float uOp; varying float vS; varying float vFace; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float tw = .5+.5*sin(uTime*1.6+vS*40.); float a = (smoothstep(.5,.0,d)*.35+smoothstep(.12,.0,d))*tw*uOp*smoothstep(0.,.35,vFace); gl_FragColor = vec4(uCol, a); }`
  });
  globe.add(new THREE.Points(svGeo, svMat));

  /* ---------- Rotas (shader da home: desenho progressivo, pulso, falha piscando em vermelho) ---------- */
  const routeVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
  const routeFS = `uniform vec3 uCol; uniform vec3 uBad; uniform float uDraw; uniform float uOp; uniform float uFail; uniform float uFailAt; uniform float uTime; uniform float uSpeed; uniform float uHalo; uniform float uGain;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float x = vUv.x; if(x>uDraw || uOp<=0.) discard;
    float edge = abs(dot(vN, vV));
    float shape = uHalo > .5 ? pow(edge, 3.)*.35 : .6 + .4*edge;
    float head = smoothstep(uDraw-.1, uDraw, x)*(1.-step(.999,uDraw));
    float ends = smoothstep(0., .03, x)*smoothstep(1., .97, x);
    float pulse = pow(1.-fract(uTime*uSpeed - x*2.), 8.);
    // falha localizada: só o trecho em volta do salto com perda pisca em vermelho, com degradê nas bordas
    float zone = uFailAt < 0. ? 1. : exp(-pow((x - uFailAt)*9., 2.));
    float f = uFail*zone;
    float flick = mix(1., .35+.65*step(.45, fract(sin(floor(uTime*12.)*91.7)*43758.5)), f);
    vec3 col = mix(uCol, uBad, f);
    float a = uOp*shape*(.55 + .7*head + .6*pulse)*flick*mix(1., ends, .7)*uGain;
    gl_FragColor = vec4(col*(1.+.8*pulse+.6*head), a); }`;
  const routeGroup = new THREE.Group(); globe.add(routeGroup);

  let routeR = 1;
  function makeRoute(pts, color, radius, speed, gain = 1) {
    radius *= routeR * 0.5;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const uniforms = { uCol: { value: color }, uBad: { value: C.bad }, uDraw: { value: 0 }, uOp: { value: 0 }, uFail: { value: 0 }, uFailAt: { value: -1 }, uTime: { value: 0 }, uSpeed: { value: speed }, uGain: { value: gain } };
    for (const halo of [0, 1]) {
      const mat = new THREE.ShaderMaterial({ uniforms: { ...uniforms, uHalo: { value: halo } }, vertexShader: routeVS, fragmentShader: routeFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 300, halo ? radius * 4.5 : radius, 10, false), mat));
    }
    return { curve, u: uniforms };
  }
  // salto entre dois nós: sai e pousa tangente à superfície, então saltos seguidos se emendam sem quina
  function arcHop(p, q, h, n) {
    const ws = Math.max(p.angleTo(q), 1e-4), ss = Math.sin(ws), out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, s = Math.sin(Math.PI * u), e = s * s * (3 - 2 * s);
      out.push(p.clone().multiplyScalar(Math.sin((1 - u) * ws) / ss).add(q.clone().multiplyScalar(Math.sin(u * ws) / ss)).normalize().multiplyScalar(1.006 + (0.02 + ws * 0.25) * h * 1.1 * e)); }
    return out;
  }
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
  // corrente de saltos por uma lista de pontos; devolve a posição (0–1) de cada nó ao longo da linha
  function chain(stops, lift) {
    const pts = [], ends = [];
    for (let k = 0; k < stops.length - 1; k++) { const sg = arcHop(stops[k], stops[k + 1], k === 0 || k === stops.length - 2 ? 0.2 : lift, 60); pts.push(...(k ? sg.slice(1) : sg)); ends.push(pts.length - 1); }
    soften(pts);
    let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); cum.push(L); }
    return { pts, t: [0, ...ends.map(e => cum[e] / L)], v: [pts[0], ...ends.map(e => pts[e])].map(p => p.clone()) };
  }
  function clearRoutes() { routeGroup.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); routeGroup.clear(); }

  // pacotes correndo nas rotas
  const MAXR = 4, PK = 9, packetsN = PK * (1 + MAXR);
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

  // nós: você (claro), servidor (verde), saltos da operadora (laranja), bridges e finals ExitLag (verde)
  const NODES = 24, ndPos = new Float32Array(NODES * 3), ndCol = new Float32Array(NODES * 3), ndA = new Float32Array(NODES), ndS = new Float32Array(NODES);
  const ndGeo = new THREE.BufferGeometry();
  ndGeo.setAttribute('position', new THREE.BufferAttribute(ndPos, 3).setUsage(THREE.DynamicDrawUsage));
  ndGeo.setAttribute('aCol', new THREE.BufferAttribute(ndCol, 3).setUsage(THREE.DynamicDrawUsage));
  ndGeo.setAttribute('aA', new THREE.BufferAttribute(ndA, 1).setUsage(THREE.DynamicDrawUsage));
  ndGeo.setAttribute('aS', new THREE.BufferAttribute(ndS, 1).setUsage(THREE.DynamicDrawUsage));
  const ndMat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 100 }, uPR: { value: PR }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uSize; uniform float uPR; attribute vec3 aCol; attribute float aA; attribute float aS; varying vec3 vC; varying float vA; varying float vS; void main(){ vC=aCol; vA=aA; vS=aS; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uSize*aS*uPR/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; varying vec3 vC; varying float vA; varying float vS; void main(){ float d = length(gl_PointCoord-.5); if(vA<=0.) discard; float r = fract(uTime*.6); float ring = vS > .8 ? smoothstep(.03,.0,abs(d-r*.5))*(1.-r) : 0.; float core = smoothstep(.12,.06,d); gl_FragColor = vec4(vC, (ring*.8+core)*vA); }`
  });
  const nodes = new THREE.Points(ndGeo, ndMat); nodes.frustumCulled = false; globe.add(nodes);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.2);
  composer.addPass(bloom);

  /* ---------- Estado ---------- */
  const vO = toV(origin[0], origin[1]);
  const cur = { yaw: 0, pitch: 0, dist: 7.5 }, want = { yaw: 0, pitch: 0, dist: 6.45 };
  let mode = 'idle', time = 0, last = performance.now(), vw = 1, vh = 1, offX = 0, offY = 0;
  // deslocamento do globo na tela (px): a câmera desliza junto com a troca de cena, sem redimensionar o canvas
  const shift = { x: 0, y: 0, tx: 0, ty: 0 };
  let R = null; // rotas montadas: { isp, xl[], ispStops, xlNodes, show: {isp, xl}, fail }
  const show = { isp: 0, xl: 0 }, target = { isp: 0, xl: 0 };
  let scanOn = false, scanY = 1;
  const [oLat, oLon] = origin;
  const centerOn = (lat, lon) => { want.yaw = (-lon - 90) * D; want.pitch = clamp(lat, -55, 55) * D; };
  centerOn(oLat, oLon); cur.yaw = want.yaw + 0.6; cur.pitch = want.pitch;

  function resize() {
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    renderer.setSize(vw, vh, false); composer.setSize(vw, vh); composer.setPixelRatio(PR); bloom.resolution.set(vw / 2, vh / 2);
    camera.aspect = vw / vh; camera.setViewOffset(vw, vh, offX, offY, vw, vh); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);

  /* ---------- API ---------- */
  function idle(dist = 6.45) { mode = 'idle'; target.isp = target.xl = 0; want.dist = dist; centerOn(oLat, oLon); }
  function setShift(x, y = 0, now = false) { shift.tx = x; shift.ty = y; if (now) { shift.x = x; shift.y = y; } }

  // ispVia: cidades pelas quais a operadora passa (desvio); xlVia: [bridges..., final] por rota ExitLag
  function setRoute({ server, ispVia, xl }) {
    clearRoutes();
    let vS = toV(server[0], server[1]);
    if (vO.angleTo(vS) < 0.03) vS = toV(server[0] + 1.6, server[1] + 1.8); // mesma cidade: afasta o ponto só no desenho
    const all = [vO, vS, ...ispVia.map(c => toV(c[0], c[1]))];
    // enquadra o trajeto todo (inclui o desvio da operadora)
    const mid = all.reduce((a, v) => a.add(v), new THREE.Vector3()).normalize();
    const [mLat, mLon] = toLL(mid); centerOn(mLat, mLon);
    const spread = Math.max(...all.map(v => v.angleTo(mid)));
    want.dist = clamp(1.4 + spread * 5.2, 2.9, 6.45);
    routeR = Math.max((want.dist - 1) / 2, 0.14);
    const ispStops = [vO, ...ispVia.map(c => toV(c[0], c[1])), vS];
    const ic = chain(ispStops, 0.25);
    const isp = makeRoute(ic.pts, C.isp, 0.0034, 0.32);
    const xlr = xl.map((via, k) => { const c = chain([vO, ...via.map(p => toV(p[0], p[1])), vS], 0.5 + k * 0.12); return { ...makeRoute(c.pts, C.route, 0.003, 0.6 + k * 0.05, k ? 0.75 : 1), t: c.t, v: c.v }; });
    R = { isp: { ...isp, t: ic.t, v: ic.v }, xl: xlr, vS };
    show.isp = show.xl = 0; target.isp = target.xl = 0;
    mode = 'route';
    return R;
  }
  const showIsp = on => { target.isp = on ? 1 : 0; };
  const showXl = on => { target.xl = on ? 1 : 0; };
  // perda num salto: k é o índice do salto na rota da operadora
  function ispFail(level, hopIdx = -1) { if (!R) return; R.isp.u.uFail.value = level; R.isp.u.uFailAt.value = hopIdx < 0 ? -1 : R.isp.t[hopIdx]; }
  const dimIsp = k => { if (R) R.isp.u.uGain.value = k; };
  function scan(on) { scanOn = on; scanY = Math.sin(want.pitch) + 0.25; }
  // posição na tela (px do canvas) de um ponto do globo, e se está do lado visível
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function screenOf(v) {
    tmp.copy(v).applyMatrix4(globe.matrixWorld);
    camDir.copy(camera.position).sub(tmp).normalize();
    const facing = tmp.clone().normalize().dot(camDir) > 0.08;
    tmp.project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * vw, y: (-tmp.y * 0.5 + 0.5) * vh, visible: facing };
  }

  /* ---------- Quadro ---------- */
  function setNode(i, v, col, a, s) { v.clone().multiplyScalar(1.008).toArray(ndPos, i * 3); col.toArray(ndCol, i * 3); ndA[i] = a; ndS[i] = s; }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; time += dt;
    const k = 1 - Math.exp(-dt * 2.4);
    if (mode === 'idle' && !reduce) want.yaw -= dt * 0.035;
    cur.yaw += (want.yaw - cur.yaw) * k; cur.pitch += (want.pitch - cur.pitch) * k; cur.dist += (want.dist - cur.dist) * k;
    globe.rotation.y = cur.yaw; tilt.rotation.x = cur.pitch;
    const ks = 1 - Math.exp(-dt * 3);
    shift.x += (shift.tx - shift.x) * ks; shift.y += (shift.ty - shift.y) * ks;
    if (Math.abs(-shift.x - offX) + Math.abs(-shift.y - offY) > 0.05) { offX = -shift.x; offY = -shift.y; camera.setViewOffset(vw, vh, offX, offY, vw, vh); camera.updateProjectionMatrix(); }
    camera.position.set(0, 0, cur.dist); camera.lookAt(0, 0, 0);
    stars.material.uniforms.uTime.value = time; svMat.uniforms.uTime.value = time; ndMat.uniforms.uTime.value = time;
    landMat.uniforms.uSize.value = 9 * clamp((cur.dist - 1) / 3, 0.35, 1) * 1.1;
    // a faixa fica com a mesma largura na tela, perto ou longe
    if (scanOn) { const zk = clamp((cur.dist - 1) / 5.45, 0.15, 1); scanY -= dt * 0.35 * zk; if (scanY < -1.2) scanY = 1.2; landMat.uniforms.uScan.value = scanY; landMat.uniforms.uScanW.value = 14 / zk; } else landMat.uniforms.uScan.value = -2;

    ndA.fill(0);
    setNode(0, vO, C.fog, 1, 1);
    if (R) {
      for (const key of ['isp', 'xl']) { const sp = reduce ? 1 : 0.55; show[key] += clamp(target[key] - show[key], -dt * sp, dt * sp); }
      const di = ease(clamp(show.isp)), dx = ease(clamp(show.xl));
      R.isp.u.uDraw.value = di; R.isp.u.uOp.value = di > 0 ? 1 : 0; R.isp.u.uTime.value = time;
      R.xl.forEach((r, i) => { const d = ease(clamp(show.xl * 1.25 - i * 0.12)); r.u.uDraw.value = d; r.u.uOp.value = d > 0 ? 1 : 0; r.u.uTime.value = time; });
      setNode(1, R.vS, C.route, Math.max(di, dx) >= 0.99 ? 1 : 0.35, 1);
      let n = 2;
      R.isp.v.slice(1, -1).forEach((v, i) => { if (n < NODES) setNode(n++, v, C.isp, di >= R.isp.t[i + 1] ? 0.9 * R.isp.u.uGain.value : 0, 0.5); });
      R.xl.forEach((r, ri) => r.v.slice(1, -1).forEach((v, i) => { if (n < NODES) setNode(n++, v, C.route, clamp(show.xl * 1.25 - ri * 0.12) >= r.t[i + 1] ? 0.85 : 0, 0.45); }));
      // pacotes: um feixe por rota visível
      const lines = [[R.isp, di, C.isp, 0.18]].concat(R.xl.map((r, i) => [r, ease(clamp(show.xl * 1.25 - i * 0.12)), C.route, 0.26 + i * 0.02]));
      lines.forEach(([r, d, col, sp], li) => {
        for (let j = 0; j < PK; j++) {
          const idx = li * PK + j, u = (time * sp + j / PK) % 1;
          if (d < 0.999 || li > MAXR) { pkA[idx] = 0; continue; }
          r.curve.getPointAt(u).toArray(pkPos, idx * 3);
          let a = Math.sin(Math.PI * u) * 0.9 * (li === 0 ? R.isp.u.uGain.value : 1);
          // perda: na rota da operadora, alguns pacotes somem depois do salto com problema
          if (li === 0 && R.isp.u.uFail.value > 0.2 && R.isp.u.uFailAt.value > 0 && u > R.isp.u.uFailAt.value && j % 3 === 0) a = 0;
          const bad = li === 0 && R.isp.u.uFail.value > 0.2 && Math.abs(u - R.isp.u.uFailAt.value) < 0.06;
          (bad ? C.bad : col).toArray(pkCol, idx * 3); pkA[idx] = a;
        }
      });
      pkGeo.attributes.position.needsUpdate = pkGeo.attributes.aCol.needsUpdate = pkGeo.attributes.aA.needsUpdate = true;
    } else pkA.fill(0), pkGeo.attributes.aA.needsUpdate = true;
    ndGeo.attributes.position.needsUpdate = ndGeo.attributes.aCol.needsUpdate = ndGeo.attributes.aA.needsUpdate = ndGeo.attributes.aS.needsUpdate = true;
    // só renderiza com o canvas visível
    if (canvas.offsetParent !== null && vw > 1) composer.render();
    if (onFrame) onFrame();
    requestAnimationFrame(frame);
  }
  let onFrame = null;
  resize(); requestAnimationFrame(frame);
  return { idle, setShift, setRoute, showIsp, showXl, ispFail, dimIsp, scan, screenOf, resize, set onFrame(f) { onFrame = f; }, get route() { return R; }, vO };
}
