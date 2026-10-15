// Seda que respira: fundo do topo das páginas, em WebGPU puro (sem biblioteca), com reserva em WebGL2.
// O movimento acompanha um ritmo de respiração lenta: 4 s para inspirar, 6 s para soltar o ar.
// Só roda quando o navegador tem WebGPU, a pessoa não pediu menos movimento e a economia de dados está desligada.
// Sem isso, fica o gradiente estático do CSS, que já é a primeira coisa pintada na tela.

const WGSL = /* wgsl */ `
struct U { res: vec2f, time: f32, breath: f32 };
@group(0) @binding(0) var<uniform> u: U;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  return vec4f(p[i], 0, 1);
}

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1, 0)), s.x), mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), s.x), s.y);
}
fn fbm(p0: vec2f) -> f32 {
  var p = p0; var a = 0.5; var v = 0.0;
  for (var k = 0; k < 4; k++) { v += a * noise(p); p = p * 2.03 + vec2f(1.7, 9.2); a *= 0.5; }
  return v;
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.res;
  var p = (uv - 0.5) * vec2f(u.res.x / u.res.y, 1.0) * 1.6;
  let t = u.time * 0.035;
  let b = u.breath;                       // 0 → 1 → 0, no ritmo da respiração
  let q = vec2f(fbm(p + vec2f(0.0, t)), fbm(p + vec2f(5.2, 1.3) - t));
  let w = 1.4 + 0.5 * b;                  // as dobras abrem ao inspirar
  let f = fbm(p + w * q + vec2f(t * 0.6, 0.0));

  // paleta da marca: blush → sand → tan → thatch, com o marinho só no fundo das dobras
  let blush  = vec3f(0.969, 0.914, 0.878);
  let sand   = vec3f(0.929, 0.886, 0.839);
  let tan    = vec3f(0.757, 0.604, 0.502);
  let thatch = vec3f(0.651, 0.498, 0.471);
  let navy   = vec3f(0.196, 0.263, 0.373);
  var c = mix(blush, sand, smoothstep(0.25, 0.55, f));
  c = mix(c, tan, smoothstep(0.42, 0.74, f) * 0.85);
  c = mix(c, thatch, smoothstep(0.62, 0.9, f) * 0.6);
  c = mix(c, navy, smoothstep(0.82, 1.0, f) * 0.18);

  // brilho de seda que corre pelas dobras
  let s = sin((p.x * 1.2 + p.y * 0.7) * 3.0 + f * 7.0 + t * 4.0);
  c += pow(0.5 + 0.5 * s, 8.0) * (0.06 + 0.05 * b);
  return vec4f(c, 1.0);
}`;

// o mesmo desenho em GLSL, para navegadores sem WebGPU (boa parte dos Android)
const GLSL = `#version 300 es
precision mediump float;
uniform vec4 u; out vec4 o;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),s=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),s.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),s.x),s.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int k=0;k<4;k++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/u.xy; uv.y=1.-uv.y;
 vec2 p=(uv-.5)*vec2(u.x/u.y,1.)*1.6; float t=u.z*.035, b=u.w;
 vec2 q=vec2(fbm(p+vec2(0,t)),fbm(p+vec2(5.2,1.3)-t));
 float f=fbm(p+(1.4+.5*b)*q+vec2(t*.6,0));
 vec3 c=mix(vec3(.969,.914,.878),vec3(.929,.886,.839),smoothstep(.25,.55,f));
 c=mix(c,vec3(.757,.604,.502),smoothstep(.42,.74,f)*.85);
 c=mix(c,vec3(.651,.498,.471),smoothstep(.62,.9,f)*.6);
 c=mix(c,vec3(.196,.263,.373),smoothstep(.82,1.,f)*.18);
 float s=sin((p.x*1.2+p.y*.7)*3.+f*7.+t*4.);
 c+=pow(.5+.5*s,8.)*(.06+.05*b);
 o=vec4(c,1);
}`;

function webgl(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2(gl_VertexID==2?3.:-1.,gl_VertexID==0?-3.:1.);gl_Position=vec4(p,0,1);}'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, GLSL));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const loc = gl.getUniformLocation(prog, 'u');
  return d => { gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform4f(loc, d[0], d[1], d[2], d[3]); gl.drawArrays(gl.TRIANGLES, 0, 3); };
}

const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
function breath(sec) {
  const ph = sec % 10;
  return ph < 4 ? ease(ph / 4) : 1 - ease((ph - 4) / 6);
}

// o navegador descarta a GPU se ninguém segurar o adaptador e o dispositivo
let keep;

async function webgpu(canvas, onLost) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'low-power' });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  if (!ctx) return null;
  keep = { adapter, device };
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });
  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  });
  const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }] });
  device.lost.then(info => info.reason !== 'destroyed' && onLost());
  return d => {
    device.queue.writeBuffer(ubo, 0, d);
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0.97, 0.91, 0.88, 1] }] });
    pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
    device.queue.submit([enc.finish()]);
  };
}

export async function start(canvas, prefer = 'webgpu') {
  let draw = null;
  // GPU perdida (troca de driver, economia de energia): recomeça em WebGL2 num canvas novo
  const onLost = () => { stop(); const c = canvas.cloneNode(); c.classList.remove('on'); canvas.replaceWith(c); start(c, 'webgl'); };
  if (prefer === 'webgpu') draw = await webgpu(canvas, onLost).catch(() => null);
  draw ||= webgl(canvas);
  if (!draw) return false;

  // resolução baixa de propósito: o desenho é macio, e assim o celular trabalha pouco
  const SCALE = 0.5;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * SCALE));
    canvas.height = Math.max(1, Math.round(r.height * SCALE));
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const data = new Float32Array(4);
  const t0 = performance.now() - 3000;
  const FRAME = 1000 / 30;                 // 30 quadros por segundo bastam para um movimento lento
  let visible = true, raf = 0, last = 0, first = true;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    last = now;
    const sec = (now - t0) / 1000;
    data.set([canvas.width, canvas.height, sec, breath(sec)]);
    draw(data);
    if (first) { first = false; canvas.classList.add('on'); }
  }
  const play = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  // pausa fora da tela e com a aba escondida: zero trabalho quando ninguém está vendo
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? play() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
  play();
  return true;
}
