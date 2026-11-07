# M3 Ouvido de intervalos e funcional — Design

Data: 2026-11-07. Quarto marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item) e do M2 (camada de grafia). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

A trilha **Ouvido** tem um único exercício: ouvir uma nota isolada e dizer o nome dela. Isso é ouvido absoluto, a habilidade menos útil para tocar com outras pessoas. O que um músico usa de verdade é o **ouvido relativo**: reconhecer a distância entre duas notas (intervalo) e reconhecer a função de uma nota dentro de uma tonalidade (grau). Os próximos marcos (escalas, campo harmônico) pressupõem isso.

O app já tem quase tudo: amostras de violão e baixo (`public/sounds/nylon` 40–88, `public/sounds/bass` 28–67), `playPitches` com intervalo entre notas, o registro de exercícios com `itemKey` (M0) e a revisão por item com `selectForReview` e `recordItemAnswer` (M1). Este marco acrescenta dois exercícios novos que usam essa base.

## Objetivos

1. **Ouvir intervalos.** O app toca duas notas, uma depois da outra (melódico), e o aluno escolhe o intervalo entre elas, de uníssono (0 semitom) a oitava (12). A direção é configurável: sobe, desce ou as duas.
2. **Ouvir graus (funcional).** O app toca uma referência da tonalidade (tônica, com ou sem arpejo 1–3–5) e depois uma nota; o aluno diz qual grau da escala maior ela é (1 a 7). A tônica muda a cada pergunta.
3. **Os dois entram na revisão espaçada do M1** (progresso por item, sessão de até 20, histórico com nível) e funcionam igual no violão e no baixo, sempre dentro da faixa das amostras.

## Não objetivos

- Intervalos **harmônicos** (as duas notas juntas), acordes, cadências harmônicas e qualquer som simultâneo: o player é monofônico (cada nota corta a anterior) e mudar isso é outro marco.
- Intervalos compostos (maiores que a oitava), graus cromáticos (♭3, ♯4…), escala menor ou modos.
- Responder a **direção** do intervalo: o aluno responde só o intervalo; a direção aparece no feedback.
- Escolher intervalos ou graus um a um (como o Foco do Intervalos escrito): a seleção é por nível.
- Braço na resposta (mostrar onde as notas estão). Fica para depois.
- Limite de audições por pergunta (como no Ouvido Médio/Difícil).
- Mapa de domínio desses itens no Progresso (como no M1, só guardam para a revisão).
- Mudar o Intervalos escrito (modo `interval`): os 11 intervalos (`INTERVALS`, `IntervalId`), o Foco dele, as chaves `interval:<raiz>:<id>`, o atalho A–G e o feedback continuam iguais.

## Anti-objetivos (falha, mesmo que "funcione")

- Uma nota tocada fora da faixa das amostras do instrumento ativo (pedido de MP3 inexistente), em qualquer item, nível, direção e sorteio, no violão ou no baixo.
- Notas graves demais ou agudas demais para reconhecer (pedal grave do baixo, casa 24 da primeira corda): a faixa usada é uma faixa confortável, não a faixa inteira.
- Mexer no Intervalos escrito, nos seus testes ou no seu progresso salvo.
- Um dado salvo antes do M3 (sem os campos novos) ou um arquivo exportado antes dele deixar de carregar, ou ser regravado ao carregar.
- Um histórico salvo com os modos novos ser descartado ao carregar.
- A grafia (M2) influenciar acerto: acerto é por semitons (intervalo) e por grau (funcional), nunca por nome de nota.
- O som da pergunta seguinte, ou uma nota pendente da anterior, tocar depois de sair da pergunta (finalizar, trocar de pergunta).
- Revelar a resposta antes do clique (nomes das notas, grau ou intervalo no DOM).

## Comportamento

### 1. Dois modos novos na trilha Ouvido

