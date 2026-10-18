// Monta o site estático em public/ a partir de content/ e src/. Sem dependências: `node build.mjs`.
import { readFileSync as read, writeFileSync as write, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs'

// domínio de produção (decidido em outubro de 2026)
const DOMINIO = process.env.DOMINIO || 'https://anacarolinaevaristo.com.br'
const OUT = 'public'
const FONTS = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,500&family=Questrial&display=swap'
const CRP = 'CRP 16/5549'
const NOME = 'Ana Carolina Evaristo'

const PAGES = [
 { key: 'inicio', path: '/', nome: 'Início', title: `Psicóloga em Vitória/ES e online · ${NOME}, ${CRP}`, desc: 'Psicoterapia com TCC para jovens e adultos: ansiedade, depressão, emoções e relacionamentos. Presencial em Santa Lúcia, Vitória, e online. Converse pelo WhatsApp.' },
 { key: 'sobre', path: '/sobre/', nome: 'Sobre', title: `Sobre ${NOME} · Psicóloga em Vitória/ES, ${CRP}`, desc: 'Psicóloga clínica desde 2016, com Terapia Cognitivo-Comportamental, pós-graduação em Psicopatologia e formação em Neuropsicologia.' },
 { key: 'como-funciona', path: '/como-funciona/', nome: 'Como funciona', title: `Como funciona a terapia · ${NOME}, psicóloga`, desc: 'Etapas da terapia, atendimento online e presencial, sessões de 50 minutos, pagamento e reembolso pelo plano de saúde.' },
 { key: 'ansiedade', path: '/ansiedade/', nome: 'Ansiedade', grupo: true, title: `Psicóloga para ansiedade em Vitória/ES e online · ${NOME}, ${CRP}`, desc: 'Terapia Cognitivo-Comportamental para ansiedade e crises, presencial em Vitória/ES e online para todo o Brasil. Entenda como funciona e converse pelo WhatsApp.' },
 { key: 'depressao', path: '/depressao/', nome: 'Depressão', grupo: true, title: `Psicóloga para depressão em Vitória/ES e online · ${NOME}, ${CRP}`, desc: 'Terapia Cognitivo-Comportamental para depressão, presencial em Vitória/ES e online para todo o Brasil. Entenda como funciona e converse pelo WhatsApp.' },
 { key: 'regulacao-emocional', path: '/regulacao-emocional/', nome: 'Regulação emocional', grupo: true, title: `Terapia para regulação emocional em Vitória/ES e online · ${NOME}, ${CRP}`, desc: 'Aprenda a lidar com emoções intensas com a Terapia Cognitivo-Comportamental, presencial em Vitória/ES e online para todo o Brasil. Converse pelo WhatsApp.' },
 { key: 'relacionamentos', path: '/relacionamentos/', nome: 'Relacionamentos', grupo: true, title: `Terapia para relacionamentos em Vitória/ES e online · ${NOME}, ${CRP}`, desc: 'Entenda seus padrões nos relacionamentos com a Terapia Cognitivo-Comportamental, presencial em Vitória/ES e online para todo o Brasil. Converse pelo WhatsApp.' },
 { key: 'adolescentes', path: '/adolescentes/', nome: 'Adolescentes', grupo: true, title: `Psicóloga para adolescentes em Vitória/ES · ${NOME}, ${CRP}`, desc: 'Terapia para adolescentes, com orientação aos pais: como funciona, o sigilo e a participação da família. Presencial e online.' },
 { key: 'contato', path: '/contato/', nome: 'Contato', title: `Contato e agendamento · ${NOME}, psicóloga em Vitória/ES`, desc: 'Agende pelo WhatsApp (27) 99955-7017. Consultório na Rua Misael Pedreira da Silva, 70, Santa Lúcia, Vitória. Atendimento online.' },
 { key: 'privacidade', path: '/privacidade/', nome: 'Privacidade', title: `Política de privacidade · ${NOME}`, desc: 'Como este site e o atendimento tratam os seus dados: sem cookies de rastreamento, sigilo profissional e LGPD.' },
 { key: '404', path: '/404.html', nome: 'Página não encontrada', title: `Página não encontrada · ${NOME}`, desc: 'Esta página não existe.', noindex: true },
]

const wa = nome => 'https://wa.me/5527999557017?text=' + encodeURIComponent(`Olá, Ana Carolina! Vim pelo site, página ${nome}.`)
const WA_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>'
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// minificação leve, suficiente para arquivos pequenos e sem dependências
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim()
const minJs = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\n\s+/g, '\n').trim()

