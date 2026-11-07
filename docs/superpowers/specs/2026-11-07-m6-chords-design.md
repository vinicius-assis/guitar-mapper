# M6 Acordes — Design

Data: 2026-11-07. Sétimo marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item), do M2 (camada de grafia), reaproveita do M3 (botões com atalho declarado, `useAutoAdvance`), do M4 (braço com `fit`, marcas `root`, legenda, `spellScale`, o padrão "toque as notas" de Toque a escala) e do M5 (`ChordQuality`, `QUALITY_SYMBOL`, `spellChord`, `phrase`, `.answer-grid--words`, a busca segura de `data-shortcut`). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

O M5 ensinou quais acordes nascem de cada grau, mas só no papel. O passo seguinte, e o que o aluno de violão faz todo dia, é **tocar esses acordes**: saber de cor os desenhos abertos (C, A, G, E, D, Am, Em, Dm e os de sétima mais usados) e as duas pestanas móveis que dão qualquer acorde em qualquer tom (forma de Mi, com a fundamental na 6ª corda, e forma de Lá, na 5ª). São duas habilidades: **reconhecer** um desenho no braço ("isso é um Am7") e **montar** o desenho de um acorde pedido ("monte o F7M").

O app já tem o braço com marcas e `fit`, o progresso por item, a grafia por letra (`spellScale`) e as qualidades de acorde do M5. Este marco acrescenta o domínio de acordes (qualidades, nomes, desenhos curados e a posição de cada nota), duas peças pequenas no braço (cordas soltas/abafadas e pestana) e dois exercícios numa trilha nova. Acordes são **só do violão**: os desenhos não existem no baixo de 4 cordas.

## Objetivos

1. **Domínio de acordes** (`src/domain/chords.ts`): tríades maior e menor e tétrades 7, m7, 7M e m7(♭5); nome do acorde com a grafia certa no ajuste Acidentais; uma tabela curada de **desenhos** — 19 abertos e 10 móveis de pestana (formas de Mi e de Lá) — e, para cada desenho e fundamental, as posições, alturas e funções (1, 3, 5, 7…) de cada nota.
2. **Nome do acorde:** o braço mostra um desenho com as cordas soltas (○) e abafadas (×); o aluno escolhe o nome entre 4 opções.
3. **Monte o acorde:** o app pede um acorde e a forma ("A7 · pestana, forma de E"); o aluno toca no braço as casas presas do desenho.
4. **Ouvir o acorde:** depois de responder, o acorde soa como um rasgueado rápido (arpejo de `playPitches`), sem motor polifônico.
5. **Os dois entram na revisão espaçada do M1** (progresso por item do violão, sessão de até 20). No baixo, ficam visíveis no menu mas não iniciam e dizem por quê.

## Não objetivos

- Sistema CAGED completo (as 5 formas pelo braço inteiro), formas de Dó/Sol/Ré móveis, desenhos alternativos do mesmo acorde (escolher entre vários), mapa de acordes no braço inteiro.
- Inversões, baixo invertido (C/E), acordes com tensões (9, 11, 13), sus, add9, aumentado, diminuto (tríade e tétrade °7), power chords.
- Digitação (qual dedo em cada casa), tablatura, diagrama vertical de acorde.
- Polifonia (`playChord`, notas simultâneas), rasgueado para cima/baixo, ritmo.
- Progressões, troca de acordes, cadências, ligar acordes ao campo harmônico do M5 ("toque o IV de Ré").
- Reconhecer a qualidade do acorde de ouvido.
- Acordes no baixo (nem desenhos de 3–4 cordas, nem arpejos).
- Mapa de domínio desses itens no Progresso e nível no histórico (como no M1/M3/M4/M5).
- Mudar os exercícios atuais, seus testes, suas chaves, `spellScale`, `spellChord` ou o ajuste Acidentais.

## Anti-objetivos (falha, mesmo que "funcione")

- Um desenho que não bate com o conhecido (C aberto ≠ x32010) ou com nota fora do acorde, em qualquer desenho × fundamental.
- A grafia ou o rótulo decidir acerto: acerto é por (classe de altura da fundamental, qualidade) no Nome do acorde e por posição no Monte o acorde, nunca pelo texto do botão.
- Um nome de acorde com dois sinais (dobrado sustenido/bemol) ou com letra repetida nas notas.
- Revelar a resposta antes do clique (nome, fundamental destacada ou funções nas marcas; no Monte o acorde, as casas do desenho, a pestana ou as cordas ○/×).
- Um toque numa nota do acorde fora do desenho contar como erro no Monte o acorde.
- O braço cortar notas ou exigir rolagem horizontal num celular de 360 px (achado da revisão do M4: só com `fit`).
- Um exercício de acordes iniciar no baixo, ou o baixo ver um braço de 4 cordas com desenho de violão.
- Um dado salvo antes do M6 (sem os campos novos) ou um arquivo exportado antes dele deixar de carregar, ou ser regravado ao carregar; chaves `chordname:`/`chordplay:` válidas serem descartadas ao carregar.
- Mexer no comportamento ou nos testes dos doze exercícios atuais (só mudam asserções de lista exata de modos/trilhas/abas).

