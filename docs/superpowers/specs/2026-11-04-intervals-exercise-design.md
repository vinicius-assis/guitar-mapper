# Exercício de Intervalos (design)

Data: 2026-11-04

## Intenção

Hoje o app ensina **onde cada nota está** no braço (violão e baixo). O passo seguinte para quem quer criar linhas, acordes e improvisar é saber **como as notas se relacionam**: dada uma nota e um intervalo, qual é a outra nota, e onde ela está no braço. Este exercício é a primeira etapa disso. Ele é inspirado no quiz de intervalos de https://www.renatoleitebass.com/quiz-intervalos e funciona nos dois instrumentos.

## Objetivos

- Novo exercício **Intervalos** em Estudar, ao lado de Posição → nota, Nota → posição, Flashcard e Ouvido, para violão e baixo.
- **Pergunta (igual ao site):** "C + 5ª J → ?". O aluno escolhe a nota de chegada entre as **12 notas**. O intervalo é sempre ascendente.
- **Feedback em dois lugares ao mesmo tempo:** os botões (resposta certa em verde, a errada em vermelho) e o braço, que mostra a nota de partida e, depois de responder, **todas as posições** da resposta no braço do instrumento ativo, com um tracejado indicando o desenho do intervalo (por exemplo, uma corda acima e duas casas à frente para a quinta justa no baixo).
- **Foco de intervalos:** o aluno marca quais intervalos treinar (com atalho "Todos") e se as notas de partida são só naturais ou também acidentais.
- **Avanço:** manual, 3 s ou 5 s após responder.
- **Som:** depois de responder, toca a nota de partida e a de chegada, em sequência, com os sons do instrumento ativo (violão ou baixo).
- **Histórico:** as sessões de Intervalos entram no histórico do instrumento, como as dos outros exercícios.
- Funciona com tudo o que existe: notação (cifra, solfejo ou os dois), mão esquerda, atalhos de teclado, layouts de celular, tablet e computador, etiqueta do instrumento e progresso separado por instrumento.

## Fora do escopo (etapas futuras)

- Perguntas no sentido inverso (identificar o intervalo entre duas notas) e o modo **por desenho** (tocar o intervalo no braço a partir de uma posição). Já está decidido que o exercício terá os dois jeitos, mas só depois desta primeira etapa.
- Repetição espaçada e mapa de domínio por intervalo (o site também não tem). O Progresso só mostra o histórico de sessões.
- Ouvido de intervalos (ouvir duas notas e dizer o intervalo).
- Intervalos descendentes e compostos (acima da oitava), círculo de quintas, baixo de 5 e 6 cordas.

## Anti-objetivos (falha, mesmo que "funcione")

- Respostas erradas por grafia: o exercício trabalha com notas (0 a 11), nunca com nomes enarmônicos como "Fá♭".
- O braço mostrar posições que não existem no instrumento ativo (por exemplo, cordas 5 e 6 no baixo).
- Quebrar qualquer exercício existente, o histórico atual ou os dados salvos.
- Misturar as sessões de Intervalos de um instrumento com as do outro.

## Decisões já tomadas (pelo usuário)

- Começar com a funcionalidade igual à do site: nota de partida + intervalo → escolher a nota entre as 12.
- Os dois jeitos de treinar (por nome e por desenho) serão contemplados no futuro; esta etapa é o por nome.
- Violão e baixo.
- Aprovou as telas do mockup (Estudar, Pergunta, Foco de intervalos).

## Decisões minhas (marcadas, para você conferir)

