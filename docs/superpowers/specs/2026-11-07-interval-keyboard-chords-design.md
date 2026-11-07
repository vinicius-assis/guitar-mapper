# Intervalos: teclado A–G e atalho "Acordes" — Design

Data: 2026-11-07. Complementa `2026-11-04-intervals-exercise-design.md`.

## Origem e motivo

Comparamos o exercício Intervalos com o quiz de referência (`renatoleitebass.com/quiz-intervalos`, que embute `vnasc.github.io/interval-quiz`). Das lacunas encontradas, duas são pequenas, não mexem no modelo de dados e melhoram o uso diário:

1. No site dá para **responder digitando a nota** (A–G, Shift para acidental). No nosso app, as 12 notas só respondem ao clique ou toque; as teclas `1`–`9` não se aplicam a elas e as letras não fazem nada.
2. No site, o seletor de intervalos tem um atalho para os **intervalos de acorde** (3ªs, 5ª e 7ªs). No nosso app só existe "Todos" e é preciso marcar cinco chips à mão para voltar ao padrão.

## Objetivos

- Quem usa teclado físico (computador, tablet com teclado) responde uma pergunta de Intervalos sem tocar no mouse: letra da nota, Shift para sustenido, Enter para a próxima.
- Voltar ao conjunto "de acorde" (`3ª m, 3ª M, 5ª J, 7ª m, 7ª M`) é um toque, na tela de Foco do computador e na folha de Foco do celular e do tablet.

## Não objetivos

- Alterar o que o app guarda: nenhum ajuste novo, nenhuma migração. "Acordes" apenas grava a lista de intervalos que já existe (`settings.intervals`).
- Digitar notas em outros exercícios. As letras só valem na pergunta de Intervalos.
- Destacar as teclas de sustenido enquanto Shift está pressionado (o site faz). Fica para depois se fizer falta.
- Aceitar bemóis (`b`), nomes enarmônicos ou solfejo digitado ("do", "re"). Ver "Anti-objetivos".
- Mudar o resumo do Foco: o padrão continua descrito pela lista de intervalos, não por "Acordes".

## Anti-objetivos (falha, mesmo que "funcione")

- Uma letra responder a pergunta errada: `C` deve responder Dó/C, nunca outra nota. Shift mais uma letra sem sustenido (E, B) não pode responder a nota seguinte (F, C).
- A tecla responder depois de a pergunta já ter sido respondida, ou durante outra tela (Foco, Progresso, Ajustes), ou com um diálogo aberto.
- As letras roubarem teclas em campos de texto ou atrapalharem outros atalhos (`1`–`9`, Enter, R) dos demais exercícios.
- O app passar a mostrar nomes enarmônicos (Fá♭): o exercício trabalha com as 12 notas, sempre com sustenidos.

## Comportamento

### 1. Teclado A–G

Só vale quando há botões de nota na tela, isto é, na pergunta de Intervalos ainda não respondida.

| Teclas | Responde |
|---|---|
| `C` `D` `E` `F` `G` `A` `B` (maiúscula ou minúscula) | a nota natural: C, D, E, F, G, A, B (Dó, Ré, Mi, Fá, Sol, Lá, Si) |
| `Shift` + `C` `D` `F` `G` `A` | o sustenido: C#, D#, F#, G#, A# |
| `Shift` + `E` ou `B` | nada (E# e B# são F e C, que já têm tecla própria) |

- As letras são sempre as da cifra, qualquer que seja a notação escolhida (cifra, solfejo ou as duas). Em solfejo, `C` responde "Dó".
- O sustenido vem do Shift, não do Caps Lock.
- Depois de responder, as teclas de letra não fazem nada (os botões ficam desabilitados). `Enter` já leva à próxima pergunta, como nos outros exercícios.
- Segue as regras que o `useQuizShortcuts` já tem: ignorado com Ctrl, Alt ou Meta, com diálogo ou menu aberto, e quando o foco está em campo de texto.
- Tecla pressionada e mantida não responde duas vezes (depois da primeira resposta os botões já estão desabilitados).
- Efeito igual ao clique no botão: registra acerto ou erro, mostra o feedback e toca o som, porque a tecla aciona o botão que já está na tela.

Dica na tela, abaixo das 12 notas, em texto pequeno e discreto: `Teclado: A–G · Shift = ♯` (some depois de responder). Em tela de toque a dica continua visível; é inofensiva.

### 2. Atalho "Acordes"

- Novo chip **Acordes** ao lado de **Todos**, antes dos intervalos, no Foco (computador) e na folha de Foco (celular e tablet).
- Ao tocar, `settings.intervals` passa a ser exatamente `3m, 3M, 5J, 7m, 7M` (o `DEFAULT_INTERVALS` que já é o padrão do app). Não mexe em nada mais.
- Aparece marcado (`aria-pressed`) quando a seleção atual é exatamente esse conjunto, e desmarcado em qualquer outro caso. "Todos" continua marcado só com os 11 intervalos.
- Dica de acessibilidade/hover: `3ª, 5ª e 7ª`.

## Restrições

- Texto da interface em português.
- Reaproveita o que existe: `useQuizShortcuts` (aciona botões da tela), `useIntervalFocus` (edita o foco), `DEFAULT_INTERVALS`. Nenhuma biblioteca nova.
- Os testes atuais (inclusive o resumo do Foco e os atalhos dos outros exercícios) continuam passando sem alteração.

## Decisões minhas (a conferir)

- Sustenido só com Shift; bemol não existe. O app não tem bemóis em lugar nenhum e o spec original proíbe nomes enarmônicos.
- Letras sempre da cifra, mesmo em solfejo. A alternativa (digitar "do", "re") exige várias teclas por nota e não ajuda.
- Dica de texto fixa, em vez de destaque visual durante o Shift.
- O chip se chama **Acordes** e não "Notas do acorde" (o site) para caber na linha de chips sem quebrar.
- "Acordes" não cria um ajuste novo; também não aparece no resumo do Foco.

## Fora do escopo (continuam como lacunas conhecidas do site)

Direção do som (descendente) e interruptor de som; círculo de quintas; melhor sequência e tempo médio de resposta; contagem regressiva visível; nome do intervalo por extenso no estilo do site.