- Modos `ear-interval` (**Ouvir intervalos**) e `ear-degree` (**Ouvir graus**), registrados como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- Ordem: `position-to-note`, `note-to-position`, `flashcard`, `ear`, `ear-interval`, `ear-degree`, `interval` (braço, ouvido, teoria). A trilha Ouvido passa a ter `ear`, `ear-interval`, `ear-degree`. No computador as abas mostram os 7 exercícios; no celular o menu agrupa por trilha, como hoje.
- Descrições (tela de início):
  - Ouvir intervalos: "Ouça duas notas, uma depois da outra, e diga o intervalo entre elas. Treina reconhecer distâncias de ouvido."
  - Ouvir graus: "O app toca a tônica de uma tonalidade e depois uma nota. Diga qual grau da escala maior ela é. A tonalidade muda a cada pergunta."
- Não registram progresso de posição (`recordsPositionProgress: false`): gravam no mapa por item do instrumento ativo (`recordItemAnswer`).
- **Som desligado:** não iniciam; mesma mensagem do Ouvido ("Ligue o Som em Ajustes para treinar de ouvido.").
- **Sem Foco:** o cartão de Foco (cordas, casas, notas) não aparece nestes dois modos, porque não se aplica. A tela de início mostra as opções do modo, a frase "Sessão de N perguntas" e Iniciar. Uma posição vinda do Progresso não inicia estes modos.

### 2. Ouvir intervalos

**Intervalos ouvidos** (tabela própria, `EAR_INTERVALS`, 13 entradas por semitons; os rótulos de 1 a 11 vêm de `INTERVALS`, sem alterar essa lista):

| semitons | rótulo | nome |
|---|---|---|
| 0 | Uníssono | uníssono |
| 1–11 | os de `INTERVALS` (`2ª m` … `7ª M`, `Trítono`) | os de `INTERVALS` |
| 12 | 8ª J | oitava justa |

**Níveis** (as opções de resposta são só os intervalos do nível, em ordem crescente):

- **Fácil:** 3ª M, 5ª J, 8ª J (4, 7, 12). "Três intervalos bem diferentes: 3ª maior, 5ª justa e oitava."
- **Médio:** 2ª M, 3ª m, 3ª M, 4ª J, 5ª J, 6ª M, 8ª J (2, 3, 4, 5, 7, 9, 12). "Sete intervalos, os mais comuns em melodias."
- **Difícil:** todos os 13 (0 a 12). "Todos os 13, do uníssono à oitava."

**Direção:** **Sobe** (padrão), **Desce** ou **Os dois**. O uníssono não tem direção: é sempre um item só, guardado como "sobe".

**Item e chave:** `{ raiz (classe 0–11 da primeira nota), semitons, direção }`, chave `earint:<raiz>:<semitons>:<up|down>`. O pool do nível é raiz × intervalos × direções (12 raízes, sempre todas). Tamanho: Fácil 36 (uma direção) ou 72 (as duas); Médio 84 ou 168; Difícil 156 ou 300.

**Alturas:** na montagem da fila, cada item recebe uma primeira nota concreta: uma oitava sorteada da raiz tal que as duas notas caibam na **faixa de ouvido** do instrumento (seção 4). Sobe: segunda = primeira + semitons; desce: segunda = primeira − semitons.

**Pergunta:**

- Título "Qual é o intervalo?". As duas notas tocam sozinhas ao abrir a pergunta, com **900 ms** entre o início de uma e da outra.
- Botão grande "Ouvir de novo" (o mesmo `.ear-play` do Ouvido, atalho R): repete as duas notas, sem limite, antes e depois de responder. Repetir cancela o que estava pendente.
- Botões de resposta numa grade de 4 colunas no celular (Difícil: 13 botões em 4 linhas), rótulo do intervalo (`3ª M`, `Uníssono`, `8ª J`).
- Acerto: semitons escolhidos = semitons do item.
- Depois de responder: certa em verde, errada em vermelho; uma linha com as duas notas na grafia do ajuste e a direção ("C → E · subindo"); status "Correto!" ou "Errado. Era terça maior, subindo." (uníssono: "Errado. Era uníssono."). Acertou: avança sozinho como o Ouvido; errou: botão Próxima.

### 3. Ouvir graus (funcional)

**Níveis** (as opções são só os graus do nível):

