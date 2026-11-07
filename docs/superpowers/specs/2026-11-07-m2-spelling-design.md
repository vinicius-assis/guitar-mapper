# M2 Grafia: sustenidos, bemóis e nomes corretos de intervalo — Design

Data: 2026-11-07. Terceiro marco do plano de 12 meses; independente do M0/M1. O usuário delegou as decisões de design deste marco ("siga para o próximo"); as escolhas abaixo são minhas e estão marcadas como tal.

## Origem e motivo

Hoje toda nota é mostrada com sustenido (`C#`, `Lá#`). Músicos usam bemóis na prática (`Bb`, `Mib`), e os próximos marcos (escalas, campo harmônico, acordes) exigem nomes corretos ("o IV de Fá é Si♭, não Lá#"). Este marco cria a **camada de grafia** sem mexer em nada que decide acerto: o app inteiro continua pensando em classe de altura (0–11); a grafia só afeta o texto exibido.

## Objetivos

1. **Ajuste "Acidentais"** em Ajustes, global, com três valores: **Sustenidos** (padrão, igual ao app de hoje), **Bemóis** e **Automático**.
2. **Todos os rótulos de nota seguem o ajuste**: perguntas, botões de resposta, marcas no braço e feedback dos quizzes de posição, Ouvido, Flashcard, Encontrar e Intervalos.
3. **Nome correto no Intervalos (Automático):** a nota de chegada recebe a letra do grau (Dó + 3ª maior = Mi; Dó + 3ª menor = Mi♭, nunca Ré#). Isso fica em `domain/spelling.ts`, reutilizável pelos próximos marcos.

## Não objetivos

- Tonalidade no app, armaduras de clave ou escolha de tonalidade (vêm com o campo harmônico, M5).
- Dobrados (𝄪, 𝄫) como rótulo, e nomes enarmônicos raros (Fá♭, Si♯, Dó♭) em qualquer modo.
- Mudar o que conta como acerto, as chaves de progresso (`"corda-casa"`, `ear:<MIDI>`, `interval:<raiz>:<id>`), o som ou a ordem das perguntas.
- Grafia de escalas exóticas e blue notes (M4).
- Mudar rótulos das cordas soltas (`stringLabels` mostra E A D G B E, só naturais).

## Anti-objetivos (falha, mesmo que "funcione")

- Qualquer mudança visível com o ajuste no padrão **Sustenidos**: os 538 testes atuais passam sem edição de comportamento.
- A grafia influenciar correção: responder "Mi♭" ou "Ré#" é a mesma resposta (mesma classe de altura); nenhum botão pode virar enarmônico duplicado (12 botões, um por classe de altura, como hoje).
- O feedback do Intervalos revelar a resposta antes de o usuário responder.
- Dados antigos ou arquivos exportados antes do M2 (sem o campo novo) quebrarem ou mudarem de comportamento.

## Comportamento

### 1. Tabelas de rótulo por ajuste

`noteLabel(note, notation, accidentals?)`: o terceiro argumento é opcional e o padrão é `'sharp'` (comportamento atual, byte a byte).

- **Sustenidos:** `C C# D D# E F F# G G# A A# B` / `Dó Dó# Ré Ré# Mi Fá Fá# Sol Sol# Lá Lá# Si` (atual).
- **Bemóis:** `C Db D Eb E F Gb G Ab A Bb B` / `Dó Réb Ré Mib Mi Fá Solb Sol Láb Lá Sib Si`. Bemol é escrito com `b` minúsculo, simétrico ao `#` que já existe.
- **Automático** (sem contexto de intervalo): a mistura convencional de músicos `C Db D Eb E F F# G Ab A Bb B` (e solfejo equivalente `Dó Réb Ré Mib Mi Fá Fá# Sol Láb Lá Sib Si`). Decisão minha: o trítono fica `F#`/`Fá#`.
- "Ambos" combina cifra e solfejo como hoje, com a mesma tabela escolhida.

### 2. Camada de grafia por grau (`domain/spelling.ts`)

Funções puras:

- `spellNote(note, accidentals)`: letra e acidente (−1, 0 ou +1) da tabela do ajuste.
- `spellInterval(root, interval, accidentals)`: devolve a nota de chegada **com a letra do grau**. Regra: letra da chegada = letra da raiz + (grau − 1) letras, em que o grau diatônico de cada `IntervalId` é 2m/2M→2, 3m/3M→3, 4J/4A→4, 5J→5, 6m/6M→6, 7m/7M→7 (o trítono é sempre a **4ª aumentada**: Dó→Fá#). O acidente é o que falta para atingir a classe de altura de chegada.
- Se o acidente resultante sair de −1…+1 (seria dobrado), `spellInterval` cai na tabela do ajuste para aquela classe de altura.
- No Intervalos, só o ajuste **Automático** usa `spellInterval` (raiz pela tabela Automático). Com Sustenidos ou Bemóis, tudo vem das tabelas fixas do item 1, previsíveis.
- Os rótulos têm a mesma forma de string do item 1 (cifra e solfejo), para entrarem em `noteLabel`/telas sem novo tipo de exibição.

### 3. Intervalos com ajuste Automático

- A pergunta usa a raiz pela tabela Automático. Os 12 botões de resposta usam a tabela Automático (um por classe de altura, sem revelar a resposta).
- No **feedback** e nas marcas do braço depois de responder, a nota de chegada aparece com o nome do grau (Dó + 3ª menor → `Eb`/`Mib`; Fá# + 3ª maior → `A#`/`Lá#`). Se esse nome for diferente do rótulo do botão da mesma classe de altura (Fá# + 3ª maior: botão `Bb`, nome `A#`), o feedback mostra os dois: `A# (Bb)`. Decisão minha.

### 4. Ajuste e dados

- `settings.accidentals?: 'sharp' | 'flat' | 'auto'` global (os dois instrumentos), padrão `'sharp'`.
- Aditivo em `guitar-mapper:v2`: sem trocar a versão, sem migração; ausente ou inválido vale `'sharp'` (`sanitizeSettings`); a importação do M0 passa pelo mesmo sanitizador.
- Ajustes: controle segmentado "Acidentais: Sustenidos / Bemóis / Automático" junto da Notação, com uma linha de explicação do Automático.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova.
- A grafia é só exibição: nenhum cálculo de acerto, chave de progresso, sorteio ou áudio muda.
- `noteLabel` mantém a assinatura compatível (terceiro parâmetro opcional).
- Os testes atuais continuam passando sem mudança de comportamento.

## Decisões minhas (a conferir)

- Bemol com `b` minúsculo (`Bb`, `Sib`), não `♭`; sustenido continua `#`.
- Automático = `C Db D Eb E F F# G Ab A Bb B`; trítono sempre 4ª aumentada (Fá#).
- Só o Intervalos usa o nome por grau, e só no Automático.
- Sem dobrados: cai na tabela do ajuste.
- Não mexo no "Zerar progresso" (que não limpa Ouvido/Intervalos): fica para depois, fora do tema.

## Fica a cargo de quem for construir

- A forma exata do tipo de ajuste e do retorno de `spellNote`/`spellInterval`, desde que o rótulo final siga as tabelas acima.
- Como os componentes de quiz recebem o ajuste (contexto/props), seguindo o padrão que já usam para `notation`.
- O visual do controle em Ajustes, seguindo os estilos existentes.
