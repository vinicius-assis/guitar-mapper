# Intervalos: sentido e interruptor do som, círculo de quintas, contagem regressiva e destaque do Shift — Design

Data: 2026-11-07. Complementa `2026-11-04-intervals-exercise-design.md` e `2026-11-07-interval-keyboard-chords-design.md`. Origem: lacunas em relação ao quiz de referência (`renatoleitebass.com/quiz-intervalos`, código em `vnasc.github.io/interval-quiz`).

## Objetivos

1. **Som e sentido.** Na pergunta de Intervalos, ligar e desligar o som e escolher se a resposta toca *subindo* (partida e depois chegada) ou *descendo* (chegada e depois partida).
2. **Círculo de quintas.** Mostrar, na pergunta, as 12 notas no círculo de quintas com a nota de partida marcada e, depois de responder, a de chegada, ligada à de partida, com a distância em semitons.
3. **Contagem regressiva.** Com avanço de 3 s ou 5 s, mostrar quanto falta para a próxima pergunta.
4. **Destaque do Shift.** Enquanto Shift está pressionado, destacar os botões que `Shift` + letra responde (C♯, D♯, F♯, G♯, A♯).

## Não objetivos

- Perguntas descendentes. A pergunta continua "nota + intervalo, sempre acima"; o sentido muda só a **ordem do som**.
- Som sintetizado como o do site. Usamos os samples do instrumento ativo, como hoje.
- Guardar o círculo ou a contagem em ajustes. Nenhum dos dois é configurável.
- Pontuação (melhor sequência, tempo médio): tratada à parte.
- Baixo de 5 e 6 cordas, idioma EN e mais de uma digitação no braço.

## Anti-objetivos (falha, mesmo que "funcione")

- O som tocar com o interruptor desligado, ou uma nota pendente soar depois de trocar o sentido, desligar o som ou sair da pergunta.
- A pergunta mudar de natureza (intervalo descendente) por causa do sentido do som.
- O círculo mostrar nomes enarmônicos (só sustenidos, como o resto do app) ou revelar a resposta antes de responder.
- A contagem mostrar um número diferente do tempo real do avanço automático ou continuar aparecendo depois de a pergunta mudar.
- O destaque do Shift ficar "preso" ao trocar de janela ou aba com Shift pressionado.

## Comportamento

### 1. Som e sentido

- Dois botões novos no topo da pergunta, à direita (acima da equação): **Som** e **Sentido**.
- **Som** liga/desliga o som do app inteiro: é o mesmo `soundEnabled` que existe em Ajustes, não um segundo interruptor. `aria-pressed` = som ligado. Texto: `Som`.
- **Sentido** alterna entre `Subindo` e `Descendo`. `aria-pressed` = descendo. Fica desabilitado com o som desligado. Texto do botão: `↑ Subindo` / `↓ Descendo`.
- Novo ajuste global `intervalDirection: 'up' | 'down'`, padrão `'up'`, opcional no armazenamento v2 (sem migração; valor inválido vira `'up'`).
- Ordem do som ao responder: `up` → partida e depois chegada (como hoje); `down` → chegada e depois partida. As alturas são as mesmas já calculadas por `intervalPitches` (dentro da faixa de samples do instrumento); só a ordem inverte.
- Trocar o sentido ou o som depois de responder não toca nada (vale na próxima resposta). Desligar o som cancela a nota pendente (o `SoundProvider` já faz isso).

### 2. Círculo de quintas

- Componente SVG com as 12 notas na ordem C, G, D, A, E, B, F♯, C♯, G♯, D♯, A♯, F, a partir do topo, no sentido horário, 30° entre uma e outra.
- Antes de responder: a nota de partida aparece destacada (cor de "partida", a mesma dos alvos do braço) e as outras discretas. Texto de apoio: `Responda para ver como as duas notas se ligam.`
- Depois de responder: a nota de chegada também destacada (cor de "correta") e uma linha reta liga as duas; legenda `N semitons acima` (`1 semitom acima` no singular).
- Rótulos pela notação do usuário; em `ambos`, só a cifra (cabe no círculo). `aria-label` do SVG descreve a partida e, depois de responder, a chegada.
- Fica abaixo do feedback e do botão "Próxima", em coluna única em todos os tamanhos; no computador não disputa espaço com o braço.
- Só desenho: sem cliques, sem estado.

### 3. Contagem regressiva

- Com avanço de 3 s ou 5 s e a pergunta respondida, o botão **Próxima** é acompanhado do texto `Próxima em Ns`, que cai de 3 (ou 5) até 1. Em avanço manual não aparece.
- Parte do mesmo instante em que o avanço automático começa e usa o mesmo tempo; nunca fica abaixo de 1 enquanto a pergunta está na tela.
- Texto em `aria-live="off"` (não anunciar a cada segundo ao leitor de tela).

### 4. Destaque do Shift

- Com Shift pressionado e a pergunta não respondida, os botões de sustenido (C♯, D♯, F♯, G♯, A♯) ganham um destaque (borda e fundo); soltar Shift, responder ou perder o foco da janela (`blur`) tira o destaque.
- Só visual: a resposta continua sendo feita pelo atalho de teclado já existente.

## Restrições

- Texto da interface em português. Reaproveita `useSound`/`SoundProvider`, `useAutoAdvance`, `intervalPitches`, `noteLabel`. Nenhuma biblioteca nova.
- Os testes atuais continuam passando sem edição, inclusive "answering right ... plays 36 then 43" (sentido padrão = subindo).
- O som e o sentido são lidos do estado do app (não do `settings` recebido por prop), para que a troca valha na hora.

## Decisões minhas (a conferir)

- **Som:** um único interruptor, o de Ajustes, em vez de um específico de Intervalos como no site. O site começa com o som desligado; o nosso mantém o padrão do app (ligado).
- **Sentido:** persistido como ajuste global opcional, não por sessão.
- **Círculo:** fica abaixo do feedback, sem tentar caber ao lado do braço.
- **Rótulo `ambos`:** só cifra no círculo.
- **Contagem:** texto discreto ao lado de "Próxima", sem barra de progresso.

## Fora do escopo

Pontuação (melhor sequência, tempo médio), baixo de 5 e 6 cordas, idioma EN, mais de uma digitação no braço.