## Comportamento

### 1. Trilha nova "Acordes" com dois modos

- Modos `chord-name` (**Nome do acorde**) e `chord-play` (**Monte o acorde**), registrados como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- `TrackId` ganha `'acordes'`; `TRACKS` passa a ser Braço, Ouvido, Teoria, Escalas, Harmonia, **Acordes** (`['chord-name', 'chord-play']`). `QUIZ_MODES` termina com `'harmony-quality', 'chord-name', 'chord-play'`. No computador as abas mostram os 14 exercícios; no celular o menu agrupa por trilha.
- Descrições (tela de início):
  - Nome do acorde: "O braço mostra o desenho de um acorde, com as cordas soltas (○) e abafadas (×). Escolha o nome dele entre 4 opções. Só no violão."
  - Monte o acorde: "O app pede um acorde e a forma, aberta ou de pestana. Toque no braço as casas presas do desenho. Uma nota fora do acorde encerra a pergunta. Só no violão."
- `recordsPositionProgress: false` (gravam no mapa por item do instrumento ativo, que é sempre o violão), `usesFocus: false`, sem bloqueio por som, uma posição vinda do Progresso não inicia estes modos, sem nível no histórico (`LEVELED_MODES` não muda).

### 2. Baixo

- Os dois modos continuam no menu e nas abas nos dois instrumentos (o modo é um ajuste global, e esconder exigiria trocar o modo ao trocar de instrumento).
- No baixo, a tela de início mostra a descrição, as opções e o aviso (`p.empty`, via `startBlockers`): **"Acordes são só para violão. Troque para Violão em Ajustes."**; Iniciar fica desabilitado; `questionCount` é 0 (some a linha "Sessão de N perguntas").
- As telas de pergunta usam sempre `GUITAR` (braço, rótulos das cordas, alturas do som), nunca o instrumento ativo, então mesmo se montadas no baixo mostram o braço de 6 cordas certo.

### 3. Qualidades e nomes

Qualidades do M5 (`ChordQuality`), sem a tríade diminuta (não tem desenho neste marco):

| qualidade | símbolo | semitons | funções |
|---|---|---|---|
| `major` | `''` | 0 4 7 | 1 3 5 |
| `minor` | `m` | 0 3 7 | 1 ♭3 5 |
| `dom7` | `7` | 0 4 7 10 | 1 3 5 ♭7 |
| `min7` | `m7` | 0 3 7 10 | 1 ♭3 5 ♭7 |
| `maj7` | `7M` | 0 4 7 11 | 1 3 5 7 |
| `half-dim` | `m7(b5)` | 0 3 6 10 | 1 ♭3 ♭5 ♭7 |

