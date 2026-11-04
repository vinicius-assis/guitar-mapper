# Contrabaixo como segundo instrumento (design)

Data: 2026-11-04

## Intenção

Hoje o app ensina o braço do violão (6 cordas). Quem estuda contrabaixo precisa dos mesmos exercícios, só que no braço do baixo: 4 cordas, afinação E-A-D-G, com o som do próprio baixo. O app passa a ter dois instrumentos, **Violão** e **Baixo**, e tudo o que existe hoje funciona igual nos dois.

## Objetivos

- Escolher o instrumento em **Ajustes**. A troca é rara, então fica só ali e não ocupa espaço no cabeçalho.
- Todos os exercícios existentes funcionam nos dois instrumentos, sem mudar o comportamento: Estudar (posição → nota, nota → posição, flashcard), Ouvido (três níveis), Foco, Progresso, atalhos de teclado, layout responsivo (mobile, tablet, desktop), mão esquerda e notação.
- **Baixo:** 4 cordas, afinação E-A-D-G (da corda 1, a mais aguda, à corda 4: G, D, A, E), 24 trastes. Notas MIDI das cordas soltas: 43, 38, 33, 28.
- **Sons próprios:** o baixo usa samples de baixo (*Electric Bass (finger)*, FluidR3 via midi-js-soundfonts); o violão continua com os samples de nylon.
- **Progresso separado:** cada instrumento tem o seu progresso (caixas de repetição espaçada) e o seu histórico de sessões. Trocar de instrumento não apaga nem mistura nada.
- Quem já usa o app não perde dados: o que existe hoje vira "Violão".

## Fora do escopo

- Baixo de 5 ou 6 cordas, afinações alternativas, outros instrumentos (ukulele, etc.).
- Seletor de instrumento no cabeçalho ou na tela inicial.
- Estatísticas comparando os dois instrumentos.
- Mudar a notação, as regras de repetição espaçada ou o conteúdo dos exercícios.

## Anti-objetivos (seria falha, mesmo que "funcione")

- O progresso do baixo aparecer no violão, ou o contrário.
- Dados atuais do violão perdidos ou resetados na atualização.
- Som de violão tocando no modo baixo (ou o inverso), inclusive oitavas trocadas no Ouvido.
- Layout quebrado com 4 cordas: braço esticado, rótulos desalinhados, Foco mostrando 6 cordas.

## Decisões já tomadas (pelo usuário)

- 4 cordas, 24 trastes, progresso separado.
- Samples de baixo próprios, não reaproveitar os de violão.
- Seleção em Ajustes, troca pouco frequente.
- Dados atuais são mantidos e passam a ser do violão.
- Deve funcionar "exatamente como temos".

## Decisões minhas (marcadas, para você conferir)

1. **Modelo de instrumento.** Um objeto por instrumento com: `id` (`'guitar' | 'bass'`), nome exibido, número de cordas, afinação (notas `NoteIndex`), MIDI das cordas soltas e pasta de sons. O número de cordas deixa de ser a constante `STRING_COUNT = 6`; `MAX_FRET = 24` e `FIRST_QUIZ_FRET = 1` continuam compartilhados.
2. **Domínio recebe o instrumento.** As funções que hoje assumem violão (`noteAt`, `positionsInFilter`, `positionsOfNote`, `allPositions`, `parsePositionKey`, `pitchOf`, geração de perguntas) passam a receber o instrumento (ou a afinação e o número de cordas) em vez de usar valores fixos. O valor padrão continua sendo violão, para os testes atuais seguirem valendo.
3. **O que é por instrumento e o que é global.**
   - Por instrumento: `filter` (cordas e trastes do Foco), `progress` e `history`.
   - Global: notação, mão esquerda, som ligado/desligado, modo do exercício, nível do Ouvido e o próprio `instrument` escolhido.
   - O filtro é por instrumento porque as cordas disponíveis são diferentes; o padrão do baixo é as 4 cordas, trastes 1 a 5, só naturais (igual ao do violão).
