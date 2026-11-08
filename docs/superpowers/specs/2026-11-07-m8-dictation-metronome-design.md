# M8 Ditado melódico e metrônomo — Design

Data: 2026-11-07. Nono marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item), do M2 (grafia), do M3 (faixa de ouvido `EAR_RANGE`, `playSequence`, `drawPitch`/`shuffled`, o padrão "som é a pergunta" de Ouvir intervalos) e do M4 (desenhos de escala `scaleBox`, `scaleTitle`, o padrão "toque as notas" de Toque a escala). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

O M3 treinou o ouvido em pedaços: duas notas (intervalo) ou uma nota contra a tônica (grau). Tocar de ouvido de verdade é juntar os pedaços: ouvir uma frase curta e achá-la no instrumento. O **ditado melódico** é exatamente isso, e o app já tem tudo para ele: escalas e desenhos (M4), uma faixa de ouvido segura por instrumento (M3), sequências de notas no tempo (`playSequence`) e o braço que aceita toques.

O segundo item, o **metrônomo**, não é um exercício: é uma ferramenta para praticar escalas, arpejos e acordes (M4–M7) no instrumento real com pulso estável. Ele precisa de um relógio preciso, que `setTimeout` não dá; por isso usa o relógio do `AudioContext` com agendamento antecipado ("dois relógios"), e o clique é sintetizado (oscilador), sem nenhum arquivo novo no cache do PWA.

## Objetivos

1. **Ditado melódico** (`dictation`, trilha Ouvido, violão e baixo): o app toca de 4 a 8 notas de uma escala, dentro de um desenho do M4 e da faixa de ouvido do instrumento; o aluno toca as notas no braço, na ordem. Vale a **altura exata**, em qualquer corda. "Ouvir de novo" sem limite.
2. **Três níveis** (Fácil, Médio, Difícil) que mudam escalas, tamanho da melodia e tamanho dos saltos; nível gravado no histórico, como os modos de Ouvido.
3. **O ditado entra na revisão espaçada do M1** (progresso por item do instrumento ativo, sessão de até 20).
4. **Metrônomo** na tela Ajustes: Iniciar/Parar, andamento de 40 a 220 BPM, acento opcional no primeiro tempo (compasso de 2, 3, 4 ou 6, ou sem acento). Clique sintetizado, agendado no relógio do áudio, que para ao esconder a aba e ao sair da tela.

## Não objetivos

- Ditado rítmico (durações diferentes, pausas), ditado com acordes ou duas vozes (polifonia), ditado sem escala (cromático), escolher a escala, a tônica ou o desenho na tela de início.
- Responder por nome de nota ou grau (botões); teclado de piano; responder tudo e corrigir no fim; segunda chance depois do erro.
- Microfone: detectar a nota tocada no instrumento real, afinador, detectar o andamento (tap tempo ou pelo som).
- Metrônomo tocando **durante** um exercício, em segundo plano ou com a tela bloqueada; subdivisões (colcheias, tercinas), volume próprio, sons de clique escolhíveis, pulso visual (luz piscando), contagem antes de começar, treinador de andamento (acelerar sozinho).
- Mapa de domínio dos itens de ditado no Progresso.
- Mudar `scales.ts`, `scaleItems.ts`, `earTraining.ts`, `player.ts`, os exercícios atuais, seus testes ou suas chaves.

## Anti-objetivos (falha, mesmo que "funcione")

