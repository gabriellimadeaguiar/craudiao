# 🩺 A Cirurgia do Breno

Jogo de browser (feito na zoeira entre amigos). Você é o médico responsável por
operar a bunda do **Breno**, que apareceu no hospital com um **buraco a mais**.
Sua missão: fechar o buraco dando os pontos — com **mão firme** e boa mira.

## Como jogar

1. **Intro:** o Breno chega ao hospital **remando de canoa**, desesperado.
2. **Cirurgia:** dê os pontos clicando nos **pontos de ancoragem**, sempre
   **alternando os lados** da fenda, na ordem (o próximo ponto certo pisca em amarelo).
3. A mira **treme** (mão de cirurgião sob pressão) — mire com calma.
4. Cada erro **machuca o Breno** e derruba a barra de "aguento". Se ela zerar,
   a operação fracassa. Feche todos os pontos para vencer.
5. Ganhe mais placar acertando com **precisão**, fazendo **combos** e sendo **rápido**.

Funciona no **PC (mouse)** e no **celular (toque)**.

🎵 A **música** (`assets/musica-cirurgia.mp3`) começa exatamente quando a cirurgia
inicia e toca em loop até o fim da operação.

## Rodar localmente

Abra o `index.html` com duplo-clique no navegador. Para carregar a foto do Breno
sem problema de CORS, prefira servir localmente:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## A foto do Breno

Coloque a foto em `assets/breno.png` (veja `assets/README.md`). Sem o arquivo, o
jogo usa um **rosto cartoon de fallback** e continua funcionando normalmente.

## Publicar no GitHub Pages

Já existe um workflow em `.github/workflows/deploy-pages.yml` que publica o jogo
a cada push. Para ativar (só uma vez):

1. Vá em **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Faça um push (ou rode o workflow em **Actions → Deploy GitHub Pages → Run workflow**).

Link do jogo depois de publicado:

```
https://gabriellimadeaguiar.github.io/craudiao/
```