- **Fácil:** graus 1, 3, 5, com contexto arpejo 1–3–5. "Graus 1, 3 e 5, depois do arpejo da tônica."
- **Médio:** graus 1 a 5, com contexto arpejo 1–3–5. "Graus 1 a 5, depois do arpejo da tônica."
- **Difícil:** graus 1 a 7, contexto só a tônica. "Os 7 graus, só com a tônica como referência."

**Item e chave:** `{ tônica (classe 0–11), grau 1–7 }`, chave `func:<tônica>:<grau>`. Pool: 12 tônicas × graus do nível (36, 60, 84).

**Alturas:** a tônica recebe uma oitava sorteada tal que tônica + 11 caiba na faixa de ouvido; a nota-alvo fica **na oitava acima da tônica**: tônica + 0, 2, 4, 5, 7, 9, 11 semitons para os graus 1 a 7 (o grau 1 é a própria tônica).

**Sequência:** Fácil e Médio: tônica em 0 ms, 3ª maior em 400 ms, 5ª justa em 800 ms, alvo em 1800 ms. Difícil: tônica em 0 ms, alvo em 1000 ms.

**Pergunta:**

- Título "Qual grau da escala maior?". A sequência toca sozinha ao abrir; "Ouvir de novo" repete a sequência inteira, sem limite.
- Botões com o número do grau (`1` … `7`, rótulo acessível "Grau 3").
- Acerto: grau escolhido = grau do item.
- Depois de responder: cores como acima; uma linha "Tônica F# · grau 3 = A#"; status "Correto!" ou "Errado. Era o grau 3.". Nome das notas: tabela do ajuste de acidentais; no **Automático**, a nota-alvo (graus 2–7) recebe o nome pelo grau, com o mesmo `spellInterval` do M2 sobre o intervalo maior/justo do grau (2M, 3M, 4J, 5J, 6M, 7M). Avanço igual ao de intervalos.

### 4. Faixa de ouvido (segurança do instrumento)

- `EAR_RANGE`: violão MIDI **45–76** (A2–E5); baixo MIDI **33–60** (A1–C4). As duas ficam dentro da faixa tocável (`instrumentRange`: violão 40–88, baixo 28–67) e portanto dentro das amostras, que cobrem toda altura do braço (teste de assets existente).
- As faixas têm mais de 23 semitons, então toda raiz/tônica tem ao menos uma oitava válida para qualquer intervalo até a oitava e para tônica + 11.
- Toda altura tocada ou pré-carregada por estes modos sai de funções puras que recebem o instrumento; um teste percorre todos os itens × níveis × direções × sorteios extremos nos dois instrumentos.
- Trocar de instrumento troca a faixa. Ao iniciar, a sessão pré-carrega (`preparePitches`) todas as alturas da fila.

### 5. Som

- `SoundApi` ganha `playSequence(notes: { midi; atMs }[])`: cancela o que estava pendente e toca cada nota no instante pedido (a primeira em 0 ms na hora). `playPitches(midis, gapMs)` passa a ser um caso dela, sem mudar o comportamento.
- Ao sair da pergunta (desmontar), as notas pendentes são canceladas (`playSequence([])`), como já faz o Intervalos.
- Som desligado: nada toca, como hoje.

### 6. Teclado

- Os botões de resposta destes modos declaram o próprio atalho. Graus: a tecla do número do grau (Fácil: 1, 3, 5). Intervalos: por posição, `1`–`9`, depois `0`, `Q`, `W`, `E` (só o Difícil usa as quatro últimas).
- Quando a tela tem botões com atalho declarado, as teclas de letra e número só valem para eles (A–G e o 1–9 posicional antigo não agem). Enter (Próxima/Iniciar) e R (Ouvir de novo) continuam iguais.
- Dica abaixo dos botões: intervalos "Teclado: 1–3 · R = ouvir de novo" (Médio "1–7", Difícil "1–9, 0, Q, W, E"); graus "Teclado: 1, 3, 5 · R = ouvir de novo" (os graus do nível).

### 7. Ajustes, sessão e histórico