- Uma nota do ditado fora da escala, fora do desenho sorteado ou fora de `EAR_RANGE` do instrumento ativo (pedido de MP3 inexistente ou nota grave/aguda demais), em qualquer escala × tônica × desenho × nível × sorteio, no violão ou no baixo.
- Acerto decidido pela corda ou pela grafia: a mesma altura em outra corda é certa; a mesma nota em outra oitava é errada.
- Revelar a melodia antes de terminar: nomes, graus, alturas ou posições das notas em DOM, `aria-label`, `title` ou `data-*` (o `aria-label` das casas continua só "Corda N, casa F"); a fila e a pergunta guardam as alturas, a tela não as escreve.
- O som final (a melodia tocada de novo ao terminar) ser cortado pelo avanço automático (o bug do M7): o atraso do avanço é calculado pelo tamanho da melodia e é maior que a duração do som final.
- Som do ditado continuar depois de sair da pergunta (desmontar cancela o agendado), ou o metrônomo continuar depois de sair de Ajustes, de trocar de aba do app ou de esconder a aba do navegador.
- O metrônomo atrasar, adiantar ou acumular deriva por depender de `setTimeout`, repetir um clique (agendar duas vezes o mesmo tempo) ou disparar uma rajada de cliques atrasados ao voltar de um travamento.
- O cache do PWA crescer: nenhum arquivo novo em `public/`, nenhum áudio novo.
- O braço cortar notas ou exigir rolagem horizontal num celular de 360 px (só com `fit` e `minFretWidth={40}`).
- Um dado salvo ou exportado antes do M8 deixar de carregar ou ser regravado ao carregar; chaves `dict:` válidas descartadas ao carregar.
- Mexer no comportamento ou nos testes dos 17 exercícios atuais (só mudam asserções de lista exata de modos/trilhas/abas e os títulos "17 exercises").

## Comportamento

### 1. Registro: um modo na trilha Ouvido

- Modo `dictation` (**Ditado melódico**), registrado como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- **Sem trilha nova.** A trilha **Ouvido** passa a `['ear', 'ear-interval', 'ear-degree', 'dictation']`. `QUIZ_MODES` ganha `'dictation'` no fim (depois de `'ii-v-i'`). No computador as abas mostram os 18 exercícios (na ordem das trilhas: o Ditado aparece depois de Ouvir graus); no celular o menu agrupa por trilha.
- Descrição (tela de início): "Ouça uma melodia curta dentro de uma escala e toque as notas no braço, na ordem. A melodia começa numa das tônicas marcadas. Vale a nota certa em qualquer corda; uma nota errada encerra a pergunta."
- `recordsPositionProgress: false`, `usesFocus: false`; uma posição vinda do Progresso não inicia. **Som desligado:** não inicia, com a mensagem do Ouvido ("Ligue o Som em Ajustes para treinar de ouvido.").
- Histórico com nível: `dictation` entra em `LEVELED_MODES` e o exercício tem `historyLevel` = `dictationLevel` ("Ditado melódico · Médio").

### 2. Níveis, itens e chaves

| nível | escalas | notas | salto máximo | itens |
|---|---|---|---|---|
| Fácil | pentatônica maior, pentatônica menor | 4 | 2 posições | 24 |
| Médio | maior, menor natural | 6 | 2 posições | 24 |
| Difícil | maior, menor natural, dórico, frígio, lídio, mixolídio, lócrio | 8 | 3 posições | 84 |

- Textos do nível (tela de início): Fácil "4 notas das pentatônicas maior e menor, em passos curtos."; Médio "6 notas das escalas maior e menor natural."; Difícil "8 notas da escala maior, da menor ou de um modo, com saltos maiores."
- **Item:** `{ scale, root, length }` (escala × tônica 0–11 × tamanho do nível). Chave `dict:<escala>:<tônica>:<tamanho>`. O tamanho identifica o nível; maior e menor natural aparecem no Médio (`:6`) e no Difícil (`:8`) como itens diferentes. Pool = escalas do nível × 12 tônicas (na ordem da tabela), tamanhos calculados por script: 24, 24, 84. A tônica entra na chave pelo mesmo motivo do M3: sem ela o Fácil teria 2 itens.
- O **desenho** não é parte do item: é sorteado (com o `rng`) a cada pergunta, entre 1 e o número de desenhos da escala.

### 3. Melodia (domínio puro)

- **Notas disponíveis** = as alturas distintas do desenho (`scaleBox(escala, desenho, tônica, instrumento)`) dentro de `EAR_RANGE` do instrumento, em ordem crescente. Conferido por script e por teste: em toda escala × desenho × tônica, há ao menos 10 notas e 2 tônicas no violão, 6 notas e 1 tônica no baixo; nenhum desenho precisa ser descartado.
- **Geração** (passeio pela lista, com o `rng` injetado; cada sorteio é `lista[min(n − 1, floor(rng() · n))]`):
  1. primeira nota: uma das tônicas da lista;
  2. cada nota seguinte: uma posição da lista a distância de 1 até o salto máximo do nível (nunca a mesma nota duas vezes seguidas; a mesma nota pode voltar depois).
