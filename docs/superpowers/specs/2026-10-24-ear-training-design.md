# Exercício de percepção musical ("Ouvido") — Design

## Objetivo

Treinar o reconhecimento de notas de ouvido: o app toca uma nota de violão e o aluno diz qual é. Depois da resposta, o braço mostra onde aquela nota está, ligando som, nome e posição.

## Decisões já tomadas

- Quarta aba na barra de modos: **Ouvido** (ao lado de Posição → nota, Nota → posição e Flashcard).
- **Três níveis**, escolhidos na tela de início do modo, cada um com um descritivo curto:
  - **Fácil:** 2 opções, com notas bem diferentes entre si. *"2 opções, com notas bem diferentes. Para começar a reconhecer o som."*
  - **Médio:** 4 opções, incluindo notas vizinhas. *"4 opções, incluindo notas vizinhas. Você pode ouvir 5 vezes cada nota."*
  - **Difícil:** todas as notas do foco como opções (7 só com naturais, 12 com acidentais). *"Sem dicas: todas as notas do seu foco são opções. Você pode ouvir 2 vezes cada nota."*
- A pergunta é só o som. O braço **não** aparece antes da resposta; aparece depois, com o ponto da posição tocada.
- A nota tocada é a altura real de uma posição do **Foco** atual (cordas, casas, naturais ou acidentais).
- O exercício **não** conta no mapa de progresso (caixas e cores das posições). Ele aparece só no histórico de sessões.
- Reaproveita a sessão existente: Iniciar, fila sem repetição, Finalizar com confirmação, resumo (acertos e tempo médio), histórico e a barra com progresso e acertos.

## Comportamento

- O som toca sozinho quando a pergunta aparece. O primeiro sai do toque em Iniciar, que libera o áudio no iPhone. Os seguintes tocam sem novo toque.
- Botão grande de alto-falante **"Ouvir de novo"**. Limite de audições por pergunta (a que toca sozinha conta): **Fácil** sem limite; **Médio** 5 (4 repetições); **Difícil** 2 (1 repetição). O botão mostra as repetições que restam ("Ouvir de novo (3)"), e ao zerar fica desabilitado como "Sem mais repetições". O limite recomeça a cada pergunta e deixa de valer depois de responder (o botão volta a tocar sempre). Os descritivos de Médio e Difícil dizem o limite.
- O tempo da resposta conta do início do som até a escolha.
- Ao responder: a opção certa fica verde, a errada vermelha, o braço mostra a posição (como no modo Posição → nota) e o avanço segue igual (automático ao acertar, botão Próxima ao errar). Nada toca de novo ao responder.
- **Som desligado em Ajustes:** o modo Ouvido não pode iniciar. A tela de início mostra "Ligue o Som em Ajustes" e o Iniciar fica desabilitado.
- Foco vazio: mesma mensagem dos outros modos.

## Uma pergunta por som

- O mesmo som toca igual em cordas diferentes (a altura é a mesma). No Ouvido a unidade da pergunta é o **som distinto**, não a posição: a fila tem uma pergunta por altura dentro do Foco (48 no braço inteiro, 17 no foco padrão), sem repetir nenhum som.
- O card de Foco mostra essa quantidade ("48 perguntas") quando o exercício é o Ouvido; nos outros exercícios continua contando posições.
- Depois de responder, o braço marca **todas as posições daquele som dentro do Foco** (mais a posição sorteada, se ela vier de fora, como no caso de uma posição aberta pelo Progresso).
- Uma posição vinda do Progresso abre a fila e o som dela não volta a ser perguntado.

## Aleatoriedade (todos os níveis)

- A ordem dos sons é sorteada a cada sessão: a fila é o conjunto de sons do Foco embaralhado, sem repetir.
- **A mesma nota não toca duas vezes seguidas** quando existe outra opção na fila (por exemplo, dois E em oitavas diferentes ficam separados). Se só sobrar a mesma nota, ela toca.
- A posição da resposta certa entre as opções também é sorteada: no Fácil a certa cai à esquerda ou à direita ao acaso; no Médio as 4 opções vêm embaralhadas. No Difícil as opções ficam em ordem cromática fixa (para o aluno achar a nota rápido).

## Opções de resposta por nível

Respeitam o Foco (`naturalsOnly`): o conjunto de notas possíveis é o das 7 naturais ou o das 12.

| Nível | Opções |
|---|---|
| Fácil | a resposta certa + 1 nota a pelo menos 3 semitons de distância (distância circular), sorteada |
| Médio | as 4 opções de hoje (`buildChoiceQuestion`: a certa + vizinhas) |
| Difícil | todo o conjunto de notas possíveis, em ordem cromática |

## Dados

- `QuizMode` ganha `'ear'`. Novo `EarLevel = 'easy' | 'medium' | 'hard'`.
- `Settings.earLevel: EarLevel` (padrão `'easy'`), validado ao carregar; valor inválido ou ausente vira `'easy'`.
- A entrada do histórico de sessões ganha `level?: EarLevel`, presente só quando `mode === 'ear'` (validada; ausente ou inválida em `mode: 'ear'` vira `'easy'`). O histórico lista "Ouvido · Fácil", "Ouvido · Médio" ou "Ouvido · Difícil".
- Respostas de Ouvido **não** chamam `recordAnswer` (o progresso por posição não muda).

## Estrutura

- `src/domain/quiz.ts`: `buildEarQuestion(position, level, naturalsOnly, rng)` devolve `{ answer, options }`.
- `src/domain/session.ts`: `buildQueue` ganha a opção `avoidSameNoteInRow` (usada pelo Ouvido).
- `src/ui/screens/EarQuiz.tsx`: a pergunta (botão de som, opções, braço depois de responder).
- `Study.tsx`: quarta aba, seletor de nível e descritivos na tela de início, ligação com a sessão e com o som.
- `modeLabels.ts`: rótulo e descrição do modo e dos níveis.
- `Progress.tsx`: o histórico mostra o nível de Ouvido.

## Testes

- Fila do Ouvido: cobre todo o Foco sem repetir posição, embaralhada pelo sorteio injetado, e evita a mesma nota em sequência quando há alternativa.
- `buildEarQuestion`: exatamente uma opção certa, sem duplicadas; Fácil tem 2 opções com a errada a ≥ 3 semitons; Médio tem 4; Difícil tem 7 (naturais) ou 12 (acidentais) em ordem cromática.
- Armazenamento: `earLevel` padrão, migração de dados antigos e valor inválido; histórico com `level` válido, ausente e inválido.
- UI do Ouvido: toca o som da posição ao aparecer a pergunta; "Ouvir de novo" toca de novo; o braço só aparece depois de responder; não grava progresso por posição; grava no histórico com o nível; com Som desligado o Iniciar fica desabilitado com o aviso; o descritivo muda com o nível.

## Fora do escopo

Intervalos, acordes, notas de oitavas diferentes como resposta, contar Ouvido no mapa de progresso.
