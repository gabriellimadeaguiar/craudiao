# Site · Ana Carolina Evaristo, psicóloga

Site estático da psicóloga Ana Carolina Evaristo (CRP 16/5549), de Vitória/ES. O objetivo é encher a agenda: cada página leva a uma conversa no WhatsApp, e a mensagem pronta diz de qual página a pessoa veio.

## Como rodar

```sh
node build.mjs                                  # gera public/ (sem dependências)
python3 -m http.server 8080 --directory public  # abre em http://localhost:8080
```

Para ver as pendências marcadas no texto, abra qualquer página com `?revisao`. Exemplo: `http://localhost:8080/adolescentes/?revisao`.

O domínio vem de `DOMINIO` (padrão: `https://acpsicologia.com.br`). Exemplo: `DOMINIO=https://anacarolinaevaristo.com.br node build.mjs`.

## Estrutura

| Pasta ou arquivo | O que tem |
|---|---|
| `content/*.html` | O texto de cada página. É o que se edita para mudar o conteúdo |
| `build.mjs` | Monta as páginas: cabeçalho, rodapé, SEO, JSON-LD, sitemap e robots |
| `src/site.css` | O visual inteiro. Vai embutido em cada página, sem requisição extra |
| `src/main.js` | Menu, botão fixo de WhatsApp, entrada das seções, copiar número, carregador da animação |
| `src/silk.js` | A animação do topo: WebGPU, com reserva em WebGL2 |
| `src/img/` | Fotos em WebP. As duas atuais são provisórias |

## Publicação (Cloudflare Pages)

- Comando de build: `node build.mjs`
- Diretório de saída: `public`
- Diretório raiz: `ac-psicologia`
- O domínio padrão é `https://anacarolinaevaristo.com.br`

Em hospedagem com Apache (cPanel, Hostinger), envie o conteúdo de `public/` para a pasta `public_html`. O `.htaccess` já cuida de HTTPS, do `www` e da página 404.

## Decisões de usabilidade

| Princípio | Como foi aplicado | Referência |
|---|---|---|
| Quem chega por indicação precisa confiar rápido | Na primeira tela: foto, nome, CRP, desde 2016, online/presencial. O botão de WhatsApp aparece logo depois | [Trust in hospital websites](https://muse.jhu.edu/article/221857/pdf), [Credibility and navigation in health UX](https://oldmagazine.uxpa.org/?p=7673) |
| As pessoas escaneiam a página no formato de F | Títulos que começam pela palavra-chave ("Quando a cabeça não desliga", "Talvez você se reconheça"), listas curtas e uma ideia por bloco | [NN/g: F-shaped pattern](https://nngroup.com/articles/f-shaped-pattern-reading-web-content/) |
| Alvos de toque grandes e na zona do polegar | Botões com 48–52 px de altura e, no celular, um botão fixo de WhatsApp no rodapé da tela, que aparece depois que o botão do topo sai de vista | [UXPin: touch targets](https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/), [WCAG 2.5.8](https://www.siteimprove.com/blog/motor-impairments-and-mobile-ui-the-touch-target-problem/) |
| Animação curta e com propósito | Interface em 200–300 ms. Sem parallax, sem sequestro da rolagem, sem nada piscando | [NN/g: animation duration](https://nngroup.com/articles/animation-duration) |
| Leitura confortável | Texto de 18 px, linhas de no máximo cerca de 68 caracteres, contraste AA | |
| Acessibilidade | Link "pular para o conteúdo", foco visível, menu fechável com Esc, breadcrumb, `prefers-reduced-motion` desliga tudo o que se move | |

## A animação: seda que respira

O fundo do topo é uma seda nas cores da marca, que abre e fecha no ritmo de uma respiração lenta: 4 segundos para inspirar e 6 para soltar o ar. As páginas Ansiedade e Regulação emocional têm um guia de respiração no mesmo ritmo, feito só com CSS.

Como ela fica leve:
- **Sem biblioteca.** WebGPU puro (WGSL), com o mesmo shader portado para WebGL2. São 3 KB comprimidos.
- **Carrega por último.** Só depois do evento `load` e em tempo ocioso. O texto e a foto aparecem antes, e o fundo estático em CSS é o que o celular pinta primeiro.
- **Metade da resolução e 30 quadros por segundo.** O desenho é macio, então não se perde nitidez.
- **Para quando ninguém está vendo.** Pausa fora da tela e com a aba escondida.
- **Fica desligada** com `prefers-reduced-motion`, com a economia de dados ligada ou em aparelhos com menos de 3 GB de memória.
- **Reserva automática.** Se a GPU for perdida, recomeça em WebGL2. Se nada disso funcionar, fica o fundo estático.

Referências: [Codrops, WebGPU fluids](https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/), [WebGL gradients em heróis (Stripe e outros)](https://gradients.design/webgl-gradient), [Three.js 2026 e fallback WebGPU→WebGL](https://www.utsubo.com/blog/best-threejs-websites-2026), [awesome-web-shaders](https://github.com/owenob1/awesome-web-shaders), [flow field em WebGPU para uma clínica de psicoterapia](https://discourse.threejs.org/t/a-generative-flow-field-visualization/88795).

## Orçamento de peso (página inicial)

| Item | Comprimido |
|---|---|
| HTML com CSS e JS embutidos | cerca de 10 KB |
| Foto | 9 KB |
| Animação (carregada depois) | 3 KB |
| Fontes (Google Fonts, 2 famílias) | cerca de 60 KB, sem bloquear a página |

Metas: LCP abaixo de 2,5 s, INP abaixo de 200 ms e CLS abaixo de 0,1 no celular.

## Pendências

Veja `PENDENCIAS.md`.
