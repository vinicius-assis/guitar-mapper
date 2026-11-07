# M1 Revisão espaçada e metas — Design

Data: 2026-11-07. Segundo marco do plano de 12 meses; depende do M0 (registro de exercícios, `itemKey` por exercício, exportar/importar).

## Origem e motivo

O app já tem o agendador de revisão espaçada (`src/domain/scheduler.ts`: 5 caixas de Leitner, `applyAnswer`, `pickNext`), mas ele **nunca é usado para escolher perguntas**: a sessão é um sorteio uniforme de todas as posições do foco (`buildQueue`), às vezes mais de 100 perguntas. Além disso, só os três modos de posição guardam o que o usuário sabe; Ouvido e Intervalos não guardam nada. E não existe noção de dia nem de constância, que um plano de 12 meses precisa para ser sustentado.

O usuário não tem uma rotina medida (não sabe a média de sessões por semana), então os valores iniciais abaixo são sugestões e ajustáveis. O uso é principalmente no celular.

## Objetivos

1. **Sessões curtas que priorizam o que precisa ser revisto.** Cada sessão tem até 20 perguntas, escolhidas pelo agendador: o que está vencido ou foi errado, o que ainda não foi visto e, por último, o que já se sabe.
2. **Todos os modos guardam progresso.** Ouvido e Intervalos passam a registrar acerto e erro por item, para entrarem na mesma revisão.
3. **Constância visível.** Dias seguidos, dias estudados na semana contra uma meta, e tempo médio por resposta, no Progresso. A meta semanal é em **dias estudados** e é ajustável em Ajustes.

## Não objetivos

- Cronômetro por pergunta e modo cronometrado (ficam para depois).
- Meta em quantidade de perguntas, lembretes e notificações.
- Mapa de domínio (mastery) para Ouvido e Intervalos no Progresso: eles só guardam o progresso para a revisão. A tela de Progresso por posição continua só para posições.
- Mudar a tela de Foco, o histórico de sessões ou as regras das caixas de Leitner (`BOX_INTERVALS_MS` continua o mesmo).
- Tamanho de sessão configurável: fixo em 20.

## Anti-objetivos (falha, mesmo que "funcione")

- Alterar, perder ou reinterpretar o progresso por posição já gravado.
- Uma sessão repetir o mesmo item, ou ficar menor que o necessário havendo itens suficientes, ou ficar vazia com o foco não vazio.
- Uma sessão só de itens já dominados quando há itens vencidos ou novos disponíveis (a revisão deve de fato priorizar).
- Os dias seguidos quebrarem por causa de fuso horário, meia-noite ou horário de verão (a data é a local do aparelho), ou quebrarem antes de o dia de hoje acabar.
- O armazenamento crescer sem limite com os dias.
- Mudar o que as perguntas de cada modo fazem, os atalhos ou o texto dos exercícios.

## Comportamento

### 1. Sessão de até 20 perguntas, montada pela revisão

- A fila é montada por uma função pura que recebe os itens candidatos do exercício (os mesmos de hoje: posições do foco; no Ouvido, uma por altura; em Intervalos, nota × intervalo), o progresso, a hora atual e o gerador de números aleatórios, e devolve até 20 itens **sem repetição**.
- Três grupos, como no `pickNext` atual: **vencidos** (já vistos e com a revisão no passado, incluindo erros recentes na caixa 1), **novos** (nunca vistos) e **resto** (vistos e ainda não vencidos). Pesos iniciais 50% / 30% / 20%. Se um grupo tiver menos itens que a sua cota, a sobra é redistribuída para os outros, na mesma ordem de prioridade (vencidos, novos, resto).
- Dentro de cada grupo a escolha é aleatória; vencidos há mais tempo não têm prioridade especial.
- A fila final é embaralhada, com as regras de hoje por modo: no Ouvido, sem a mesma nota seguida e uma pergunta por altura; nos modos de posição e em Intervalos, o que já existe para evitar repetição consecutiva.
- Se há menos de 20 itens candidatos, a sessão tem todos eles.
- Posição vinda do Progresso (`forced`) continua abrindo a sessão pela posição escolhida, que conta como parte dos 20.
- Na tela de início, ao lado da contagem do Foco, o texto informa o tamanho real da sessão ("Sessão de 20 perguntas" ou "Sessão de N perguntas" se N < 20).
- Dentro da sessão um item não volta, mesmo errado; ele fica vencido para a próxima sessão.

