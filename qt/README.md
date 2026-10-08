# ExitLag Analyzer (Qt Quick + Qt Quick 3D)

App de desktop para Windows com todo o fluxo do protótipo:

**Log in / check-up › análise do PC › análise da conexão › resultados e plano › criar conta › network map › varredura de jogos › home com onboarding**

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
| Network map | A mesma medição até um ponto em cada continente |
| Jogos instalados | Steam (`libraryfolders.vdf` e `appmanifest`), Epic Games (manifestos `.item`), Riot Client, Battle.net e pastas padrão |
| Origem no globo | Fuso horário do sistema |

## O que é estimado ou ainda não está conectado

- **"Through ExitLag":** é uma estimativa, marcada assim na tela. Ela parte da sua rota medida e da distância até o servidor. Medir de verdade exige a rede da ExitLag.
- **Login e criação de conta:** qualquer entrada passa, porque o app não está ligado ao sistema de contas.
- **Preços dos planos e oferta da loja parceira:** são exemplos.
- **Optimize na home:** desenha as rotas e mostra a estimativa, mas não muda o roteamento.

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
