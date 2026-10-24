# Guitar Mapper

App web (PWA) para memorizar as notas do braço da guitarra, casas 0–24, com quiz de múltipla escolha, "encontre a nota" no braço e flashcards, com repetição espaçada.

## Desenvolvimento

    npm install
    npm run dev        # servidor local
    npm test           # testes (Vitest)
    npm run build      # build de produção em dist/
    npm run preview    # serve o build

## Estrutura

- `src/domain/`: lógica musical e repetição espaçada (TypeScript puro, sem React).
- `src/state/`: persistência no `localStorage` e contexto do app.
- `src/ui/`: componente do braço (SVG) e telas.

Spec e plano em `docs/superpowers/`.

## Deploy (GitHub Pages)

O workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica `dist/` a cada push na `main`. Ative uma única vez em *Settings → Pages → Source: GitHub Actions*. O app fica em `https://vinicius-assis.github.io/guitar-mapper/` (o `base` do Vite está configurado para esse subcaminho).