- **Propriedades conferidas por teste exaustivo** (instrumento × nível × escala × tônica × desenho × `rng` constante 0, 0,5 e 0,999999, mais um gerador semeado): tamanho certo; toda nota na escala, no desenho e em `EAR_RANGE`; primeira nota é tônica; sem repetição seguida; salto ≤ máximo; e o sorteio do desenho dá 1 com `rng` 0 e o último com 0,999999.
- Referências: violão, A pentatônica menor desenho 1 → notas `45 48 50 52 55 57 60 62 64 67 69 72`; com `rng` 0,5 a melodia de 4 é `57 60 62 64` (A C D E). C maior desenho 1 → 17 notas de 48 a 76 (o 77 da casa 13 da 1ª corda fica de fora da faixa). Baixo, C♯ pentatônica maior desenho 3 → `34 37 39 41 44 46` (o caso mais curto).
- **Som:** nota i em `i × 600 ms` (`DICTATION_GAP_MS`). Duração da melodia = `(tamanho − 1) × 600` ms.

### 4. Tela do ditado

- `p.prompt` "Toque a melodia"; `p.scale-title` com `scaleTitle` do M4 ("A pentatônica menor · desenho 1"); `p.scale-remaining` (`aria-live="polite"`) "Faltam N notas" (N = tamanho − notas já certas).
- A melodia toca sozinha ao abrir (`playSequence`); botão grande `.ear-play` **"Ouvir de novo"** (atalho R) repete, sem limite, antes e depois de responder; repetir cancela o pendente.
- **Braço:** instrumento ativo, janela do desenho (`fretMin..fretMax` do `scaleBox`), `fit`, `minFretWidth={40}`, `stringLabels`, canhoto. Antes de terminar mostra só as **tônicas do desenho** como `root` sem rótulo e as casas já tocadas certas como `scale` sem rótulo. Toda casa da janela é tocável.
- **Cada toque** (compara a altura `pitchOf(casa, instrumento)` com a próxima nota da melodia):
  - igual → conta; se não for a última, toca o som da casa (`playPosition`);
  - diferente → `wrong`, a pergunta acaba errada.
- **Fim:** a melodia toca de novo (`playSequence`, som final). Acertou → "Correto! Melodia completa." e avança sozinho depois de `dictationAdvanceMs(tamanho) = (tamanho − 1) × 600 + 1000` ms (2800, 4000, 5200 ms), sempre depois do fim do som final. Errou → "Errado. A 2ª nota era C, não D." (esperada pela grafia da escala, tocada por `noteLabel`, como o M4) e Próxima. Nos dois casos: cada nota da melodia aparece no braço com o rótulo do grau (`SCALES[escala].degrees`), `scale` se foi tocada certa (na casa tocada) ou `hint` se faltou (na casa do desenho); a casa errada como `wrong`; as tônicas que não são da melodia continuam `root`; uma casa só tem uma marca. Detalhe `p.ear-detail` "Melodia: A C D E · 1 ♭3 4 5" (nomes pela grafia da escala, notação do ajuste).
- **Desmontar a tela cancela** o som agendado (`playSequence([])`), com o `SoundProvider` ainda montado. O Study remonta a tela a cada pergunta (`key`), então nada vaza entre perguntas.
- Teclado: Enter = Próxima; R = `.ear-play`. Sem `data-shortcut` novo.

### 5. Baixo

- Funciona igual, com o desenho de 4 cordas do M4 e `EAR_RANGE` do baixo (33–60). Progresso no mapa do baixo. Nenhum aviso, nenhum bloqueio.

### 6. Metrônomo

