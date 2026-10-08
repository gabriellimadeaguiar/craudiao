# ExitLag Analyzer (Qt Quick + Qt Quick 3D)

App de desktop para Windows com todo o fluxo do protótipo:

**Log in / check-up › análise do PC › análise da conexão › resultados e plano › criar conta › network map › home com onboarding**

No canto inferior esquerdo há uma orelha discreta com os controles do protótipo: acelerar as esperas (1×, 4×, 10×), pular a etapa atual ou ir direto para qualquer tela (inclusive a varredura de jogos, que roda em segundo plano).

## Rodar no Windows

Cada execução de *Windows build* no GitHub Actions (aba *Actions* › execução mais recente › *Artifacts*) gera dois arquivos:

- **ExitLagAnalyzer-Setup**: um único `ExitLagAnalyzer-Setup.exe` (Inno Setup). Abra e siga o assistente. Ele instala para o usuário atual, sem pedir administrador, cria o atalho no Menu Iniciar (e na área de trabalho, se marcado) e aparece em *Aplicativos instalados* para desinstalar. É o arquivo para distribuir.
- **ExitLagAnalyzer-windows**: a pasta pronta, para rodar sem instalar. Extraia a pasta inteira e abra `ExitLagAnalyzer.exe`.

O runtime do Visual C++ vai junto do app, então não é preciso instalar o vc_redist. O instalador é definido em `installer/ExitLagAnalyzer.iss`, e o ícone é gerado por `tools/make_appicon.py`.

O Windows SmartScreen pode avisar na primeira vez, porque o instalador e o executável não são assinados (para tirar o aviso, assine com um certificado de assinatura de código). Para abrir, clique em *Mais informações* › *Executar assim mesmo*.

## O que é medido de verdade

| Parte | Como |
|---|---|
| Hardware | PowerShell + WMI/CIM: processador, placa de vídeo e memória de vídeo, memória e uso, disco do sistema, monitor (frequência atual e máxima suportada), adaptador de rede e sinal do Wi-Fi, processos, apps de inicialização, plano de energia, Modo de Jogo e servidores DNS |
| DNS | Tempo de resposta do resolvedor do sistema (consultas a nomes inexistentes, sem cache) |
| Ping, jitter, perda e picos | Conexões TCP até um data center na região do servidor do jogo (endpoints públicos da AWS, porta 443), em amostras contínuas. Não exige administrador. |
| Rota salto a salto | Traceroute pela API ICMP do Windows (`IcmpSendEcho`), com perda por salto e nome reverso |
| Network map | A mesma medição, em paralelo, até 27 data centers em 7 regiões do mundo; fica o melhor de cada uma |
| Ping no seletor de servidor | A mesma medição até cada região do jogo ("~" enquanto ainda é a estimativa pela distância) |
| Jogos instalados | Steam (`libraryfolders.vdf` e `appmanifest`), Epic Games (manifestos `.item`), Riot Client, Battle.net e pastas padrão |
| Origem no globo | Cidade pelo IP (ipwho.is, com ipapi.co de reserva); sem resposta, o fuso horário do sistema |

## O que é estimado ou ainda não está conectado

- **"Through ExitLag":** é uma estimativa, marcada assim na tela. Ela parte da sua rota medida e da distância até o servidor. Medir de verdade exige a rede da ExitLag.
- **Login e criação de conta:** qualquer entrada passa, porque o app não está ligado ao sistema de contas.
- **Preços dos planos e oferta da loja parceira:** são exemplos.
- **Optimize na home:** desenha as rotas e mostra a estimativa, mas não muda o roteamento. As rotas separadas (Route 1 a 4), as quedas de uma rota e o registro com horário são simulados a partir da sua rota medida; o painel avisa isso.

## Compilar

Requer Qt 6.4 ou superior (com Qt Quick 3D e Qt Shader Tools) e CMake 3.21 ou superior.

```
cmake -S qt -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

Opções úteis para testar:

- `--scene=intro|analysis|results|netmap|libscan|home`: abre direto numa tela.
- `--shot=arquivo.png --shot-delay=ms`: salva uma captura da janela e fecha.

## Estrutura

- `src/`: C++. Contém as geometrias do globo (`LandGeometry`, `StarGeometry`, `RouteGeometry`), as sondas (`HardwareProbe`, `LatencyProbe`, `TraceRoute`), o `GameScanner` e o `Platform`.
- `qml/`: telas e componentes. `Logic.js` reúne as regras de diagnóstico e `Theme.qml` traz os tokens do Design System.
- `resources/`: fontes (Anek Latin, Ubuntu Sans), capas dos jogos e os pontos de terra do globo.

## Desempenho

O app mede o próprio desempenho: quadros por segundo, pior quadro, CPU (processo e thread da interface), memória e
tempo até o primeiro quadro. Os números aparecem nos controles do protótipo (orelha no canto inferior esquerdo) e,
com `--perf`, uma linha por segundo vai para o console e para `perf.log` na pasta temporária
(`--perf=<arquivo>` escolhe outro lugar; `--quit-after=<ms>` fecha sozinho; `--power=full|low|off` força o modo de
energia). O build do Windows roda esse teste em quatro telas e publica os logs no artefato `perf-logs`.

Economia de energia, para não disputar recursos com o jogo:

| Janela | Animações | Desenho |
|---|---|---|
| Em foco | a cada quadro da tela | contínuo enquanto o globo gira |
| Visível, sem foco | 15 passos por segundo; simulações a 2 Hz | ~15 quadros por segundo |
| Minimizada ou escondida | paradas | nenhum (só o necessário para os números medidos) |

Escolhas que mais pesaram (medidas com renderização por software, que exagera o custo de desenho):

- Pontos da rede no globo numa malha só, com a piscada no shader (antes, 140 esferas com binding por quadro): 1,8×.
- Globo desenhado no mesmo passo do 2D (`View3D.Inline`), sem textura intermediária com MSAA próprio: 1,9×.
- Cantos arredondados pelo próprio Windows 11 (DWM), sem camada na janela inteira: 1,7×.
- Pacotes das rotas e desenho progressivo no shader da rota (antes, esferas com três bindings por quadro), malha
  montada uma vez: 1,4×.
- Rotas e etiquetas em `ListModel`: acrescentar uma não recria as outras.
- Animações infinitas só rodam visíveis e com a janela ativa; valores que perseguem um destino encaixam ao chegar,
  para não manter quadros sendo pedidos à toa.
- Cache em disco dos pipelines gráficos (`pipelines.cache`), para abrir mais rápido a partir da segunda vez.
- Pacote sem o OpenGL por software (`opengl32sw.dll`, ~20 MB) e sem plugins de imagem que o app não usa.

Variáveis `EXL_*` desligam partes do globo para medir o custo de cada uma (`EXL_NONODES`, `EXL_NOLAND`,
`EXL_NOSTARS`, `EXL_NOATMO`, `EXL_NOGLOW`, `EXL_NOAA`, `EXL_OFFSCREEN`, `EXL_WINMSAA0`).