const CSS = minCss(read('src/site.css', 'utf8'))
const JS = minJs(read('src/main.js', 'utf8'))

const NAV = [['/', 'Início'], ['/#ajudar', 'Como posso ajudar'], ['/sobre/', 'Sobre'], ['/como-funciona/', 'Como funciona'], ['/contato/', 'Contato']]
const DEMANDAS = PAGES.filter(p => p.grupo)

const ldNegocio = {
 '@context': 'https://schema.org', '@type': 'ProfessionalService',
 name: `${NOME} · Psicóloga`, url: DOMINIO + '/', image: DOMINIO + '/og.png', telephone: '+55-27-99955-7017',
 address: { '@type': 'PostalAddress', streetAddress: 'Rua Misael Pedreira da Silva, 70', addressLocality: 'Vitória', addressRegion: 'ES', postalCode: '29056-920', addressCountry: 'BR' },
 hasMap: 'https://maps.app.goo.gl/8EddKYcoQ6pqX3wx6', areaServed: ['Vitória', 'Brasil'],
 sameAs: ['https://www.instagram.com/acarol.psi/', 'https://www.facebook.com/acarolinaevaristo/'],
 founder: { '@type': 'Person', name: 'Ana Carolina Evaristo Silva Murrer', jobTitle: 'Psicóloga', identifier: CRP },
}

function layout(p, body) {
 const url = DOMINIO + (p.path === '/404.html' ? '/' : p.path)
 const link = wa(p.nome)
 const cur = h => (h === p.path ? ' aria-current="page"' : '')
 const crumbs = p.key === 'inicio' || p.key === '404' ? '' : `<nav class="crumb" aria-label="Você está em"><ol><li><a href="/">Início</a></li>${p.grupo ? '<li><a href="/#ajudar">Como posso ajudar</a></li>' : ''}<li aria-current="page">${p.nome}</li></ol></nav>`
 const ld = [ldNegocio]
 if (p.key !== 'inicio' && p.key !== '404') ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: DOMINIO + '/' }, { '@type': 'ListItem', position: 2, name: p.nome, item: url }] })
 return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
