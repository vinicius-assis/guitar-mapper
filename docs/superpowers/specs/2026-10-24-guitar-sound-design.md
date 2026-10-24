# Som de violão — Design

## Objetivo

Tocar o som real de violão de nylon da posição estudada, para o aluno associar nome, posição no braço e som. O som é reforço: toca depois que o aluno responde, nunca antes, para não entregar a resposta.

## Decisões já tomadas

- **Quando toca:** assim que o aluno escolhe a resposta, em todos os modos.
- **Fonte do som:** amostras FluidR3 (violão de nylon) do projeto midi-js-soundfonts, escolhidas pelo aluno após comparação lado a lado (opção A). Uma amostra por semitom, E2 a E6 (MIDI 40–88, 49 notas), o intervalo exato do braço em afinação padrão (E2 = corda 6 solta, E6 = corda 1 casa 24).
- **Licença:** o repositório midi-js-soundfonts declara CC BY 3.0 para o FluidR3; o autor do FluidR3 declara MIT. Em qualquer caso é permissivo, com **crédito obrigatório**. O texto exato dos avisos é copiado dos arquivos de licença originais na hora de implementar.

## Quando e o que toca

| Modo | Gatilho | Nota tocada |
|---|---|---|
| Posição → nota | ao tocar numa opção | a nota real da posição perguntada (a resposta certa), mesmo se o aluno errou |
| Nota → posição | ao tocar numa casa | a nota real da casa tocada (como tocar a corda) |
| Flashcard | ao tocar em "Mostrar nota" | a nota real da posição |

Nada toca no Progresso, no início da sessão nem ao marcar Acertei/Errei. Uma resposta toca no máximo um som (um novo som corta o anterior).

## Estrutura

```
public/sounds/nylon/{midi}.mp3     # 49 arquivos (~1 MB), gerados uma vez a partir do .js original
public/sounds/nylon/LICENSE.txt    # avisos de licença originais
src/domain/pitch.ts                # (posição) → número MIDI; OPEN_STRING_MIDI = [64,59,55,50,45,40]
src/audio/player.ts                # Web Audio: carrega, decodifica e toca; recebe o AudioContext por injeção
src/audio/SoundProvider.tsx        # contexto + hook useSound(); lê settings.soundEnabled
```

- `pitchOf(position)` é função pura: `OPEN_STRING_MIDI[string-1] + fret`.
- O `player` cria o `AudioContext` só no primeiro gesto do aluno (toque em Iniciar), carrega cada MP3 sob demanda e guarda o buffer decodificado. Ao iniciar a sessão, pré-carrega as notas da fila para o primeiro som sair sem atraso.
- O service worker guarda os MP3 (precache), então o som funciona offline. O app continua abrindo sem o som se os arquivos falharem.
- **Falhas nunca quebram o estudo:** áudio indisponível, arquivo ausente ou erro de decodificação resultam em silêncio, sem mensagem de erro.

## Configurações e créditos

- Nova opção em **Ajustes**: "Som" (ligado por padrão), salva em `settings.soundEnabled`. Dados salvos antes dela passam a ter o valor padrão (ligado).
- Seção **Créditos** em Ajustes com o aviso de licença do som. Também uma dica: "No iPhone, o som não toca com o aparelho no modo silencioso."

## Testes

- `pitch`: E2 (corda 6, casa 0), E4 (corda 1, casa 0), E6 (corda 1, casa 24), e todas as posições entre MIDI 40 e 88.
- `player` com `AudioContext` falso: cria o contexto só no primeiro gesto, carrega e reaproveita buffers, corta o som anterior, fica mudo quando desligado ou em erro.
- Configuração: valor padrão, migração de dados antigos, validação de valor inválido.
- UI: cada modo toca exatamente um som por resposta, com a nota certa (opção errada toca a nota certa; casa tocada toca a casa), e nada toca com o som desligado.

## Fora do escopo

Volume, outros timbres, treino de ouvido (tocar antes de responder), metrônomo e acordes.