- Ajustes novos, globais (os dois instrumentos), escolhidos na tela de início do modo (componente `Options` do exercício, como o nível do Ouvido): `earIntervalLevel` (padrão Fácil), `earIntervalDirection` (`up` | `down` | `both`, padrão `up`), `degreeLevel` (padrão Fácil). Usam o mesmo tipo de nível do Ouvido (`easy` | `medium` | `hard`) e os mesmos rótulos Fácil/Médio/Difícil.
- Sessão: até 20 perguntas pelo `selectForReview` do M1 sobre o pool do nível; a fila é embaralhada e então recebe as alturas. A frase "Sessão de N perguntas" usa o tamanho do pool.
- Histórico: os modos novos entram como os outros e guardam o nível da sessão (como o Ouvido): "Ouvir intervalos · Médio". A direção não vai para o histórico.

### 8. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão e sem migração:
  - `sanitizeSettings`: os três campos novos, ausentes ou inválidos valem o padrão; `mode` aceita os modos novos (já vem de `QUIZ_MODES`).
  - Mapa por item (`items`): aceita `earint:<0–11>:<0–12>:<up|down>` (uníssono só com `up`) e `func:<0–11>:<1–7>`, sem zeros à esquerda; o resto é descartado, como hoje.
  - Histórico: aceita os modos novos (via `QUIZ_MODES`); guarda `level` (padrão `easy` se ausente ou inválido) para `ear`, `ear-interval` e `ear-degree`, e continua sem `level` nos outros.
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro.
- O Intervalos escrito não muda (código, testes e dados).
- Toda altura dos modos novos dentro de `EAR_RANGE` do instrumento ativo.
- Acerto por semitons/grau; a grafia é só exibição.
- Sorteios com `rng` injetado (o `ExerciseContext` já leva), para testes determinísticos.
- Os testes atuais continuam passando; só mudam os que fixam a lista exata de modos/trilhas (`exercises.test.ts`) e a regra "nível só no Ouvido" do histórico, e o commit explica.

## Decisões minhas (a conferir)

- Nomes "Ouvir intervalos" e "Ouvir graus"; ids `ear-interval` e `ear-degree`; ordem dentro da trilha Ouvido.
- Níveis de intervalos (Fácil 3M/5J/8J, Médio 2M/3m/3M/4J/5J/6M/8J, Difícil os 13) e direção como ajuste separado, padrão Sobe; o aluno não responde a direção.
- Uníssono é um item só (direção "sobe").
- Níveis de graus (1-3-5, 1–5, 1–7), contexto arpejo 1–3–5 no Fácil e Médio e só a tônica no Difícil; **tônica sorteada a cada pergunta em todos os níveis** (a referência toca toda vez, então não há "tonalidade da sessão"); alvo sempre na oitava acima da tônica.
- Faixas de ouvido 45–76 (violão) e 33–60 (baixo), menores que a faixa inteira.
- Tempos: 900 ms entre as notas do intervalo; arpejo a cada 400 ms e alvo 1 s depois.
- Sem limite de audições e sem braço na resposta.
- Chave de intervalo com a raiz (`earint:<raiz>:…`) para que todo nível tenha itens suficientes para uma sessão de 20 (só por intervalo e direção, o Fácil teria 3).
- Cartão de Foco escondido nestes modos; opções na tela de início.
- Atalhos declarados nos botões (graus pelo número; intervalos 1–9, 0, Q, W, E).
- Nome por grau no feedback de graus só no Automático, como o M2 faz no Intervalos.
- Nível no histórico dos modos novos; direção fora.

## Fica a cargo de quem for construir

- Nome do módulo de domínio e dos tipos (itens abstratos e perguntas com alturas), desde que as chaves e as faixas sejam as acima.
- Como o `Exercise` diz que não usa o Foco e qual nível vai para o histórico (campo novo no registro, por exemplo).
- O visual da grade de respostas e da linha de detalhe, seguindo `.option`, `.note-grid` e `.level-bar`.
- O modo exato de sortear a oitava (qualquer distribuição sobre as oitavas válidas), desde que use o `rng` injetado.
