# Guitar Mapper — Design

## Objetivo

Web app responsivo (primeiro para iPhone 13 Pro, 390px) para memorizar as notas no braço da guitarra, da casa 0 à 24, nas 6 cordas. Uso pessoal, sem login e sem backend. O foco inicial é decorar os nomes das notas. Treino de velocidade e escalas ficam para depois.

## Premissas

- Afinação padrão (E A D G B E), com a afinação isolada para permitir outras no futuro.
- Notação C D E e Dó Ré Mi, com troca nas configurações (também é possível mostrar os dois).
- Só notas naturais no início. Os acidentais entram como nível seguinte.
- Stack: React + TypeScript + Vite, Vitest, PWA (vite-plugin-pwa), `localStorage`.

## Estrutura

```
src/
  domain/          # TypeScript puro, sem React
    notes.ts       # 12 notas, nomes (C/Dó), naturais vs acidentais
    tuning.ts      # afinação padrão E A D G B E
    fretboard.ts   # (corda, casa) → nota; (nota, filtro) → posições
    quiz.ts        # gera perguntas e opções erradas plausíveis
    scheduler.ts   # repetição espaçada (caixas estilo Leitner)
  state/           # progresso e configurações persistidos no localStorage
  ui/
    Fretboard.tsx  # braço em SVG (marca posição, recebe toques)
    screens/       # Estudar, Foco, Progresso, Ajustes
```

Escalas e acordes entram depois como novos módulos em `domain/` e novas telas, sem reescrever o existente.

## Conceitos

- **Posição:** `{corda 1–6, casa 0–24}`, 150 posições. Cada uma é independente (a casa 12 repete a corda solta, mas tem progresso próprio).
- **Filtro:** conjunto de cordas, faixa de casas (predefinições 0–5, 5–12, 12–24 e ajuste manual) e nível de notas (naturais ou com acidentais). O sorteio acontece só dentro dele.
- **Progresso por posição:** caixa, acertos, erros, última e próxima revisão.

## Telas

Barra inferior com 4 abas: **Estudar · Progresso · Foco · Ajustes**.

**Estudar:** pergunta e contador da sessão (acertos/total, sequência) no topo, o braço no meio e a área de resposta embaixo. O braço mostra uma janela de cerca de 5 a 7 casas que acompanha o filtro, com rolagem horizontal quando fizer sentido.

Modos:
- **Posição → nota (múltipla escolha):** um ponto aparece no braço e há 4 botões. As opções erradas vêm de notas próximas ou confundíveis, não de sorteio puro.
- **Nota → posição (toque no braço):** o app pede uma nota numa corda e qualquer posição correta dentro do filtro vale. Ao errar, destaca as outras posições da nota.
- **Flashcard:** mostra o ponto, o usuário toca para revelar e marca "Acertei" ou "Errei".

Feedback: acerto rende flash verde e avança. Erro mostra a resposta certa com o ponto destacado, e a posição volta antes pela repetição espaçada.

**Foco:** chips de cordas 1–6, faixa de casas e nível de notas.

**Progresso:** mapa do braço inteiro (casas 0–24) colorido por domínio (vermelho errando, amarelo aprendendo, verde dominada, cinza nunca vista). Tocar numa posição leva a estudá-la.

**Ajustes:** notação, mão esquerda/direita (inverte o braço) e zerar progresso.

**Responsividade:** layout pensado primeiro para 390px. Alvos de toque de 44px ou mais, respeitando a área segura do iPhone.

## Dados e persistência

- Uma chave versionada, `guitar-mapper:v1`, com `settings` (notação, destro/canhoto, foco ativo, modo) e `progress` (mapa `"corda-casa"` → `{caixa, acertos, erros, ultimaRevisao, proximaRevisao}`).
- `progress` guarda só posições já vistas. As nunca vistas são cinza por ausência.
- A versão no formato permite migração futura.
- Gravação síncrona a cada resposta.

## Repetição espaçada

- 5 caixas. Acertar sobe uma caixa e errar volta para a caixa 1. Cada caixa tem um intervalo de revisão crescente.
- O sorteio mistura posições vencidas, posições novas dentro do filtro e posições dominadas com peso baixo.
- `scheduler.ts` é uma função pura que recebe o tempo e o gerador de sorteio como parâmetros.

## Tratamento de erros

- `localStorage` indisponível ou cheio: o app segue em memória e avisa discretamente que o progresso não será salvo.
- Dado corrompido ou de versão desconhecida: ignora, começa limpo e guarda cópia do dado antigo antes de sobrescrever.
- Filtro sem posições: o botão de estudar fica desabilitado, com mensagem do que falta.
- Sem backend, não há erros de rede. O service worker permite abrir offline.

## Testes

TDD no `domain/` com Vitest:
- `fretboard`: casos conhecidos (corda 6 solta = E, corda 5 casa 3 = C, casa 12 repete a solta, casa 24 em todas as cordas).
- `notes`: formatação C/Dó, naturais versus acidentais.
- `quiz`: exatamente uma resposta correta entre as opções, sem duplicadas; no modo nota → posição, aceita qualquer posição correta do filtro.
- `scheduler`: subir e descer de caixa, prioridade das vencidas, determinismo com sorteio injetado.
- `state`: leitura e gravação, migração de versão, dado corrompido.
- UI: poucos testes de componente (Testing Library) no fluxo principal de responder. A parte visual é verificada no navegador em 390px.

## Fora do escopo

Contas e sincronização, escalas e acordes, áudio das notas, histórico e gráficos.