- **Onde:** uma seção **"Metrônomo"** na tela **Ajustes**, entre "Meta semanal" e "Dados". Funciona sem sessão de estudo e sem depender do ajuste Som.
- **Controles** (alvos de toque ≥ 48 px, celular primeiro):
  - número grande do andamento ("80 BPM");
  - botões **−5, −1, +1, +5** (`aria-label` "Diminuir 5 BPM" etc.) e um controle deslizante 40–220 (`aria-label` "Andamento (BPM)");
  - grupo **Compasso** (`role="group"`, `aria-pressed`): "Sem acento", "2", "3", "4", "6" (padrão 4);
  - botão **Iniciar / Parar** (`aria-pressed`), em largura total;
  - dica "Para sozinho quando você sai desta tela ou do app."
- Andamento e compasso ficam salvos (ajustes globais `metronomeBpm`, padrão 80, e `metronomeBeats`, padrão 4). Mudar o andamento ou o compasso com o metrônomo tocando vale a partir do próximo clique; mudar o compasso recomeça a contagem (o próximo clique é acentuado).
- **Relógio ("dois relógios"):** um `setInterval` de 25 ms acorda o agendador, que agenda no relógio do `AudioContext` todos os cliques que caem nos próximos 100 ms. A conta é uma função pura, `scheduleWindow(estado, { now, lookAhead, bpm, beatsPerBar })` → `{ clicks: { time, accent }[], estado }`:
  - o próximo clique é `startAt` (o primeiro) ou `último + 60 / bpm` (com o bpm **atual**, então a troca de andamento vale no próximo clique);
  - agenda enquanto `próximo < now + lookAhead`; cada clique agendado vira o "último", então chamar de novo com o mesmo `now` não repete nada;
  - cliques mais de 50 ms no passado (aba travada, timer atrasado) são **pulados**, mas contam no compasso (o acento continua no lugar certo);
  - acento quando `beatsPerBar > 1` e a contagem do clique é múltipla de `beatsPerBar`.
- **Clique sintetizado:** um oscilador senoidal curto (1600 Hz acentuado, 1000 Hz normal) com envelope de ganho (sobe em 2 ms, cai exponencialmente até 50 ms, para em 60 ms). Nenhum arquivo, nenhum `fetch`.
- **iPhone:** o `AudioContext` do metrônomo é próprio (não o do `NotePlayer`), criado e retomado (`resume()`) dentro do toque em Iniciar, como `SoundProvider.unlock` faz no Iniciar do Study. Sem Web Audio, Iniciar mostra "Este navegador não toca o metrônomo." e nada quebra.
- **Para sozinho:** ao esconder a aba (`visibilitychange` com `document.visibilityState === 'hidden'`) e ao desmontar a seção (trocar de aba do app). Ao parar, os osciladores já agendados e ainda não tocados são parados. Não volta sozinho: o aluno toca Iniciar de novo (que também é o gesto que o iPhone exige).

### 7. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão, sem migração, sem regravar ao carregar:
  - `sanitizeSettings`: `dictationLevel` (`easy|medium|hard`, padrão `easy`), `metronomeBpm` (inteiro 40–220, padrão 80), `metronomeBeats` (1, 2, 3, 4 ou 6, padrão 4); ausentes ou inválidos valem o padrão. `mode` aceita `dictation` (via `QUIZ_MODES`).
  - Mapa por item (`isItemKey`): aceita `dict:<escala>:<0–11>:<4|6|8>` quando a escala pertence ao nível daquele tamanho (pentatônicas com 4; maior/menor com 6; as 7 de sete notas com 8), sem zeros à esquerda; o resto é descartado, como hoje.
  - Histórico: aceita `dictation`, com `level` (padrão `easy` se ausente ou inválido).
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro (braço com `fit` + `minFretWidth={40}` em 360 px, sem rolagem horizontal; metrônomo com alvos ≥ 48 px).
- Nenhum arquivo novo em `public/`; `vite.config.ts` não muda.
- `scales.ts`, `scaleItems.ts`, `earTraining.ts`, `player.ts`, `SoundProvider.tsx`, `useQuizShortcuts.ts`, `Fretboard.tsx` não mudam: o módulo novo só os consome.
- Nenhuma cor nova: o ditado usa as marcas `root`, `scale`, `hint` e `wrong` existentes; o metrônomo usa `.primary`, `.level-bar` e os tokens atuais. Se a implementação precisar de uma cor nova, ela entra nos dois temas (`:root` escuro e `@media (prefers-color-scheme: light)`) com contraste ≥ 4,5:1 calculado por script.
- Acerto por altura exata; a grafia é só exibição. Sorteios só pelo `rng` injetado; o relógio do metrônomo é injetado (contexto e timer falsos nos testes).
- Tabelas de teste literais, geradas por script independente (Python, sem importar o TS) e nunca recalculadas pelo código testado.
- Sem reformatar arquivos existentes (aspas simples, sem mudar vírgulas ou quebras fora das linhas da tarefa).
- Os 17 exercícios atuais não mudam; só mudam asserções de lista exata (`exercises.test.ts`: `QUIZ_MODES` e a trilha Ouvido; `Study.test.tsx`: menu e abas com 18, `labels('Ouvido')`, títulos "17 exercises" → "18 exercises").