### 2. Progresso por item em Ouvido e Intervalos

- Novo mapa por instrumento, ao lado de `progress`, com o mesmo formato de cada entrada (caixa, acertos, erros, última e próxima revisão). Chaves por exercício: Ouvido `ear:<altura MIDI>`; Intervalos `interval:<nota de partida>:<intervalo>`. A chave vem do `itemKey` que o M0 já declarou em cada exercício.
- Responder grava acerto ou erro no item, com a mesma regra das caixas de hoje.
- Os três modos de posição continuam usando o mapa de posições existente (`progress`), compartilhado entre eles como hoje. Nada do `progress` atual muda.
- Restaurar um arquivo exportado antes do M1 (sem o campo novo) funciona: o campo ausente vale vazio.

### 3. Constância

- Uma sessão conta como **dia estudado** quando termina (terminar ou Finalizar) com ao menos uma pergunta respondida. A data é a **local** do aparelho, no formato `AAAA-MM-DD`.
- Registro global (não por instrumento): por dia, quantas sessões, perguntas respondidas, acertos e tempo total de resposta. Entradas com mais de 400 dias são descartadas ao gravar.
- **Dias seguidos:** quantidade de dias consecutivos estudados terminando hoje, ou terminando ontem se hoje ainda não foi estudado (a sequência só quebra quando um dia inteiro passa sem estudo).
- **Semana:** de segunda a domingo (calendário local). Mostra "N de META dias" para a semana atual.
- **Tempo médio por resposta:** média das respostas dos últimos 7 dias (soma dos tempos dividida pelas respostas), formatada com o `formatSeconds` que já existe. Sem respostas nos 7 dias, não mostra o valor.

### 4. Onde aparece

- **Progresso:** um bloco "Constância" no topo, com dias seguidos, "N de META dias esta semana" e o tempo médio dos últimos 7 dias. Texto neutro quando ainda não há dados ("Termine uma sessão para começar a contar.").
- **Ajustes:** "Meta semanal" com valor de 1 a 7 dias; valor inicial **5**. Fica em ajustes globais (vale para os dois instrumentos).
- Nenhuma mudança na barra de baixo ou nas abas.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova.
- Formato `guitar-mapper:v2` **aditivo**: campos novos opcionais, com valor padrão seguro quando ausentes ou inválidos, sem trocar a versão e sem migração. O sanitizador de carga e a importação (`sanitizeV2`) validam os campos novos.
- O exportar e o importar do M0 cobrem os campos novos automaticamente, por serem parte do `AppData`.
- A data atual e o gerador aleatório são injetáveis (o `AppProvider` já aceita `now`), para testes determinísticos.
- Os testes atuais continuam passando; só podem mudar os que testavam o sorteio uniforme de `buildQueue` se ele deixar de ser usado, e o commit explica.

## Decisões minhas (a conferir)

- Sessão fixa de 20 perguntas, pesos 50/30/20.
- Meta padrão de 5 dias por semana; semana de segunda a domingo; "dia estudado" = uma sessão terminada com ao menos uma resposta.
- Tempo médio dos últimos 7 dias (e não de todo o histórico).
- Progresso de Ouvido e Intervalos por instrumento; chave de Ouvido pela altura (MIDI), não pela posição.
- O `progress` por posição continua como único mapa dos três modos de posição.
- Registro diário global, com limite de 400 dias.

## Fica a cargo de quem for construir

- O nome e a forma exata dos campos novos no armazenamento e no contexto do app (`recordItemAnswer` ou equivalente), e como a função de revisão generaliza o `pickNext`.
- Onde calcular dias seguidos e semana (função pura de domínio, com a data injetada).
- O visual do bloco "Constância", seguindo os estilos existentes.
- Como tratar o fuso e o horário de verão ao comparar dias (a regra é a data local; o método fica a critério).