4. **Armazenamento v2.** A chave passa a `guitar-mapper:v2` com `version: 2`, e os dados ficam em `instruments: { guitar: {filter, progress, history}, bass: {...} }`. Ao abrir o app, se existir `guitar-mapper:v1` válido e ainda não existir v2, os dados v1 são convertidos para `guitar` e gravados em v2. A chave v1 **não é apagada** (serve de backup). Dados v1 corrompidos seguem o fluxo de recuperação atual (backup + dados limpos).
5. **Validação de posições.** `parsePositionKey` e a sanitização do filtro aceitam apenas cordas de 1 até o número de cordas do instrumento ao qual pertencem. Chaves de posição não incluem o instrumento (o progresso já é separado por instrumento).
6. **Entrada do histórico.** Cada instrumento tem seu histórico; as entradas não precisam do campo instrumento.
7. **Áudio.** `SoundProvider` mantém um player por instrumento (criado sob demanda), com `urlFor` apontando para `sounds/<pasta>/<midi>.mp3`. Os arquivos do baixo ficam em `public/sounds/bass/28.mp3` … `67.mp3` (40 notas, E1 a G4), gerados por um script `scripts/extract-bass.mjs` a partir de `electric_bass_finger-mp3.js` (mesmo método do `extract-nylon.mjs`). A pasta entra no precache da PWA pelo padrão que já existe (`**/*.mp3`). Aviso de licença em `public/sounds/bass/LICENSE.txt`, no mesmo formato do de nylon, e a seção Créditos de Ajustes cita os dois.
8. **UI.** Os rótulos das cordas (`stringLabels`), o braço (`Fretboard`), os chips de cordas do Foco, o resumo do Foco ("Todas" quando todas as cordas do instrumento estão marcadas), `FindQuiz` e `Progress` usam as cordas do instrumento escolhido. O braço do baixo mantém o mesmo espaçamento entre cordas (fica mais baixo, com 4 linhas), sem esticar.
10. **Etiqueta do instrumento.** Uma etiqueta informativa com o nome do instrumento ativo ("Violão" ou "Baixo"): no cabeçalho do Estudar (celular e tablet), no topo da barra lateral (computador) e junto do título de Progresso e de Foco. Não é clicável nem troca de instrumento (decisão do usuário: só a etiqueta).
9. **Ajustes.** Novo grupo "Instrumento" com duas opções (Violão, Baixo), no mesmo estilo do grupo "Notação". Ao trocar, vale na hora para o próximo exercício; o histórico e o progresso mostrados passam a ser os do instrumento escolhido.

## O que fica para quem for construir

- Nome exato do arquivo e do tipo do objeto de instrumento, e como o instrumento atual chega aos componentes (contexto ou propriedade).
- Se existe sessão em andamento quando o instrumento muda (a tela de Ajustes é separada dos exercícios; confirmar que a sessão atual é descartada ou que a troca só ocorre fora dela).
- Texto de interface em português, igual ao resto (ex.: "Instrumento", "Violão", "Baixo").

## Testes esperados

- Domínio: notas, alturas (MIDI) e posições do baixo (cada corda solta e alguns trastes), filtro com 4 cordas, rejeição de corda 5 e 6 no baixo, perguntas de nota → posição e de ouvido com a faixa 28 a 67.
- Armazenamento: migração v1 → v2 (violão preservado, baixo vazio, v1 intacto), v2 válido, v2 corrompido (backup e dados limpos), padrão do filtro do baixo.
- Estado: gravar resposta e sessão no instrumento ativo; trocar de instrumento mostra o progresso e o histórico certos; nada vaza de um para o outro.
- Áudio: URL do sample usa a pasta do instrumento; todos os arquivos MIDI 28 a 67 existem em `bass/` (como o teste atual faz com `nylon/`).
- UI: Ajustes troca o instrumento; braço, rótulos (G D A E), Foco e Progresso refletem 4 cordas; os testes de layout responsivo seguem passando.
- Regressão: toda a suíte atual do violão continua passando sem alterações no comportamento.

## Tamanho do trabalho

Projeto médio, com este spec e depois um plano de implementação. Sem pendências de ferramenta: os samples vêm do mesmo repositório usado para o violão.
