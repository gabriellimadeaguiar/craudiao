## Handoff — Ping for Games | Re-test

**Figma:** https://www.figma.com/design/4wqFMlGYDxQnfW6Wu5QHtg/Ping-for-games-%7C-Spec?node-id=118-2

### Objetivo
Permitir que o usuário refaça o teste de ping do último jogo testado direto do card de resultados, sem precisar selecionar o jogo de novo.

### O que muda
- Novo botão **"Ping again"** (botão secundário com ícone de refresh) no header do card **Last result**, entre a data/hora do último teste e o campo de busca.
- Fora isso, nada muda na tela (header da página, tabs, "View history", "Choose a game to ping" e tabela).

### Comportamento
- **O fluxo a partir do botão é exatamente o mesmo de iniciar o teste com o jogo já selecionado.** Usar o jogo do último resultado (o ícone exibido no header do card) e disparar o mesmo fluxo/estados já existentes (loading, progresso, resultado, erro). Não é um fluxo novo.
- Quando o teste termina, o card **Last result** mostra o novo resultado, com data/hora atualizadas.
- O botão só aparece quando existe um último resultado.

### Resoluções
Specs em **1080x610**, **1280x720** e **1440x810**: mesma posição e mesmo componente em todas.

### Textos / i18n
| Idioma | Label |
|---|---|
| EN | Ping again |
| ES | Hacer ping de nuevo |
| RU | Пинг снова |

- Em RU o título "Last result" é longo e trunca com reticências ("Последний средний рез..."). Seguir o Figma.

### Critérios de aceite
- [ ] Botão "Ping again" no header do card Last result, conforme o Figma, nas 3 resoluções.
- [ ] Clicar no botão dispara o mesmo fluxo de iniciar o teste com o jogo selecionado, usando o jogo do último resultado.
- [ ] O resultado e a data/hora são atualizados ao final.
- [ ] Labels traduzidas (EN/ES/RU) e o truncamento em RU funcionando.