1. **Intervalos oferecidos:** os 11 do site, nomes em português com siglas curtas: 2ª m (2m), 2ª M (2M), 3ª m (3m), 3ª M (3M), 4ª J (4J), Trítono (4A/5d), 5ª J (5J), 6ª m (6m), 6ª M (6M), 7ª m (7m), 7ª M (7M); em semitons, de 1 a 11. Padrão do Foco: 3ª m, 3ª M, 5ª J, 7ª m e 7ª M (igual ao site).
2. **Notação das notas:** o app já mostra acidentais com sustenido (C#, D#, F#...), então a pergunta e as opções também usam sustenido. As 12 notas aparecem como botões, no mesmo estilo de notação do app (cifra, solfejo ou "C · Dó").
3. **Nota de partida:** "só naturais" (padrão) ou "com acidentais", reaproveitando a opção que já existe no Foco (`filter.naturalsOnly`). A resposta pode ser qualquer das 12 notas, mesmo com partida natural. As cordas e casas do Foco **não** se aplicam a este exercício (a posição vem do braço inteiro) e ficam ocultas no Foco quando o modo é Intervalos.
4. **Ordem das perguntas:** aleatória, sem repetir a mesma combinação (nota de partida + intervalo) em sequência. Uma sessão tem tantas perguntas quantas combinações (partida × intervalo marcados), como as outras sessões usam todas as posições do foco.
5. **O braço do exercício:** mostra as casas de 0 a 12 por padrão (como o site) e acompanha a largura do container como os outros braços. As posições com a corda solta (casa 0) aparecem, mesmo que os outros exercícios comecem na casa 1. Se o desenho tiver espaço, no computador o braço pode mostrar mais casas (decisão do construtor, seguindo o que o Fretboard já faz com `fit` e `expand`).
6. **Posições da resposta:** o braço marca a partida (todas as posições da nota de partida) e, ao responder, todas as posições da resposta. O tracejado liga **uma** posição de partida a uma posição da resposta que esteja exatamente o intervalo acima (a altura da resposta é a da partida mais os semitons, nunca uma oitava a mais ou a menos), escolhendo o par de menor distância no braço (corda e casa). Se nenhum par couber nas casas exibidas, não há tracejado.
7. **Som:** toca a partida e a chegada, em sequência (a chegada sempre mais aguda), escolhendo as alturas dentro da faixa dos samples do instrumento (baixo: MIDI 28–67; violão: 40–88). Se um intervalo não couber no registro, a chegada sobe ou desce de oitava para caber (a nota continua a mesma).
8. **Avanço:** novo ajuste global `intervalAdvance: 'manual' | '3s' | '5s'`, padrão `'manual'` (igual ao site). Em manual, uma seta leva à próxima pergunta, como hoje no botão "Próxima". Com 3 s ou 5 s, a próxima pergunta vem sozinha depois da resposta, certa ou errada. Atenção: no Escolha atual, acertar avança sozinho após 700 ms; neste exercício o avanço segue o ajuste.
9. **Dados:**
   - `QuizMode` ganha `'interval'`.
   - Configurações globais ganham `intervals: IntervalId[]` (os intervalos do Foco) e `intervalAdvance`. São globais porque a teoria é a mesma nos dois instrumentos; o resto do Foco (cordas e casas) continua por instrumento.
   - Entradas de histórico aceitam `mode: 'interval'`.
   - O formato salvo segue na versão 2; os campos novos são opcionais e têm padrões quando faltam, então dados atuais abrem sem migração.
10. **Etiquetas:** Estudar ganha o botão "Intervalos" (com descrição). No computador, a faixa de exercícios passa de 4 para 5 botões; o construtor confirma que cabe sem quebrar o layout.
11. **Acessibilidade e atalhos:** `1`–`9` já escolhem opção nos outros exercícios; aqui as 12 notas não cabem em 9 atalhos, então o construtor mantém os atalhos existentes (Enter, Esc) e deixa as notas acessíveis por toque, tab e leitor de tela. Atalhos numéricos para as notas ficam fora desta etapa.

## O que fica para quem for construir

- Nomes de arquivos e tipos (`Interval`, `IntervalId`, `buildIntervalQuestion`, tela `IntervalQuiz`) e onde a lista de intervalos mora no domínio.
- Como desenhar o tracejado e escolher a posição de partida mais próxima.
- Como o Foco troca de conteúdo conforme o modo (hoje mostra cordas e casas).
- Textos em português: descrição do exercício, rótulos dos botões, mensagens de feedback.

## Testes esperados

- Domínio: para cada um dos 11 intervalos, `(partida + semitons) % 12` correto; pergunta com 12 opções sem repetição; sem repetir a combinação anterior; filtro de partida natural ou com acidentais; alturas de som dentro da faixa do instrumento (baixo e violão) para todos os intervalos e notas de partida.
- Estado: `intervals` e `intervalAdvance` com padrões, salvos e lidos; dados salvos sem esses campos abrem com os padrões; `mode: 'interval'` válido no histórico e na sanitização.
- UI: Estudar mostra "Intervalos"; a pergunta, o feedback certo e o errado (botões e braço); o Foco de intervalos (marcar, "Todos", naturais/acidentais, avanço) e a ocultação de cordas/casas; braço com 4 cordas no baixo e 6 no violão; avanço de 3 s e 5 s com timers falsos; som tocando as duas notas (player falso).
- Regressão: toda a suíte atual (343 testes) continua passando, incluindo layout responsivo e atalhos.

## Tamanho do trabalho

Projeto médio: spec, plano e execução por etapas, como o do baixo. Sem dependências novas.
