// Comportamentos pequenos do site. Vai embutido em cada página (menos de 2 KB).
document.documentElement.classList.add('js')
if (/[?&]revisao\b/.test(location.search)) document.documentElement.classList.add('revisao')

// cabeçalho ganha borda ao rolar
const topo = document.querySelector('.topo')
const onScroll = () => topo.classList.toggle('scrolled', scrollY > 8)
addEventListener('scroll', onScroll, { passive: true }); onScroll()

// menu do celular
const btn = document.querySelector('.menu-btn'), panel = document.getElementById('menu')
btn?.addEventListener('click', () => {
 const open = btn.getAttribute('aria-expanded') !== 'true'
 btn.setAttribute('aria-expanded', open); panel.hidden = !open
 if (open) panel.querySelector('a')?.focus()
})
addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; btn.setAttribute('aria-expanded', false); btn.focus() } })

// botão fixo de WhatsApp: no celular, aparece sempre que o botão principal do topo não está à vista
const bar = document.querySelector('.cta-bar'), heroCta = document.querySelector('[data-hero-cta]') || document.querySelector('main .btn')
if (bar && heroCta) new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting)).observe(heroCta)

// seções entram com suavidade (o conteúdo já está visível sem JS)
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -10% 0px' })
document.querySelectorAll("main > section:not(:first-of-type)").forEach(s => { if (s.getBoundingClientRect().top > innerHeight) { s.classList.add('reveal'); io.observe(s) } })

// copiar número (página Contato)
const cf = document.getElementById('copiar-fone')
cf?.addEventListener('click', () => {
 const pick = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById('fone')); getSelection().removeAllRanges(); getSelection().addRange(r); cf.textContent = 'Número selecionado' }
 navigator.clipboard ? navigator.clipboard.writeText('27999557017').then(() => { cf.textContent = 'Número copiado' }, pick) : pick()
})

// seda em WebGPU (ou WebGL2): carrega depois que a página está pronta, e só quando faz sentido
const canvas = document.querySelector('.silk canvas')
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData
// enxuto: aparelhos com pouca memória ficam com o fundo estático
const fraco = navigator.deviceMemory && navigator.deviceMemory < 3
if (canvas && !calm && !fraco) {
 const go = () => import('/assets/js/silk.js').then(m => m.start(canvas)).catch(() => {})
 const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 800))
 document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true })
}