${p.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#FCF7F3">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${NOME} · Psicóloga">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${DOMINIO}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONTS}"></noscript>
${p.key === 'inicio' ? '<link rel="preload" as="image" href="/assets/img/ana-inicio-360.webp" imagesrcset="/assets/img/ana-inicio-360.webp 360w, /assets/img/ana-inicio-720.webp 720w" imagesizes="(max-width: 820px) 88px, 340px" fetchpriority="high">' : ''}
<style>${CSS}</style>
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="topo">
 <a class="logo" href="/" aria-label="${NOME}, psicóloga: página inicial"><b>AC</b><i>PSICOLOGIA</i></a>
 <nav aria-label="Menu principal">${NAV.map(([h, t]) => `<a href="${h}"${cur(h)}>${t}</a>`).join('')}</nav>
 <a class="btn small btn-agendar" href="${link}" target="_blank" rel="noopener">${WA_ICON}Agendar conversa</a>
 <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu</button>
</header>
<nav id="menu" class="menu-panel" aria-label="Menu" hidden>
 ${NAV.map(([h, t]) => `<a href="${h}"${cur(h)}>${t}</a>`).join('')}
 <p class="group">Como posso ajudar</p>
 ${DEMANDAS.map(d => `<a href="${d.path}"${cur(d.path)}>${d.nome}</a>`).join('')}
</nav>
<main id="conteudo">
${crumbs}
${body}
</main>
<footer class="rodape">
 <p class="crise"><b>Em crise ou pensando em se machucar?</b> Este consultório não faz atendimento de emergência. Ligue para o CVV no 188 (24 horas, gratuito) ou para o SAMU no 192.</p>
 <div class="cols">
  <div>
   <a class="logo" href="/" aria-label="Página inicial"><b>AC</b><i>PSICOLOGIA</i></a>
   <p>${NOME} · Psicóloga · ${CRP}<br><small>Nome de registro: Ana Carolina Evaristo Silva Murrer</small></p>
   <p>Rua Misael Pedreira da Silva, 70 · Santa Lúcia, Vitória/ES · CEP 29056-920<br>Online no Brasil e no exterior</p>
  </div>
  <div>
   <h2>Como posso ajudar</h2>
   <ul>${DEMANDAS.map(d => `<li><a href="${d.path}">${d.nome}</a></li>`).join('')}</ul>
  </div>
  <div>
   <h2>Contato</h2>
   <ul>
    <li><a href="${link}" target="_blank" rel="noopener">WhatsApp (27) 99955-7017</a></li>
    <li><a href="https://www.instagram.com/acarol.psi/" target="_blank" rel="noopener">Instagram @acarol.psi</a></li>
    <li><a href="https://www.facebook.com/acarolinaevaristo/" target="_blank" rel="noopener">Facebook</a></li>
    <li><a href="https://maps.app.goo.gl/8EddKYcoQ6pqX3wx6" target="_blank" rel="noopener">Como chegar</a></li>
    <li><a href="/privacidade/">Política de privacidade</a></li>
   </ul>
  </div>
 </div>
</footer>
<a class="btn cta-bar" href="${link}" target="_blank" rel="noopener">${WA_ICON}Conversar pelo WhatsApp</a>
<script>${JS}</script>
</body>
</html>
`
}

const BREATH = '<div class="breath" aria-hidden="true"><span class="orb"></span><span class="in">inspire</span><span class="out">solte o ar</span></div>'

function prepare(p, html) {
 html = html.replaceAll('{{WA_ICON}}', WA_ICON)
 // a seda em WebGPU entra por trás do primeiro bloco da página
 html = html.replace(/<section class="(hero|page-hero)"([^>]*)>/, '<section class="$1"$2><div class="silk" aria-hidden="true"><canvas></canvas></div>')
 // guia de respiração onde o exercício pede respiração lenta
 if (['ansiedade', 'regulacao-emocional'].includes(p.key)) html = html.replace(/(<div class="calm">\s*<div>[\s\S]*?)(<\/div>)/, `$1${BREATH}$2`)
 // botões de WhatsApp do conteúdo ganham o ícone
 html = html.replace(/(<a class="btn"[^>]*href="https:\/\/wa\.me[^"]*"[^>]*>)(?!<svg)/g, `$1${WA_ICON}`)
 return html
}

rmSync(OUT, { recursive: true, force: true })
for (const p of PAGES) {
 const body = prepare(p, read(`content/${p.key}.html`, 'utf8'))
 const file = p.path.endsWith('.html') ? OUT + p.path : OUT + p.path + 'index.html'
 mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true })
 write(file, layout(p, body))
}

mkdirSync(`${OUT}/assets/js`, { recursive: true })
mkdirSync(`${OUT}/assets/img`, { recursive: true })
write(`${OUT}/assets/js/silk.js`, minJs(read('src/silk.js', 'utf8')))
for (const f of readdirSync('src/img')) copyFileSync(`src/img/${f}`, `${OUT}/assets/img/${f}`)
for (const f of ['favicon.svg', 'apple-touch-icon.png', 'og.png', '.htaccess']) copyFileSync(`src/${f}`, `${OUT}/${f}`)

const hoje = new Date().toISOString().slice(0, 10)
write(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.filter(p => !p.noindex).map(p => ` <url><loc>${DOMINIO}${p.path}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}\n</urlset>\n`)
write(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${DOMINIO}/sitemap.xml\n`)
// o .htaccess só serve para a Hostinger: não vai para o Worker da Cloudflare
write(`${OUT}/.assetsignore`, '.htaccess\n.assetsignore\n')
// cabeçalhos da Cloudflare (Worker com assets): imagens e scripts em cache por uma semana
write(`${OUT}/_headers`, `/assets/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`)

console.log(`ok: ${PAGES.length} páginas em ${OUT}/`)