## Decisões minhas (a conferir)

- **Ditado na trilha Ouvido** (sem trilha nova), id `dictation`, nome "Ditado melódico", no fim de `QUIZ_MODES` e da trilha Ouvido.
- **Resposta tocando no braço**, na ordem, em vez de escolher nomes ou graus: é o "reproduzir no instrumento" que o ditado treina e reaproveita o padrão do M4. O braço mostra a **janela de um desenho** da escala (por isso a melodia é gerada dentro do desenho): toda nota cabe nela e a tela cabe em 360 px.
- **Acerto pela altura exata** (não pela classe de altura): numa melodia a oitava faz parte do contorno, e acertar a nota na oitava errada é errar a frase. Como a comparação é pela altura, qualquer corda vale (C maior desenho 1: o 72 na 1ª corda casa 8 ou na 2ª casa 13).
- **Erro encerra a pergunta** no primeiro toque errado (como Toque a escala e Arpejo), sem segunda chance.
- **Tônicas do desenho marcadas antes** e **melodia sempre começando numa tônica**: dá a referência que um ditado precisa sem revelar a melodia (o aluno ainda precisa achar qual tônica, ou seja, a oitava).
- **Item = escala × tônica × tamanho** (o tamanho identifica o nível); o desenho é sorteado por pergunta. Pools 24 / 24 / 84.
- Níveis: Fácil pentatônicas, 4 notas, saltos de até 2 posições; Médio maior e menor natural, 6 notas, até 2; Difícil as 7 escalas de sete notas, 8 notas, até 3. Blues fica fora (a blue note é cromática e confunde no início).
- **600 ms** entre as notas em todos os níveis; "Ouvir de novo" **sem limite** (como o M3).
- **Som final em acerto e erro** (a melodia de novo) e avanço automático só depois dele: `(tamanho − 1) × 600 + 1000` ms. Ao acertar, o último toque não toca o som da casa (a melodia final começa na hora).
- Nível do ditado gravado no histórico (`LEVELED_MODES`), como os modos de Ouvido.
- **Metrônomo em Ajustes**, como seção própria, e não numa aba nova ou na tela de início dos exercícios: não muda a navegação, não disputa os atalhos do Study e não toca junto com os exercícios. Para ao sair da tela.
- Metrônomo **independente do ajuste Som** (Iniciar já é um pedido explícito de som) e com `AudioContext` próprio.
- Clique senoidal 1600/1000 Hz com envelope de 60 ms; agendamento 25 ms / 100 ms; cliques atrasados mais de 50 ms são pulados; compasso "Sem acento", 2, 3, 4, 6 (padrão 4); 80 BPM padrão; andamento e compasso salvos.
- Ao voltar para a aba, o metrônomo **não** recomeça sozinho.

## Fica a cargo de quem for construir

- Nomes de tipos e funções internas, desde que as chaves, os níveis, as regras de geração e de agendamento acima valham.
- O visual exato da seção do metrônomo (seguindo `.level-bar`, `.primary`, `.hint`) e se o controle deslizante tem rótulos de mínimo e máximo.
- Onde ficam os textos novos (um `dictationText.ts` ou funções em `scaleText.ts`, desde que `scaleText.ts` só ganhe linhas).
- Se o motor do metrônomo é um módulo com fábrica (`createMetronome(deps)`) ou uma classe, desde que `scheduleWindow` seja pura e o relógio e o timer sejam injetáveis.
