# Layout responsivo (celular, tablet e computador) — Design

## Objetivo

O app hoje é uma coluna de 640px centrada: bom no celular, mas no computador sobra espaço dos lados e no meio. O objetivo é um layout que use bem a tela em qualquer largura, mantendo o celular exatamente como está.

## Faixas de largura

| Faixa | Largura | Resumo |
|---|---|---|
| Celular | até 639px | igual ao de hoje |
| Tablet | 640–1023px | coluna mais larga (até 760px), braço e botões maiores, abas na base |
| Computador | 1024px ou mais | barra lateral, exercícios sempre visíveis, painel de Foco fixo, braço largo |

- Um hook `useBreakpoint()` (via `matchMedia`) devolve `'mobile' | 'tablet' | 'desktop'` para o que muda a estrutura. O que muda só visualmente usa as mesmas faixas em `@media` no CSS. Sem `matchMedia` (testes), vale `'mobile'`.

## Estrutura geral

- **Navegação:** o mesmo `<nav aria-label="Principal">` (Estudar, Progresso, Foco, Ajustes). No celular e no tablet fica na base, como hoje. No computador vira uma **barra lateral** à esquerda (220px) com a logo e o nome "Guitar Mapper" no topo. No computador ela fica sempre visível, **inclusive durante a sessão** (a regra de esconder a navegação em sessão vale só para celular e tablet).
- **Conteúdo:** no tablet, coluna de até 760px; no computador, até 1100px ao lado da barra lateral. As telas de formulário (Foco e Ajustes) ficam numa coluna de até 640px, sem esticar.

## Estudar

- **Exercícios:** no computador, os 4 exercícios aparecem sempre como botões no topo (o atual marcado), no lugar do menu ☰; a logo sai do cabeçalho (está na barra lateral). Celular e tablet mantêm logo e menu.
- **Tela de início (computador):** duas colunas. Esquerda (cerca de 340px): o painel de **Foco fixo e aberto** (os mesmos controles editáveis, sem seta, sem fundo escurecido). Direita: descrição, níveis do Ouvido e o botão Iniciar. Tablet e celular mantêm o card recolhível.
- **Durante a sessão (computador):** o painel de Foco some; o braço e as respostas ocupam uma coluna central de até 860px. Opções de resposta em uma linha (até 4 opções; no Difícil, grade de 6 colunas).
- **Braço:** o SVG passa a escalar com o espaço (`viewBox`, largura 100%) mas nunca abaixo de uma largura mínima por casa (`minFretWidth`, padrão 56px), então no celular continua rolando como hoje e no computador ocupa a largura toda.

## Progresso

- Computador: duas colunas, o mapa à esquerda e o histórico (com Zerar progresso e Limpar histórico) em uma coluna de 320px à direita. O mapa mostra as 24 casas **sem rolagem** (`minFretWidth` menor no computador). Tablet e celular mantêm a coluna única.

## Mouse e teclado

- Foco visível (`:focus-visible`) em todos os controles, com contorno na cor de destaque; estados de `hover` nos botões; cursor de ponteiro.
- **Atalhos** (só com a tela de pergunta aberta, sem diálogo ou menu aberto e sem foco em campo de formulário):
  - `1` a `9`: escolhe a opção correspondente (Posição → nota, Ouvido). No computador as opções mostram o número num selo pequeno.
  - `Enter`: ação principal — "Próxima" (quando aparece), "Mostrar nota" (Flashcard) ou "Iniciar" (tela de início).
  - Flashcard depois de revelar: `1` = Errei, `2` = Acertei (mesma ordem dos botões).
  - Ouvido: `R` toca o som de novo (respeita o limite de audições).
  - `Esc`: fecha menu, diálogo ou painel aberto (já existe).
- Nota → posição (toque no braço) não tem atalho de resposta.

## Mantido

- Alvos de toque de 44px ou mais; tema, textos e fluxos iguais; PWA e `orientation: any` sem mudança; nenhuma mudança nos dados salvos.

## Testes

- Helper de teste para simular `matchMedia` por largura.
- `useBreakpoint`: devolve a faixa certa e reage à mudança de largura.
- Shell: barra lateral no computador (com navegação visível durante a sessão) e abas na base no celular e no tablet (escondidas na sessão).
- Estudar no computador: exercícios visíveis em vez do menu, painel de Foco aberto e editável sem seta, e some durante a sessão; no celular continua igual.
- Fretboard: respeita `minFretWidth` e escala a largura (atributos do SVG).
- Progresso no computador: histórico em coluna própria e mapa sem rolagem.
- Atalhos: cada tecla faz a ação certa nos modos, e é ignorada com diálogo aberto ou foco num campo.
- Verificação no navegador em iframes de 390px, 768px e 1280px.

## Fora do escopo

Ajustes específicos de celular na horizontal, troca manual de tema claro e escuro, arrastar para trocar de exercício e atalhos para o modo Nota → posição.
