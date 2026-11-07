import { useEffect } from 'react';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable);

const click = (el: Element | null | undefined) => {
  if (!(el instanceof HTMLElement)) return false;
  el.click();
  return true;
};

// Letras da cifra → nota (0 = C). As 12 notas só têm sustenidos: Shift soma um
// semitom, e E/B não têm sustenido próprio (E♯ = F, B♯ = C), então Shift+E/B não faz nada.
const LETTER_NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function answerWithLetter(letter: string, sharp: boolean) {
  const natural = LETTER_NOTE[letter.toUpperCase()];
  if (sharp && (natural === 4 || natural === 11)) return false;
  const button = document.querySelectorAll('.note-grid .note-option')[natural + (sharp ? 1 : 0)];
  if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
  return click(button);
}

/**
 * Atalhos de teclado das perguntas: 1–9 escolhem a opção, Enter é a ação principal
 * (Iniciar, Mostrar nota, Próxima), R toca o som de novo (Ouvido). Botões com `data-shortcut`
 * (Ouvido: intervalos e graus) declaram a própria tecla e substituem as regras de resposta. Aciona os botões que
 * já estão na tela (em Intervalos, A–G respondem a nota; Shift = ♯), então respeita tudo o que eles respeitam (limite de audições, etc.).
 */
export function useQuizShortcuts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      if (document.querySelector('[role="alertdialog"], [role="menu"]') || isTyping(event.target)) {
        return;
      }
      // Telas que declaram `data-shortcut` nos botões mandam: a tecla aciona o botão
      // correspondente (se habilitado) e nenhum outro atalho de resposta roda.
      if (
        document.querySelector('[data-shortcut]') &&
        event.key !== 'Enter' &&
        event.key !== 'r' &&
        event.key !== 'R'
      ) {
        const button = Array.from(document.querySelectorAll<HTMLElement>('[data-shortcut]')).find(
          (el) => el.dataset.shortcut === event.key.toLowerCase(),
        );
        if (button instanceof HTMLButtonElement && !button.disabled && click(button)) {
          event.preventDefault();
        }
        return;
      }
      let handled = false;
      if (/^[1-9]$/.test(event.key)) {
        const n = Number(event.key) - 1;
        const grade = document.querySelectorAll('.options--two .option');
        const options = document.querySelectorAll('.options:not(.options--two) .option:not(:disabled)');
        handled = click(grade.length > 0 ? grade[n] : options[n]);
      } else if (event.key === 'Enter') {
        // Com um botão focado o navegador já o ativa: não disparar duas vezes.
        if (event.target instanceof HTMLElement && ['BUTTON', 'A'].includes(event.target.tagName)) {
          return;
        }
        handled =
          click(document.querySelector('.quiz-actions .primary')) ||
          click(document.querySelector('.start:not(:disabled)'));
      } else if (/^[a-g]$/i.test(event.key) && !event.repeat) {
        handled = answerWithLetter(event.key, event.shiftKey);
      } else if (event.key === 'r' || event.key === 'R') {
        handled = click(document.querySelector('.ear-play:not(:disabled)'));
      }
      if (handled) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