- **Família:** tríades = `major`, `minor`; tétrades = `maj7`, `dom7`, `min7`, `half-dim` (ordem do `SEVENTH_QUALITIES` do M5).
- **Grafia** (só exibição): as notas do acorde empilham terças por letra (passos 0, 2, 4, 6 a partir da letra da fundamental), pelas mesmas regras do `spellScale` do M4, aplicadas a um "acorde como escala" (semitons da qualidade, `letterSteps` 0 2 4 6), sem mudar `spellScale`: fundamental natural sempre natural; fundamental preta escolhe entre sustenido e bemol, descarta a que exigiria dobrado; **Sustenidos** → sustenido primeiro, **Bemóis** → bemol primeiro, **Automático** → menos sinais no total e, no empate, a tabela do M2 (Db, Eb, F#, Ab, Bb).
- Exemplos: Automático `C#m` (não Dbm, que teria Fb), `Ebm`, `G#m`, `Db`, `Gb7M`, `A#m7(b5)`; Sustenidos `Eb` (D# maior exigiria F𝄪), `C#` = C# E# G#; Bemóis `F#m` (Gbm exigiria B𝄫), `Dbm` = Db Fb Ab. Tabelas completas (12 fundamentais × 6 qualidades × 3 ajustes) ficam como teste literal gerado por script independente.
- **Nome mostrado:** fundamental pela Notação + símbolo, com `phrase` do M5: `F#m7(b5)`, `Fá#m7(b5)`, em Ambos `F#m7(b5) (Fá#m7(b5))`. Notas do acorde: `C7: C E G Bb`.

### 4. Desenhos

Cordas como no resto do app (1 = a mais aguda); a notação de desenho abaixo vai da 6ª para a 1ª corda, `x` = abafada, `0` = solta.

**Abertos (fundamental fixa)** — 19:

| id | acorde | desenho | id | acorde | desenho |
|---|---|---|---|---|---|
| `c` | C | x32010 | `g7` | G7 | 320001 |
| `a` | A | x02220 | `c7` | C7 | x32310 |
| `g` | G | 320003 | `d7` | D7 | xx0212 |
| `e` | E | 022100 | `a7` | A7 | x02020 |
| `d` | D | xx0232 | `e7` | E7 | 020100 |
| `am` | Am | x02210 | `am7` | Am7 | x02010 |
| `em` | Em | 022000 | `em7` | Em7 | 020000 |
| `dm` | Dm | xx0231 | `dm7` | Dm7 | xx0211 |
| | | | `cmaj7` | C7M | x32000 |
| | | | `fmaj7` | F7M | xx3210 |
| | | | `bm7b5` | Bm7(b5) | x2323x |

**Móveis de pestana (qualquer fundamental)** — 10, com a casa da pestana *r* = casa da fundamental na corda da fundamental, entre 1 e 12 (casa 0 vira 12, porque a 0 é o desenho aberto):

| id | forma | qualidade | desenho (casas relativas a *r*) | pestana |
|---|---|---|---|---|
| `e-maj` | de Mi (fund. na 6ª) | maior | r r+2 r+2 r+1 r r | casa r, cordas 6–1 |
| `e-min` | de Mi | menor | r r+2 r+2 r r r | 6–1 |
| `e-7` | de Mi | 7 | r r+2 r r+1 r r | 6–1 |
| `e-m7` | de Mi | m7 | r r+2 r r r r | 6–1 |
| `a-maj` | de Lá (fund. na 5ª) | maior | x r r+2 r+2 r+2 r | casa r, cordas 5–1 |
| `a-min` | de Lá | menor | x r r+2 r+2 r+1 r | 5–1 |
| `a-7` | de Lá | 7 | x r r+2 r r+2 r | 5–1 |
| `a-m7` | de Lá | m7 | x r r+2 r r+1 r | 5–1 |
| `a-maj7` | de Lá | 7M | x r r+2 r+1 r+2 r | 5–1 |
| `a-m7b5` | de Lá | m7(♭5) | x r r+1 r r+1 x | sem pestana |

- Referências: F forma de Mi = 1-3-3-2-1-1; A forma de Mi = 5-7-7-6-5-5; Bm forma de Lá = x-2-4-4-3-2; C7 forma de Lá = x-3-5-3-5-3; E forma de Mi = 12-14-14-13-12-12; A forma de Lá = x-12-14-14-14-12. Casa máxima 14, altura máxima MIDI 76.
- **Propriedades conferidas por teste** (todos os desenhos × fundamentais): a nota mais grave é a fundamental (sem inversões); o conjunto de classes de altura das cordas tocadas é **igual** às notas do acorde, conferido contra a camada do M5 (as notas de `spellChord` de um grau do campo maior com essa fundamental e qualidade, convertidas em classe de altura); única exceção declarada: **C7 aberto (x32310) omite a quinta** (`omitsFifth: true`), e então o conjunto é as notas menos a quinta; toda casa presa entre 1 e 14; uma nota por corda.
- **Janela** do braço: abertos, casas 1–4 (as cordas soltas aparecem na coluna ○/×, não numa casa 0); móveis, `lo = max(1, r − 1)` até `lo + 4` (5 casas). Todas as casas presas cabem na janela.
- Cada nota do desenho guarda posição, altura (`openMidi + casa`) e função (rótulo da tabela da seção 3 pelo intervalo até a fundamental). As alturas em ordem da 6ª para a 1ª corda são o rasgueado.

### 5. Braço: peças novas (aditivas)

- `MarkKind` ganha `chord` (nota do acorde): círculo preenchido com `--text` e rótulo em `--surface` (o "ponto preto" dos diagramas), diferente de `scale` (contorno).
- Prop nova `stringMarks?: ('open' | 'muted' | null)[]` (índice 0 = corda 1): uma coluna fixa estreita entre os nomes das cordas e o braço (segue o espelhamento de `leftHanded`), com `○` (solta) ou `×` (abafada) em cada linha, `data-testid="string-mark-N"`, e rótulo acessível "Corda N solta" / "Corda N abafada". Sem a prop, nada muda.
- Prop nova `barres?: { fret: number; fromString: number; toString: number }[]`: uma barra arredondada (`rect.barre`, cor `--text` translúcida) na casa, cobrindo as cordas, desenhada abaixo das marcas. Sem a prop, nada muda.
- Legenda `ChordLegend` (lista `.legend`): "Fundamental" (`swatch--root`), "Nota do acorde" (`swatch--chord`), "○ Corda solta", "× Corda abafada".
- As duas telas usam `fit` com `minFretWidth={40}` (como M4); a janela de 4–5 casas + 2 colunas fixas cabe em 360 px.

### 6. Ajustes e tela de início

Dois ajustes globais novos, escolhidos na tela de início (componente `ChordOptions` compartilhado), grupos de botões `aria-pressed` como no M5:

- `chordShapes`: **Formas** — "Abertas" (`'open'`, padrão), "Pestana" (`'barre'`), "Todas" (`'all'`).
- `chordKinds`: **Acordes** — "Tríades" (`'triads'`, padrão), "Tétrades" (`'sevenths'`), "Todos" (`'both'`).
- Tamanho do pool (item = desenho × fundamental): abertas 8 / 11 / 19; pestana 48 / 72 / 120; todas 56 / 83 / 139 (tríades / tétrades / todos).
- A tela mostra a descrição, as opções, o aviso do baixo (se for o caso), "Sessão de N perguntas" e Iniciar.

### 7. Nome do acorde (`chord-name`)

- **Item:** `{ shape, root }` (desenho aberto: `root` é a fundamental fixa dele). Chave `chordname:<shape>:<root 0–11>`.
- **Pergunta:** na montagem da fila, cada item recebe 4 opções (`{ root, quality }`), sorteadas com o `rng`: a certa; mesma fundamental, outra qualidade da família; mesma qualidade, outra fundamental; e uma qualquer da família ainda não usada; embaralhadas. As 4 são distintas.
- Enunciado "Qual é este acorde?". O braço mostra a janela com as casas presas como `chord` **sem rótulo**, a pestana e a coluna ○/×; nada destaca a fundamental.
- **Respostas:** 4 botões `.option` em `.answer-grid.answer-grid--words`, com o nome (seção 3); `data-shortcut` 1–4; dica "Teclado: 1–4".
- **Acerto:** fundamental (classe) e qualidade da opção = as do item.
- **Depois:** botão certo `option--correct`, escolhido errado `option--wrong`; marcas da fundamental viram `root`; todas ganham o rótulo da função; status "Correto! É Am7." / "Errado. É Am7."; detalhe "Am7: A C E G · forma aberta" (ou "· pestana, forma de E"); toca o rasgueado; botão "Ouvir o acorde" (`.ear-play`, tecla R). Acertou: avança sozinho; errou: Próxima.

### 8. Monte o acorde (`chord-play`)

- **Item:** igual, chave `chordplay:<shape>:<root>`; mesmo pool.
- **Pergunta:** "Monte o acorde" e o título "A7 · pestana, forma de E" ("C · forma aberta"; forma pela Notação: "forma de Mi", "forma de E (Mi)"). O braço mostra a janela do desenho, todas as casas tocáveis, sem marcas, sem pestana e com a coluna ○/× vazia (presente desde o início para não mudar a largura). Linha "Faltam N notas" (`aria-live`), N = casas presas.
- **Cada toque:** toca a altura da casa (no violão). Casa do desenho ainda não encontrada → marca `chord`, conta. Casa já encontrada → nada. Casa fora do desenho cuja nota é do acorde → nada (neutra, não é erro). Casa cuja nota não é do acorde → `wrong`, a pergunta acaba errada.
- **Fim:** todas as casas presas encontradas → "Correto! A7 montado.", rasgueado, avança sozinho. Errou → "Errado. F não está em A7." (nota pelo ajuste Acidentais); o desenho inteiro aparece com funções, a pestana e ○/×, as casas que faltavam como `hint`; Próxima. Nos dois casos, "Ouvir o acorde".
- Acerto por posição; a grafia é só exibição.

### 9. Som e teclado

- Rasgueado: `playPitches(alturas da 6ª para a 1ª corda, 40)` só se o Som estiver ligado; não bloqueia o início. Cancelado ao sair da pergunta (`playPitches([])` ao desmontar). `prepareSound` carrega as alturas dos desenhos da fila.
- Teclado: 1–4 no Nome do acorde (busca segura de `data-shortcut` do M5); Enter = Próxima; R = Ouvir o acorde (já liberado pelo `useQuizShortcuts` mesmo com `data-shortcut`).

### 10. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão e sem migração:
  - `sanitizeSettings`: `chordShapes` (`'open' | 'barre' | 'all'`, senão `'open'`), `chordKinds` (`'triads' | 'sevenths' | 'both'`, senão `'triads'`); `mode` aceita os modos novos (via `QUIZ_MODES`).
  - Mapa por item: aceita `chordname:<shape>:<0–11>` e `chordplay:<shape>:<0–11>` com `shape` da tabela, sem zeros à esquerda, e, num desenho aberto, `root` igual à fundamental dele (`chordname:c:2` é descartada); o resto é descartado, como hoje.
  - Histórico: aceita os modos novos, sem `level`.
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro (braço com `fit` em 360 px, botões sem rolagem horizontal).
- Os doze exercícios atuais não mudam; só mudam as asserções de lista exata de modos/trilhas/abas (`exercises.test.ts`; em `Study.test.tsx` os títulos "12 exercises" viram "14 exercises").
- O `Fretboard` só ganha coisas opcionais (uma `MarkKind`, duas props); os testes dele continuam iguais.
- Acerto por classe de altura + qualidade ou por posição; a grafia é só exibição. Sorteios com o `rng` injetado.
- Tabelas de teste literais, geradas por script independente, nunca recalculadas pelo código testado.
- Sem reformatar arquivos existentes (`spelling.ts` aspas duplas; o resto simples).

## Decisões minhas (a conferir)

- Trilha nova **Acordes** (não dentro de Harmonia), ids `chord-name`/`chord-play`, nomes "Nome do acorde" e "Monte o acorde".
- **Baixo: modos visíveis com aviso**, não escondidos. "Acordes são só para violão. Troque para Violão em Ajustes." bloqueia o início; as telas usam `GUITAR` sempre. Esconder exigiria mexer no menu/abas e trocar o modo global ao mudar de instrumento.
- Tabela curada: as 8 tríades e 11 tétrades abertas pedidas, com G = 320003, Em7 = 020000 e C7 = x32310 (o desenho que se ensina, **sem a quinta**, exceção declarada no teste); pestanas formas de Mi (maior, menor, 7, m7) e de Lá (maior, menor, 7, m7, 7M, m7(♭5)). Sem diminuto, sem inversões.
- Pestana na casa 1–12 (a casa 0 é o desenho aberto, que já existe para E, Em, E7, Em7, A, Am, A7, Am7); os dois desenhos coexistem como itens diferentes.
- Nome do acorde com **4 opções** (com distratores próximos: mesma fundamental ou mesma qualidade), não 12 notas + qualidade em dois passos.
- Monte o acorde pede **as casas presas do desenho pedido** (não "qualquer desenho com essas notas"); corda solta não precisa ser tocada; toque numa nota do acorde fora do desenho é neutro; nota fora do acorde encerra; sem "desistir". Antes do fim não aparece ○/×, pestana nem fundamental.
- Janela fixa (abertos 1–4; pestana `r−1`…`r+3`). Ela insinua a região, como a janela do M4; aceito em troca de caber em 360 px sem rolagem.
- Cordas soltas/abafadas numa **coluna lateral** (não numa casa 0), pestana como barra; marca nova `chord` preenchida.
- Grafia do nome pela regra do `spellScale` aplicada ao acorde (Automático = menos sinais), aceitando nomes como `A#m7(b5)` e `Ebm` que saem da regra; nenhum dobrado.
- Item = desenho × fundamental, igual para os dois exercícios (chaves separadas por exercício); opções do Nome do acorde sorteadas na fila, não guardadas.
- Rasgueado = `playPitches` com 40 ms entre cordas, depois de responder, e botão "Ouvir o acorde" (R). Sem som antes de responder.
- Ajustes globais `chordShapes` (padrão Abertas) e `chordKinds` (padrão Tríades), separados do `harmonySevenths` do M5 (aqui há "Todos").

## Fica a cargo de quem for construir

- Nomes de tipos e funções internas, desde que as chaves, as tabelas de desenhos e de grafia e as regras acima valham.
- Como o "acorde como escala" é passado ao `spellScale` (um `ScaleDef` montado a partir de `SCALES.major` com outros `semitones`/`letterSteps` é aceitável).
- O visual exato de `.mark--chord`, `.string-marks`, `.barre` e da legenda, seguindo `.mark`, `.string-labels`, `.legend` e `.swatch`.
- Onde ficam os textos (um `chordText.ts` como o `harmonyText.ts`).
- A distribuição exata do sorteio dos distratores, desde que use o `rng` injetado e as 4 opções sejam distintas.
