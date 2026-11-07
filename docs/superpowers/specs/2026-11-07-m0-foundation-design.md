# M0 Fundação: exercícios como registro, seletor por trilhas e exportar/importar — Design

Data: 2026-11-07. Primeiro marco do plano de 12 meses (ver relatório de viabilidade na conversa). Nada do que o usuário vê nos exercícios muda neste marco.

## Origem e motivo

O app vai ganhar muitos exercícios (ouvido, escalas, acordes, campo harmônico). Hoje cada modo novo exige mexer em vários lugares: `Study.tsx` ramifica por `isInterval`, mantém duas filas (`queue`, `intervalQueue`) e só grava progresso para modos de posição; `modeLabels.ts`, `storage.ts` (`MODES`) e `StudyHeader.tsx` repetem a lista de modos. Além disso, os dados vivem só no `localStorage`, e o Safari pode apagá-los após dias sem uso. Num plano de 12 meses, perder o progresso é o maior risco.

O app foi pensado principalmente para celular. O usuário normalmente escolhe um modo e fica nele a sessão inteira.

## Objetivos

1. **Exercício como registro.** Adicionar um modo novo passa a ser: criar um arquivo do exercício e uma entrada no registro, sem editar `Study.tsx`.
2. **Trilhas no seletor de modos.** O menu de exercícios de Estudar agrupa os modos por trilha (Braço, Ouvido, Teoria), para continuar legível quando houver mais de uma dúzia de modos.
3. **Exportar e importar.** Em Ajustes, baixar todos os dados num arquivo JSON e restaurá-los a partir de um arquivo, com confirmação.

## Não objetivos

- Qualquer exercício, ajuste ou dado novo. O formato `guitar-mapper:v2` não muda (sem migração).
- Ligar a revisão espaçada a Ouvido e Intervalos (isso é o M1). A refatoração deve apenas deixar um ponto claro para isso (cada exercício declara uma chave de item), sem usá-lo ainda.
- Mesclar dados importados com os atuais; backup automático; nuvem.
- Nova aba na barra de baixo. Ela continua com 4 abas.
- Mudar o layout do desktop além do que o seletor exigir.

## Anti-objetivos (falha, mesmo que "funcione")

- Qualquer comportamento de exercício diferente do atual: mesma ordem de perguntas, mesmo registro de progresso (só posição nos modos de posição, nada em Ouvido e Intervalos), mesmo histórico, mesmos atalhos.
- Os 424 testes atuais precisarem de edição de comportamento. Só podem mudar o que testam sobre a estrutura interna removida, e cada mudança deve ser justificada no commit.
- Importar um arquivo inválido ou de versão desconhecida apagar ou alterar os dados atuais.
- Importar sem confirmação, ou sem guardar uma cópia dos dados atuais antes de substituir.
- O seletor adicionar um toque a mais para quem já está no modo e só quer estudar (iniciar a sessão não pode depender do menu).

## Comportamento

### 1. Exercício como registro

Um tipo `Exercise<Item>` descreve cada modo: seu `id` (o `QuizMode`), trilha, rótulo e descrição, como montar a fila de itens, uma chave estável por item, e o componente da pergunta. `Study` passa a ter uma única fila genérica e delega ao exercício.

Os cinco modos atuais (`position-to-note`, `note-to-position`, `flashcard`, `ear`, `interval`) são portados para o registro. `MODES`, `MODE_DESCRIPTIONS`, o rótulo exibido e a lista usada pelo sanitizador de histórico em `storage.ts` passam a derivar do registro, em um só lugar.

Quem decide se uma resposta grava progresso por posição continua sendo o mesmo critério de hoje; o registro apenas o expressa (por exemplo, um campo que diz se o exercício registra progresso por posição).

### 2. Seletor por trilhas

O `StudyHeader` já tem um menu (botão hambúrguer, "Menu de exercícios") no celular e no tablet, e uma fileira de botões no computador. Este marco não troca esse mecanismo: só agrupa os modos por trilha.

- No celular e no tablet, o menu existente passa a mostrar os modos agrupados por trilha, cada grupo com seu título (Braço, Ouvido, Teoria). Os itens continuam sendo `menuitemradio`, e o menu abre, fecha e troca de modo como hoje.
- No computador, a fileira de botões continua com todos os modos (são poucos); só passa a seguir a ordem das trilhas.
- Trilhas: **Braço** (posição→nota, nota→posição, flashcard), **Ouvido** (ouvido), **Teoria** (intervalos).
- O botão Iniciar continua sendo a ação principal; o menu continua secundário. A barra de baixo continua escondida durante a sessão.

### 3. Exportar e importar

Em Ajustes, uma seção "Dados":

- **Exportar dados:** baixa `guitar-mapper-AAAA-MM-DD.json` com o `AppData` v2 inteiro (ajustes, progresso, histórico dos dois instrumentos).
- **Importar dados:** escolhe um `.json`. O app valida o arquivo antes de tocar nos dados atuais. Se for válido, mostra uma confirmação com o que será substituído ("isto substitui todo o progresso atual") e só então substitui. Antes de substituir, guarda os dados atuais na chave de backup existente (`guitar-mapper:v2:backup`).
- **Arquivo válido:** JSON, objeto com `version: 2` e `instruments` como objeto. O conteúdo passa pelo mesmo sanitizador do carregamento (`sanitizeV2`), então campos inválidos são descartados como já acontece hoje.
- **Arquivo inválido** (não é JSON, não é objeto, versão diferente de 2, estrutura incompleta): mensagem em português ("Arquivo não reconhecido…") e nenhum dado é alterado.
- Após importar com sucesso: aviso de sucesso e o app já reflete os dados novos sem recarregar manualmente.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova.
- Sem mudança no formato de armazenamento. A importação deve usar o sanitizador existente, não um segundo.
- Os testes ficam em Vitest com Testing Library, como os atuais; o fluxo de arquivo do iPhone é teste manual.

## Decisões minhas (a conferir)

- Trilhas: Braço, Ouvido, Teoria, com Intervalos em Teoria. Pode mudar o agrupamento sem afetar o resto.
- Importar substitui tudo; não há mesclagem. É mais simples e previsível.
- A cópia de segurança antes de importar reaproveita a chave `guitar-mapper:v2:backup` (a mesma da recuperação de dados corrompidos), em vez de criar uma nova chave. Isso sobrescreve um backup anterior de recuperação.
- Exportar inclui os dois instrumentos num único arquivo.
- A confirmação da importação reaproveita o `useConfirm` que o app já usa.

## Fica a cargo de quem for construir

- A forma exata do tipo `Exercise` e como os componentes de pergunta recebem seus dados, desde que `Study` fique sem ramos por modo.
- O mecanismo de download no iPhone (`<a download>` ou compartilhamento de arquivo): escolher o que funcionar e registrar o que não foi possível verificar.
- O visual dos títulos de trilha no menu, seguindo os estilos existentes.
